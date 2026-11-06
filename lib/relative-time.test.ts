import { test } from 'node:test';
import assert from 'node:assert/strict';
import { relativeTime } from './relative-time.ts';

const now = new Date('2026-11-05T12:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

test('relative times', () => {
  assert.equal(relativeTime(ago(2_000), now), 'just now');
  assert.equal(relativeTime(ago(30_000), now), '30 seconds ago');
  assert.equal(relativeTime(ago(60_000), now), '1 minute ago');
  assert.equal(relativeTime(ago(5 * 60_000), now), '5 minutes ago');
  assert.equal(relativeTime(ago(3 * 3_600_000), now), '3 hours ago');
  assert.equal(relativeTime(ago(2 * 86_400_000), now), '2 days ago');
});

test('future, missing and invalid', () => {
  assert.equal(relativeTime(new Date(now.getTime() + 60_000).toISOString(), now), 'just now');
  assert.equal(relativeTime(null, now), '-');
  assert.equal(relativeTime('not a date', now), '-');
});
