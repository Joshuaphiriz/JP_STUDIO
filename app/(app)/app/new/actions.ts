"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import {
  auditLog,
  orgMembers,
  organizations,
  workspaceMembers,
  workspaceThemes,
  workspaces,
} from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";
import { rememberWorkspace } from "@/lib/workspace-prefs";
import { DEFAULT_THEME } from "@/lib/theme/types";
import { randomSuffix, slugify } from "@/lib/slug";

const schema = z.object({
  workspaceName: z.string().min(1, { error: "Name your workspace." }).max(60),
  organizationName: z.string().max(60).optional(),
  organizationId: z.string().uuid().optional(),
});

export type NewWorkspaceState = { error?: string };

async function uniqueOrgSlug(base: string) {
  let slug = slugify(base) || "org";
  for (let i = 0; i < 5; i++) {
    const [hit] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);
    if (!hit) return slug;
    slug = `${slugify(base) || "org"}-${randomSuffix()}`;
  }
  return `${slugify(base) || "org"}-${randomSuffix(6)}`;
}

async function uniqueWorkspaceSlug(orgId: string, base: string) {
  let slug = slugify(base) || "workspace";
  for (let i = 0; i < 5; i++) {
    const [hit] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(
        and(eq(workspaces.organizationId, orgId), eq(workspaces.slug, slug)),
      )
      .limit(1);
    if (!hit) return slug;
    slug = `${slugify(base) || "workspace"}-${randomSuffix()}`;
  }
  return `${slugify(base) || "workspace"}-${randomSuffix(6)}`;
}

export async function createWorkspace(
  _prev: NewWorkspaceState,
  formData: FormData,
): Promise<NewWorkspaceState> {
  const user = await verifySession();
  const parsed = schema.safeParse({
    workspaceName: String(formData.get("workspaceName") ?? "").trim(),
    organizationName:
      String(formData.get("organizationName") ?? "").trim() || undefined,
    organizationId:
      String(formData.get("organizationId") ?? "").trim() || undefined,
  });
  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error).split("\n")[0] };
  }
  const { workspaceName, organizationName, organizationId } = parsed.data;

  let orgId = organizationId;

  if (orgId) {
    const [membership] = await db
      .select({ role: orgMembers.role })
      .from(orgMembers)
      .where(
        and(
          eq(orgMembers.organizationId, orgId),
          eq(orgMembers.userId, user.id),
        ),
      )
      .limit(1);
    if (!membership || membership.role === "member") {
      return { error: "You can't add workspaces to that organization." };
    }
  } else {
    const orgName = organizationName || workspaceName;
    const [org] = await db
      .insert(organizations)
      .values({ name: orgName, slug: await uniqueOrgSlug(orgName) })
      .returning();
    orgId = org.id;
    await db
      .insert(orgMembers)
      .values({ organizationId: orgId, userId: user.id, role: "owner" });
  }

  const [ws] = await db
    .insert(workspaces)
    .values({
      organizationId: orgId,
      name: workspaceName,
      slug: await uniqueWorkspaceSlug(orgId, workspaceName),
    })
    .returning();

  await db
    .insert(workspaceMembers)
    .values({ workspaceId: ws.id, userId: user.id, role: "owner" });

  await db
    .insert(workspaceThemes)
    .values({ workspaceId: ws.id, config: DEFAULT_THEME });

  await db.insert(auditLog).values({
    organizationId: orgId,
    workspaceId: ws.id,
    actorUserId: user.id,
    action: "workspace.created",
    targetType: "workspace",
    targetId: ws.id,
  });

  await rememberWorkspace(user.id, ws.id);
  redirect(`/app/${ws.slug}`);
}
