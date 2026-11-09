import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSummary, contextLine, type SummaryInput } from './summary.ts';

const NOW = new Date('2026-11-05T12:00:00Z');

const ID_PAYLOAD = {
  document: {
    type: 'id',
    issuing_country: 'FR',
    fields: { first_name: 'ALEX', last_name: 'SAMPLE', date_of_birth: '1990-04-12', document_number: 'SAMPLE0000' },
  },
};
const KYC_FIELDS = {
  middle_name: 'JORDAN', gender: 'X', nationality: 'FR', place_of_birth: 'SAMPLEVILLE', address: '1 RUE', issue_date: '2021-06-01', expiry_date: '2031-05-31',
};
const kycPayload = (dob: string) => ({
  document: { type: 'id', issuing_country: 'FR', fields: { ...ID_PAYLOAD.document.fields, ...KYC_FIELDS, date_of_birth: dob } },
});

function input(extra: Partial<SummaryInput>): SummaryInput {
  return {
    check: 'selfie', sample: false, status: 'approved', reason: null, reasonLabel: null, payload: null,
    timing: { seconds: 8, approximate: false }, delivery: 'signed', now: NOW, ...extra,
  };
}
const DELIVERED = 'as a signed webhook, signature verified';

test('selfie approved', () => {
  const s = buildSummary(input({}));
  assert.deepEqual(s.badge, { label: 'Approved', tone: 'ok' });
  assert.deepEqual(s.lines, [
    { label: 'Over 18', value: 'Yes' },
    { label: 'Personal data', value: 'None: no name, no date of birth, no document' },
    { label: 'Decision time', value: '8 s after submission' },
    { label: 'Delivered', value: DELIVERED },
  ]);
  assert.equal(s.allFields, null);
});

test('exact timing under ten seconds keeps one decimal', () => {
  assert.equal(buildSummary(input({ timing: { seconds: 2.4, approximate: false } })).lines[2].value, '2.4 s after submission');
  assert.equal(buildSummary(input({ timing: { seconds: 12.6, approximate: false } })).lines[2].value, '13 s after submission');
});

test('approximate timing says about, missing timing drops the line', () => {
  assert.equal(buildSummary(input({ timing: { seconds: 8, approximate: true } })).lines[2].value, 'about 8 s after submission');
  assert.deepEqual(buildSummary(input({ timing: null })).lines.map((l) => l.label), ['Over 18', 'Personal data', 'Delivered']);
});

test('age check by ID approved', () => {
  const s = buildSummary(input({ check: 'age-id', payload: ID_PAYLOAD }));
  assert.deepEqual(s.lines, [
    { label: 'Over 18', value: 'Yes' },
    { label: 'Name', value: 'Alex Sample' },
    { label: 'Date of birth', value: '1990-04-12 — 36 y.o.' },
    { label: 'Document', value: 'ID · FR · no. •••• 0000' },
    { label: 'Decision time', value: '8 s after submission' },
    { label: 'Delivered', value: DELIVERED },
  ]);
  assert.equal(s.allFields, null);
});

test('KYC of a 15-year-old: no Over 18 line, age shown, all fields behind the toggle', () => {
  const s = buildSummary(input({ check: 'kyc', payload: kycPayload('2011-03-01') }));
  assert.equal(s.badge.label, 'Approved');
  assert.ok(!s.lines.some((l) => l.label === 'Over 18'));
  assert.equal(s.lines.find((l) => l.label === 'Date of birth')?.value, '2011-03-01 — 15 y.o.');
  assert.equal(s.allFields?.length, 13);
});

test('a date of birth that cannot be read gets no age and no crash', () => {
  for (const dob of ['••••', '']) {
    const s = buildSummary(input({ check: 'kyc', payload: kycPayload(dob) }));
    const value = s.lines.find((l) => l.label === 'Date of birth')?.value;
    assert.ok(value && !value.includes('y.o.'), dob);
  }
  const none = buildSummary(input({ check: 'kyc', payload: { document: { type: 'id', issuing_country: 'FR', fields: { first_name: null, last_name: null, date_of_birth: null, document_number: null } } } }));
  assert.equal(none.lines.find((l) => l.label === 'Name')?.value, 'Not printed');
});

test('declined shows the reason in words and no fields', () => {
  const s = buildSummary(input({ check: 'kyc', status: 'declined', reason: 'document.face.mismatch', reasonLabel: 'The selfie does not match the document photo', payload: kycPayload('1990-04-12') }));
  assert.deepEqual(s.badge, { label: 'Declined', tone: 'danger' });
  assert.deepEqual(s.lines, [
    { label: 'Reason', value: 'The selfie does not match the document photo' },
    { label: 'Decision time', value: '8 s after submission' },
    { label: 'Delivered', value: 'Same webhook, with status: declined' },
  ]);
  assert.equal(s.allFields, null);
});

test('an unknown reason code is shown as sent', () => {
  const s = buildSummary(input({ status: 'declined', reason: 'document.new.code', reasonLabel: null }));
  assert.equal(s.lines[0].value, 'document.new.code');
});

test('resubmission requested', () => {
  const s = buildSummary(input({ status: 'resubmission_requested', reason: 'document.front.blur.high', reasonLabel: 'Document front too blurry' }));
  assert.deepEqual(s.badge, { label: 'Resubmission requested', tone: 'warn' });
  assert.equal(s.lines.at(-1)?.value, 'Same webhook, with status: resubmission requested');
});

test('delivery variants', () => {
  assert.equal(buildSummary(input({ delivery: 'sample' })).lines.at(-1)?.value, 'sample payload, not signed');
  assert.equal(buildSummary(input({ delivery: 'pending' })).lines.at(-1)?.value, 'waiting for the webhook');
  assert.equal(buildSummary(input({ delivery: 'unconfigured' })).lines.at(-1)?.value, 'not shown, webhook storage is not configured on this deployment');
});

test('a selfie check that fell back to an ID shows what arrived', () => {
  const s = buildSummary(input({ check: 'selfie', payload: ID_PAYLOAD }));
  assert.ok(s.lines.some((l) => l.label === 'Name' && l.value === 'Alex Sample'));
  assert.ok(!s.lines.some((l) => l.label === 'Personal data'), 'personal data did arrive');
});

test('context line', () => {
  const at = new Date('2026-11-05T14:02:00');
  assert.match(contextLine({ check: 'age-id', look: 'proofage', opens: 'popup', at, sample: false }), /^Age verification by ID · over this page · ProofAge look · \d\d:\d\d$/);
  assert.match(contextLine({ check: 'kyc', look: 'lumo', opens: 'tab', at, sample: false }), /^Identity verification \(KYC\) · in a new tab · Lumo look · \d\d:\d\d$/);
  assert.equal(contextLine({ check: 'selfie', look: 'proofage', opens: null, at: null, sample: false }), 'Facial age estimation · ProofAge look');
  assert.equal(contextLine({ check: 'selfie', look: 'lumo', opens: 'popup', at, sample: true }), 'Facial age estimation · Lumo look');
});

test('a selfie check with an empty document (nothing read) shows no document lines, and says no personal data arrived', () => {
  const empty = { document: { type: null, issuing_country: null, fields: { first_name: null, last_name: null, date_of_birth: null, document_number: null } } };
  assert.deepEqual(buildSummary(input({ check: 'selfie', payload: empty })).lines.map((l) => l.label), ['Over 18', 'Personal data', 'Decision time', 'Delivered']);
});
