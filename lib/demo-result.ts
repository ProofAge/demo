export type DemoState =
  | 'not_finished'
  | 'checking'
  | 'in_review'
  | 'approved_named'
  | 'approved_guest'
  | 'retry'
  | 'declined'
  | 'ended'
  | 'unknown';

export type ResultView = {
  state: DemoState;
  /** True while the page should keep polling for a decision. */
  pending: boolean;
  status: string;
  reason: string | null;
  firstName: string | null;
  /** The hosted verification URL, where the person can still go back in. */
  continueUrl: string | null;
};

export type LoadedResult = { kind: 'no_session' } | { kind: 'error' } | { kind: 'ok'; slug: string; view: ResultView };

const STATES: Record<string, DemoState> = {
  created: 'not_finished',
  started: 'not_finished',
  submitted: 'checking',
  review: 'in_review',
  resubmission_requested: 'retry',
  declined: 'declined',
  abandoned: 'ended',
  expired: 'ended',
};

export function toResultView(status: string, reason: string | null, firstName: string | null, sessionUrl: string): ResultView {
  const name = status === 'approved' ? firstName : null;
  const state: DemoState =
    status === 'approved' ? (name ? 'approved_named' : 'approved_guest') : (Object.hasOwn(STATES, status) ? STATES[status] : 'unknown');
  return {
    state,
    pending: state === 'checking' || state === 'in_review',
    status,
    reason,
    firstName: name,
    continueUrl: state === 'not_finished' || state === 'retry' ? sessionUrl : null,
  };
}

/** Documents print names in capitals; show "Jean-Pierre", not "JEAN-PIERRE". */
export function normaliseFirstName(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const collapsed = raw.trim().replace(/\s+/g, ' ');
  if (!collapsed) {
    return null;
  }
  return collapsed
    .toLocaleLowerCase()
    .replace(/(^|[\s\-'’])(\p{L})/gu, (_match, separator: string, letter: string) => separator + letter.toLocaleUpperCase());
}

/**
 * A verification belongs to this browser only when its external_id is the visitor cookie.
 * Anything else looks exactly like "no session", so the page never says why.
 */
export function resultFromVerification(input: {
  slug: string;
  sessionUrl: string;
  visitorId: string;
  verification: { external_id: string | null; status: string; reason: string | null } | null;
  firstName: string | null;
}): LoadedResult {
  const { verification } = input;
  if (!verification || verification.external_id !== input.visitorId) {
    return { kind: 'no_session' };
  }
  return {
    kind: 'ok',
    slug: input.slug,
    view: toResultView(verification.status, verification.reason, input.firstName, input.sessionUrl),
  };
}
