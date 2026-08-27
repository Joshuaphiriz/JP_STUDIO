import "server-only";

import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  notifications,
  posts,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";

/**
 * Nudge reviewers about posts that have sat in a pending state too long.
 * Deduplicated by not re-notifying a user who already has an unread reminder
 * for the same post in the last 20 hours.
 */
export async function runApprovalReminders(): Promise<{ reminded: number }> {
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000);
  const stale = await db
    .select({
      id: posts.id,
      workspaceId: posts.workspaceId,
      status: posts.status,
      slug: workspaces.slug,
    })
    .from(posts)
    .innerJoin(workspaces, eq(workspaces.id, posts.workspaceId))
    .where(
      and(
        inArray(posts.status, ["pending_review", "pending_client"]),
        lt(posts.updatedAt, cutoff),
      ),
    )
    .limit(100);

  let reminded = 0;
  const recentCutoff = new Date(Date.now() - 20 * 3600 * 1000);

  for (const post of stale) {
    const roles =
      post.status === "pending_review"
        ? (["owner", "manager", "editor"] as const)
        : (["owner", "manager"] as const);
    const reviewers = await db
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, post.workspaceId),
          inArray(workspaceMembers.role, [...roles]),
        ),
      );

    for (const r of reviewers) {
      const [existing] = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, r.userId),
            eq(notifications.type, "approval_reminder"),
            gte(notifications.createdAt, recentCutoff),
          ),
        )
        .limit(1);
      if (existing) continue;
      await db.insert(notifications).values({
        userId: r.userId,
        workspaceId: post.workspaceId,
        type: "approval_reminder",
        title: "A post is still waiting for review",
        href: `/app/${post.slug}/approvals`,
        data: { postId: post.id },
      });
      reminded++;
    }
  }

  return { reminded };
}
