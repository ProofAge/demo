/** "Valid" or "Expired" next to the document's expiry date, as the ProofAge console shows it. */
export type ExpiryMarker = 'valid' | 'expired';

/**
 * Same rule as the console: a month-only date ("2031-05") reads as the first day of that month, and a
 * document expiring on the reference day is still valid. Anything that is not a date gets no marker.
 */
export function expiryMarker(value: string | null, reference: Date): ExpiryMarker | null {
  const match = value ? /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value.trim()) : null;
  if (!match || Number.isNaN(reference.getTime())) {
    return null;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]) - 1, match[3] ? Number(match[3]) : 1];
  const expiry = new Date(year, month, day);
  if (expiry.getFullYear() !== year || expiry.getMonth() !== month || expiry.getDate() !== day) {
    return null;
  }
  const today = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  return expiry < today ? 'expired' : 'valid';
}
