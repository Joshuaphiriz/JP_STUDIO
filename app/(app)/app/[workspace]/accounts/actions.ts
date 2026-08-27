"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLog, socialAccounts } from "@/lib/db/schema";
import { requireWorkspace } from "@/lib/dal";
import { connectTelegram, disconnectAccount } from "@/lib/providers/accounts";

export type TelegramConnectState = { error?: string; ok?: string };

export async function connectTelegramAction(
  workspaceSlug: string,
  _prev: TelegramConnectState,
  formData: FormData,
): Promise<TelegramConnectState> {
  const ws = await requireWorkspace(workspaceSlug);
  const botToken = String(formData.get("botToken") ?? "").trim();
  const channel = String(formData.get("channel") ?? "").trim();
  if (!botToken || !channel) {
    return { error: "Bot token and channel are both required." };
  }

  try {
    const res = await connectTelegram({
      workspaceId: ws.id,
      userId: ws.user.id,
      botToken,
      channel,
    });
    await db.insert(auditLog).values({
      organizationId: ws.organizationId,
      workspaceId: ws.id,
      actorUserId: ws.user.id,
      action: "account.connected",
      targetType: "social_account",
      targetId: res.id,
      meta: { platform: "telegram" },
    });
    revalidatePath(`/app/${ws.slug}/accounts`);
    return { ok: `Connected ${res.displayName}` };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function disconnectAccountAction(
  workspaceSlug: string,
  socialAccountId: string,
) {
  const ws = await requireWorkspace(workspaceSlug);
  const [acct] = await db
    .select({ id: socialAccounts.id })
    .from(socialAccounts)
    .where(
      and(
        eq(socialAccounts.id, socialAccountId),
        eq(socialAccounts.workspaceId, ws.id),
      ),
    )
    .limit(1);
  if (!acct) return;
  await disconnectAccount(socialAccountId);
  await db.insert(auditLog).values({
    organizationId: ws.organizationId,
    workspaceId: ws.id,
    actorUserId: ws.user.id,
    action: "account.disconnected",
    targetType: "social_account",
    targetId: socialAccountId,
  });
  revalidatePath(`/app/${ws.slug}/accounts`);
}
