import type { PlatformKey } from "@/lib/platforms/catalog";

/** OAuth token material returned by a provider after code exchange / refresh. */
export type TokenSet = {
  accessToken: string;
  refreshToken?: string;
  /** absolute expiry of the access token */
  expiresAt?: Date;
  /** absolute expiry of the refresh token, when the platform issues one */
  refreshExpiresAt?: Date;
  scopes?: string[];
  /** platform-specific extras kept encrypted (e.g. Meta page tokens, open_id) */
  extra?: Record<string, unknown>;
};

/** A connectable account discovered during / after OAuth. */
export type ProviderProfile = {
  externalId: string;
  displayName: string;
  handle?: string;
  avatarUrl?: string;
  followerCount?: number;
  /** for Meta: the owning Page id for an IG account */
  parentExternalId?: string;
  meta?: Record<string, unknown>;
};

export type MediaKind = "image" | "video";

export type MediaInput = {
  kind: MediaKind;
  /** publicly reachable URL the platform can fetch, or a data ref the caller resolves */
  url: string;
  mimeType?: string;
  altText?: string;
  durationSec?: number;
  width?: number;
  height?: number;
};

/** Normalised, per-platform-resolved content the publisher hands to a provider. */
export type PublishContent = {
  /** already merged with any per-platform override */
  caption: string;
  media: MediaInput[];
  /** posted shortly after the main post, where supported */
  firstComment?: string;
  /** platform-specific options (privacy level, title, visibility, board id, …) */
  options?: Record<string, unknown>;
  /** idempotency hint for retries */
  idempotencyKey?: string;
};

export type PublishResult = {
  ok: boolean;
  externalPostId?: string;
  permalink?: string;
  /** provider-classified failure so the queue can decide on retry */
  error?: { message: string; retryable: boolean; code?: string };
  raw?: unknown;
};

export type PostMetrics = {
  impressions?: number;
  reach?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  clicks?: number;
  videoViews?: number;
  watchTimeSec?: number;
  collectedAt: Date;
  raw?: unknown;
};

export type InboundMessageType = "comment" | "mention" | "dm" | "review";

export type InboundMessage = {
  platformMessageId: string;
  type: InboundMessageType;
  threadId?: string;
  parentId?: string;
  authorName?: string;
  authorHandle?: string;
  authorExternalId?: string;
  body: string;
  permalink?: string;
  createdAt: Date;
  /** id of the post the comment/mention is on, when known */
  targetExternalPostId?: string;
  raw?: unknown;
};

export type ReplyResult = {
  ok: boolean;
  externalId?: string;
  error?: { message: string; retryable: boolean };
};

/** Static declaration of what a platform can do — drives composer + validation UI. */
export type PlatformCapabilities = {
  platform: PlatformKey;
  captionMax: number;
  media: {
    image: boolean;
    video: boolean;
    /** max items in a carousel/gallery; 1 = no carousel */
    maxItems: number;
    videoMaxSec?: number;
    videoMinSec?: number;
  };
  supportsFirstComment: boolean;
  supportsScheduling: "native" | "internal";
  publish: boolean;
  comments: boolean;
  mentions: boolean;
  dms: boolean;
  analytics: boolean;
  /** OAuth scopes JP Studio requests */
  scopes: string[];
  /** whether the platform requires an approved app for production */
  needsAppReview: boolean;
  notes?: string;
};

export interface SocialProvider {
  readonly platform: PlatformKey;
  readonly capabilities: PlatformCapabilities;

  /** Build the authorization URL. `pkce` returns a verifier to persist with the state. */
  getAuthUrl(input: {
    redirectUri: string;
    state: string;
    codeChallenge?: string;
    scopes?: string[];
  }): string;

  /** Whether this provider uses PKCE (verifier must be generated + stored). */
  readonly usesPkce: boolean;

  exchangeCode(input: {
    code: string;
    redirectUri: string;
    codeVerifier?: string;
  }): Promise<TokenSet>;

  refreshToken?(refreshToken: string): Promise<TokenSet>;

  /** Accounts the granted token can act on (often just one). */
  listProfiles(token: TokenSet): Promise<ProviderProfile[]>;

  publish(
    token: TokenSet,
    profile: ProviderProfile,
    content: PublishContent,
  ): Promise<PublishResult>;

  getPostMetrics?(
    token: TokenSet,
    profile: ProviderProfile,
    externalPostId: string,
  ): Promise<PostMetrics>;

  getMessages?(
    token: TokenSet,
    profile: ProviderProfile,
    since: Date,
  ): Promise<InboundMessage[]>;

  replyToMessage?(
    token: TokenSet,
    profile: ProviderProfile,
    message: { platformMessageId: string; threadId?: string },
    text: string,
  ): Promise<ReplyResult>;

  /** Lightweight liveness check for the health-check job. */
  checkHealth(
    token: TokenSet,
    profile: ProviderProfile,
  ): Promise<{ ok: boolean; reason?: string }>;
}
