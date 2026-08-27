"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { auditLog, posts, queues, timeSlots } from "@/lib/db/schema";
import { requireWorkspace } from "@/lib/dal";
import {
  addToQueue,
  reflowQueue,
  removeFromQueue,
  swapQueueOrder,
} from "@/lib/queues/schedule";

async function ownedQueue(workspaceId: string, queueId: string) {
  const [q] = await db
    .select({ id: queues.id })
    .from(queues)
    .where(and(eq(queues.id, queueId), eq(queues.workspaceId, workspaceId)))
    .limit(1);
  return q ?? null;
}

export async function createQueue(workspaceSlug: string, name: string) {
  const ws = await requireWorkspace(workspaceSlug);
  if (!ws.can("queue:manage")) return { ok: false, error: "Not allowed" };
  if (!name.trim()) return { ok: false, error: "Name required" };
  await db
    .insert(queues)
    .values({ workspaceId: ws.id, name: name.trim() })
    .onConflictDoNothing();
  await db.insert(auditLog).values({
    organizationId: ws.organizationId,
    workspaceId: ws.id,
    actorUserId: ws.user.id,
    action: "queue.created",
    meta: { name: name.trim() },
  });
  revalidatePath(`/app/${ws.slug}/queue`);
  return { ok: true };
}

export async function deleteQueue(workspaceSlug: string, queueId: string) {
  const ws = await requireWorkspace(workspaceSlug);
  if (!ws.can("queue:manage")) return;
  if (!(await ownedQueue(ws.id, queueId))) return;
  // detach posts, then delete
  await db
    .update(posts)
    .set({ queueId: null })
    .where(eq(posts.queueId, queueId));
  await db.delete(queues).where(eq(queues.id, queueId));
  revalidatePath(`/app/${ws.slug}/queue`);
}

const slotSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
});

export async function addSlot(
  workspaceSlug: string,
  queueId: string,
  raw: unknown,
) {
  const ws = await requireWorkspace(workspaceSlug);
  if (!ws.can("queue:manage")) return { ok: false, error: "Not allowed" };
  if (!(await ownedQueue(ws.id, queueId)))
    return { ok: false, error: "No queue" };
  const p = slotSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Invalid slot" };
  await db.insert(timeSlots).values({
    workspaceId: ws.id,
    queueId,
    weekday: p.data.weekday,
    minuteOfDay: p.data.hour * 60 + p.data.minute,
  });
  await reflowQueue(queueId);
  revalidatePath(`/app/${ws.slug}/queue`);
  return { ok: true };
}

export async function removeSlot(
  workspaceSlug: string,
  queueId: string,
  slotId: string,
) {
  const ws = await requireWorkspace(workspaceSlug);
  if (!ws.can("queue:manage")) return;
  if (!(await ownedQueue(ws.id, queueId))) return;
  await db
    .delete(timeSlots)
    .where(and(eq(timeSlots.id, slotId), eq(timeSlots.queueId, queueId)));
  await reflowQueue(queueId);
  revalidatePath(`/app/${ws.slug}/queue`);
}

export async function queuePost(
  workspaceSlug: string,
  queueId: string,
  postId: string,
) {
  const ws = await requireWorkspace(workspaceSlug);
  if (!ws.can("queue:manage")) return;
  if (!(await ownedQueue(ws.id, queueId))) return;
  const [post] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.workspaceId, ws.id)))
    .limit(1);
  if (!post) return;
  await addToQueue(postId, queueId);
  revalidatePath(`/app/${ws.slug}/queue`);
}

export async function unqueuePost(
  workspaceSlug: string,
  queueId: string,
  postId: string,
) {
  const ws = await requireWorkspace(workspaceSlug);
  if (!ws.can("queue:manage")) return;
  await removeFromQueue(postId, queueId);
  revalidatePath(`/app/${ws.slug}/queue`);
}

export async function moveInQueue(
  workspaceSlug: string,
  queueId: string,
  aId: string,
  bId: string,
) {
  const ws = await requireWorkspace(workspaceSlug);
  if (!ws.can("queue:manage")) return;
  if (!(await ownedQueue(ws.id, queueId))) return;
  await swapQueueOrder(queueId, aId, bId);
  revalidatePath(`/app/${ws.slug}/queue`);
}
