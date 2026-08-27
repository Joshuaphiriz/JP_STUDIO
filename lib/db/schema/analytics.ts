import {
  bigint,
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { platformPosts } from "./content";
import { socialAccounts } from "./social";
import { workspaces } from "./tenancy";

/** One row per account per day — the follower/reach trend line. */
export const analyticsSnapshots = pgTable(
  "analytics_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    socialAccountId: uuid("social_account_id")
      .notNull()
      .references(() => socialAccounts.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    followers: bigint("followers", { mode: "number" }),
    impressions: bigint("impressions", { mode: "number" }),
    reach: bigint("reach", { mode: "number" }),
    engagements: bigint("engagements", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("analytics_snapshots_account_day_uq").on(t.socialAccountId, t.day),
    index("analytics_snapshots_ws_day_idx").on(t.workspaceId, t.day),
  ],
);

/** Latest known metrics for a published platform post. */
export const postMetrics = pgTable("post_metrics", {
  platformPostId: uuid("platform_post_id")
    .primaryKey()
    .references(() => platformPosts.id, { onDelete: "cascade" }),
  impressions: integer("impressions"),
  reach: integer("reach"),
  likes: integer("likes"),
  comments: integer("comments"),
  shares: integer("shares"),
  saves: integer("saves"),
  clicks: integer("clicks"),
  videoViews: integer("video_views"),
  engagementRate: doublePrecision("engagement_rate"),
  collectedAt: timestamp("collected_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
