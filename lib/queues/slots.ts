/** Pure slot maths — no DB, safe to unit test. */

export type Slot = { weekday: number; minuteOfDay: number };

/** The next `count` slot datetimes at or after `from`, given weekly slots. */
export function upcomingSlotTimes(
  slots: Slot[],
  from: Date,
  count: number,
): Date[] {
  if (slots.length === 0) return [];
  const sorted = [...slots].sort(
    (a, b) => a.weekday - b.weekday || a.minuteOfDay - b.minuteOfDay,
  );
  const out: Date[] = [];
  const cursor = new Date(from);
  cursor.setSeconds(0, 0);

  let guard = 0;
  while (out.length < count && guard < 400) {
    guard++;
    const day = cursor.getUTCDay();
    for (const s of sorted) {
      if (s.weekday !== day) continue;
      const t = new Date(cursor);
      t.setUTCHours(0, 0, 0, 0);
      t.setUTCMinutes(s.minuteOfDay);
      if (t.getTime() >= from.getTime()) out.push(t);
      if (out.length >= count) break;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    cursor.setUTCHours(0, 0, 0, 0);
  }
  return out;
}
