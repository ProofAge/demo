const UNITS: [number, string][] = [
  [86_400_000, 'day'],
  [3_600_000, 'hour'],
  [60_000, 'minute'],
  [1_000, 'second'],
];

/** "5 minutes ago", as the console shows dates. Missing or invalid gives "-"; a future time is "just now". */
export function relativeTime(iso: string | null, now: Date): string {
  const then = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(then)) {
    return '-';
  }
  const diff = now.getTime() - then;
  if (diff < 5_000) {
    return 'just now';
  }
  for (const [ms, name] of UNITS) {
    if (diff >= ms) {
      const n = Math.floor(diff / ms);
      return `${n} ${name}${n === 1 ? '' : 's'} ago`;
    }
  }
  return 'just now';
}
