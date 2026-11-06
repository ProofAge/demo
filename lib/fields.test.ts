import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOCUMENT_FIELD_KEYS, FIELD_ROWS, receivedFields } from './fields.ts';

test('every document field the SDK declares has a row', () => {
  const covered = FIELD_ROWS.flatMap((row) => ('field' in row.source ? [row.source.field] : []));
  assert.deepEqual([...covered].sort(), [...DOCUMENT_FIELD_KEYS].sort());
});

const FULL = {
  document: {
    type: 'id',
    issuing_country: 'FR',
    fields: {
      first_name: 'ALEX', middle_name: 'J', last_name: 'SAMPLE', date_of_birth: '1990-04-12', gender: 'X', nationality: 'FR',
      place_of_birth: 'X', address: 'Y', document_number: '•••• 0000', issue_date: '2021-06-01', expiry_date: '2031-05-31',
    },
  },
};

test('age by ID: country and type first, then the four base fields', () => {
  assert.deepEqual(receivedFields('age-id', FULL).map((r) => r.label), [
    'Issuing country', 'Document type', 'First name', 'Last name', 'Date of birth', 'Document number',
  ]);
});

test('KYC: all eleven fields plus type and country', () => {
  const rows = receivedFields('kyc', FULL);
  assert.equal(rows.length, 13);
  assert.equal(rows.find((r) => r.label === 'Issue date')?.value, '2021-06-01');
});

test('null for a field not printed; empty without a document or for the selfie', () => {
  const rows = receivedFields('age-id', { document: { type: 'id', issuing_country: 'FR', fields: { first_name: 'A', last_name: null } } });
  assert.deepEqual(rows.find((r) => r.label === 'Last name'), { label: 'Last name', value: null });
  assert.deepEqual(receivedFields('kyc', { status: 'approved' }), []);
  assert.deepEqual(receivedFields('selfie', FULL), []);
});
