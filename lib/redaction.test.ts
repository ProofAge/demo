import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { WebhookPayload } from '@proofage/node';
import { documentForOwner, FOREIGN_DUPLICATE, maskForDisplay, maskTail, MASK, OMITTED_STAFF, redactPayload } from './redaction.ts';

const VISITOR = 'visitorAAAAAAAAAAAAAAA';

function payload(extra: Partial<WebhookPayload> = {}): WebhookPayload {
  return {
    verification_id: '01a0eed6-610b-73b2-94d0-117ec4a8455b',
    status: 'approved',
    external_id: VISITOR,
    external_metadata: { demo: 'kyc' },
    reason: null,
    timestamp: '2026-10-13T10:00:12Z',
    document: {
      type: 'id',
      issuing_country: 'FR',
      fields: {
        first_name: 'ERIC',
        middle_name: null,
        last_name: 'MARTIN',
        date_of_birth: '1990-01-02',
        place_of_birth: 'PARIS',
        address: '1 RUE X 75000 PARIS',
        document_number: 'X1234821',
      },
    },
    ...extra,
  };
}

const fields = (p: Record<string, unknown>) => (p.document as { fields: Record<string, unknown> }).fields;

test('maskTail keeps the last four characters', () => {
  assert.equal(maskTail('X1234821'), '•••• 4821');
  assert.equal(maskTail('AB 12 34 56'), '•••• 3456');
  assert.equal(maskTail('1234'), '••••');
});

test('device signals reach the owner as sent; the external id is masked', () => {
  const signals = { ip_address: '1.2.3.4', ip_country_code: 'FR', ip_timezone: 'Europe/Paris', device_timezone: 'Europe/Paris' };
  const out = redactPayload(payload({ fingerprint_signals: signals }), { visitorId: VISITOR, maskAll: false });
  assert.deepEqual(out.fingerprint_signals, signals);
  assert.equal(out.external_id, '•••• AAAA');
});

test('maskAll hides the IP but keeps the country', () => {
  const out = redactPayload(payload({ fingerprint_signals: { ip_address: '1.2.3.4', ip_country_code: 'FR' } }), { visitorId: VISITOR, maskAll: true });
  assert.deepEqual(out.fingerprint_signals, { ip_address: MASK, ip_country_code: 'FR' });
  assert.ok(!JSON.stringify(out).includes('1.2.3.4'));
});

test('no fingerprint key when none was sent', () => {
  assert.equal('fingerprint_signals' in redactPayload(payload(), { visitorId: VISITOR, maskAll: false }), false);
});

test('duplicate_of is shown only when it is this visitor', () => {
  const own = { verification_id: 'a', external_id: VISITOR };
  const foreign = { verification_id: 'b', external_id: 'someoneElseBBBBBBBBBBB' };
  assert.deepEqual(redactPayload(payload({ duplicate_detected: true, duplicate_count: 1, duplicate_of: own }), { visitorId: VISITOR, maskAll: false }).duplicate_of, {
    verification_id: 'a',
    external_id: '•••• AAAA',
  });
  const out = redactPayload(payload({ duplicate_detected: true, duplicate_count: 1, duplicate_of: foreign }), { visitorId: VISITOR, maskAll: false });
  assert.equal(out.duplicate_of, FOREIGN_DUPLICATE);
  assert.ok(!JSON.stringify(out).includes('someoneElse'));
});

test('without maskAll the fields reach the owner in full', () => {
  const out = redactPayload(payload(), { visitorId: VISITOR, maskAll: false });
  assert.equal(fields(out).document_number, 'X1234821');
  assert.equal(fields(out).first_name, 'ERIC');
});

test('maskAll masks names, dates, places and numbers before they leave the server', () => {
  const out = redactPayload(payload(), { visitorId: VISITOR, maskAll: true });
  for (const key of ['first_name', 'last_name', 'date_of_birth', 'place_of_birth', 'address', 'document_number']) {
    assert.equal(fields(out)[key], '••••', key);
  }
  assert.equal(fields(out).middle_name, null);
  assert.ok(!JSON.stringify(out).includes('4821'));
});

test('redaction does not mutate its input', () => {
  const input = payload({ fingerprint_signals: { ip_address: '1.2.3.4' } });
  redactPayload(input, { visitorId: VISITOR, maskAll: true });
  assert.equal(input.document?.fields.document_number, 'X1234821');
  assert.deepEqual(input.fingerprint_signals, { ip_address: '1.2.3.4' });
});

test('maskForDisplay hides the document number and address until Reveal', () => {
  const shown = maskForDisplay(redactPayload(payload(), { visitorId: VISITOR, maskAll: false }));
  assert.equal(fields(shown).document_number, '•••• 4821');
  assert.equal(fields(shown).address, '•••• ARIS');
  assert.equal(fields(shown).first_name, 'ERIC');
});

test('documentForOwner keeps the document, masks it when recording, and does not mutate', () => {
  const doc = { type: 'id', issuing_country: 'FR', fields: { first_name: 'ERIC', document_number: 'X1234821' } };
  assert.deepEqual(documentForOwner(doc, false), doc);
  const masked = documentForOwner(doc, true) as { fields: Record<string, unknown> };
  assert.equal(masked.fields.first_name, '••••');
  assert.equal(masked.fields.document_number, '••••');
  assert.equal(doc.fields.first_name, 'ERIC');
});

test('payloads without a document survive', () => {
  const bare = payload();
  delete bare.document;
  assert.equal(redactPayload(bare, { visitorId: VISITOR, maskAll: true }).document, undefined);
  assert.equal(maskForDisplay({ status: 'approved' }).status, 'approved');
});

test('the console user behind a manual decision is never shown', () => {
  const out = redactPayload(
    payload({
      manual_moderation: {
        action: 'approve',
        reason: 'looks fine',
        source: 'landlord_admin',
        performed_by: { id: 7, name: 'Staff Person', email: 'staff@proofage.net', role: 'admin' },
      },
    }),
    { visitorId: VISITOR, maskAll: false },
  );
  assert.ok(!JSON.stringify(out).includes('staff@proofage.net'));
  assert.ok(!JSON.stringify(out).includes('Staff Person'));
  assert.deepEqual(out.manual_moderation, { action: 'approve', reason: 'looks fine', source: 'landlord_admin', performed_by: OMITTED_STAFF });
});
