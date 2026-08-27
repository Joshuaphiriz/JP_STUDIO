import { describe, expect, it } from "vitest";
import { upcomingSlotTimes } from "@/lib/queues/slots";

describe("upcomingSlotTimes", () => {
  it("returns slot times in chronological order", () => {
    // Mon 09:00 and Wed 18:00
    const slots = [
      { weekday: 1, minuteOfDay: 540 },
      { weekday: 3, minuteOfDay: 1080 },
    ];
    // start from a Sunday
    const from = new Date("2026-01-04T00:00:00Z"); // Sunday
    const times = upcomingSlotTimes(slots, from, 4);
    expect(times).toHaveLength(4);
    for (let i = 1; i < times.length; i++) {
      expect(times[i].getTime()).toBeGreaterThan(times[i - 1].getTime());
    }
    // first should be Monday 09:00
    expect(times[0].getUTCDay()).toBe(1);
    expect(times[0].getUTCHours()).toBe(9);
    // second Wednesday 18:00
    expect(times[1].getUTCDay()).toBe(3);
    expect(times[1].getUTCHours()).toBe(18);
  });

  it("skips slots earlier today", () => {
    const slots = [{ weekday: 1, minuteOfDay: 540 }];
    const from = new Date("2026-01-05T12:00:00Z"); // Monday noon, past 09:00
    const [first] = upcomingSlotTimes(slots, from, 1);
    // must be next Monday
    expect(first.getTime()).toBeGreaterThan(from.getTime());
    expect(first.getUTCDay()).toBe(1);
  });

  it("returns nothing with no slots", () => {
    expect(upcomingSlotTimes([], new Date(), 5)).toEqual([]);
  });
});
