import "server-only";

import { inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mediaAssets } from "@/lib/db/schema";
import type { MediaInput, PublishContent } from "@/lib/providers/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export function publicMediaUrl(storagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/media/${storagePath}`;
}

type PlatformPostLike = {
  captionOverride: string | null;
  mediaIdsOverride: string[] | null;
  firstCommentOverride: string | null;
  options: Record<string, unknown> | null;
};

type PostLike = {
  id: string;
  caption: string;
  mediaIds: string[];
  firstComment: string | null;
};

/** Merge a base post with a platform override into the payload a provider takes. */
export async function renderPublishContent(
  post: PostLike,
  pp: PlatformPostLike,
): Promise<PublishContent> {
  const mediaIds = pp.mediaIdsOverride ?? post.mediaIds ?? [];
  const media = await resolveMedia(mediaIds);
  return {
    caption: pp.captionOverride ?? post.caption,
    media,
    firstComment: pp.firstCommentOverride ?? post.firstComment ?? undefined,
    options: pp.options ?? undefined,
    idempotencyKey: `post:${post.id}`,
  };
}

async function resolveMedia(ids: string[]): Promise<MediaInput[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(mediaAssets)
    .where(inArray(mediaAssets.id, ids));
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is (typeof rows)[number] => Boolean(r))
    .map((r) => ({
      kind: r.kind as "image" | "video",
      url: publicMediaUrl(r.storagePath),
      mimeType: r.mimeType,
      altText: r.altText ?? undefined,
      durationSec: r.durationSec ?? undefined,
      width: r.width ?? undefined,
      height: r.height ?? undefined,
    }));
}
