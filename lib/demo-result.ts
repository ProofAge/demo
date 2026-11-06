import { checkOf, type Check, type DemoPage, type WorkspaceSlug } from './demo-pages.ts';
import type { ConsoleInput } from './console-view.ts';
import type { Receipt } from './receipt.ts';

export type DemoState =
  | 'not_finished'
  | 'checking'
  | 'approved'
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
  /** The hosted verification URL, where the person can still go back in. */
  continueUrl: string | null;
  /** When the decision was made (webhook timestamp, else the verification's updated_at). */
  decidedAt: string | null;
};

/** What the server read for the console replica, once the verification has a decision. */
export type ConsoleLive = {
  workspaceName: string | null;
  url: string;
  createdAt: string;
  updatedAt: string;
  /** Masked to its last four characters. */
  externalId: string | null;
  metadata: Record<string, unknown> | null;
  attemptId: string | null;
  /** The document as read from the API, so the page has it before the webhook arrives. */
  document: Record<string, unknown> | null;
  estimation: ConsoleInput['estimation'];
  media: ConsoleInput['media'];
};

export type LoadedResult =
  | { kind: 'no_session' }
  | { kind: 'error' }
  | {
      kind: 'ok';
      verificationId: string;
      slug: WorkspaceSlug;
      check: Check;
      page: DemoPage;
      view: ResultView;
      receipt: Receipt | null;
      storage: boolean;
      console: ConsoleLive | null;
    };

/** ProofAge has no manual review in production; a test workspace's `review` is still "checking". */
const STATES: Record<string, DemoState> = {
  created: 'not_finished',
  started: 'not_finished',
  submitted: 'checking',
  review: 'checking',
  resubmission_requested: 'retry',
  declined: 'declined',
  abandoned: 'ended',
  expired: 'ended',
};

export function toResultView(
  status: string,
  reason: string | null,
  sessionUrl: string,
  decidedAt: string | null = null,
): ResultView {
  const state: DemoState = status === 'approved' ? 'approved' : Object.hasOwn(STATES, status) ? STATES[status] : 'unknown';
  return {
    state,
    pending: state === 'checking',
    status,
    reason,
    continueUrl: state === 'not_finished' || state === 'retry' ? sessionUrl : null,
    decidedAt: state === 'approved' || state === 'declined' || state === 'retry' ? decidedAt : null,
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
  verificationId: string;
  slug: WorkspaceSlug;
  page: DemoPage;
  sessionUrl: string;
  visitorId: string;
  verification: { external_id: string | null; status: string; reason: string | null } | null;
  decidedAt: string | null;
}): LoadedResult {
  const { verification } = input;
  if (!verification || verification.external_id !== input.visitorId) {
    return { kind: 'no_session' };
  }
  return {
    kind: 'ok',
    verificationId: input.verificationId,
    slug: input.slug,
    check: checkOf(input.slug),
    page: input.page,
    view: toResultView(verification.status, verification.reason, input.sessionUrl, input.decidedAt),
    receipt: null,
    storage: false,
    console: null,
  };
}
