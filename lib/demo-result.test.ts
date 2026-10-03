import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliseFirstName, resultFromVerification, toResultView } from './demo-result.ts';

const URL_ = 'https://idv.proofage.xyz/v/tok';

test('maps every API status', () => {
  const cases: Array<[string, string, boolean]> = [
    ['created', 'not_finished', false],
    ['started', 'not_finished', false],
    ['submitted', 'checking', true],
    ['review', 'in_review', true],
    ['resubmission_requested', 'retry', false],
    ['declined', 'declined', false],
    ['abandoned', 'ended', false],
    ['expired', 'ended', false],
  ];
  for (const [status, state, pending] of cases) {
    const view = toResultView(status, null, null, URL_);
    assert.equal(view.state, state, status);
    assert.equal(view.pending, pending, status);
  }
});

test('approved splits on the first name', () => {
  assert.equal(toResultView('approved', null, 'Eric', URL_).state, 'approved_named');
  assert.equal(toResultView('approved', null, null, URL_).state, 'approved_guest');
});

test('a status the API adds later is unknown, not a crash', () => {
  const view = toResultView('on_hold', null, null, URL_);
  assert.equal(view.state, 'unknown');
  assert.equal(view.pending, false);
  assert.equal(view.status, 'on_hold');
});

test('continueUrl only where the person can go back in', () => {
  assert.equal(toResultView('created', null, null, URL_).continueUrl, URL_);
  assert.equal(toResultView('started', null, null, URL_).continueUrl, URL_);
  assert.equal(toResultView('resubmission_requested', 'selfie_blurry', null, URL_).continueUrl, URL_);
  assert.equal(toResultView('approved', null, null, URL_).continueUrl, null);
  assert.equal(toResultView('declined', null, null, URL_).continueUrl, null);
});

test('first name is the name only for approved', () => {
  assert.equal(toResultView('declined', null, 'Eric', URL_).firstName, null);
  assert.equal(toResultView('approved', null, 'Eric', URL_).firstName, 'Eric');
});

test('normaliseFirstName cleans document spellings', () => {
  assert.equal(normaliseFirstName('ERIC'), 'Eric');
  assert.equal(normaliseFirstName('JEAN-PIERRE'), 'Jean-Pierre');
  assert.equal(normaliseFirstName("o'neil"), "O'Neil");
  assert.equal(normaliseFirstName('  maria   jose '), 'Maria Jose');
  assert.equal(normaliseFirstName('ÉLODIE'), 'Élodie');
  assert.equal(normaliseFirstName(''), null);
  assert.equal(normaliseFirstName('   '), null);
  assert.equal(normaliseFirstName(null), null);
  assert.equal(normaliseFirstName(42), null);
});

test('no verification or a foreign one is no_session', () => {
  const base = { slug: 'ember-box', sessionUrl: URL_, visitorId: 'visitor-a', firstName: null };
  assert.deepEqual(resultFromVerification({ ...base, verification: null }), { kind: 'no_session' });
  assert.deepEqual(
    resultFromVerification({ ...base, verification: { external_id: 'visitor-b', status: 'approved', reason: null } }),
    { kind: 'no_session' },
  );
  assert.deepEqual(
    resultFromVerification({ ...base, verification: { external_id: null, status: 'approved', reason: null } }),
    { kind: 'no_session' },
  );
});

test('own verification renders a view', () => {
  const result = resultFromVerification({
    slug: 'eudi-wallet',
    sessionUrl: URL_,
    visitorId: 'visitor-a',
    firstName: null,
    verification: { external_id: 'visitor-a', status: 'approved', reason: null },
  });
  assert.equal(result.kind, 'ok');
  assert.equal(result.kind === 'ok' && result.slug, 'eudi-wallet');
  assert.equal(result.kind === 'ok' && result.view.state, 'approved_guest');
});
