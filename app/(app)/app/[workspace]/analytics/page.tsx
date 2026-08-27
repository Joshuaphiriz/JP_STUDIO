import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db/client";
import {
  analyticsSnapshots,
  platformPosts,
  postMetrics,
  posts,
  socialAccounts,
} from "@/lib/db/schema";
import { requireWorkspace } from "@/lib/dal";
import { isoDaysAgo } from "@/lib/time";
import { AnalyticsClient } from "./analytics-client";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage(
  props: PageProps<"/app/[workspace]/analytics">,
) {
  const { workspace } = await props.params;
  const ws = await requireWorkspace(workspace);
  if (!ws.can("analytics:view")) {
    return (
      <PageContainer>
        <PageHeader
          title="Analytics"
          description="You don't have analytics access here."
        />
      </PageContainer>
    );
  }

  const since = isoDaysAgo(90);

  const [snapshots, accounts, topPosts] = await Promise.all([
    db
      .select({
        day: analyticsSnapshots.day,
        followers: analyticsSnapshots.followers,
        socialAccountId: analyticsSnapshots.socialAccountId,
      })
      .from(analyticsSnapshots)
      .where(
        and(
          eq(analyticsSnapshots.workspaceId, ws.id),
          gte(analyticsSnapshots.day, since),
        ),
      )
      .orderBy(analyticsSnapshots.day),
    db
      .select({
        id: socialAccounts.id,
        name: socialAccounts.displayName,
        platform: socialAccounts.platform,
        followers: socialAccounts.followerCount,
      })
      .from(socialAccounts)
      .where(eq(socialAccounts.workspaceId, ws.id)),
    db
      .select({
        postId: posts.id,
        caption: posts.caption,
        platform: platformPosts.platform,
        permalink: platformPosts.permalink,
        impressions: postMetrics.impressions,
        likes: postMetrics.likes,
        comments: postMetrics.comments,
        engagementRate: postMetrics.engagementRate,
      })
      .from(postMetrics)
      .innerJoin(
        platformPosts,
        eq(platformPosts.id, postMetrics.platformPostId),
      )
      .innerJoin(posts, eq(posts.id, platformPosts.postId))
      .where(eq(posts.workspaceId, ws.id))
      .orderBy(desc(postMetrics.engagementRate))
      .limit(8),
  ]);

  // best-time-to-post heatmap: avg engagement rate by weekday × hour
  const perfRows = await db
    .select({
      publishedAt: platformPosts.publishedAt,
      engagementRate: postMetrics.engagementRate,
    })
    .from(postMetrics)
    .innerJoin(platformPosts, eq(platformPosts.id, postMetrics.platformPostId))
    .innerJoin(posts, eq(posts.id, platformPosts.postId))
    .where(
      and(eq(posts.workspaceId, ws.id), eq(platformPosts.status, "published")),
    );

  const buckets: { sum: number; n: number }[][] = Array.from(
    { length: 7 },
    () => Array.from({ length: 24 }, () => ({ sum: 0, n: 0 })),
  );
  for (const r of perfRows) {
    if (!r.publishedAt || r.engagementRate == null) continue;
    const d = new Date(r.publishedAt);
    const cell = buckets[d.getUTCDay()][d.getUTCHours()];
    cell.sum += r.engagementRate;
    cell.n += 1;
  }
  const heatmap = buckets.map((row) =>
    row.map((c) => (c.n > 0 ? c.sum / c.n : null)),
  );
  const heatmapSamples = perfRows.filter(
    (r) => r.publishedAt && r.engagementRate != null,
  ).length;

  // aggregate followers per day across accounts
  const followersByDay = new Map<string, number>();
  for (const s of snapshots) {
    followersByDay.set(
      s.day,
      (followersByDay.get(s.day) ?? 0) + (s.followers ?? 0),
    );
  }
  const followerSeries = [...followersByDay.entries()]
    .map(([day, followers]) => ({ day, followers }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const totalFollowers = accounts.reduce((s, a) => s + (a.followers ?? 0), 0);
  const firstFollowers = followerSeries[0]?.followers ?? totalFollowers;
  const followerDelta = totalFollowers - firstFollowers;

  return (
    <PageContainer>
      <PageHeader
        title="Analytics"
        description="Follower growth and post performance across every account."
      />
      <AnalyticsClient
        totalFollowers={totalFollowers}
        followerDelta={followerDelta}
        followerSeries={followerSeries}
        accounts={accounts.map((a) => ({ ...a, followers: a.followers ?? 0 }))}
        topPosts={topPosts.map((p) => ({
          ...p,
          engagementRate: p.engagementRate ?? 0,
          impressions: p.impressions ?? 0,
          likes: p.likes ?? 0,
          comments: p.comments ?? 0,
        }))}
        heatmap={heatmap}
        heatmapSamples={heatmapSamples}
      />
      {snapshots.length === 0 && (
        <p className="mt-4 text-xs text-[var(--text-ghost)]">
          Data appears after the hourly analytics job runs against connected
          accounts with published posts.
        </p>
      )}
    </PageContainer>
  );
}
