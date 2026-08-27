/** Display catalog for platforms JP Studio targets. Capability wiring lands in Phase 1. */
export type PlatformKey =
  "facebook" | "instagram" | "linkedin" | "tiktok" | "youtube" | "telegram";

export type PlatformInfo = {
  key: PlatformKey;
  name: string;
  blurb: string;
  /** whether the OAuth/connect flow is implemented yet */
  connectReady: boolean;
  needsReview: boolean;
};

export const PLATFORM_CATALOG: PlatformInfo[] = [
  {
    key: "facebook",
    name: "Facebook Pages",
    blurb: "Posts, videos, carousels, stories, comments, and Page messages.",
    connectReady: false,
    needsReview: true,
  },
  {
    key: "instagram",
    name: "Instagram",
    blurb: "Feed, Reels, Stories, carousels, comments, and DMs (business).",
    connectReady: false,
    needsReview: true,
  },
  {
    key: "linkedin",
    name: "LinkedIn",
    blurb: "Profile and company posts, articles, documents, and polls.",
    connectReady: false,
    needsReview: true,
  },
  {
    key: "tiktok",
    name: "TikTok",
    blurb: "Video publishing and read-only analytics.",
    connectReady: false,
    needsReview: true,
  },
  {
    key: "youtube",
    name: "YouTube",
    blurb: "Video and Shorts uploads with full metadata, plus comments.",
    connectReady: false,
    needsReview: true,
  },
  {
    key: "telegram",
    name: "Telegram",
    blurb: "Channel posts via a bot. No platform review required.",
    connectReady: false,
    needsReview: false,
  },
];
