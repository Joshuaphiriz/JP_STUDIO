"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  approvals,
  auditLog,
  notifications,
  platformPosts,
  postVersions,
  posts,
  socialAccounts,
  workspaceMembers,
} from "@/lib/db/schema";
import type { ApprovalMode, PostStatus } from "@/lib/db/schema";
import { requireWorkspace } from "@/lib/dal";
import { composerInputSchema, type ComposerInput } from "@/lib/composer/schema";
import { planSubmit } from "@/lib/approvals/workflow";
import { publishDuePosts } from "@/lib/publish/run";

type Ctx = { workspaceSlug: string };
export type ComposerResult =
  | { ok: true; postId: string; status: string; awaitingApproval?: boolean }
  | { ok: false; error: string };

async function persist(
  ctx: Ctx,
  raw: ComposerInput,
  intent: "draft" | "schedule" | "publish" | "submit",
): Promise<ComposerResult> {
  const parsed = composerInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid post data" };
  const input = parsed.data;
  const ws = await requireWorkspace(ctx.workspaceSlug);

  if (intent !== "draft" && !ws.can("post:create") && !ws.can("post:submit")) {
    return { ok: false, error: "You can't create posts in this workspace." };
  }
  if (intent !== "draft" && input.accountIds.length === 0) {
    return { ok: false, error: "Pick at least one account to post to." };
  }

  const accounts = input.accountIds.length
    ? await db
        .select({ id: socialAccounts.id, platform: socialAccounts.platform })
        .from(socialAccounts)
        .where(
          and(
            eq(socialAccounts.workspaceId, ws.id),
            inArray(socialAccounts.id, input.accountIds),
          ),
        )
    : [];
  if (accounts.length !== input.accountIds.length) {
    return {
      ok: false,
      error: "One or more accounts are not in this workspace.",
    };
  }

  const scheduledAt =
    intent === "publish"
      ? new Date()
      : input.scheduledAt
        ? new Date(input.scheduledAt)
        : null;
  if (intent === "schedule" && !scheduledAt) {
    return { ok: false, error: "Choose a date and time to schedule." };
  }

  // decide the resulting status
  const mode = (ws.approvalMode ?? "none") as ApprovalMode;
  let status: PostStatus = "draft";
  let awaitingApproval = false;
  if (intent !== "draft") {
    const plan = planSubmit(
      mode,
      {
        canPublish: ws.can("post:publish"),
        canApproveInternal: ws.can("approval:internal"),
      },
      intent === "publish" ? "publish" : "schedule",
    );
    status = plan.status;
    awaitingApproval = plan.awaitingApproval;
  }

  // upsert base post
  let postId = input.postId;
  const baseValues = {
    caption: input.caption,
    mediaIds: input.mediaIds,
    firstComment: input.firstComment ?? null,
    category: input.category ?? null,
    tags: input.tags,
    internalNotes: input.internalNotes ?? null,
    scheduledAt,
    status,
    updatedAt: new Date(),
  };
  if (postId) {
    const [existing] = await db
      .select({ id: posts.id, authorUserId: posts.authorUserId })
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.workspaceId, ws.id)))
      .limit(1);
    if (!existing) return { ok: false, error: "Post not found." };
    if (existing.authorUserId !== ws.user.id && !ws.can("post:edit_any")) {
      return { ok: false, error: "You can only edit your own posts." };
    }
    await db.update(posts).set(baseValues).where(eq(posts.id, postId));
  } else {
    const [created] = await db
      .insert(posts)
      .values({ workspaceId: ws.id, authorUserId: ws.user.id, ...baseValues })
      .returning({ id: posts.id });
    postId = created.id;
  }

  // reconcile platform_posts
  const overrideByAccount = new Map(
    input.overrides.map((o) => [o.socialAccountId, o]),
  );
  await db.delete(platformPosts).where(eq(platformPosts.postId, postId));
  if (accounts.length) {
    const ppStatus: PostStatus = status === "scheduled" ? "scheduled" : "draft";
    await db.insert(platformPosts).values(
      accounts.map((a) => {
        const o = overrideByAccount.get(a.id);
        return {
          postId: postId!,
          socialAccountId: a.id,
          platform: a.platform,
          captionOverride: o?.captionOverride ?? null,
          firstCommentOverride: o?.firstCommentOverride ?? null,
          mediaIdsOverride: o?.mediaIdsOverride ?? null,
          options: o?.options ?? null,
          status: ppStatus,
        };
      }),
    );
  }

  await db.insert(postVersions).values({
    postId,
    snapshot: { ...input, intent },
    editedByUserId: ws.user.id,
  });
  await db.insert(auditLog).values({
    organizationId: ws.organizationId,
    workspaceId: ws.id,
    actorUserId: ws.user.id,
    action: `post.${intent}`,
    targetType: "post",
    targetId: postId,
  });

  if (awaitingApproval) {
    await db
      .insert(approvals)
      .values({ postId, stage: "internal", decision: "pending" });
    await notifyApprovers(ws.id, ws.user.id, postId, ws.slug);
  }

  revalidatePath(`/app/${ws.slug}`, "layout");

  if (intent === "publish" && status === "scheduled") {
    await publishDuePosts().catch(() => {});
    const [after] = await db
      .select({ status: posts.status })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    return { ok: true, postId, status: after?.status ?? "publishing" };
  }

  return { ok: true, postId, status, awaitingApproval };
}

async function notifyApprovers(
  workspaceId: string,
  authorId: string,
  postId: string,
  slug: string,
) {
  const members = await db
    .select({ userId: workspaceMembers.userId, role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        inArray(workspaceMembers.role, ["owner", "manager", "editor"]),
        ne(workspaceMembers.userId, authorId),
      ),
    );
  if (members.length === 0) return;
  await db.insert(notifications).values(
    members.map((m) => ({
      userId: m.userId,
      workspaceId,
      type: "approval_request" as const,
      title: "A post needs your review",
      href: `/app/${slug}/approvals`,
      data: { postId },
    })),
  );
}

export async function saveDraft(ctx: Ctx, input: ComposerInput) {
  return persist(ctx, input, "draft");
}
export async function schedulePost(ctx: Ctx, input: ComposerInput) {
  return persist(ctx, input, "schedule");
}
export async function publishNow(ctx: Ctx, input: ComposerInput) {
  return persist(ctx, input, "publish");
}
export async function submitForApproval(ctx: Ctx, input: ComposerInput) {
  return persist(ctx, input, "submit");
}
