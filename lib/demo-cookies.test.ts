import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isVisitorId, newVisitorId, parseSession, serializeSession } from './demo-cookies.ts';

test('visitor ids are 22-char base64url and unique', () => {
  const a = newVisitorId();
  const b = newVisitorId();
  assert.match(a, /^[A-Za-z0-9_-]{22}$/);
  assert.notEqual(a, b);
  assert.equal(isVisitorId(a), true);
});

test('isVisitorId rejects anything else', () => {
  assert.equal(isVisitorId(undefined), false);
  assert.equal(isVisitorId(''), false);
  assert.equal(isVisitorId('short'), false);
  assert.equal(isVisitorId('a'.repeat(21) + '!'), false);
});

test('session round-trips', () => {
  const session = { slug: 'eudi-wallet', verificationId: '01a0eed6-610b-73b2-94d0-117ec4a8455b', url: 'https://idv.proofage.net/v/tok' };
  assert.deepEqual(parseSession(serializeSession(session)), session);
});

test('parseSession rejects garbage', () => {
  assert.equal(parseSession(undefined), null);
  assert.equal(parseSession(''), null);
  assert.equal(parseSession('not json'), null);
  assert.equal(parseSession('[]'), null);
  assert.equal(parseSession(JSON.stringify({ slug: 'x', verificationId: '01a0eed6-610b-73b2-94d0-117ec4a8455b' })), null);
  assert.equal(parseSession(JSON.stringify({ slug: 1, verificationId: '01a0eed6-610b-73b2-94d0-117ec4a8455b', url: 'https://a.b' })), null);
});

test('parseSession rejects non-http urls', () => {
  const base = { slug: 'ember-box', verificationId: '01a0eed6-610b-73b2-94d0-117ec4a8455b' };
  assert.equal(parseSession(JSON.stringify({ ...base, url: 'javascript:alert(1)' })), null);
  assert.equal(parseSession(JSON.stringify({ ...base, url: 'data:text/html,x' })), null);
  assert.equal(parseSession(JSON.stringify({ ...base, url: 'not a url' })), null);
  assert.notEqual(parseSession(JSON.stringify({ ...base, url: 'https://proofage.test/v/t' })), null);
});

test('parseSession requires a UUID verification id', () => {
  const base = { slug: 'ember-box', url: 'https://proofage.test/v/t' };
  assert.notEqual(parseSession(JSON.stringify({ ...base, verificationId: '01A0EED6-610B-73B2-94D0-117EC4A8455B' })), null);
  assert.equal(parseSession(JSON.stringify({ ...base, verificationId: '../x' })), null);
  assert.equal(parseSession(JSON.stringify({ ...base, verificationId: 'abc' })), null);
});
