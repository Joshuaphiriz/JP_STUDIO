import { CAPABILITIES } from "@/lib/platforms/capabilities";
import { apiFetch, ProviderHttpError } from "./http";
import type {
  ProviderProfile,
  PublishContent,
  PublishResult,
  SocialProvider,
  TokenSet,
} from "./types";

const AUTH = "https://www.tiktok.com/v2/auth/authorize/";
const API = "https://open.tiktokapis.com/v2";

/**
 * TikTok provider — video publishing via the Content Posting API (direct post).
 * PKCE is required. Note TikTok uses a "Client Key" rather than a client id, and
 * rejects redirect URIs containing brand names (we use `/api/oauth/tiktok/...`).
 */
export class TikTokProvider implements SocialProvider {
  readonly platform = "tiktok" as const;
  readonly capabilities = CAPABILITIES.tiktok;
  readonly usesPkce = true;

  constructor(
    private readonly clientKey: string,
    private readonly clientSecret: string,
  ) {}

  getAuthUrl({
    redirectUri,
    state,
    codeChallenge,
    scopes,
  }: {
    redirectUri: string;
    state: string;
    codeChallenge?: string;
    scopes?: string[];
  }): string {
    const p = new URLSearchParams({
      client_key: this.clientKey,
      response_type: "code",
      scope: (scopes ?? this.capabilities.scopes).join(","),
      redirect_uri: redirectUri,
      state,
    });
    if (codeChallenge) {
      p.set("code_challenge", codeChallenge);
      p.set("code_challenge_method", "S256");
    }
    return `${AUTH}?${p.toString()}`;
  }

  async exchangeCode({
    code,
    redirectUri,
    codeVerifier,
  }: {
    code: string;
    redirectUri: string;
    codeVerifier?: string;
  }): Promise<TokenSet> {
    const data = await apiFetch<TikTokToken>(`${API}/oauth/token/`, {
      method: "POST",
      form: {
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
      },
    });
    return this.toTokenSet(data);
  }

  async refreshToken(refreshToken: string): Promise<TokenSet> {
    const data = await apiFetch<TikTokToken>(`${API}/oauth/token/`, {
      method: "POST",
      form: {
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      },
    });
    return this.toTokenSet(data);
  }

  async listProfiles(token: TokenSet): Promise<ProviderProfile[]> {
    const res = await apiFetch<{
      data: {
        user: {
          open_id: string;
          union_id?: string;
          display_name?: string;
          avatar_url?: string;
        };
      };
    }>(`${API}/user/info/?fields=open_id,union_id,display_name,avatar_url`, {
      headers: { authorization: `Bearer ${token.accessToken}` },
    });
    const u = res.data.user;
    return [
      {
        externalId: u.open_id,
        displayName: u.display_name ?? "TikTok",
        avatarUrl: u.avatar_url,
        meta: { unionId: u.union_id },
      },
    ];
  }

  async publish(
    token: TokenSet,
    _profile: ProviderProfile,
    content: PublishContent,
  ): Promise<PublishResult> {
    const video = content.media.find((m) => m.kind === "video");
    if (!video) {
      return {
        ok: false,
        error: { message: "TikTok requires a video", retryable: false },
      };
    }
    try {
      const init = await apiFetch<{
        data: { publish_id: string };
        error?: { code: string; message: string };
      }>(`${API}/post/publish/video/init/`, {
        method: "POST",
        headers: { authorization: `Bearer ${token.accessToken}` },
        body: {
          post_info: {
            title: content.caption.slice(0, 2200),
            privacy_level:
              (content.options?.privacyLevel as string) ?? "SELF_ONLY",
            disable_comment: content.options?.disableComment ?? false,
            disable_duet: content.options?.disableDuet ?? false,
            disable_stitch: content.options?.disableStitch ?? false,
          },
          source_info: {
            source: "PULL_FROM_URL",
            video_url: video.url,
          },
        },
      });
      if (init.error && init.error.code !== "ok") {
        return {
          ok: false,
          error: {
            message: init.error.message,
            retryable: false,
            code: init.error.code,
          },
        };
      }
      const publishId = init.data.publish_id;
      const status = await this.pollStatus(token.accessToken, publishId);
      return {
        ok: status.ok,
        externalPostId: status.postId ?? publishId,
        error: status.ok
          ? undefined
          : {
              message: status.reason ?? "TikTok publish failed",
              retryable: false,
            },
      };
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

  private async pollStatus(accessToken: string, publishId: string) {
    for (let i = 0; i < 30; i++) {
      const res = await apiFetch<{
        data: {
          status: string;
          publicaly_available_post_id?: string[];
          fail_reason?: string;
        };
      }>(`${API}/post/publish/status/fetch/`, {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken}` },
        body: { publish_id: publishId },
      });
      const s = res.data.status;
      if (s === "PUBLISH_COMPLETE") {
        return { ok: true, postId: res.data.publicaly_available_post_id?.[0] };
      }
      if (s === "FAILED") {
        return { ok: false, reason: res.data.fail_reason };
      }
      await new Promise((r) => setTimeout(r, 4000));
    }
    return {
      ok: false,
      reason: "Timed out waiting for TikTok to process the video",
    };
  }

  async checkHealth(token: TokenSet) {
    try {
      await apiFetch(`${API}/user/info/?fields=open_id`, {
        headers: { authorization: `Bearer ${token.accessToken}` },
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: (err as Error).message };
    }
  }

  private toTokenSet(data: TikTokToken): TokenSet {
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      refreshExpiresAt: data.refresh_expires_in
        ? new Date(Date.now() + data.refresh_expires_in * 1000)
        : undefined,
      scopes: data.scope?.split(","),
      extra: { openId: data.open_id },
    };
  }
}

type TikTokToken = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in?: number;
  scope?: string;
  open_id: string;
};
