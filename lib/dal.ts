import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  orgMembers,
  organizations,
  users,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
};

/**
 * Authoritative auth check. Verifies the Supabase session, mirrors the user
 * into our `users` table on first sight, and returns the app user. Redirects to
 * /sign-in when there is no session. Memoized per request.
 */
export const verifySession = cache(async (): Promise<SessionUser> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;
  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined) ??
    null;

  const [row] = await db
    .insert(users)
    .values({
      id: user.id,
      email: user.email ?? "",
      fullName,
      avatarUrl,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: { email: user.email ?? "", fullName, avatarUrl },
    })
    .returning();

  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    avatarUrl: row.avatarUrl,
  };
});

/** Session user or null — for optional-auth surfaces. Does not redirect. */
export const getOptionalUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  return row
    ? {
        id: row.id,
        email: row.email,
        fullName: row.fullName,
        avatarUrl: row.avatarUrl,
      }
    : { id: user.id, email: user.email ?? "", fullName: null, avatarUrl: null };
});

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  role: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
};

/** All workspaces the current user can see, with their role in each. */
export const getMyWorkspaces = cache(async (): Promise<WorkspaceSummary[]> => {
  const user = await verifySession();
  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      role: workspaceMembers.role,
      organizationId: organizations.id,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .innerJoin(organizations, eq(workspaces.organizationId, organizations.id))
    .where(eq(workspaceMembers.userId, user.id));
  return rows;
});

/** Organizations the user belongs to, with their org-level role. */
export const getMyOrganizations = cache(async () => {
  const user = await verifySession();
  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      role: orgMembers.role,
    })
    .from(orgMembers)
    .innerJoin(organizations, eq(orgMembers.organizationId, organizations.id))
    .where(eq(orgMembers.userId, user.id));
});

/**
 * Resolve a workspace by slug and assert membership. Redirects to the app root
 * if the workspace does not exist or the user is not a member.
 */
export const requireWorkspace = cache(async (slug: string) => {
  const user = await verifySession();
  const [row] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      timezone: workspaces.timezone,
      organizationId: workspaces.organizationId,
      approvalMode: workspaces.approvalMode,
      settings: workspaces.settings,
      role: workspaceMembers.role,
      customRoleId: workspaceMembers.customRoleId,
      permissionOverrides: workspaceMembers.permissionOverrides,
    })
    .from(workspaces)
    .innerJoin(
      workspaceMembers,
      and(
        eq(workspaceMembers.workspaceId, workspaces.id),
        eq(workspaceMembers.userId, user.id),
      ),
    )
    .where(eq(workspaces.slug, slug))
    .limit(1);

  if (!row) redirect("/app");
  return { ...row, user };
});
