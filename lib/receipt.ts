import type { Check } from './demo-pages.ts';
import { decisionTiming, type DecisionTiming } from './decision-timing.ts';
import { reasonLabel } from './reasons.ts';
import { redactPayload, type RedactedPayload } from './redaction.ts';
import type { WebhookHistoryEntry, WebhookRecord } from './webhook-record.ts';

/** Everything "What your system receives" shows, built on the server for the owner only. */
export type Receipt = {
  source: 'webhook' | 'sample';
  check: Check;
  status: string;
  reason: string | null;
  reasonLabel: string | null;
  timing: DecisionTiming | null;
  receivedAt: string;
  deliveryId: string | null;
  history: WebhookHistoryEntry[];
  payload: RedactedPayload;
  maskAll: boolean;
};

export function buildReceipt(input: {
  check: Check;
  record: WebhookRecord;
  submittedSeenAt: string | null;
  visitorId: string;
  maskAll: boolean;
  source?: Receipt['source'];
  /** Samples carry a fixed figure instead of a measurement. */
  timing?: DecisionTiming | null;
}): Receipt {
  const { payload } = input.record;
  const submittedAt = (payload as { submitted_at?: unknown }).submitted_at;
  return {
    source: input.source ?? 'webhook',
    check: input.check,
    status: payload.status,
    reason: payload.reason,
    reasonLabel: reasonLabel(payload.reason),
    timing:
      input.timing !== undefined
        ? input.timing
        : decisionTiming({
            status: payload.status,
            decidedAt: payload.timestamp,
            submittedAt: typeof submittedAt === 'string' ? submittedAt : null,
            submittedSeenAt: input.submittedSeenAt,
          }),
    receivedAt: input.record.receivedAt,
    deliveryId: input.record.deliveryId,
    history: input.record.history,
    payload: redactPayload(payload, { visitorId: input.visitorId, maskAll: input.maskAll }),
    maskAll: input.maskAll,
  };
}
