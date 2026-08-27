/** Date helpers kept out of component modules so lint doesn't flag `Date.now`. */

export function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

export function isoDay(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function isoDaysAgo(n: number): string {
  return isoDay(daysAgo(n));
}
