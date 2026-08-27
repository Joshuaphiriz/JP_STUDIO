"use server";

import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  auditLog,
  invitations,
  orgMembers,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";
import { sha256Hex } from "@/lib/crypto";

export async function acceptInvite(token: string) {
  const user = await verifySession();
  const hash = await sha256Hex(token);

  const [invite] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.tokenHash, hash),
        isNull(invitations.acceptedAt),
        gt(invitations.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!invite) redirect("/app");
  if (invite.email.toLowerCase() !== user.email.toLowerCase()) redirect("/app");

  // ensure an org membership exists (needed for cross-workspace visibility)
  await db
    .insert(orgMembers)
    .values({
      organizationId: invite.organizationId,
      userId: user.id,
      role: "member",
    })
    .onConflictDoNothing();

  await db
    .insert(workspaceMembers)
    .values({
      workspaceId: invite.workspaceId!,
      userId: user.id,
      role: invite.workspaceRole ?? "editor",
    })
    .onConflictDoUpdate({
      target: [workspaceMembers.workspaceId, workspaceMembers.userId],
      set: { role: invite.workspaceRole ?? "editor" },
    });

  await db
    .update(invitations)
    .set({ acceptedAt: new Date() })
    .where(eq(invitations.id, invite.id));

  await db.insert(auditLog).values({
    organizationId: invite.organizationId,
    workspaceId: invite.workspaceId,
    actorUserId: user.id,
    action: "member.joined",
    targetType: "user",
    targetId: user.id,
  });

  const [ws] = await db
    .select({ slug: workspaces.slug })
    .from(workspaces)
    .where(eq(workspaces.id, invite.workspaceId!))
    .limit(1);
  redirect(`/app/${ws?.slug ?? ""}`);
}
