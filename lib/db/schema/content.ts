import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { platformEnum, postStatusEnum } from "./enums";
import { socialAccounts } from "./social";
import { users, workspaces } from "./tenancy";

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["image", "video"] }).notNull(),
    /** path within the Supabase Storage `media` bucket */
    storagePath: text("storage_path").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    width: integer("width"),
    height: integer("height"),
    durationSec: integer("duration_sec"),
    altText: text("alt_text"),
    tags: text("tags").array(),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("media_assets_ws_idx").on(t.workspaceId, t.createdAt)],
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    status: postStatusEnum("status").notNull().default("draft"),
    /** shared base caption; per-platform overrides live in platform_posts */
    caption: text("caption").notNull().default(""),
    /** ordered media asset ids for the base post */
    mediaIds: uuid("media_ids").array().notNull().default([]),
    firstComment: text("first_comment"),
    category: text("category"),
    tags: text("tags").array(),
    internalNotes: text("internal_notes"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    /** set when this post is a template rather than a real post */
    isTemplate: boolean("is_template").notNull().default(false),
    templateName: text("template_name"),
    queueId: uuid("queue_id"),
    authorUserId: uuid("author_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("posts_ws_status_idx").on(t.workspaceId, t.status),
    index("posts_ws_scheduled_idx").on(t.workspaceId, t.scheduledAt),
  ],
);

/** One row per (post, target social account). Holds the per-platform payload + result. */
export const platformPosts = pgTable(
  "platform_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    socialAccountId: uuid("social_account_id")
      .notNull()
      .references(() => socialAccounts.id, { onDelete: "cascade" }),
    platform: platformEnum("platform").notNull(),
    /** null → inherit from the base post */
    captionOverride: text("caption_override"),
    mediaIdsOverride: uuid("media_ids_override").array(),
    firstCommentOverride: text("first_comment_override"),
    /** platform-specific options (privacy level, title, board, visibility, …) */
    options: jsonb("options").$type<Record<string, unknown>>(),
    status: postStatusEnum("status").notNull().default("scheduled"),
    externalPostId: text("external_post_id"),
    permalink: text("permalink"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("platform_posts_post_account_uq").on(t.postId, t.socialAccountId),
    index("platform_posts_status_idx").on(t.status),
  ],
);

export const postVersions = pgTable(
  "post_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    /** full JSON snapshot of the post + platform_posts at save time */
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    editedByUserId: uuid("edited_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("post_versions_post_idx").on(t.postId, t.createdAt)],
);

export const queues = pgTable(
  "queues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** optional content category this queue draws from */
    category: text("category"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [unique("queues_ws_name_uq").on(t.workspaceId, t.name)],
);

/** Recurring posting slots, e.g. "Mon/Wed/Fri at 09:00 and 18:00" for an account. */
export const timeSlots = pgTable(
  "time_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    queueId: uuid("queue_id").references(() => queues.id, {
      onDelete: "cascade",
    }),
    socialAccountId: uuid("social_account_id").references(
      () => socialAccounts.id,
      {
        onDelete: "cascade",
      },
    ),
    /** 0=Sun … 6=Sat */
    weekday: integer("weekday").notNull(),
    /** minutes past midnight, in the workspace timezone */
    minuteOfDay: integer("minute_of_day").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("time_slots_ws_idx").on(t.workspaceId)],
);

export const postsRelations = relations(posts, ({ many, one }) => ({
  platformPosts: many(platformPosts),
  versions: many(postVersions),
  author: one(users, { fields: [posts.authorUserId], references: [users.id] }),
}));

export const platformPostsRelations = relations(platformPosts, ({ one }) => ({
  post: one(posts, { fields: [platformPosts.postId], references: [posts.id] }),
  account: one(socialAccounts, {
    fields: [platformPosts.socialAccountId],
    references: [socialAccounts.id],
  }),
}));
