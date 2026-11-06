import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { WebhookPayload } from '@proofage/node';
import { buildReceipt } from './receipt.ts';
import type { WebhookRecord } from './webhook-record.ts';

const VISITOR = 'visitorAAAAAAAAAAAAAAA';

function record(extra: Partial<WebhookPayload> = {}): WebhookRecord {
  const payload: WebhookPayload = {
    verification_id: 'v',
    status: 'declined',
    external_id: VISITOR,
    external_metadata: null,
    reason: 'aml.blocklist.face_match',
    timestamp: '2026-10-13T10:00:12Z',
    ...extra,
  };
  return { payload, receivedAt: '2026-10-13T10:00:13Z', deliveryId: 'del_1', history: [{ status: payload.status, timestamp: payload.timestamp }] };
}

test('summary, timing and labels come from the payload', () => {
  const receipt = buildReceipt({ check: 'kyc', record: record(), submittedSeenAt: '2026-10-13T10:00:04Z', visitorId: VISITOR, maskAll: false });
  assert.equal(receipt.source, 'webhook');
  assert.equal(receipt.status, 'declined');
  assert.equal(receipt.reasonLabel, 'Face blocklist match');
  assert.deepEqual(receipt.timing, { seconds: 8, approximate: true });
  assert.equal(receipt.deliveryId, 'del_1');
  assert.equal('ownDuplicate' in receipt, false);
});

test('submitted_at from the API wins over the demo measurement', () => {
  const receipt = buildReceipt({
    check: 'age-id',
    record: record({ status: 'approved', reason: null, submitted_at: '2026-10-13T10:00:10Z' } as Partial<WebhookPayload>),
    submittedSeenAt: '2026-10-13T10:00:04Z',
    visitorId: VISITOR,
    maskAll: false,
  });
  assert.deepEqual(receipt.timing, { seconds: 2, approximate: false });
});

test('the payload in the receipt is redacted, device signals kept for the owner', () => {
  const kept = buildReceipt({ check: 'kyc', record: record({ fingerprint_signals: { ip_address: '1.2.3.4' } }), submittedSeenAt: null, visitorId: VISITOR, maskAll: false });
  assert.deepEqual(kept.payload.fingerprint_signals, { ip_address: '1.2.3.4' });
  const masked = buildReceipt({ check: 'kyc', record: record({ fingerprint_signals: { ip_address: '1.2.3.4' } }), submittedSeenAt: null, visitorId: VISITOR, maskAll: true });
  assert.ok(!JSON.stringify(masked).includes('1.2.3.4'));
  assert.equal(masked.maskAll, true);
});

test('a sample receipt keeps the given timing', () => {
  const receipt = buildReceipt({ check: 'kyc', record: record(), submittedSeenAt: null, visitorId: VISITOR, maskAll: false, source: 'sample', timing: { seconds: 8, approximate: false } });
  assert.equal(receipt.source, 'sample');
  assert.deepEqual(receipt.timing, { seconds: 8, approximate: false });
});
