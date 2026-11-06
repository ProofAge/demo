export type DecisionTiming = { seconds: number; approximate: boolean };

const DECISIONS = new Set(['approved', 'declined', 'resubmission_requested']);

/**
 * Seconds from submission to the decision webhook. `submittedAt` comes from the API once it
 * ships; until then the demo's own first sighting of `submitted` stands in ("about").
 * Time spent taking photos is never counted.
 */
export function decisionTiming(input: {
  status: string;
  decidedAt: string | null;
  submittedAt: string | null;
  submittedSeenAt: string | null;
}): DecisionTiming | null {
  if (!DECISIONS.has(input.status)) {
    return null;
  }
  const decided = toMs(input.decidedAt);
  const exact = toMs(input.submittedAt);
  const start = exact ?? toMs(input.submittedSeenAt);
  if (decided === null || start === null || start > decided) {
    return null;
  }
  // Exact figures in tenths (decisions often take two or three seconds); our own sighting is only
  // good to a poll, so whole seconds.
  const ms = decided - start;
  const seconds = exact === null ? Math.round(ms / 1000) : Math.round(ms / 100) / 10;
  if (exact === null && seconds < 1) {
    // Our own sighting is only accurate to a poll: "about 0 s" would claim more than we know.
    return null;
  }
  return { seconds, approximate: exact === null };
}

/**
 * Whether this poll's sighting of `submitted` becomes the submission time: the first one, or a
 * new one after a resubmission (a stored event newer than the old sighting), so retaking photos
 * is not counted.
 */
export function shouldRecordSubmission(seenAt: string | null, latestEventAt: string | null): boolean {
  const seen = toMs(seenAt);
  if (seen === null) {
    return true;
  }
  const latest = toMs(latestEventAt);
  return latest !== null && latest > seen;
}

function toMs(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}
