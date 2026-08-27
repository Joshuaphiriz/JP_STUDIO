import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { posts, timeSlots } from "@/lib/db/schema";
import { upcomingSlotTimes } from "./slots";

/**
 * Queue scheduling. A queue has a set of weekly slots (weekday + minute-of-day,
 * interpreted as UTC wall time for now; timezone-aware slotting is a later
 * refinement). Posts assigned to a queue are laid onto the next free slots.
 */
export { upcomingSlotTimes };

/** Recompute `scheduled_at` for every queued post, in queue order. */
export async function reflowQueue(queueId: string): Promise<number> {
  const slots = await db
    .select({
      weekday: timeSlots.weekday,
      minuteOfDay: timeSlots.minuteOfDay,
    })
    .from(timeSlots)
    .where(eq(timeSlots.queueId, queueId));

  const queued = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.queueId, queueId), eq(posts.isTemplate, false)))
    .orderBy(asc(posts.scheduledAt), asc(posts.createdAt));

  if (queued.length === 0) return 0;

  const times = upcomingSlotTimes(
    slots,
    new Date(Date.now() + 60_000),
    queued.length,
  );

  for (let i = 0; i < queued.length; i++) {
    const when = times[i] ?? null;
    await db
      .update(posts)
      .set({
        scheduledAt: when,
        status: when ? "scheduled" : "draft",
        updatedAt: new Date(),
      })
      .where(eq(posts.id, queued[i].id));
  }
  return queued.length;
}

/** Append a post to a queue and reflow. */
export async function addToQueue(postId: string, queueId: string) {
  // put it last by giving it a far-future placeholder time before the reflow
  await db
    .update(posts)
    .set({ queueId, scheduledAt: new Date(Date.now() + 3650 * 864e5) })
    .where(eq(posts.id, postId));
  await reflowQueue(queueId);
}

export async function removeFromQueue(postId: string, queueId: string) {
  await db.update(posts).set({ queueId: null }).where(eq(posts.id, postId));
  await reflowQueue(queueId);
}

/** Swap two posts' positions in a queue (by swapping their scheduled times). */
export async function swapQueueOrder(
  queueId: string,
  aId: string,
  bId: string,
) {
  const rows = await db
    .select({ id: posts.id, scheduledAt: posts.scheduledAt })
    .from(posts)
    .where(and(eq(posts.queueId, queueId)));
  const a = rows.find((r) => r.id === aId);
  const b = rows.find((r) => r.id === bId);
  if (!a || !b) return;
  await db
    .update(posts)
    .set({ scheduledAt: b.scheduledAt })
    .where(eq(posts.id, aId));
  await db
    .update(posts)
    .set({ scheduledAt: a.scheduledAt })
    .where(eq(posts.id, bId));
  await reflowQueue(queueId);
}
