import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import {
  analyticsSnapshots,
  auditLog,
  mediaAssets,
  platformPosts,
  postMetrics,
  posts,
  socialAccounts,
} from "@/lib/db/schema";
import { publicMediaUrl } from "@/lib/publish/render";
import { storeMedia } from "@/lib/media/store";
import { publishDuePosts } from "@/lib/publish/run";
import { ApiError, type ApiContext } from "./auth";

export async function listAccounts(ctx: ApiContext) {
  const rows = await db
    .select({
      id: socialAccounts.id,
      platform: socialAccounts.platform,
      name: socialAccounts.displayName,
      handle: socialAccounts.handle,
      status: socialAccounts.status,
      followers: socialAccounts.followerCount,
    })
    .from(socialAccounts)
    .where(eq(socialAccounts.workspaceId, ctx.workspaceId));
  return rows;
}

const createSchema = z.object({
  caption: z.string().max(64000).default(""),
  account_ids: z.array(z.string().uuid()).min(1),
  media_urls: z.array(z.string().url()).max(20).optional(),
  first_comment: z.string().max(4000).optional(),
  scheduled_at: z.string().datetime().optional(),
  publish: z.boolean().optional(),
});

export async function createPost(ctx: ApiContext, input: unknown) {
  const body = createSchema.parse(input);

  const accounts = await db
    .select({ id: socialAccounts.id, platform: socialAccounts.platform })
    .from(socialAccounts)
    .where(
      and(
        eq(socialAccounts.workspaceId, ctx.workspaceId),
        inArray(socialAccounts.id, body.account_ids),
      ),
    );
  if (accounts.length !== body.account_ids.length) {
    throw new ApiError(
      400,
      "One or more account_ids are not in this workspace",
    );
  }

  // pull media_urls into the library
  const mediaIds: string[] = [];
  for (const url of body.media_urls ?? []) {
    const res = await fetch(url);
    if (!res.ok) throw new ApiError(400, `Could not fetch media: ${url}`);
    const blob = await res.blob();
    const name = url.split("/").pop() ?? "upload";
    const file = new File([blob], name, {
      type: res.headers.get("content-type") ?? blob.type,
    });
    const stored = await storeMedia({
      workspaceId: ctx.workspaceId,
      userId: ctx.keyId,
      file,
    });
    mediaIds.push(stored.id);
  }

  const scheduledAt = body.publish
    ? new Date()
    : body.scheduled_at
      ? new Date(body.scheduled_at)
      : null;
  const status = scheduledAt ? "scheduled" : "draft";

  const [post] = await db
    .insert(posts)
    .values({
      workspaceId: ctx.workspaceId,
      caption: body.caption,
      mediaIds,
      firstComment: body.first_comment ?? null,
      scheduledAt,
      status,
    })
    .returning();

  await db.insert(platformPosts).values(
    accounts.map((a) => ({
      postId: post.id,
      socialAccountId: a.id,
      platform: a.platform,
      status: (status === "scheduled" ? "scheduled" : "draft") as
        "scheduled" | "draft",
    })),
  );

  await db.insert(auditLog).values({
    organizationId: ctx.organizationId,
    workspaceId: ctx.workspaceId,
    action: "api.post.created",
    targetType: "post",
    targetId: post.id,
    meta: { keyId: ctx.keyId },
  });

  if (body.publish) await publishDuePosts().catch(() => {});

  return serializePost(post.id, ctx);
}

export async function schedulePost(
  ctx: ApiContext,
  postId: string,
  scheduledAt: string,
) {
  const when = new Date(scheduledAt);
  if (Number.isNaN(when.getTime()))
    throw new ApiError(400, "Invalid scheduled_at");
  const [post] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.workspaceId, ctx.workspaceId)))
    .limit(1);
  if (!post) throw new ApiError(404, "Post not found");

  await db
    .update(posts)
    .set({ scheduledAt: when, status: "scheduled", updatedAt: new Date() })
    .where(eq(posts.id, postId));
  await db
    .update(platformPosts)
    .set({ status: "scheduled" })
    .where(eq(platformPosts.postId, postId));

  return serializePost(postId, ctx);
}

export async function getPost(ctx: ApiContext, postId: string) {
  const [post] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.workspaceId, ctx.workspaceId)))
    .limit(1);
  if (!post) throw new ApiError(404, "Post not found");
  return serializePost(postId, ctx);
}

export async function listPosts(ctx: ApiContext, status?: string) {
  const rows = await db
    .select({
      id: posts.id,
      status: posts.status,
      caption: posts.caption,
      scheduledAt: posts.scheduledAt,
      publishedAt: posts.publishedAt,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(
      status
        ? and(
            eq(posts.workspaceId, ctx.workspaceId),
            eq(
              posts.status,
              status as (typeof posts.status.enumValues)[number],
            ),
          )
        : eq(posts.workspaceId, ctx.workspaceId),
    )
    .orderBy(desc(posts.createdAt))
    .limit(50);
  return rows;
}

async function serializePost(postId: string, _ctx: ApiContext) {
  const [post] = await db
    .select()
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  const pps = await db
    .select()
    .from(platformPosts)
    .where(eq(platformPosts.postId, postId));
  const media = post.mediaIds.length
    ? await db
        .select()
        .from(mediaAssets)
        .where(inArray(mediaAssets.id, post.mediaIds))
    : [];
  return {
    id: post.id,
    status: post.status,
    caption: post.caption,
    first_comment: post.firstComment,
    scheduled_at: post.scheduledAt?.toISOString() ?? null,
    published_at: post.publishedAt?.toISOString() ?? null,
    media: media.map((m) => ({
      id: m.id,
      url: publicMediaUrl(m.storagePath),
      kind: m.kind,
    })),
    targets: pps.map((p) => ({
      account_id: p.socialAccountId,
      platform: p.platform,
      status: p.status,
      external_post_id: p.externalPostId,
      permalink: p.permalink,
      error: p.lastError,
    })),
  };
}

export async function accountAnalytics(ctx: ApiContext, accountId: string) {
  const [account] = await db
    .select({ id: socialAccounts.id, name: socialAccounts.displayName })
    .from(socialAccounts)
    .where(
      and(
        eq(socialAccounts.id, accountId),
        eq(socialAccounts.workspaceId, ctx.workspaceId),
      ),
    )
    .limit(1);
  if (!account) throw new ApiError(404, "Account not found");

  const snapshots = await db
    .select({
      day: analyticsSnapshots.day,
      followers: analyticsSnapshots.followers,
      impressions: analyticsSnapshots.impressions,
      reach: analyticsSnapshots.reach,
    })
    .from(analyticsSnapshots)
    .where(eq(analyticsSnapshots.socialAccountId, accountId))
    .orderBy(analyticsSnapshots.day);

  const metrics = await db
    .select({
      platformPostId: postMetrics.platformPostId,
      impressions: postMetrics.impressions,
      likes: postMetrics.likes,
      comments: postMetrics.comments,
      engagementRate: postMetrics.engagementRate,
    })
    .from(postMetrics)
    .innerJoin(platformPosts, eq(platformPosts.id, postMetrics.platformPostId))
    .where(eq(platformPosts.socialAccountId, accountId))
    .orderBy(desc(postMetrics.engagementRate))
    .limit(10);

  return { account: account.name, snapshots, top_posts: metrics };
}
