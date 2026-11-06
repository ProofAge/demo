import type { WebhookPayload } from '@proofage/node';
import type { ConsoleLive, LoadedResult } from './demo-result.ts';
import type { Receipt } from './receipt.ts';
import type { WebhookRecord } from './webhook-record.ts';

/**
 * The demo erases each check's personal data in ProofAge (photos, document fields, device data)
 * as soon as the visitor has seen the result. The page first copies what it shows into its own
 * memory, so the result stays on screen until a reload; after a reload only the status is left.
 * Checks nobody comes back for are erased by the workspaces' own one-day auto-erase.
 */

/** What the API accepts: `resubmission_requested` is not final, the person may still go back in. */
export const ERASABLE_STATUSES: ReadonlySet<string> = new Set(['approved', 'declined', 'abandoned', 'expired']);

export const ERASE_REQUEST = { reason_code: 'customer_request', reason: 'one-time public demo session' } as const;

/** How long the page waits for the webhook (it carries the document) before erasing without it. */
export const WEBHOOK_WAIT_MS = 30_000;

/** The API asks for a retry after about 3 s while the decision is settling or another erasure runs. */
export const ERASE_RETRY_MS = 3_000;
export const ERASE_ATTEMPTS = 10;

export type DemoErasure = {
  erasedAt: string;
  /** True while the page still shows the copy it kept in memory before the erasure. */
  keptInPage: boolean;
};

/** 409 (still processing, or another erasure running) and 503 (recordings not deleted, nothing erased) are worth a retry. */
export function eraseErrorIsRetryable(statusCode: number | null): boolean {
  return statusCode === 409 || statusCode === 503;
}

/** The webhook fields that are not personal data: a stored record keeps only these once the check is erased. */
const KEPT_PAYLOAD_KEYS = [
  'verification_id',
  'event',
  'status',
  'external_id',
  'external_metadata',
  'reason',
  'timestamp',
  'submitted_at',
  'duplicate_detected',
  'duplicate_count',
] as const;

export function scrubRecord(record: WebhookRecord): WebhookRecord {
  const source = record.payload as unknown as Record<string, unknown>;
  const payload = Object.fromEntries(KEPT_PAYLOAD_KEYS.filter((key) => Object.hasOwn(source, key)).map((key) => [key, source[key]]));
  return { ...record, payload: payload as unknown as WebhookPayload };
}

/** What the page copied before asking ProofAge to erase the check. */
export type KeptResult = {
  verificationId: string;
  status: string;
  console: ConsoleLive | null;
  receipt: Receipt | null;
  /** Set once ProofAge confirmed the erasure. */
  erasedAt: string | null;
};

/** The live result with the copy the page kept, so a poll after the erasure does not blank the screen. */
export function withKept(live: LoadedResult | null, kept: KeptResult | null): LoadedResult | null {
  if (!live || live.kind !== 'ok' || !kept || kept.verificationId !== live.verificationId || kept.status !== live.view.status) {
    return live;
  }
  const erasedAt = kept.erasedAt ?? live.erasure?.erasedAt ?? null;
  return {
    ...live,
    console: kept.console ?? live.console,
    receipt: kept.receipt ?? live.receipt,
    erasure: erasedAt ? { erasedAt, keptInPage: true } : null,
  };
}

/**
 * When to erase this result: null when there is nothing to erase, otherwise how many more ms to
 * wait for the webhook (0 = now). `firstSeenAt` is when this page first saw the decision.
 */
export function eraseDelay(live: LoadedResult | null, firstSeenAt: number, now: number): number | null {
  if (!live || live.kind !== 'ok' || live.erasure || !ERASABLE_STATUSES.has(live.view.status)) {
    return null;
  }
  const webhookIn = !live.storage || (live.receipt !== null && live.receipt.status === live.view.status);
  if (webhookIn || live.console === null) {
    return 0;
  }
  return Math.max(0, firstSeenAt + WEBHOOK_WAIT_MS - now);
}
