import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reasonLabel } from './reasons.ts';

test('blocklist and age codes have our labels', () => {
  assert.equal(reasonLabel('aml.blocklist.face_match'), 'Face blocklist match');
  assert.equal(reasonLabel('aml.blocklist.device_match'), 'Device blocklist match');
  assert.equal(reasonLabel('verification.age_threshold.failed'), 'Under the age threshold');
  assert.equal(reasonLabel('document.face.mismatch'), 'The selfie does not match the document photo');
});

test('unknown and empty codes pass through unlabelled', () => {
  assert.equal(reasonLabel('document.something.new'), null);
  assert.equal(reasonLabel('toString'), null);
  assert.equal(reasonLabel(null), null);
});
