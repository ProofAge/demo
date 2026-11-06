import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { WebhookPayload } from '@proofage/node';
import * as webhookRecord from './webhook-record.ts';
import { isDemoPayload, isStoredEvent, mergeWebhook } from './webhook-record.ts';

function event(status: string, timestamp: string, extra: Record<string, unknown> = {}): WebhookPayload {
  return { verification_id: 'v', status, external_id: 'x', external_metadata: null, reason: null, timestamp, ...extra } as WebhookPayload;
}

test('only status.updated (or no event) is stored', () => {
  assert.equal(isStoredEvent(event('approved', 't')), true);
  assert.equal(isStoredEvent(event('approved', 't', { event: 'status.updated' })), true);
  assert.equal(isStoredEvent(event('approved', 't', { event: 'data.updated' })), false);
});

test('first event starts the record', () => {
  const record = mergeWebhook(null, { payload: event('approved', '2026-10-13T10:00:00Z'), receivedAt: 'r1', deliveryId: 'd1' });
  assert.equal(record.payload.status, 'approved');
  assert.equal(record.deliveryId, 'd1');
  assert.deepEqual(record.history, [{ status: 'approved', timestamp: '2026-10-13T10:00:00Z' }]);
});

test('a later event replaces the payload and extends the history', () => {
  const first = mergeWebhook(null, { payload: event('resubmission_requested', '2026-10-13T10:00:00Z'), receivedAt: 'r1', deliveryId: 'd1' });
  const second = mergeWebhook(first, { payload: event('approved', '2026-10-13T10:01:00Z'), receivedAt: 'r2', deliveryId: 'd2' });
  assert.equal(second.payload.status, 'approved');
  assert.equal(second.receivedAt, 'r2');
  assert.deepEqual(second.history.map((h) => h.status), ['resubmission_requested', 'approved']);
});

test('a late retry of an older event keeps the newer payload', () => {
  const decided = mergeWebhook(null, { payload: event('approved', '2026-10-13T10:01:00Z'), receivedAt: 'r2', deliveryId: 'd2' });
  const late = mergeWebhook(decided, { payload: event('resubmission_requested', '2026-10-13T10:00:00Z'), receivedAt: 'r3', deliveryId: 'd1' });
  assert.equal(late.payload.status, 'approved');
  assert.equal(late.deliveryId, 'd2');
  assert.deepEqual(late.history.map((h) => h.status), ['resubmission_requested', 'approved']);
});

test('a retried delivery does not duplicate history', () => {
  const once = mergeWebhook(null, { payload: event('approved', '2026-10-13T10:01:00Z'), receivedAt: 'r1', deliveryId: 'd1' });
  const twice = mergeWebhook(once, { payload: event('approved', '2026-10-13T10:01:00Z'), receivedAt: 'r2', deliveryId: 'd1' });
  assert.equal(twice.history.length, 1);
});

test('history is capped at 10 entries', () => {
  let record = null;
  for (let i = 0; i < 15; i += 1) {
    record = mergeWebhook(record, { payload: event('resubmission_requested', `2026-10-13T10:00:${String(i).padStart(2, '0')}Z`), receivedAt: 'r', deliveryId: null });
  }
  assert.equal(record?.history.length, 10);
  assert.equal(record?.history[9].timestamp, '2026-10-13T10:00:14Z');
});

test('only demo verifications are kept, without device signals', () => {
  assert.equal(isDemoPayload(event('approved', 't', { external_metadata: { demo: 'kyc', page: '/courses' } })), true);
  assert.equal(isDemoPayload(event('approved', 't', { external_metadata: { order: 42 } })), false);
  assert.equal(isDemoPayload(event('approved', 't')), false);
  assert.equal('forStorage' in webhookRecord, false, 'device signals are stored for the owner');
});
