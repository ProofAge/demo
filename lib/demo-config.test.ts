import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isMaskAll } from './demo-config.ts';

test('mask-all only on the exact string true', () => {
  assert.equal(isMaskAll({ DEMO_MASK_ALL: 'true' }), true);
  assert.equal(isMaskAll({ DEMO_MASK_ALL: 'false' }), false);
  assert.equal(isMaskAll({ DEMO_MASK_ALL: '1' }), false);
  assert.equal(isMaskAll({}), false);
});
