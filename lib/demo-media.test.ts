import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authoriseMedia, mediaHeaders, sniffContentType } from './demo-media.ts';

const VISITOR = 'visitorAAAAAAAAAAAAAAA';
const MEDIA = [
  { id: 'm1', url: 'https://x/m1' },
  { id: 'm2', url: null },
];

test('the owner may read a listed, stored file', () => {
  assert.deepEqual(authoriseMedia({ visitorId: VISITOR, externalId: VISITOR, mediaId: 'm1', media: MEDIA }), { ok: true });
});

test('everything else is a 404', () => {
  const refused = { ok: false, status: 404 };
  assert.deepEqual(authoriseMedia({ visitorId: VISITOR, externalId: 'someoneElseBBBBBBBBBBB', mediaId: 'm1', media: MEDIA }), refused);
  assert.deepEqual(authoriseMedia({ visitorId: null, externalId: VISITOR, mediaId: 'm1', media: MEDIA }), refused);
  assert.deepEqual(authoriseMedia({ visitorId: VISITOR, externalId: null, mediaId: 'm1', media: MEDIA }), refused);
  assert.deepEqual(authoriseMedia({ visitorId: VISITOR, externalId: VISITOR, mediaId: 'other', media: MEDIA }), refused);
  assert.deepEqual(authoriseMedia({ visitorId: VISITOR, externalId: VISITOR, mediaId: 'm2', media: MEDIA }), refused, 'purged file');
});

test('content type by magic bytes', () => {
  assert.equal(sniffContentType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
  assert.equal(sniffContentType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png');
  assert.equal(sniffContentType(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ')), 'image/webp');
  assert.equal(sniffContentType(new TextEncoder().encode('<svg onload=alert(1)>')), 'application/octet-stream');
  assert.equal(sniffContentType(new Uint8Array()), 'application/octet-stream');
});

test('responses are never cacheable', () => {
  const headers = mediaHeaders('image/jpeg');
  assert.equal(headers['Cache-Control'], 'no-store');
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['Content-Type'], 'image/jpeg');
  assert.ok(!Object.values(headers).some((v) => /max-age|public/.test(v)));
});
