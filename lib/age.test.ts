import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ageOn } from './age.ts';

const now = new Date('2026-11-05T12:00:00Z');

test('plain ages and birthdays', () => {
  assert.equal(ageOn('1994-07-04', now), 32);
  assert.equal(ageOn('2000-11-05', now), 26);
  assert.equal(ageOn('2000-11-06', now), 25);
  assert.equal(ageOn('2026-11-05', now), 0);
});

test('leap day births', () => {
  assert.equal(ageOn('2004-02-29', new Date('2026-02-28T12:00:00Z')), 21);
  assert.equal(ageOn('2004-02-29', new Date('2026-03-01T12:00:00Z')), 22);
  assert.equal(ageOn('2004-02-29', new Date('2028-02-29T12:00:00Z')), 24);
});

test('missing, malformed or future dates give no age', () => {
  for (const bad of [null, undefined, '', '••••', '1994-13-40', '1994-02-30', '04/07/1994', '2031-01-01']) {
    assert.equal(ageOn(bad, now), null, String(bad));
  }
});
