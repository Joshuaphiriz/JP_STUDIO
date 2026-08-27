import { CAPABILITIES } from "@/lib/platforms/capabilities";
import { apiFetch, ProviderHttpError } from "./http";
import type {
  ProviderProfile,
  PublishContent,
  PublishResult,
  SocialProvider,
  TokenSet,
} from "./types";

const AUTH = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN = "https://www.linkedin.com/oauth/v2/accessToken";
const REST = "https://api.linkedin.com/rest";
const VERSION = "202506";

/**
 * LinkedIn provider — personal member posting via `w_member_social`.
 * Company Page posting and inbox require the Community Management API (separate
 * partner review); those paths are stubbed with a clear error for now.
 */
export class LinkedInProvider implements SocialProvider {
  readonly platform = "linkedin" as const;
  readonly capabilities = CAPABILITIES.linkedin;
  readonly usesPkce = true;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  getAuthUrl({
    redirectUri,
    state,
    scopes,
  }: {
    redirectUri: string;
    state: string;
    codeChallenge?: string;
    scopes?: string[];
  }): string {
    const p = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: redirectUri,
      state,
      scope: (scopes ?? this.capabilities.scopes).join(" "),
    });
    return `${AUTH}?${p.toString()}`;
  }

  async exchangeCode({
    code,
    redirectUri,
  }: {
    code: string;
    redirectUri: string;
  }): Promise<TokenSet> {
    const data = await apiFetch<{
      access_token: string;
      expires_in: number;
      refresh_token?: string;
      refresh_token_expires_in?: number;
      scope?: string;
    }>(TOKEN, {
      method: "POST",
      form: {
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      },
    });
    return this.toTokenSet(data);
  }

  async refreshToken(refreshToken: string): Promise<TokenSet> {
    const data = await apiFetch<{
      access_token: string;
      expires_in: number;
      refresh_token?: string;
      refresh_token_expires_in?: number;
      scope?: string;
    }>(TOKEN, {
      method: "POST",
      form: {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      },
    });
    return this.toTokenSet(data);
  }

  async listProfiles(token: TokenSet): Promise<ProviderProfile[]> {
    const me = await apiFetch<{
      sub: string;
      name: string;
      picture?: string;
      email?: string;
    }>("https://api.linkedin.com/v2/userinfo", {
      headers: { authorization: `Bearer ${token.accessToken}` },
    });
    return [
      {
        externalId: me.sub,
        displayName: me.name,
        avatarUrl: me.picture,
        meta: { authorUrn: `urn:li:person:${me.sub}`, kind: "member" },
      },
    ];
  }

  async publish(
    token: TokenSet,
    profile: ProviderProfile,
    content: PublishContent,
  ): Promise<PublishResult> {
    const author =
      (profile.meta?.authorUrn as string) ??
      `urn:li:person:${profile.externalId}`;
    try {
      let mediaUrn: string | undefined;
      const firstImage = content.media.find((m) => m.kind === "image");
      if (firstImage) {
        mediaUrn = await this.uploadImage(
          token.accessToken,
          author,
          firstImage.url,
        );
      }
      if (content.media.some((m) => m.kind === "video")) {
        return {
          ok: false,
          error: {
            message: "LinkedIn video upload is not implemented yet",
            retryable: false,
          },
        };
      }

      const body: Record<string, unknown> = {
        author,
        commentary: content.caption,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      };
      if (mediaUrn) {
        body.content = {
          media: { id: mediaUrn, title: firstImage?.altText ?? "" },
        };
      }

      const res = await apiFetch<unknown>(`${REST}/posts`, {
        method: "POST",
        headers: this.headers(token.accessToken),
        body,
      });
      // LinkedIn returns the post URN in x-restli-id; apiFetch doesn't expose
      // headers, so re-request is skipped — treat 2xx as success.
      const id =
        typeof res === "object" && res && "id" in res
          ? String((res as { id: unknown }).id)
          : undefined;
      return {
        ok: true,
        externalPostId: id,
        permalink: id
          ? `https://www.linkedin.com/feed/update/${id}`
          : undefined,
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

  async checkHealth(token: TokenSet) {
    try {
      await apiFetch("https://api.linkedin.com/v2/userinfo", {
        headers: { authorization: `Bearer ${token.accessToken}` },
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: (err as Error).message };
    }
  }

  private async uploadImage(
    accessToken: string,
    owner: string,
    imageUrl: string,
  ): Promise<string> {
    const init = await apiFetch<{
      value: { uploadUrl: string; image: string };
    }>(`${REST}/images?action=initializeUpload`, {
      method: "POST",
      headers: this.headers(accessToken),
      body: { initializeUploadRequest: { owner } },
    });
    const bin = await fetch(imageUrl).then((r) => r.arrayBuffer());
    await fetch(init.value.uploadUrl, {
      method: "PUT",
      headers: { authorization: `Bearer ${accessToken}` },
      body: bin,
    });
    return init.value.image;
  }

  private headers(accessToken: string) {
    return {
      authorization: `Bearer ${accessToken}`,
      "linkedin-version": VERSION,
      "x-restli-protocol-version": "2.0.0",
    };
  }

  private toTokenSet(data: {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    refresh_token_expires_in?: number;
    scope?: string;
  }): TokenSet {
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      refreshExpiresAt: data.refresh_token_expires_in
        ? new Date(Date.now() + data.refresh_token_expires_in * 1000)
        : undefined,
      scopes: data.scope?.split(" "),
    };
  }
}
