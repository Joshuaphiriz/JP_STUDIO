import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { posts } from "./content";
import { users, workspaces } from "./tenancy";

export const approvalStageEnum = pgEnum("approval_stage", [
  "internal",
  "client",
]);
export const approvalDecisionEnum = pgEnum("approval_decision", [
  "pending",
  "approved",
  "changes_requested",
  "rejected",
]);
export const commentVisibilityEnum = pgEnum("comment_visibility", [
  "internal",
  "client",
]);

/** One row per decision taken on a post at a given stage. */
export const approvals = pgTable(
  "approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    stage: approvalStageEnum("stage").notNull(),
    decision: approvalDecisionEnum("decision").notNull().default("pending"),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** for client decisions made via the portal (no user account) */
    actorLabel: text("actor_label"),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("approvals_post_idx").on(t.postId, t.createdAt)],
);

export const postComments = pgTable(
  "post_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    authorUserId: uuid("author_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    authorLabel: text("author_label"),
    body: text("body").notNull(),
    visibility: commentVisibilityEnum("visibility")
      .notNull()
      .default("internal"),
    /** [{ url, name }] — images only */
    attachments: jsonb("attachments").$type<{ url: string; name: string }[]>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("post_comments_post_idx").on(t.postId, t.createdAt)],
);

/** Passwordless client portal access. */
export const clientPortalTokens = pgTable(
  "client_portal_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    label: text("label").notNull(),
    email: text("email"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("client_portal_tokens_ws_idx").on(t.workspaceId)],
);

/** Single-purpose link that lets a client connect their own social accounts. */
export const connectionLinks = pgTable("connection_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
