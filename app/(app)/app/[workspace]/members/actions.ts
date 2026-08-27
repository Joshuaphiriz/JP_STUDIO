"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import {
  auditLog,
  invitations,
  notifications,
  workspaceMembers,
} from "@/lib/db/schema";
import type { WorkspaceRole } from "@/lib/db/schema";
import { requireWorkspace } from "@/lib/dal";
import { randomToken, sha256Hex } from "@/lib/crypto";
import { sendInviteEmail } from "@/lib/email/send";
import { getAppUrl } from "@/lib/url";

const ROLES: WorkspaceRole[] = [
  "manager",
  "editor",
  "contributor",
  "client",
  "viewer",
];

const inviteSchema = z.object({
  email: z.email(),
  role: z.enum(["manager", "editor", "contributor", "client", "viewer"]),
});

export type InviteState = { error?: string; ok?: string };

export async function inviteMember(
  workspaceSlug: string,
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const ws = await requireWorkspace(workspaceSlug);
  if (!ws.can("member:manage")) return { error: "Not allowed" };

  const parsed = inviteSchema.safeParse({
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    role: String(formData.get("role") ?? "editor"),
  });
  if (!parsed.success) return { error: "Enter a valid email and role." };
  const { email, role } = parsed.data;

  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  await db.insert(invitations).values({
    organizationId: ws.organizationId,
    workspaceId: ws.id,
    email,
    workspaceRole: role,
    tokenHash,
    invitedByUserId: ws.user.id,
    expiresAt: new Date(Date.now() + 14 * 24 * 3600 * 1000),
  });

  const url = `${await getAppUrl()}/invite/${token}`;
  await sendInviteEmail({ to: email, workspace: ws.name, url, role }).catch(
    () => {},
  );
  await db.insert(auditLog).values({
    organizationId: ws.organizationId,
    workspaceId: ws.id,
    actorUserId: ws.user.id,
    action: "member.invited",
    meta: { email, role },
  });
  revalidatePath(`/app/${ws.slug}/members`);
  return { ok: `Invite sent to ${email}` };
}

export async function changeRole(
  workspaceSlug: string,
  memberId: string,
  role: string,
) {
  const ws = await requireWorkspace(workspaceSlug);
  if (!ws.can("member:manage")) return;
  if (!ROLES.includes(role as WorkspaceRole)) return;

  const [m] = await db
    .select({ userId: workspaceMembers.userId, role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.id, memberId),
        eq(workspaceMembers.workspaceId, ws.id),
      ),
    )
    .limit(1);
  if (!m || m.role === "owner") return; // never demote an owner here

  await db
    .update(workspaceMembers)
    .set({ role: role as WorkspaceRole })
    .where(eq(workspaceMembers.id, memberId));
  await db.insert(auditLog).values({
    organizationId: ws.organizationId,
    workspaceId: ws.id,
    actorUserId: ws.user.id,
    action: "member.role_changed",
    targetType: "user",
    targetId: m.userId,
    meta: { role },
  });
  revalidatePath(`/app/${ws.slug}/members`);
}

export async function removeMember(workspaceSlug: string, memberId: string) {
  const ws = await requireWorkspace(workspaceSlug);
  if (!ws.can("member:manage")) return;
  const [m] = await db
    .select({ userId: workspaceMembers.userId, role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.id, memberId),
        eq(workspaceMembers.workspaceId, ws.id),
      ),
    )
    .limit(1);
  if (!m || m.role === "owner" || m.userId === ws.user.id) return;

  await db.delete(workspaceMembers).where(eq(workspaceMembers.id, memberId));
  await db.insert(notifications).values({
    userId: m.userId,
    type: "assignment",
    title: `You were removed from ${ws.name}`,
  });
  await db.insert(auditLog).values({
    organizationId: ws.organizationId,
    workspaceId: ws.id,
    actorUserId: ws.user.id,
    action: "member.removed",
    targetType: "user",
    targetId: m.userId,
  });
  revalidatePath(`/app/${ws.slug}/members`);
}

export async function cancelInvite(workspaceSlug: string, inviteId: string) {
  const ws = await requireWorkspace(workspaceSlug);
  if (!ws.can("member:manage")) return;
  await db
    .delete(invitations)
    .where(
      and(eq(invitations.id, inviteId), eq(invitations.workspaceId, ws.id)),
    );
  revalidatePath(`/app/${ws.slug}/members`);
}
