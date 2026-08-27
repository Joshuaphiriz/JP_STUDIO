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
  workspaces,
} from "@/lib/db/schema";
import type { ApprovalMode } from "@/lib/db/schema";
import { planDecision } from "@/lib/approvals/workflow";
import { resolvePortalToken } from "@/lib/portal/session";

export async function portalDecide(
  token: string,
  postId: string,
  decision: "approved" | "changes_requested" | "rejected",
  comment: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await resolvePortalToken(token);
  if (!session) return { ok: false, error: "This link is no longer valid." };
  if (decision !== "approved" && !comment.trim()) {
    return { ok: false, error: "Please add a note." };
  }

  const [post] = await db
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.id, postId),
        eq(posts.workspaceId, session.workspaceId),
        eq(posts.status, "pending_client"),
      ),
    )
    .limit(1);
  if (!post)
    return { ok: false, error: "That post isn't awaiting your review." };

  const [ws] = await db
    .select({ approvalMode: workspaces.approvalMode })
    .from(workspaces)
    .where(eq(workspaces.id, session.workspaceId))
    .limit(1);
  const plan = planDecision(
    (ws.approvalMode ?? "none") as ApprovalMode,
    "client",
    decision,
    Boolean(post.scheduledAt),
  );

  await db.insert(approvals).values({
    postId,
    stage: "client",
    decision,
    actorLabel: session.label,
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
  await db.insert(auditLog).values({
    organizationId: session.organizationId,
    workspaceId: session.workspaceId,
    action: `approval.client.${decision}`,
    targetType: "post",
    targetId: postId,
    meta: { by: session.label },
  });
  if (post.authorUserId) {
    await db.insert(notifications).values({
      userId: post.authorUserId,
      workspaceId: session.workspaceId,
      type: "approval_request",
      title:
        decision === "approved"
          ? `${session.label} approved your post`
          : `${session.label} sent your post back`,
      body: comment.trim() || undefined,
      data: { postId },
    });
  }

  revalidatePath(`/portal/${token}`);
  return { ok: true };
}
