import "server-only";

import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mediaAssets } from "@/lib/db/schema";
import { createAdminClient } from "@/lib/supabase/server";
import { publicMediaUrl } from "@/lib/publish/render";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const MAX_BYTES = 500 * 1024 * 1024;

export type StoredMedia = {
  id: string;
  kind: "image" | "video";
  url: string;
  fileName: string;
  width: number | null;
  height: number | null;
};

export async function storeMedia(input: {
  workspaceId: string;
  userId: string;
  file: File;
}): Promise<StoredMedia> {
  const { file, workspaceId, userId } = input;
  if (file.size > MAX_BYTES) throw new Error("File is larger than 500 MB");

  const isImage = IMAGE_TYPES.has(file.type);
  const isVideo = VIDEO_TYPES.has(file.type);
  if (!isImage && !isVideo)
    throw new Error(`Unsupported file type: ${file.type}`);

  const buf = Buffer.from(await file.arrayBuffer());
  let width: number | null = null;
  let height: number | null = null;
  if (isImage && file.type !== "image/gif") {
    try {
      const meta = await sharp(buf).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;
    } catch {
      /* non-fatal */
    }
  }

  const ext = extFor(file.type, file.name);
  const key = `${workspaceId}/${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;

  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from("media")
    .upload(key, buf, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  const [row] = await db
    .insert(mediaAssets)
    .values({
      workspaceId,
      kind: isImage ? "image" : "video",
      storagePath: key,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      width,
      height,
      uploadedByUserId: userId,
    })
    .returning();

  return {
    id: row.id,
    kind: row.kind as "image" | "video",
    url: publicMediaUrl(key),
    fileName: row.fileName,
    width: row.width,
    height: row.height,
  };
}

export async function deleteMedia(workspaceId: string, assetId: string) {
  const [row] = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, assetId))
    .limit(1);
  if (!row || row.workspaceId !== workspaceId) return;
  const supabase = createAdminClient();
  await supabase.storage.from("media").remove([row.storagePath]);
  await db.delete(mediaAssets).where(eq(mediaAssets.id, assetId));
}

function extFor(mime: string, name: string): string {
  const fromName = name.split(".").pop();
  if (fromName && fromName.length <= 4) return fromName.toLowerCase();
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
  };
  return map[mime] ?? "bin";
}
