const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Whole years on `now` (UTC) for a `YYYY-MM-DD` date of birth; null when missing, malformed, impossible or in the future. */
export function ageOn(dateOfBirth: string | null | undefined, now: Date): number | null {
  const match = typeof dateOfBirth === 'string' ? ISO_DATE.exec(dateOfBirth) : null;
  if (!match) {
    return null;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return null;
  }
  let age = now.getUTCFullYear() - year;
  const before = now.getUTCMonth() + 1 < month || (now.getUTCMonth() + 1 === month && now.getUTCDate() < day);
  if (before) {
    age -= 1;
  }
  return age < 0 ? null : age;
}
