"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  auditLog,
  platformPosts,
  postVersions,
  posts,
  socialAccounts,
} from "@/lib/db/schema";
import { requireWorkspace } from "@/lib/dal";
import { composerInputSchema, type ComposerInput } from "@/lib/composer/schema";
import { publishDuePosts } from "@/lib/publish/run";

type Ctx = { workspaceSlug: string };
export type ComposerResult =
  { ok: true; postId: string; status: string } | { ok: false; error: string };

async function persist(
  ctx: Ctx,
  raw: ComposerInput,
  intent: "draft" | "schedule" | "publish",
): Promise<ComposerResult> {
  const parsed = composerInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid post data" };
  const input = parsed.data;
  const ws = await requireWorkspace(ctx.workspaceSlug);

  if (intent !== "draft" && input.accountIds.length === 0) {
    return { ok: false, error: "Pick at least one account to post to." };
  }

  // validate the accounts belong to this workspace
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

  const status = intent === "draft" ? "draft" : ("scheduled" as const);

  // upsert the base post
  let postId = input.postId;
  if (postId) {
    const [existing] = await db
      .select({ id: posts.id })
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.workspaceId, ws.id)))
      .limit(1);
    if (!existing) return { ok: false, error: "Post not found." };
    await db
      .update(posts)
      .set({
        caption: input.caption,
        mediaIds: input.mediaIds,
        firstComment: input.firstComment ?? null,
        category: input.category ?? null,
        tags: input.tags,
        internalNotes: input.internalNotes ?? null,
        scheduledAt,
        status,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId));
  } else {
    const [created] = await db
      .insert(posts)
      .values({
        workspaceId: ws.id,
        caption: input.caption,
        mediaIds: input.mediaIds,
        firstComment: input.firstComment ?? null,
        category: input.category ?? null,
        tags: input.tags,
        internalNotes: input.internalNotes ?? null,
        scheduledAt,
        status,
        authorUserId: ws.user.id,
      })
      .returning({ id: posts.id });
    postId = created.id;
  }

  // reconcile platform_posts
  const overrideByAccount = new Map(
    input.overrides.map((o) => [o.socialAccountId, o]),
  );
  await db.delete(platformPosts).where(eq(platformPosts.postId, postId));
  if (accounts.length) {
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
          status: (status === "draft" ? "draft" : "scheduled") as
            "draft" | "scheduled",
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

  revalidatePath(`/app/${ws.slug}`, "layout");

  if (intent === "publish") {
    // run the pipeline immediately for instant feedback
    await publishDuePosts().catch(() => {});
    const [after] = await db
      .select({ status: posts.status })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    return { ok: true, postId, status: after?.status ?? "publishing" };
  }

  return { ok: true, postId, status };
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
