"use client";

import { Heart, MessageCircle, Repeat2, Send } from "lucide-react";
import type { Platform } from "@/lib/db/schema";

const LABEL: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
  telegram: "Telegram",
};

export function PlatformPreview({
  platform,
  accountName,
  avatarUrl,
  caption,
  mediaUrls,
}: {
  platform: Platform;
  accountName: string;
  avatarUrl?: string | null;
  caption: string;
  mediaUrls: { url: string; kind: "image" | "video" }[];
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-0)]">
      <div className="flex items-center gap-2 p-3">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="size-8 rounded-full object-cover"
          />
        ) : (
          <span className="flex size-8 items-center justify-center rounded-full bg-[var(--surface-3)] text-[10px] font-semibold uppercase">
            {accountName.slice(0, 2)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold">{accountName}</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">
            {LABEL[platform] ?? platform} · now
          </p>
        </div>
      </div>

      {caption && (
        <p className="px-3 pb-2 text-[13px] whitespace-pre-wrap text-[var(--text-primary)]">
          {caption}
        </p>
      )}

      {mediaUrls.length > 0 && (
        <div
          className={
            "grid gap-0.5 bg-[var(--border)] " +
            (mediaUrls.length === 1 ? "grid-cols-1" : "grid-cols-2")
          }
        >
          {mediaUrls.slice(0, 4).map((m, i) =>
            m.kind === "video" ? (
              <video
                key={i}
                src={m.url}
                className="aspect-square w-full bg-black object-cover"
                muted
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={m.url}
                alt=""
                className="aspect-square w-full object-cover"
              />
            ),
          )}
        </div>
      )}

      <div className="flex items-center gap-4 px-3 py-2 text-[var(--text-tertiary)]">
        <Heart className="size-4" />
        <MessageCircle className="size-4" />
        {platform !== "instagram" && <Repeat2 className="size-4" />}
        <Send className="ml-auto size-4" />
      </div>
    </div>
  );
}
