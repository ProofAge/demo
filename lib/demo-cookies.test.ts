import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isVisitorId, newVisitorId, parseSession, resultRedirectPath, serializeSession, sessionForPage } from './demo-cookies.ts';

const ID = '01a0eed6-610b-73b2-94d0-117ec4a8455b';
const BASE = { slug: 'kyc', page: '/', verificationId: ID, url: 'https://idv.proofage.net/v/tok' } as const;

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

test('session round-trips with its page', () => {
  assert.deepEqual(parseSession(serializeSession({ ...BASE })), BASE);
});

test('parseSession rejects garbage', () => {
  assert.equal(parseSession(undefined), null);
  assert.equal(parseSession(''), null);
  assert.equal(parseSession('not json'), null);
  assert.equal(parseSession('[]'), null);
  assert.equal(parseSession(JSON.stringify({ ...BASE, url: undefined })), null);
  assert.equal(parseSession(JSON.stringify({ ...BASE, slug: 1 })), null);
});

test('parseSession requires a known page and an allowed workspace', () => {
  assert.equal(parseSession(JSON.stringify({ ...BASE, page: undefined })), null);
  assert.equal(parseSession(JSON.stringify({ ...BASE, page: '/result' })), null);
  assert.equal(parseSession(JSON.stringify({ ...BASE, page: 'https://evil.test/' })), null);
  assert.equal(parseSession(JSON.stringify({ ...BASE, slug: 'ember-box' })), null);
  assert.equal(parseSession(JSON.stringify({ ...BASE, slug: 'eudi-wallet', page: '/eudi-wallet-age-verification', url: 'javascript:1' })), null);
  assert.notEqual(parseSession(JSON.stringify({ ...BASE, page: '/', slug: 'age-id-lumo' })), null);
});

test('parseSession rejects non-http urls', () => {
  assert.equal(parseSession(JSON.stringify({ ...BASE, url: 'javascript:alert(1)' })), null);
  assert.equal(parseSession(JSON.stringify({ ...BASE, url: 'data:text/html,x' })), null);
  assert.equal(parseSession(JSON.stringify({ ...BASE, url: 'not a url' })), null);
  assert.notEqual(parseSession(JSON.stringify({ ...BASE, url: 'https://proofage.test/v/t' })), null);
});

test('parseSession requires a UUID verification id', () => {
  assert.notEqual(parseSession(JSON.stringify({ ...BASE, verificationId: ID.toUpperCase() })), null);
  assert.equal(parseSession(JSON.stringify({ ...BASE, verificationId: '../x' })), null);
  assert.equal(parseSession(JSON.stringify({ ...BASE, verificationId: 'abc' })), null);
});

test('a session belongs to the page it started on', () => {
  const session = parseSession(serializeSession({ ...BASE }));
  assert.deepEqual(sessionForPage(session, '/'), BASE);
  assert.equal(sessionForPage(session, '/eudi-wallet-age-verification'), null);
  assert.equal(sessionForPage(null, '/'), null);
});

test('/result sends people back to their page, else to / with a notice', () => {
  assert.equal(resultRedirectPath(parseSession(serializeSession({ ...BASE }))), '/?check=kyc');
  assert.equal(resultRedirectPath(parseSession(serializeSession({ ...BASE, slug: 'selfie' }))), '/');
  assert.equal(resultRedirectPath(parseSession(serializeSession({ ...BASE, slug: 'age-id-lumo' }))), '/?check=age-id&look=lumo');
  assert.equal(
    resultRedirectPath(parseSession(serializeSession({ ...BASE, slug: 'eudi-wallet', page: '/eudi-wallet-age-verification' }))),
    '/eudi-wallet-age-verification',
  );
  assert.equal(resultRedirectPath(null), '/?result=elsewhere');
});

test('cookies from before the single flow keep their result', () => {
  const legacy = { verificationId: ID, url: 'https://idv.proofage.net/v/tok' };
  assert.deepEqual(parseSession(JSON.stringify({ ...legacy, slug: 'ember-box' })), { ...legacy, slug: 'age-id', page: '/' });
  assert.deepEqual(parseSession(JSON.stringify({ ...legacy, slug: 'eudi-wallet' })), { ...legacy, slug: 'eudi-wallet', page: '/eudi-wallet-age-verification' });
  assert.deepEqual(parseSession(JSON.stringify({ ...legacy, slug: 'eudi-wallet', page: '/' })), { ...legacy, slug: 'selfie', page: '/' });
  assert.deepEqual(parseSession(JSON.stringify({ ...legacy, slug: 'eudi-wallet', page: '/store' })), { ...legacy, slug: 'selfie', page: '/' });
  assert.deepEqual(parseSession(JSON.stringify({ ...legacy, slug: 'kyc', page: '/courses' })), { ...legacy, slug: 'kyc', page: '/' });
  assert.deepEqual(parseSession(JSON.stringify({ ...legacy, slug: 'age-id', page: '/store' })), { ...legacy, slug: 'age-id', page: '/' });
  assert.deepEqual(
    parseSession(JSON.stringify({ ...legacy, slug: 'eudi-wallet', page: '/eudi-wallet-age-verification' })),
    { ...legacy, slug: 'eudi-wallet', page: '/eudi-wallet-age-verification' },
  );
  assert.equal(parseSession(JSON.stringify({ ...legacy, slug: 'kyc' })), null, 'kyc never existed without a page');
});
