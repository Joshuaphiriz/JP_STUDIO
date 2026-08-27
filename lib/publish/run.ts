import "server-only";

import { and, eq, inArray, lte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  notifications,
  platformPosts,
  posts,
  socialAccounts,
} from "@/lib/db/schema";
import { getAccountToken } from "@/lib/providers/accounts";
import { getProvider } from "@/lib/providers/registry";
import { renderPublishContent } from "./render";

const MAX_ATTEMPTS = 3;

type Summary = {
  posts: number;
  published: number;
  failed: number;
  skipped: number;
};

/**
 * Publish every post whose scheduled time has arrived. Idempotent and safe to
 * call every minute — a row is claimed by flipping its status to `publishing`
 * before any network call.
 */
export async function publishDuePosts(now = new Date()): Promise<Summary> {
  const due = await db
    .select({ id: posts.id })
    .from(posts)
    .where(
      and(
        inArray(posts.status, ["scheduled", "publishing", "partially_failed"]),
        lte(posts.scheduledAt, now),
        eq(posts.isTemplate, false),
      ),
    )
    .limit(50);

  const summary: Summary = { posts: 0, published: 0, failed: 0, skipped: 0 };

  for (const { id: postId } of due) {
    // claim
    const claimed = await db
      .update(posts)
      .set({ status: "publishing", updatedAt: new Date() })
      .where(
        and(
          eq(posts.id, postId),
          inArray(posts.status, [
            "scheduled",
            "publishing",
            "partially_failed",
          ]),
        ),
      )
      .returning({ id: posts.id });
    if (claimed.length === 0) continue;
    summary.posts++;

    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    const targets = await db
      .select({ pp: platformPosts, account: socialAccounts })
      .from(platformPosts)
      .innerJoin(
        socialAccounts,
        eq(socialAccounts.id, platformPosts.socialAccountId),
      )
      .where(eq(platformPosts.postId, postId));

    let anyOk = false;
    let anyFail = false;
    let anyPending = false;

    for (const { pp, account } of targets) {
      if (pp.status === "published") {
        anyOk = true;
        continue;
      }
      if (pp.attempts >= MAX_ATTEMPTS) {
        anyFail = true;
        continue;
      }

      try {
        const { token, profile } = await getAccountToken(account.id);
        const provider = getProvider(account.platform);
        const content = await renderPublishContent(post, pp);
        const result = await provider.publish(token, profile, content);

        if (result.ok) {
          anyOk = true;
          await db
            .update(platformPosts)
            .set({
              status: "published",
              externalPostId: result.externalPostId,
              permalink: result.permalink,
              publishedAt: new Date(),
              attempts: pp.attempts + 1,
              lastError: null,
            })
            .where(eq(platformPosts.id, pp.id));
        } else {
          const retryable = result.error?.retryable ?? false;
          const attempts = pp.attempts + 1;
          const dead = !retryable || attempts >= MAX_ATTEMPTS;
          if (dead) anyFail = true;
          else anyPending = true;
          await db
            .update(platformPosts)
            .set({
              status: dead ? "failed" : "scheduled",
              attempts,
              lastError: result.error?.message ?? "Unknown error",
            })
            .where(eq(platformPosts.id, pp.id));
        }
      } catch (err) {
        const attempts = pp.attempts + 1;
        const dead = attempts >= MAX_ATTEMPTS;
        if (dead) anyFail = true;
        else anyPending = true;
        await db
          .update(platformPosts)
          .set({
            status: dead ? "failed" : "scheduled",
            attempts,
            lastError: (err as Error).message,
          })
          .where(eq(platformPosts.id, pp.id));
      }
    }

    const finalStatus = anyPending
      ? "scheduled"
      : anyFail && anyOk
        ? "partially_failed"
        : anyFail
          ? "failed"
          : "published";

    await db
      .update(posts)
      .set({
        status: finalStatus,
        publishedAt:
          finalStatus === "published" ? new Date() : post.publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId));

    if (finalStatus === "published") summary.published++;
    else if (finalStatus === "scheduled") summary.skipped++;
    else summary.failed++;

    if (
      (finalStatus === "failed" || finalStatus === "partially_failed") &&
      post.authorUserId
    ) {
      await db.insert(notifications).values({
        userId: post.authorUserId,
        workspaceId: post.workspaceId,
        type: "publish_failure",
        title: "A post failed to publish",
        body: targets.find((t) => t.pp.lastError)?.pp.lastError ?? undefined,
        href: `/app`,
      });
    }
  }

  return summary;
}

/** Refresh tokens for accounts whose access token expires within 24h. */
export async function refreshExpiringTokens(): Promise<{ checked: number }> {
  const rows = await db
    .select({ id: socialAccounts.id })
    .from(socialAccounts)
    .where(inArray(socialAccounts.status, ["connected", "token_expiring"]))
    .limit(100);
  // getAccountToken refreshes lazily when a token is near expiry.
  for (const r of rows) {
    await getAccountToken(r.id).catch(() => {});
  }
  return { checked: rows.length };
}

/** Health-check connected accounts (every ~6h). */
export async function runHealthChecks(): Promise<{
  checked: number;
  unhealthy: number;
}> {
  const rows = await db
    .select({ id: socialAccounts.id })
    .from(socialAccounts)
    .where(eq(socialAccounts.status, "connected"))
    .limit(100);
  let unhealthy = 0;
  for (const r of rows) {
    try {
      const { token, profile, platform } = await getAccountToken(r.id);
      const res = await getProvider(platform).checkHealth(token, profile);
      await db
        .update(socialAccounts)
        .set({
          status: res.ok ? "connected" : "error",
          lastHealthCheckAt: new Date(),
        })
        .where(eq(socialAccounts.id, r.id));
      if (!res.ok) unhealthy++;
    } catch {
      unhealthy++;
      await db
        .update(socialAccounts)
        .set({ status: "error", lastHealthCheckAt: new Date() })
        .where(eq(socialAccounts.id, r.id));
    }
  }
  return { checked: rows.length, unhealthy };
}
