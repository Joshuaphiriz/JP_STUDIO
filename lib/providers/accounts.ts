import "server-only";

import { eq, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  oauthStates,
  socialAccounts,
  socialAccountTokens,
} from "@/lib/db/schema";
import { decryptSecret, encryptSecret, randomToken } from "@/lib/crypto";
import type { Platform } from "@/lib/db/schema";
import type { PlatformKey } from "@/lib/platforms/catalog";
import { createPkcePair } from "./pkce";
import { getProvider } from "./registry";
import { TelegramProvider } from "./telegram";
import type { ProviderProfile, TokenSet } from "./types";

const TOKEN_INFO = "jp-studio:tokens";

export function oauthRedirectUri(appUrl: string, platform: PlatformKey) {
  return `${appUrl.replace(/\/$/, "")}/api/oauth/${platform}/callback`;
}

/** Begin an OAuth connect: persist state, return the provider authorize URL. */
export async function startOAuthConnect(input: {
  workspaceId: string;
  userId: string;
  platform: PlatformKey;
  appUrl: string;
  connectionLinkId?: string;
}): Promise<string> {
  const provider = getProvider(input.platform);
  const redirectUri = oauthRedirectUri(input.appUrl, input.platform);
  const state = randomToken(24);
  const pkce = provider.usesPkce ? createPkcePair() : null;

  await db.insert(oauthStates).values({
    state,
    workspaceId: input.workspaceId,
    userId: input.userId,
    platform: input.platform,
    connectionLinkId: input.connectionLinkId,
    codeVerifier: pkce?.verifier,
    redirectUri,
    expiresAt: new Date(Date.now() + 15 * 60_000),
  });

  return provider.getAuthUrl({
    redirectUri,
    state,
    codeChallenge: pkce?.challenge,
  });
}

export type ConnectResult = {
  connected: Array<{ id: string; platform: Platform; displayName: string }>;
  workspaceId: string;
};

/** Complete an OAuth connect: exchange code, discover profiles, store accounts. */
export async function completeOAuthConnect(input: {
  code: string;
  state: string;
}): Promise<ConnectResult> {
  const [st] = await db
    .select()
    .from(oauthStates)
    .where(eq(oauthStates.state, input.state))
    .limit(1);
  if (!st) throw new Error("Unknown or expired connect request");
  await db.delete(oauthStates).where(eq(oauthStates.state, input.state));
  if (st.expiresAt.getTime() < Date.now())
    throw new Error("Connect request expired");

  const provider = getProvider(st.platform);
  const token = await provider.exchangeCode({
    code: input.code,
    redirectUri: st.redirectUri,
    codeVerifier: st.codeVerifier ?? undefined,
  });
  const profiles = await provider.listProfiles(token);
  if (profiles.length === 0) {
    throw new Error(
      "No publishable accounts were found for this login. Check the account type and granted permissions.",
    );
  }

  const connected: ConnectResult["connected"] = [];
  for (const profile of profiles) {
    const id = await upsertAccount(
      st.workspaceId,
      st.platform,
      profile,
      token,
      st.userId,
    );
    connected.push({
      id,
      platform: st.platform,
      displayName: profile.displayName,
    });
  }
  return { connected, workspaceId: st.workspaceId };
}

async function upsertAccount(
  workspaceId: string,
  platform: Platform,
  profile: ProviderProfile,
  token: TokenSet,
  userId: string | null,
): Promise<string> {
  const [account] = await db
    .insert(socialAccounts)
    .values({
      workspaceId,
      platform,
      externalId: profile.externalId,
      parentExternalId: profile.parentExternalId,
      displayName: profile.displayName,
      handle: profile.handle,
      avatarUrl: profile.avatarUrl,
      followerCount: profile.followerCount,
      status: "connected",
      scopes: token.scopes,
      meta: profile.meta,
      connectedByUserId: userId,
      lastHealthCheckAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        socialAccounts.workspaceId,
        socialAccounts.platform,
        socialAccounts.externalId,
      ],
      set: {
        displayName: profile.displayName,
        handle: profile.handle,
        avatarUrl: profile.avatarUrl,
        followerCount: profile.followerCount,
        status: "connected",
        scopes: token.scopes,
        meta: profile.meta,
        lastHealthCheckAt: new Date(),
      },
    })
    .returning({ id: socialAccounts.id });

  await storeToken(account.id, token, profile);
  return account.id;
}

async function storeToken(
  socialAccountId: string,
  token: TokenSet,
  profile: ProviderProfile,
) {
  const extra = { ...(token.extra ?? {}), profileMeta: profile.meta };
  await db
    .insert(socialAccountTokens)
    .values({
      socialAccountId,
      accessTokenEnc: encryptSecret(token.accessToken, TOKEN_INFO),
      refreshTokenEnc: token.refreshToken
        ? encryptSecret(token.refreshToken, TOKEN_INFO)
        : null,
      extraEnc: encryptSecret(JSON.stringify(extra), TOKEN_INFO),
      expiresAt: token.expiresAt,
      refreshExpiresAt: token.refreshExpiresAt,
    })
    .onConflictDoUpdate({
      target: socialAccountTokens.socialAccountId,
      set: {
        accessTokenEnc: encryptSecret(token.accessToken, TOKEN_INFO),
        refreshTokenEnc: token.refreshToken
          ? encryptSecret(token.refreshToken, TOKEN_INFO)
          : null,
        extraEnc: encryptSecret(JSON.stringify(extra), TOKEN_INFO),
        expiresAt: token.expiresAt,
        refreshExpiresAt: token.refreshExpiresAt,
        updatedAt: new Date(),
      },
    });
}

/** Decrypt a stored token, refreshing it if it expires within 10 minutes. */
export async function getAccountToken(socialAccountId: string): Promise<{
  token: TokenSet;
  profile: ProviderProfile;
  platform: Platform;
}> {
  const [row] = await db
    .select({
      account: socialAccounts,
      tok: socialAccountTokens,
    })
    .from(socialAccountTokens)
    .innerJoin(
      socialAccounts,
      eq(socialAccounts.id, socialAccountTokens.socialAccountId),
    )
    .where(eq(socialAccountTokens.socialAccountId, socialAccountId))
    .limit(1);
  if (!row) throw new Error("Social account has no stored credentials");

  const extra = JSON.parse(
    row.tok.extraEnc ? decryptSecret(row.tok.extraEnc, TOKEN_INFO) : "{}",
  ) as Record<string, unknown> & { profileMeta?: Record<string, unknown> };

  let token: TokenSet = {
    accessToken: decryptSecret(row.tok.accessTokenEnc, TOKEN_INFO),
    refreshToken: row.tok.refreshTokenEnc
      ? decryptSecret(row.tok.refreshTokenEnc, TOKEN_INFO)
      : undefined,
    expiresAt: row.tok.expiresAt ?? undefined,
    refreshExpiresAt: row.tok.refreshExpiresAt ?? undefined,
    scopes: row.account.scopes ?? undefined,
    extra,
  };

  const provider = getProvider(row.account.platform);
  const needsRefresh =
    token.refreshToken &&
    provider.refreshToken &&
    token.expiresAt &&
    token.expiresAt.getTime() - Date.now() < 10 * 60_000;

  if (needsRefresh) {
    try {
      const fresh = await provider.refreshToken!(token.refreshToken!);
      token = {
        ...token,
        ...fresh,
        extra: { ...extra, ...(fresh.extra ?? {}) },
      };
      const profileForStore: ProviderProfile = {
        externalId: row.account.externalId,
        displayName: row.account.displayName,
        meta: extra.profileMeta,
      };
      await storeToken(socialAccountId, token, profileForStore);
    } catch {
      await db
        .update(socialAccounts)
        .set({ status: "token_expiring" })
        .where(eq(socialAccounts.id, socialAccountId));
    }
  }

  const profile: ProviderProfile = {
    externalId: row.account.externalId,
    parentExternalId: row.account.parentExternalId ?? undefined,
    displayName: row.account.displayName,
    handle: row.account.handle ?? undefined,
    meta:
      (extra.profileMeta as Record<string, unknown>) ??
      row.account.meta ??
      undefined,
  };

  return { token, profile, platform: row.account.platform };
}

/** Telegram connect: verify the bot + channel, store as an account. */
export async function connectTelegram(input: {
  workspaceId: string;
  userId: string;
  botToken: string;
  channel: string;
}): Promise<{ id: string; displayName: string }> {
  const tg = new TelegramProvider();
  await tg.verifyBot(input.botToken);
  const profile = await tg.resolveChannel(input.botToken, input.channel);

  const token: TokenSet = {
    accessToken: input.botToken,
    extra: { channel: input.channel },
  };
  const id = await upsertAccount(
    input.workspaceId,
    "telegram",
    profile,
    token,
    input.userId,
  );
  return { id, displayName: profile.displayName };
}

/** Disconnect: mark the account and drop its tokens. */
export async function disconnectAccount(socialAccountId: string) {
  await db
    .delete(socialAccountTokens)
    .where(eq(socialAccountTokens.socialAccountId, socialAccountId));
  await db
    .update(socialAccounts)
    .set({ status: "disconnected" })
    .where(eq(socialAccounts.id, socialAccountId));
}

/** House-keeping: drop OAuth states that were never completed. */
export async function pruneOAuthStates() {
  await db.delete(oauthStates).where(lt(oauthStates.expiresAt, new Date()));
}
