import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { WebhookPayload } from '@proofage/node';
import { toDisplay, pollMode } from './demo-display.ts';
import { toResultView, type LoadedResult } from './demo-result.ts';
import { eraseDelay, eraseErrorIsRetryable, ERASE_REQUEST, scrubRecord, WEBHOOK_WAIT_MS, withKept, type KeptResult } from './erasure.ts';
import type { Receipt } from './receipt.ts';
import { erasedText } from './summary.ts';
import type { WebhookRecord } from './webhook-record.ts';

const NOW = Date.parse('2026-11-06T12:00:00Z');
const CONSOLE = {
  workspaceName: 'KYC [DEMO]',
  url: 'https://idv.example/v/abc',
  createdAt: '2026-11-06T11:58:00Z',
  updatedAt: '2026-11-06T11:59:50Z',
  externalId: '•••• AAAA',
  metadata: null,
  attemptId: 'a1',
  document: { type: 'id', issuing_country: 'FR', fields: { first_name: 'JEAN', last_name: 'DUPONT', date_of_birth: '1990-01-02' } },
  estimation: null,
  media: [{ label: 'Selfie', src: '/api/demo-media?id=m1' }],
};

const receipt = (status: string) => ({ status, payload: { status } }) as unknown as Receipt;

const live = (status: string, extra: Partial<Extract<LoadedResult, { kind: 'ok' }>> = {}): Extract<LoadedResult, { kind: 'ok' }> => ({
  kind: 'ok',
  verificationId: 'v1',
  slug: 'kyc',
  check: 'kyc',
  page: '/',
  view: toResultView(status, null, 'https://idv.example/v', '2026-11-06T11:59:50Z'),
  receipt: null,
  storage: true,
  console: CONSOLE,
  erasure: null,
  ...extra,
});

test('the demo erases as the customer, for a one-time session', () => {
  assert.deepEqual(ERASE_REQUEST, { reason_code: 'customer_request', reason: 'one-time public demo session' });
});

test('only final checks are erased; a resubmission may still be finished', () => {
  for (const status of ['approved', 'declined', 'abandoned', 'expired']) {
    assert.notEqual(eraseDelay(live(status, { receipt: receipt(status) }), NOW, NOW), null, status);
  }
  for (const status of ['created', 'started', 'submitted', 'review', 'resubmission_requested']) {
    assert.equal(eraseDelay(live(status), NOW, NOW), null, status);
  }
  assert.equal(eraseDelay({ kind: 'no_session' }, NOW, NOW), null);
  assert.equal(eraseDelay(null, NOW, NOW), null);
});

test('an erased check is not erased again', () => {
  assert.equal(eraseDelay(live('approved', { erasure: { erasedAt: '2026-11-06T12:00:00Z', keptInPage: false } }), NOW, NOW), null);
});

test('it waits for the webhook, but not longer than the webhook wait', () => {
  assert.equal(eraseDelay(live('approved'), NOW, NOW), WEBHOOK_WAIT_MS);
  assert.equal(eraseDelay(live('approved'), NOW, NOW + 10_000), WEBHOOK_WAIT_MS - 10_000);
  assert.equal(eraseDelay(live('approved'), NOW, NOW + WEBHOOK_WAIT_MS + 1), 0);
  assert.equal(eraseDelay(live('approved', { receipt: receipt('approved') }), NOW, NOW), 0, 'webhook in');
  assert.equal(eraseDelay(live('approved', { receipt: receipt('resubmission_requested') }), NOW, NOW), WEBHOOK_WAIT_MS, 'an older webhook is not this one');
  assert.equal(eraseDelay(live('approved', { storage: false }), NOW, NOW), 0, 'no webhook will be stored');
  assert.equal(eraseDelay(live('abandoned', { console: null }), NOW, NOW), 0, 'nothing to show');
});

test('409 and 503 are retried, anything else is not', () => {
  assert.equal(eraseErrorIsRetryable(409), true);
  assert.equal(eraseErrorIsRetryable(503), true);
  for (const status of [400, 403, 404, 422, 500, null]) {
    assert.equal(eraseErrorIsRetryable(status), false, String(status));
  }
});

test('a scrubbed webhook keeps the status and drops the document, device data and moderation', () => {
  const payload = {
    verification_id: 'v1',
    event: 'status.updated',
    status: 'approved',
    external_id: 'visitor',
    external_metadata: { demo: 'kyc' },
    reason: null,
    timestamp: '2026-11-06T11:59:50Z',
    submitted_at: '2026-11-06T11:59:40Z',
    document: { type: 'id', fields: { first_name: 'JEAN' } },
    fingerprint_signals: { ip_address: '192.0.2.1' },
    manual_moderation: { performed_by: 'x' },
    duplicate_of: { verification_id: 'v0', external_id: 'other' },
  } as unknown as WebhookPayload;
  const record: WebhookRecord = { payload, receivedAt: 'r', deliveryId: 'd', history: [{ status: 'approved', timestamp: 't' }] };
  const scrubbed = scrubRecord(record);
  assert.deepEqual(Object.keys(scrubbed.payload).sort(), ['event', 'external_id', 'external_metadata', 'reason', 'status', 'submitted_at', 'timestamp', 'verification_id']);
  assert.equal(scrubbed.deliveryId, 'd');
  assert.deepEqual(scrubbed.history, record.history);
  assert.ok('document' in record.payload, 'the original is not changed');
});

test('the kept copy outlives the erased poll that follows', () => {
  const keptConsole = { ...CONSOLE, media: [{ label: 'Selfie', src: 'blob:x' }] };
  const kept: KeptResult = { verificationId: 'v1', status: 'approved', console: keptConsole, receipt: receipt('approved'), erasedAt: '2026-11-06T12:00:05Z' };
  const afterErasure = live('approved', {
    console: { ...CONSOLE, document: null, media: [{ label: 'Selfie', src: null }] },
    erasure: { erasedAt: '2026-11-06T12:00:05Z', keptInPage: false },
  });
  const shown = withKept(afterErasure, kept);
  assert.equal(shown?.kind, 'ok');
  if (shown?.kind === 'ok') {
    assert.equal(shown.console, keptConsole);
    assert.equal(shown.receipt, kept.receipt);
    assert.deepEqual(shown.erasure, { erasedAt: '2026-11-06T12:00:05Z', keptInPage: true });
  }
  // Before ProofAge confirms, the page shows its copy without claiming anything was erased.
  const pending = withKept(live('approved'), { ...kept, erasedAt: null });
  assert.equal(pending?.kind === 'ok' && pending.erasure, null);
});

test('a kept copy of another check or status is ignored', () => {
  const kept: KeptResult = { verificationId: 'v0', status: 'approved', console: null, receipt: null, erasedAt: 'x' };
  const current = live('approved');
  assert.equal(withKept(current, kept), current);
  assert.equal(withKept(current, { ...kept, verificationId: 'v1', status: 'declined' }), current);
  assert.equal(withKept(current, null), current);
});

test('the summary says the data is gone from ProofAge, and whether the page still holds a copy', () => {
  assert.match(erasedText({ erasedAt: '2026-11-06T12:00:05Z', keptInPage: true }), /deleted from ProofAge at \d\d:\d\d\. This page keeps its copy until you reload it\.$/);
  assert.match(erasedText({ erasedAt: '2026-11-06T12:00:05Z', keptInPage: false }), /were deleted from ProofAge at \d\d:\d\d, right after you saw the result\.$/);
  const after = toDisplay(live('approved', { console: { ...CONSOLE, document: null }, erasure: { erasedAt: '2026-11-06T12:00:05Z', keptInPage: false } }), null, {
    now: new Date(NOW),
    started: null,
  });
  assert.equal(after?.summary.lines.find((line) => line.label === 'Erased')?.value.startsWith('Photos and personal data were deleted'), true);
  assert.equal(after?.summary.lines.some((line) => line.label === 'Name'), false, 'no document after a reload');
  assert.equal(after?.console.erased, true);
  assert.equal(after?.summary.lines.at(-1)?.value, 'the webhook did not arrive before the data was deleted');
  assert.equal(after?.console.technicalEmpty, 'Deleted with the personal data');
});

test('an erased check does not wait for its webhook', () => {
  assert.equal(pollMode(live('approved'), false), 'webhook');
  assert.equal(pollMode(live('approved', { erasure: { erasedAt: 'x', keptInPage: false } }), false), null);
});
