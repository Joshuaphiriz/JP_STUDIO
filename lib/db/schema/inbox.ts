import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { platformEnum } from "./enums";
import { socialAccounts } from "./social";
import { users, workspaces } from "./tenancy";

export const inboxTypeEnum = pgEnum("inbox_type", [
  "comment",
  "mention",
  "dm",
  "review",
]);
export const inboxStatusEnum = pgEnum("inbox_status", [
  "unread",
  "open",
  "resolved",
  "archived",
]);
export const sentimentEnum = pgEnum("sentiment", [
  "positive",
  "neutral",
  "negative",
]);

export const inboxMessages = pgTable(
  "inbox_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    socialAccountId: uuid("social_account_id")
      .notNull()
      .references(() => socialAccounts.id, { onDelete: "cascade" }),
    platform: platformEnum("platform").notNull(),
    platformMessageId: text("platform_message_id").notNull(),
    type: inboxTypeEnum("type").notNull(),
    threadId: text("thread_id"),
    parentId: text("parent_id"),
    authorName: text("author_name"),
    authorHandle: text("author_handle"),
    authorExternalId: text("author_external_id"),
    body: text("body").notNull().default(""),
    permalink: text("permalink"),
    targetExternalPostId: text("target_external_post_id"),
    status: inboxStatusEnum("status").notNull().default("unread"),
    sentiment: sentimentEnum("sentiment"),
    assigneeUserId: uuid("assignee_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    slaAt: timestamp("sla_at", { withTimezone: true }),
    platformCreatedAt: timestamp("platform_created_at", {
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("inbox_messages_account_msg_uq").on(
      t.socialAccountId,
      t.platformMessageId,
    ),
    index("inbox_messages_ws_status_idx").on(t.workspaceId, t.status),
    index("inbox_messages_ws_created_idx").on(
      t.workspaceId,
      t.platformCreatedAt,
    ),
  ],
);

export const inboxReplies = pgTable(
  "inbox_replies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => inboxMessages.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    body: text("body").notNull(),
    externalId: text("external_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("inbox_replies_msg_idx").on(t.messageId)],
);

export const inboxNotes = pgTable(
  "inbox_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => inboxMessages.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("inbox_notes_msg_idx").on(t.messageId)],
);

export const savedReplies = pgTable(
  "saved_replies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [unique("saved_replies_ws_title_uq").on(t.workspaceId, t.title)],
);
