import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expiryMarker } from './document-expiry.ts';
import { receivedFields } from './fields.ts';

const TODAY = new Date(2026, 10, 6, 15, 30);

test('a past date is expired, today and later are valid', () => {
  assert.equal(expiryMarker('2026-10-13', TODAY), 'expired');
  assert.equal(expiryMarker('2026-11-05', TODAY), 'expired');
  assert.equal(expiryMarker('2026-11-06', TODAY), 'valid', 'expiring today is still valid');
  assert.equal(expiryMarker('2031-05-31', TODAY), 'valid');
});

test('a month-only date reads as the first of that month', () => {
  assert.equal(expiryMarker('2026-11', TODAY), 'expired');
  assert.equal(expiryMarker('2026-12', TODAY), 'valid');
});

test('no marker for anything that is not a date', () => {
  for (const value of [null, '', 'unknown', '2026-13-01', '2026-02-30', '31.05.2031']) {
    assert.equal(expiryMarker(value, TODAY), null, String(value));
  }
});

test('only the expiry date row is marked, and only when a date to compare with is given', () => {
  const payload = { document: { type: 'id', issuing_country: 'FR', fields: { issue_date: '2016-10-13', expiry_date: '2026-10-13' } } };
  const rows = receivedFields('kyc', payload, TODAY);
  assert.equal(rows.find((row) => row.label === 'Expiry date')?.expiry, 'expired');
  assert.equal(rows.find((row) => row.label === 'Issue date')?.expiry, undefined);
  assert.equal(receivedFields('kyc', payload).find((row) => row.label === 'Expiry date')?.expiry, undefined);
});
