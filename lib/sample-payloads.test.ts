import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { CHECKS } from './demo-pages.ts';
import { SAMPLE_CONSOLE, SAMPLE_PAYLOADS, sampleReceipt } from './sample-payloads.ts';

test('KYC sample has all eleven fields, age by ID four, selfie none', () => {
  assert.equal(Object.keys(SAMPLE_PAYLOADS.kyc.approved.document?.fields ?? {}).length, 11);
  assert.equal(Object.keys(SAMPLE_PAYLOADS['age-id'].approved.document?.fields ?? {}).length, 4);
  assert.equal(SAMPLE_PAYLOADS.selfie.approved.document, undefined);
  assert.equal(SAMPLE_PAYLOADS.kyc.approved.document?.issuing_country, 'FR');
  assert.equal(SAMPLE_PAYLOADS.kyc.approved.document?.fields.first_name, 'ALEX');
});

test('every sample has an approved and a declined variant with sample signals', () => {
  for (const check of CHECKS) {
    const { approved, declined } = SAMPLE_PAYLOADS[check];
    assert.equal(approved.status, 'approved');
    assert.equal(approved.reason, null);
    assert.equal(declined.status, 'declined');
    assert.ok(declined.reason);
    for (const p of [approved, declined]) {
      assert.equal(p.external_metadata?.sample, true);
      assert.equal(p.fingerprint_signals?.ip_country_code, 'FR');
      assert.equal(p.fingerprint_signals?.ip_address, '203.0.113.7');
    }
  }
});

test('the sample is obviously fake', () => {
  assert.ok(JSON.stringify(SAMPLE_PAYLOADS).includes('SAMPLE'));
});

test('the sample MRZ is two lines of 44 characters', () => {
  assert.equal(SAMPLE_CONSOLE.mrz.length, 2);
  for (const line of SAMPLE_CONSOLE.mrz) {
    assert.equal(line.length, 44);
  }
});

test('placeholder media exist on disk', () => {
  assert.equal(SAMPLE_CONSOLE.media.selfie.length, 1);
  assert.equal(SAMPLE_CONSOLE.media['age-id'].length, 3);
  assert.equal(SAMPLE_CONSOLE.media.kyc.length, 3);
  for (const slots of Object.values(SAMPLE_CONSOLE.media)) {
    for (const slot of slots) {
      assert.ok(existsSync(`public${slot.src}`), slot.src);
    }
  }
});

test('sample receipts are labelled and timed', () => {
  const receipt = sampleReceipt('kyc', 'approved');
  assert.equal(receipt.source, 'sample');
  assert.deepEqual(receipt.timing, { seconds: 2.4, approximate: false });
  assert.equal(receipt.status, 'approved');
  assert.equal(sampleReceipt('selfie', 'declined').reasonLabel, 'Under the age threshold');
});
