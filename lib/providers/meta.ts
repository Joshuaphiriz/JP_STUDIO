import { CAPABILITIES } from "@/lib/platforms/capabilities";
import { apiFetch, ProviderHttpError } from "./http";
import type {
  InboundMessage,
  PostMetrics,
  ProviderProfile,
  PublishContent,
  PublishResult,
  ReplyResult,
  SocialProvider,
  TokenSet,
} from "./types";

const GRAPH = "https://graph.facebook.com/v21.0";
const OAUTH_DIALOG = "https://www.facebook.com/v21.0/dialog/oauth";

type MetaKind = "facebook" | "instagram";

/**
 * Meta provider covering Facebook Pages and Instagram (Graph API, business
 * accounts linked to a Page). One OAuth grant yields both; `listProfiles`
 * returns a profile per Page and per linked IG account.
 */
export class MetaProvider implements SocialProvider {
  readonly usesPkce = false;

  constructor(
    readonly platform: MetaKind,
    private readonly appId: string,
    private readonly appSecret: string,
  ) {}

  get capabilities() {
    return CAPABILITIES[this.platform];
  }

  getAuthUrl({
    redirectUri,
    state,
    scopes,
  }: {
    redirectUri: string;
    state: string;
    scopes?: string[];
  }): string {
    // Request the union of FB + IG scopes so a single grant serves both.
    const all = new Set([
      ...CAPABILITIES.facebook.scopes,
      ...CAPABILITIES.instagram.scopes,
      ...(scopes ?? []),
    ]);
    const p = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: redirectUri,
      state,
      response_type: "code",
      scope: [...all].join(","),
    });
    return `${OAUTH_DIALOG}?${p.toString()}`;
  }

  async exchangeCode({
    code,
    redirectUri,
  }: {
    code: string;
    redirectUri: string;
  }): Promise<TokenSet> {
    const short = await apiFetch<{ access_token: string; expires_in?: number }>(
      `${GRAPH}/oauth/access_token?` +
        new URLSearchParams({
          client_id: this.appId,
          client_secret: this.appSecret,
          redirect_uri: redirectUri,
          code,
        }),
    );
    // Upgrade to a long-lived (~60 day) user token.
    const long = await apiFetch<{ access_token: string; expires_in?: number }>(
      `${GRAPH}/oauth/access_token?` +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: this.appId,
          client_secret: this.appSecret,
          fb_exchange_token: short.access_token,
        }),
    );
    return {
      accessToken: long.access_token,
      expiresAt: long.expires_in
        ? new Date(Date.now() + long.expires_in * 1000)
        : undefined,
    };
  }

  /** Page tokens are long-lived and effectively non-expiring; nothing to refresh. */

  async listProfiles(token: TokenSet): Promise<ProviderProfile[]> {
    const pages = await apiFetch<{
      data: Array<{
        id: string;
        name: string;
        access_token: string;
        followers_count?: number;
        picture?: { data?: { url?: string } };
        instagram_business_account?: { id: string };
      }>;
    }>(
      `${GRAPH}/me/accounts?` +
        new URLSearchParams({
          fields:
            "id,name,access_token,followers_count,picture{url},instagram_business_account",
          access_token: token.accessToken,
        }),
    );

    const out: ProviderProfile[] = [];
    for (const page of pages.data) {
      if (this.platform === "facebook") {
        out.push({
          externalId: page.id,
          displayName: page.name,
          avatarUrl: page.picture?.data?.url,
          followerCount: page.followers_count,
          meta: { pageAccessToken: page.access_token, kind: "page" },
        });
      } else if (page.instagram_business_account) {
        const ig = await apiFetch<{
          id: string;
          username: string;
          name?: string;
          followers_count?: number;
          profile_picture_url?: string;
        }>(
          `${GRAPH}/${page.instagram_business_account.id}?` +
            new URLSearchParams({
              fields: "id,username,name,followers_count,profile_picture_url",
              access_token: page.access_token,
            }),
        );
        out.push({
          externalId: ig.id,
          parentExternalId: page.id,
          displayName: ig.name ?? ig.username,
          handle: `@${ig.username}`,
          avatarUrl: ig.profile_picture_url,
          followerCount: ig.followers_count,
          meta: { pageAccessToken: page.access_token, kind: "ig" },
        });
      }
    }
    return out;
  }

  async publish(
    token: TokenSet,
    profile: ProviderProfile,
    content: PublishContent,
  ): Promise<PublishResult> {
    const pageToken =
      (profile.meta?.pageAccessToken as string) ?? token.accessToken;
    try {
      const result =
        this.platform === "facebook"
          ? await this.publishFacebook(profile.externalId, pageToken, content)
          : await this.publishInstagram(profile.externalId, pageToken, content);

      if (result.ok && content.firstComment && result.externalPostId) {
        await this.comment(
          result.externalPostId,
          pageToken,
          content.firstComment,
        ).catch(() => {});
      }
      return result;
    } catch (err) {
      return {
        ok: false,
        error: {
          message: (err as Error).message,
          retryable: err instanceof ProviderHttpError ? err.retryable : true,
        },
      };
    }
  }

  private async publishFacebook(
    pageId: string,
    pageToken: string,
    content: PublishContent,
  ): Promise<PublishResult> {
    const images = content.media.filter((m) => m.kind === "image");
    const videos = content.media.filter((m) => m.kind === "video");

    if (videos.length === 1 && images.length === 0) {
      const res = await apiFetch<{ id: string; post_id?: string }>(
        `${GRAPH}/${pageId}/videos`,
        {
          method: "POST",
          body: {
            file_url: videos[0].url,
            description: content.caption,
            access_token: pageToken,
          },
        },
      );
      return { ok: true, externalPostId: res.post_id ?? res.id };
    }

    if (images.length === 0) {
      const res = await apiFetch<{ id: string }>(`${GRAPH}/${pageId}/feed`, {
        method: "POST",
        body: { message: content.caption, access_token: pageToken },
      });
      return { ok: true, externalPostId: res.id, permalink: postUrl(res.id) };
    }

    if (images.length === 1) {
      const res = await apiFetch<{ id: string; post_id?: string }>(
        `${GRAPH}/${pageId}/photos`,
        {
          method: "POST",
          body: {
            url: images[0].url,
            caption: content.caption,
            access_token: pageToken,
          },
        },
      );
      return { ok: true, externalPostId: res.post_id ?? res.id };
    }

    // multi-photo: upload unpublished, then attach
    const mediaFbids: { media_fbid: string }[] = [];
    for (const img of images.slice(0, 10)) {
      const up = await apiFetch<{ id: string }>(`${GRAPH}/${pageId}/photos`, {
        method: "POST",
        body: { url: img.url, published: false, access_token: pageToken },
      });
      mediaFbids.push({ media_fbid: up.id });
    }
    const res = await apiFetch<{ id: string }>(`${GRAPH}/${pageId}/feed`, {
      method: "POST",
      body: {
        message: content.caption,
        attached_media: mediaFbids,
        access_token: pageToken,
      },
    });
    return { ok: true, externalPostId: res.id, permalink: postUrl(res.id) };
  }

  private async publishInstagram(
    igId: string,
    pageToken: string,
    content: PublishContent,
  ): Promise<PublishResult> {
    const items = content.media;
    if (items.length === 0) {
      return {
        ok: false,
        error: {
          message: "Instagram requires at least one image or video",
          retryable: false,
        },
      };
    }

    const createContainer = (params: Record<string, string>) =>
      apiFetch<{ id: string }>(`${GRAPH}/${igId}/media`, {
        method: "POST",
        body: { ...params, access_token: pageToken },
      });

    let containerId: string;

    if (items.length === 1) {
      const m = items[0];
      containerId = (
        await createContainer(
          m.kind === "video"
            ? {
                media_type: "REELS",
                video_url: m.url,
                caption: content.caption,
              }
            : { image_url: m.url, caption: content.caption },
        )
      ).id;
    } else {
      const children: string[] = [];
      for (const m of items.slice(0, 20)) {
        const child = await createContainer(
          m.kind === "video"
            ? {
                media_type: "VIDEO",
                video_url: m.url,
                is_carousel_item: "true",
              }
            : { image_url: m.url, is_carousel_item: "true" },
        );
        children.push(child.id);
      }
      containerId = (
        await createContainer({
          media_type: "CAROUSEL",
          children: children.join(","),
          caption: content.caption,
        })
      ).id;
    }

    await this.waitForContainer(containerId, pageToken);

    const publish = await apiFetch<{ id: string }>(
      `${GRAPH}/${igId}/media_publish`,
      {
        method: "POST",
        body: { creation_id: containerId, access_token: pageToken },
      },
    );
    return { ok: true, externalPostId: publish.id };
  }

  private async waitForContainer(containerId: string, token: string) {
    for (let i = 0; i < 20; i++) {
      const s = await apiFetch<{ status_code: string }>(
        `${GRAPH}/${containerId}?` +
          new URLSearchParams({ fields: "status_code", access_token: token }),
      );
      if (s.status_code === "FINISHED") return;
      if (s.status_code === "ERROR" || s.status_code === "EXPIRED") {
        throw new Error(`Instagram media container ${s.status_code}`);
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    throw new Error("Instagram media container timed out");
  }

  private comment(objectId: string, token: string, message: string) {
    return apiFetch(`${GRAPH}/${objectId}/comments`, {
      method: "POST",
      body: { message, access_token: token },
    });
  }

  async getPostMetrics(
    _token: TokenSet,
    profile: ProviderProfile,
    externalPostId: string,
  ): Promise<PostMetrics> {
    const token = profile.meta?.pageAccessToken as string;
    const metric =
      this.platform === "facebook"
        ? "post_impressions,post_engaged_users,post_reactions_by_type_total"
        : "impressions,reach,likes,comments,saved,shares";
    const res = await apiFetch<{
      data: Array<{ name: string; values: Array<{ value: unknown }> }>;
    }>(
      `${GRAPH}/${externalPostId}/insights?` +
        new URLSearchParams({ metric, access_token: token }),
    );
    const map: Record<string, number> = {};
    for (const d of res.data) {
      const v = d.values[0]?.value;
      map[d.name] = typeof v === "number" ? v : 0;
    }
    return {
      impressions: map.post_impressions ?? map.impressions,
      reach: map.reach,
      likes: map.likes,
      comments: map.comments,
      shares: map.shares,
      saves: map.saved,
      collectedAt: new Date(),
      raw: res,
    };
  }

  async getMessages(
    _token: TokenSet,
    profile: ProviderProfile,
    since: Date,
  ): Promise<InboundMessage[]> {
    const token = profile.meta?.pageAccessToken as string;
    if (this.platform !== "facebook") return [];
    const res = await apiFetch<{
      data: Array<{
        id: string;
        message: string;
        from?: { name?: string; id?: string };
        created_time: string;
        permalink_url?: string;
      }>;
    }>(
      `${GRAPH}/${profile.externalId}/feed?` +
        new URLSearchParams({
          fields: "comments{id,message,from,created_time,permalink_url}",
          since: String(Math.floor(since.getTime() / 1000)),
          access_token: token,
        }),
    );
    return (res.data ?? []).flatMap((post) =>
      (
        (post as unknown as { comments?: { data?: unknown[] } }).comments
          ?.data ?? []
      ).map((c) => {
        const cc = c as {
          id: string;
          message: string;
          from?: { name?: string; id?: string };
          created_time: string;
          permalink_url?: string;
        };
        return {
          platformMessageId: cc.id,
          type: "comment" as const,
          authorName: cc.from?.name,
          authorExternalId: cc.from?.id,
          body: cc.message,
          permalink: cc.permalink_url,
          createdAt: new Date(cc.created_time),
          targetExternalPostId: post.id,
        };
      }),
    );
  }

  async replyToMessage(
    _token: TokenSet,
    profile: ProviderProfile,
    message: { platformMessageId: string },
    text: string,
  ): Promise<ReplyResult> {
    const token = profile.meta?.pageAccessToken as string;
    try {
      const res = await apiFetch<{ id: string }>(
        `${GRAPH}/${message.platformMessageId}/comments`,
        { method: "POST", body: { message: text, access_token: token } },
      );
      return { ok: true, externalId: res.id };
    } catch (err) {
      return {
        ok: false,
        error: {
          message: (err as Error).message,
          retryable: err instanceof ProviderHttpError ? err.retryable : true,
        },
      };
    }
  }

  async checkHealth(token: TokenSet, profile: ProviderProfile) {
    try {
      const t = (profile.meta?.pageAccessToken as string) ?? token.accessToken;
      await apiFetch(
        `${GRAPH}/${profile.externalId}?` +
          new URLSearchParams({ fields: "id", access_token: t }),
      );
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: (err as Error).message };
    }
  }
}

function postUrl(id: string) {
  return `https://www.facebook.com/${id}`;
}
