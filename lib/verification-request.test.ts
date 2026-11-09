import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verificationRequest } from './verification-request.ts';

test('a demo verification names its visitor and its demo', () => {
  assert.deepEqual(verificationRequest({ visitorId: 'visitor', slug: 'selfie', page: '/' }), {
    external_id: 'visitor',
    external_metadata: { demo: 'selfie', page: '/' },
  });
});

test('it asks for no redirect: the SDK would reload the page and lose the copy of the erased result', () => {
  assert.equal('callback_url' in verificationRequest({ visitorId: 'visitor', slug: 'kyc', page: '/' }), false);
});
