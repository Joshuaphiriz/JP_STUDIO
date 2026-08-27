"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  inboxMessages,
  inboxNotes,
  inboxReplies,
  notifications,
  savedReplies,
} from "@/lib/db/schema";
import { requireWorkspace } from "@/lib/dal";
import { getAccountToken } from "@/lib/providers/accounts";
import { getProvider } from "@/lib/providers/registry";

async function loadMessage(workspaceId: string, messageId: string) {
  const [m] = await db
    .select()
    .from(inboxMessages)
    .where(
      and(
        eq(inboxMessages.id, messageId),
        eq(inboxMessages.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  return m ?? null;
}

export async function replyToMessage(
  workspaceSlug: string,
  messageId: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  const ws = await requireWorkspace(workspaceSlug);
  if (!ws.can("inbox:reply")) return { ok: false, error: "Not allowed" };
  if (!body.trim()) return { ok: false, error: "Write a reply first." };

  const m = await loadMessage(ws.id, messageId);
  if (!m) return { ok: false, error: "Message not found" };

  try {
    const { token, profile } = await getAccountToken(m.socialAccountId);
    const provider = getProvider(m.platform);
    if (!provider.replyToMessage) {
      return {
        ok: false,
        error: `Replies aren't supported for ${m.platform} yet.`,
      };
    }
    const res = await provider.replyToMessage(
      token,
      profile,
      {
        platformMessageId: m.platformMessageId,
        threadId: m.threadId ?? undefined,
      },
      body.trim(),
    );
    if (!res.ok)
      return { ok: false, error: res.error?.message ?? "Reply failed" };

    await db.insert(inboxReplies).values({
      messageId,
      authorUserId: ws.user.id,
      body: body.trim(),
      externalId: res.externalId,
    });
    await db
      .update(inboxMessages)
      .set({ status: "resolved" })
      .where(eq(inboxMessages.id, messageId));
    revalidatePath(`/app/${ws.slug}/inbox`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function setMessageStatus(
  workspaceSlug: string,
  messageId: string,
  status: "unread" | "open" | "resolved" | "archived",
) {
  const ws = await requireWorkspace(workspaceSlug);
  if (!ws.can("inbox:view")) return;
  await db
    .update(inboxMessages)
    .set({ status })
    .where(
      and(
        eq(inboxMessages.id, messageId),
        eq(inboxMessages.workspaceId, ws.id),
      ),
    );
  revalidatePath(`/app/${ws.slug}/inbox`);
}

export async function assignMessage(
  workspaceSlug: string,
  messageId: string,
  userId: string | null,
) {
  const ws = await requireWorkspace(workspaceSlug);
  if (!ws.can("inbox:view")) return;
  await db
    .update(inboxMessages)
    .set({ assigneeUserId: userId, status: "open" })
    .where(
      and(
        eq(inboxMessages.id, messageId),
        eq(inboxMessages.workspaceId, ws.id),
      ),
    );
  if (userId && userId !== ws.user.id) {
    await db.insert(notifications).values({
      userId,
      workspaceId: ws.id,
      type: "assignment",
      title: "A message was assigned to you",
      href: `/app/${ws.slug}/inbox?m=${messageId}`,
      data: { messageId },
    });
  }
  revalidatePath(`/app/${ws.slug}/inbox`);
}

export async function addInboxNote(
  workspaceSlug: string,
  messageId: string,
  body: string,
) {
  const ws = await requireWorkspace(workspaceSlug);
  if (!ws.can("inbox:view") || !body.trim()) return;
  await db
    .insert(inboxNotes)
    .values({ messageId, authorUserId: ws.user.id, body: body.trim() });
  revalidatePath(`/app/${ws.slug}/inbox`);
}

export async function createSavedReply(
  workspaceSlug: string,
  title: string,
  body: string,
) {
  const ws = await requireWorkspace(workspaceSlug);
  if (!ws.can("inbox:reply") || !title.trim() || !body.trim()) return;
  await db
    .insert(savedReplies)
    .values({ workspaceId: ws.id, title: title.trim(), body: body.trim() })
    .onConflictDoUpdate({
      target: [savedReplies.workspaceId, savedReplies.title],
      set: { body: body.trim() },
    });
  revalidatePath(`/app/${ws.slug}/inbox`);
}

export async function deleteSavedReply(workspaceSlug: string, id: string) {
  const ws = await requireWorkspace(workspaceSlug);
  if (!ws.can("inbox:reply")) return;
  await db
    .delete(savedReplies)
    .where(and(eq(savedReplies.id, id), eq(savedReplies.workspaceId, ws.id)));
  revalidatePath(`/app/${ws.slug}/inbox`);
}
