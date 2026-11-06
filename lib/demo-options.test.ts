import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHECKS, LOOKS, OPENS } from './demo-pages.ts';
import { CHECK_LABELS, DEFAULT_OPTIONS, LOOK_LINE, optionsQuery, parseOptions } from './demo-options.ts';

test('defaults', () => {
  assert.deepEqual(DEFAULT_OPTIONS, { check: 'selfie', look: 'proofage', opens: 'popup' });
  assert.deepEqual(parseOptions({}), DEFAULT_OPTIONS);
});

test('valid values are taken', () => {
  assert.deepEqual(parseOptions({ check: 'kyc', look: 'lumo', open: 'tab' }), { check: 'kyc', look: 'lumo', opens: 'tab' });
  assert.deepEqual(parseOptions(new URLSearchParams('check=age-id')), { ...DEFAULT_OPTIONS, check: 'age-id' });
});

test('invalid values are ignored', () => {
  assert.deepEqual(parseOptions({ check: 'nope', look: ['lumo'], open: 'x' }), DEFAULT_OPTIONS);
  assert.deepEqual(parseOptions({ check: 'toString' }), DEFAULT_OPTIONS);
});

test('optionsQuery writes only non-defaults', () => {
  assert.equal(optionsQuery(DEFAULT_OPTIONS), '');
  assert.equal(optionsQuery({ check: 'kyc', look: 'proofage', opens: 'tab' }), '?check=kyc&open=tab');
});

test('round trip for all 18 combinations', () => {
  for (const check of CHECKS) for (const look of LOOKS) for (const opens of OPENS) {
    const o = { check, look, opens };
    assert.deepEqual(parseOptions(new URLSearchParams(optionsQuery(o))), o);
  }
});

test('copy', () => {
  assert.match(LOOK_LINE, /Lumo is a made-up brand/);
  assert.ok(!LOOK_LINE.includes('Powered by'));
  assert.equal(CHECK_LABELS.kyc, 'Identity (KYC)');
});
