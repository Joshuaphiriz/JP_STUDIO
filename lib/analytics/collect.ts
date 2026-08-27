import "server-only";

import { and, eq, gte, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  analyticsSnapshots,
  platformPosts,
  postMetrics,
  posts,
  socialAccounts,
} from "@/lib/db/schema";
import { getAccountToken } from "@/lib/providers/accounts";
import { getProvider } from "@/lib/providers/registry";

/**
 * Collect fresh metrics for recently-published posts and take a daily follower
 * snapshot per account. Runs on the `collect-analytics` cron (hourly).
 */
export async function collectAnalytics(): Promise<{
  postsUpdated: number;
  accountsSnapshotted: number;
}> {
  const day = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 864e5);

  // 1. per-account follower snapshot
  const accounts = await db
    .select({
      id: socialAccounts.id,
      workspaceId: socialAccounts.workspaceId,
      followerCount: socialAccounts.followerCount,
      platform: socialAccounts.platform,
    })
    .from(socialAccounts)
    .where(inArray(socialAccounts.status, ["connected", "token_expiring"]));

  let accountsSnapshotted = 0;
  for (const a of accounts) {
    await db
      .insert(analyticsSnapshots)
      .values({
        workspaceId: a.workspaceId,
        socialAccountId: a.id,
        day,
        followers: a.followerCount ?? null,
      })
      .onConflictDoUpdate({
        target: [analyticsSnapshots.socialAccountId, analyticsSnapshots.day],
        set: { followers: a.followerCount ?? null },
      });
    accountsSnapshotted++;
  }

  // 2. per-post metrics for anything published in the last 7 days
  const targets = await db
    .select({
      ppId: platformPosts.id,
      externalPostId: platformPosts.externalPostId,
      accountId: platformPosts.socialAccountId,
    })
    .from(platformPosts)
    .innerJoin(posts, eq(posts.id, platformPosts.postId))
    .where(
      and(
        eq(platformPosts.status, "published"),
        isNotNull(platformPosts.externalPostId),
        gte(posts.publishedAt, sevenDaysAgo),
      ),
    )
    .limit(200);

  let postsUpdated = 0;
  for (const t of targets) {
    try {
      const { token, profile, platform } = await getAccountToken(t.accountId);
      const provider = getProvider(platform);
      if (!provider.getPostMetrics) continue;
      const m = await provider.getPostMetrics(
        token,
        profile,
        t.externalPostId!,
      );
      const engagements =
        (m.likes ?? 0) + (m.comments ?? 0) + (m.shares ?? 0) + (m.saves ?? 0);
      const rate = m.impressions ? engagements / m.impressions : null;
      await db
        .insert(postMetrics)
        .values({
          platformPostId: t.ppId,
          impressions: m.impressions,
          reach: m.reach,
          likes: m.likes,
          comments: m.comments,
          shares: m.shares,
          saves: m.saves,
          clicks: m.clicks,
          videoViews: m.videoViews,
          engagementRate: rate,
        })
        .onConflictDoUpdate({
          target: postMetrics.platformPostId,
          set: {
            impressions: m.impressions,
            reach: m.reach,
            likes: m.likes,
            comments: m.comments,
            shares: m.shares,
            saves: m.saves,
            clicks: m.clicks,
            videoViews: m.videoViews,
            engagementRate: rate,
            collectedAt: new Date(),
          },
        });
      postsUpdated++;
    } catch {
      /* skip this one */
    }
  }

  return { postsUpdated, accountsSnapshotted };
}
