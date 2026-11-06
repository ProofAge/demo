import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientIp, hit, isSameOrigin, type Counter } from './rate-limit.ts';

function memoryCounter(): Counter {
  const counts = new Map<string, number>();
  return async (key) => {
    const next = (counts.get(key) ?? 0) + 1;
    counts.set(key, next);
    return next;
  };
}

const HOUR = 3600;
const T0 = Date.parse('2026-11-06T10:00:00Z');

test('allows up to the limit, then refuses with the seconds left in the window', async () => {
  const counter = memoryCounter();
  const at = (now: number) => hit(counter, { scope: 'create', id: '203.0.113.7', limit: 2, windowSeconds: HOUR, now });
  assert.deepEqual(await at(T0), { ok: true });
  assert.deepEqual(await at(T0 + 1000), { ok: true });
  assert.deepEqual(await at(T0 + 15 * 60_000), { ok: false, retryAfter: 45 * 60 });
});

test('a new window starts a new count; other visitors are counted apart', async () => {
  const counter = memoryCounter();
  const base = { scope: 'create', limit: 1, windowSeconds: HOUR };
  assert.deepEqual(await hit(counter, { ...base, id: 'a', now: T0 }), { ok: true });
  assert.equal((await hit(counter, { ...base, id: 'a', now: T0 + 1000 })).ok, false);
  assert.deepEqual(await hit(counter, { ...base, id: 'b', now: T0 + 1000 }), { ok: true });
  assert.deepEqual(await hit(counter, { ...base, id: 'a', now: T0 + HOUR * 1000 }), { ok: true });
});

test('client IP: first x-forwarded-for entry, then x-real-ip, then unknown', () => {
  assert.equal(clientIp(new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' })), '203.0.113.7');
  assert.equal(clientIp(new Headers({ 'x-real-ip': '198.51.100.2' })), '198.51.100.2');
  assert.equal(clientIp(new Headers()), 'unknown');
});

test('same origin: own pages pass, cross-site requests do not', () => {
  const post = (headers: Record<string, string>) => new Request('https://demo.proofage.net/api/demo-session', { method: 'POST', headers });
  assert.ok(isSameOrigin(post({ 'sec-fetch-site': 'same-origin', origin: 'https://demo.proofage.net' })));
  assert.ok(isSameOrigin(post({})), 'no browser headers: left to the rate limit');
  assert.ok(!isSameOrigin(post({ 'sec-fetch-site': 'cross-site', origin: 'https://evil.example' })));
  assert.ok(!isSameOrigin(post({ origin: 'https://evil.example' })));
  assert.ok(!isSameOrigin(post({ origin: 'not a url' })));
});
