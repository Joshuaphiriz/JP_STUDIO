"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  approvals,
  auditLog,
  notifications,
  platformPosts,
  posts,
} from "@/lib/db/schema";
import type { ApprovalMode } from "@/lib/db/schema";
import { requireWorkspace } from "@/lib/dal";
import {
  planDecision,
  type Decision,
  type Stage,
} from "@/lib/approvals/workflow";

export type DecideResult = { ok: boolean; error?: string };

export async function decide(
  workspaceSlug: string,
  postId: string,
  stage: Stage,
  decision: Decision,
  comment: string,
): Promise<DecideResult> {
  const ws = await requireWorkspace(workspaceSlug);
  const perm = stage === "internal" ? "approval:internal" : "approval:client";
  if (!ws.can(perm)) return { ok: false, error: "Not allowed" };
  if (decision !== "approved" && !comment.trim()) {
    return {
      ok: false,
      error: "A comment is required to reject or request changes.",
    };
  }

  const [post] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.workspaceId, ws.id)))
    .limit(1);
  if (!post) return { ok: false, error: "Post not found" };

  const expected = stage === "internal" ? "pending_review" : "pending_client";
  if (post.status !== expected && post.status !== "changes_requested") {
    return { ok: false, error: "This post is no longer awaiting that review." };
  }

  const mode = (ws.approvalMode ?? "none") as ApprovalMode;
  const plan = planDecision(mode, stage, decision, Boolean(post.scheduledAt));

  await db.insert(approvals).values({
    postId,
    stage,
    decision,
    actorUserId: ws.user.id,
    comment: comment.trim() || null,
  });

  await db
    .update(posts)
    .set({ status: plan.status, updatedAt: new Date() })
    .where(eq(posts.id, postId));

  if (plan.status === "scheduled") {
    await db
      .update(platformPosts)
      .set({ status: "scheduled" })
      .where(eq(platformPosts.postId, postId));
  }

  // create the next-stage approval row
  if (plan.nextStage) {
    await db
      .insert(approvals)
      .values({ postId, stage: plan.nextStage, decision: "pending" });
  }

  await db.insert(auditLog).values({
    organizationId: ws.organizationId,
    workspaceId: ws.id,
    actorUserId: ws.user.id,
    action: `approval.${decision}`,
    targetType: "post",
    targetId: postId,
    meta: { stage },
  });

  if (post.authorUserId && post.authorUserId !== ws.user.id) {
    await db.insert(notifications).values({
      userId: post.authorUserId,
      workspaceId: ws.id,
      type: "approval_request",
      title:
        decision === "approved"
          ? plan.nextStage
            ? "Approved — now with the client"
            : "Your post was approved"
          : decision === "rejected"
            ? "Your post was rejected"
            : "Changes requested on your post",
      body: comment.trim() || undefined,
      href: `/app/${ws.slug}/composer?post=${postId}`,
      data: { postId },
    });
  }

  revalidatePath(`/app/${ws.slug}/approvals`);
  revalidatePath(`/app/${ws.slug}`, "layout");
  return { ok: true };
}

export async function addComment(
  workspaceSlug: string,
  postId: string,
  body: string,
  visibility: "internal" | "client",
): Promise<DecideResult> {
  const ws = await requireWorkspace(workspaceSlug);
  if (!body.trim()) return { ok: false, error: "Empty comment" };
  const [post] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.workspaceId, ws.id)))
    .limit(1);
  if (!post) return { ok: false, error: "Post not found" };

  const { postComments } = await import("@/lib/db/schema");
  await db.insert(postComments).values({
    postId,
    authorUserId: ws.user.id,
    body: body.trim(),
    visibility,
  });
  revalidatePath(`/app/${ws.slug}/approvals`);
  return { ok: true };
}
