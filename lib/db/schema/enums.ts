import { pgEnum } from "drizzle-orm/pg-core";

export const platformEnum = pgEnum("platform", [
  "facebook",
  "instagram",
  "linkedin",
  "tiktok",
  "youtube",
  "telegram",
  "pinterest",
  "threads",
  "bluesky",
  "mastodon",
  "google_business",
]);

export const orgRoleEnum = pgEnum("org_role", ["owner", "admin", "member"]);

export const workspaceRoleEnum = pgEnum("workspace_role", [
  "owner",
  "manager",
  "editor",
  "contributor",
  "client",
  "viewer",
  "custom",
]);

export const socialAccountStatusEnum = pgEnum("social_account_status", [
  "connected",
  "token_expiring",
  "disconnected",
  "error",
]);

export const postStatusEnum = pgEnum("post_status", [
  "draft",
  "pending_review",
  "changes_requested",
  "approved",
  "pending_client",
  "scheduled",
  "publishing",
  "published",
  "partially_failed",
  "failed",
]);

export const approvalModeEnum = pgEnum("approval_mode", [
  "none",
  "optional",
  "required_internal",
  "required_internal_client",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "running",
  "succeeded",
  "failed",
  "dead",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "approval_request",
  "approval_reminder",
  "assignment",
  "publish_success",
  "publish_failure",
  "sla_overdue",
  "token_expiry",
  "account_disconnected",
  "stalled_post",
  "mention",
]);

export const themeScopeEnum = pgEnum("theme_scope", ["user", "workspace"]);
