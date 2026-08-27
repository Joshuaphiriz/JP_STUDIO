"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { auditLog, clientPortalTokens, workspaces } from "@/lib/db/schema";
import { requireWorkspace } from "@/lib/dal";
import { randomToken, sha256Hex } from "@/lib/crypto";

const modeSchema = z.enum([
  "none",
  "optional",
  "required_internal",
  "required_internal_client",
]);

export async function setApprovalMode(workspaceSlug: string, mode: string) {
  const ws = await requireWorkspace(workspaceSlug);
  if (!ws.can("settings:manage")) return { ok: false, error: "Not allowed" };
  const parsed = modeSchema.safeParse(mode);
  if (!parsed.success) return { ok: false, error: "Invalid mode" };

  await db
    .update(workspaces)
    .set({ approvalMode: parsed.data })
    .where(eq(workspaces.id, ws.id));
  await db.insert(auditLog).values({
    organizationId: ws.organizationId,
    workspaceId: ws.id,
    actorUserId: ws.user.id,
    action: "settings.approval_mode",
    meta: { mode: parsed.data },
  });
  revalidatePath(`/app/${ws.slug}/settings`);
  return { ok: true };
}

export type PortalLinkResult =
  { ok: true; url: string; label: string } | { ok: false; error: string };

export async function createPortalLink(
  workspaceSlug: string,
  label: string,
  appUrl: string,
): Promise<PortalLinkResult> {
  const ws = await requireWorkspace(workspaceSlug);
  if (!ws.can("member:manage") && !ws.can("settings:manage")) {
    return { ok: false, error: "Not allowed" };
  }
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  await db.insert(clientPortalTokens).values({
    workspaceId: ws.id,
    tokenHash,
    label: label.trim() || "Client",
    createdByUserId: ws.user.id,
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
  });
  revalidatePath(`/app/${ws.slug}/settings`);
  return {
    ok: true,
    url: `${appUrl.replace(/\/$/, "")}/portal/${token}`,
    label: label.trim() || "Client",
  };
}

export async function revokePortalLink(workspaceSlug: string, id: string) {
  const ws = await requireWorkspace(workspaceSlug);
  if (!ws.can("member:manage") && !ws.can("settings:manage")) return;
  await db
    .update(clientPortalTokens)
    .set({ revokedAt: new Date() })
    .where(eq(clientPortalTokens.id, id));
  revalidatePath(`/app/${ws.slug}/settings`);
}
