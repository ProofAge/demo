import type { WebhookPayload } from '@proofage/node';

/** The headers `webhookHandler` checked; only verified payloads are ever stored. */
export const SIGNATURE_HEADERS = ['X-Auth-Client', 'X-HMAC-Signature', 'X-Timestamp'] as const;

export type WebhookHistoryEntry = { status: string; timestamp: string };

export type WebhookRecord = {
  payload: WebhookPayload;
  receivedAt: string;
  deliveryId: string | null;
  history: WebhookHistoryEntry[];
};

const HISTORY_LIMIT = 10;

/** `data.updated` (a console correction) is acknowledged and ignored. Old retries carry no `event`. */
export function isStoredEvent(payload: WebhookPayload): boolean {
  const event = (payload as { event?: unknown }).event;
  return event === undefined || event === null || event === 'status.updated';
}

/** Only checks this demo created (`external_metadata.demo` is set at create): a reused workspace's other verifications stay out. */
export function isDemoPayload(payload: WebhookPayload): boolean {
  return typeof payload.external_metadata?.demo === 'string';
}

/** The latest event by its own timestamp wins; history is sorted, de-duplicated and capped. */
export function mergeWebhook(
  previous: WebhookRecord | null,
  incoming: { payload: WebhookPayload; receivedAt: string; deliveryId: string | null },
): WebhookRecord {
  const entries = [...(previous?.history ?? []), { status: incoming.payload.status, timestamp: incoming.payload.timestamp }];
  const history = entries
    .filter((entry, index) => entries.findIndex((other) => other.status === entry.status && other.timestamp === entry.timestamp) === index)
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .slice(-HISTORY_LIMIT);
  const latest =
    !previous || Date.parse(incoming.payload.timestamp) >= Date.parse(previous.payload.timestamp) ? incoming : previous;
  return { payload: latest.payload, receivedAt: latest.receivedAt, deliveryId: latest.deliveryId, history };
}
