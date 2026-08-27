import {
  bigint,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { platformEnum, socialAccountStatusEnum } from "./enums";
import { users, workspaces } from "./tenancy";

/**
 * A connected social account (a Facebook Page, an Instagram business account, a
 * LinkedIn profile/org, a TikTok account, …). One row per external account.
 */
export const socialAccounts = pgTable(
  "social_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    platform: platformEnum("platform").notNull(),
    /** id of the account on the platform */
    externalId: text("external_id").notNull(),
    /** for Meta: the parent (e.g. the Page that owns an IG account) */
    parentExternalId: text("parent_external_id"),
    displayName: text("display_name").notNull(),
    handle: text("handle"),
    avatarUrl: text("avatar_url"),
    followerCount: bigint("follower_count", { mode: "number" }),
    status: socialAccountStatusEnum("status").notNull().default("connected"),
    /** granted OAuth scopes */
    scopes: text("scopes").array(),
    /** free-form platform metadata (page category, account type, …) */
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    connectedByUserId: uuid("connected_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    lastHealthCheckAt: timestamp("last_health_check_at", {
      withTimezone: true,
    }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("social_accounts_ws_platform_ext_uq").on(
      t.workspaceId,
      t.platform,
      t.externalId,
    ),
    index("social_accounts_ws_idx").on(t.workspaceId),
  ],
);

/**
 * Encrypted OAuth material. Kept in a separate table with NO row-level access
 * for normal users — only the service role (Edge Functions, server actions that
 * publish) reads it. Values are AES-256-GCM ciphertext (see lib/crypto.ts).
 */
export const socialAccountTokens = pgTable("social_account_tokens", {
  socialAccountId: uuid("social_account_id")
    .primaryKey()
    .references(() => socialAccounts.id, { onDelete: "cascade" }),
  accessTokenEnc: text("access_token_enc").notNull(),
  refreshTokenEnc: text("refresh_token_enc"),
  /** extra encrypted blob for platform-specific tokens (page tokens, etc.) */
  extraEnc: text("extra_enc"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  refreshExpiresAt: timestamp("refresh_expires_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * Per-org / per-deployment platform app credentials. Environment variables take
 * precedence; this table lets an org supply its own app keys via the admin UI.
 */
export const platformCredentials = pgTable(
  "platform_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    platform: platformEnum("platform").notNull(),
    clientIdEnc: text("client_id_enc").notNull(),
    clientSecretEnc: text("client_secret_enc").notNull(),
    extraEnc: text("extra_enc"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("platform_credentials_org_platform_uq").on(
      t.organizationId,
      t.platform,
    ),
  ],
);

/** Short-lived signed state for an in-flight OAuth connect. */
export const oauthStates = pgTable("oauth_states", {
  state: text("state").primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  platform: platformEnum("platform").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  /** optional connection-link token when a client is self-connecting */
  connectionLinkId: uuid("connection_link_id"),
  codeVerifier: text("code_verifier"),
  redirectUri: text("redirect_uri").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
