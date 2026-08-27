import type { WorkspaceRole } from "@/lib/db/schema";

/** Every gate in the app. Keep the string values stable — they persist in DB. */
export const PERMISSIONS = {
  "post:create": "Create and compose posts",
  "post:edit_any": "Edit posts created by others",
  "post:delete": "Delete posts",
  "post:publish": "Publish or schedule directly (skip approval)",
  "post:submit": "Submit posts for approval",
  "approval:internal": "Approve at the internal review stage",
  "approval:client": "Approve at the client review stage",
  "account:manage": "Connect and disconnect social accounts",
  "media:manage": "Upload and delete media",
  "member:manage": "Invite and manage workspace members",
  "settings:manage": "Change workspace settings and workflow",
  "analytics:view": "View basic analytics",
  "analytics:view_full": "View full analytics and top posts",
  "inbox:view": "See the unified inbox",
  "inbox:reply": "Reply to inbox messages",
  "template:manage": "Create and edit post templates",
  "queue:manage": "Manage queues and posting slots",
} as const;

export type Permission = keyof typeof PERMISSIONS;

const ALL = Object.keys(PERMISSIONS) as Permission[];

/** Default permission set per built-in workspace role. */
export const ROLE_PERMISSIONS: Record<WorkspaceRole, Permission[]> = {
  owner: ALL,
  manager: ALL,
  editor: [
    "post:create",
    "post:edit_any",
    "post:delete",
    "post:publish",
    "post:submit",
    "approval:internal",
    "media:manage",
    "analytics:view",
    "analytics:view_full",
    "inbox:view",
    "inbox:reply",
    "template:manage",
    "queue:manage",
  ],
  contributor: [
    "post:create",
    "post:submit",
    "media:manage",
    "analytics:view",
    "inbox:view",
  ],
  client: ["approval:client"],
  viewer: ["analytics:view"],
  custom: [],
};

export type PermissionContext = {
  role: WorkspaceRole;
  /** permissions attached to a custom role, when role === "custom" */
  customRolePermissions?: Record<string, boolean> | null;
  /** per-member overrides applied on top of the role */
  permissionOverrides?: Record<string, boolean> | null;
};

/** Resolve whether a member holds a permission: role default → custom role → member override. */
export function can(ctx: PermissionContext, permission: Permission): boolean {
  let granted =
    ctx.role === "custom"
      ? Boolean(ctx.customRolePermissions?.[permission])
      : ROLE_PERMISSIONS[ctx.role].includes(permission);

  const override = ctx.permissionOverrides?.[permission];
  if (typeof override === "boolean") granted = override;

  return granted;
}

export function permissionsFor(ctx: PermissionContext): Permission[] {
  return ALL.filter((p) => can(ctx, p));
}

/** True when this workspace member is a review-only client. */
export function isClientRole(role: WorkspaceRole): boolean {
  return role === "client";
}
