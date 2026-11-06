import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliseFirstName, resultFromVerification, toResultView } from './demo-result.ts';

const URL_ = 'https://idv.proofage.net/v/tok';

test('maps every API status', () => {
  const cases: Array<[string, string, boolean]> = [
    ['created', 'not_finished', false],
    ['started', 'not_finished', false],
    ['submitted', 'checking', true],
    ['review', 'checking', true],
    ['resubmission_requested', 'retry', false],
    ['declined', 'declined', false],
    ['abandoned', 'ended', false],
    ['expired', 'ended', false],
  ];
  for (const [status, state, pending] of cases) {
    const view = toResultView(status, null, URL_);
    assert.equal(view.state, state, status);
    assert.equal(view.pending, pending, status);
  }
});

test('approved is approved', () => {
  assert.equal(toResultView('approved', null, URL_).state, 'approved');
});

test('a status the API adds later is unknown, not a crash', () => {
  const view = toResultView('on_hold', null, URL_);
  assert.equal(view.state, 'unknown');
  assert.equal(view.pending, false);
  assert.equal(view.status, 'on_hold');
});

test('continueUrl only where the person can go back in', () => {
  assert.equal(toResultView('created', null, URL_).continueUrl, URL_);
  assert.equal(toResultView('started', null, URL_).continueUrl, URL_);
  assert.equal(toResultView('resubmission_requested', 'selfie_blurry', URL_).continueUrl, URL_);
  assert.equal(toResultView('approved', null, URL_).continueUrl, null);
  assert.equal(toResultView('declined', null, URL_).continueUrl, null);
});

test('decision time only where it means something', () => {
  assert.equal(toResultView('approved', null, URL_, '2026-10-13T10:00:00Z').decidedAt, '2026-10-13T10:00:00Z');
  assert.equal(toResultView('started', null, URL_, '2026-10-13T10:00:00Z').decidedAt, null);
  assert.equal(toResultView('resubmission_requested', 'x', URL_, '2026-10-13T10:00:00Z').decidedAt, '2026-10-13T10:00:00Z');
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

const BASE = { verificationId: 'v1', slug: 'kyc', page: '/', sessionUrl: URL_, visitorId: 'visitor-a', decidedAt: null } as const;

test('no verification or a foreign one is no_session', () => {
  assert.deepEqual(resultFromVerification({ ...BASE, verification: null }), { kind: 'no_session' });
  assert.deepEqual(resultFromVerification({ ...BASE, verification: { external_id: 'visitor-b', status: 'approved', reason: null } }), { kind: 'no_session' });
  assert.deepEqual(resultFromVerification({ ...BASE, verification: { external_id: null, status: 'approved', reason: null } }), { kind: 'no_session' });
});

test('own verification renders a view for its page, receipt filled later', () => {
  const result = resultFromVerification({ ...BASE, verification: { external_id: 'visitor-a', status: 'approved', reason: null } });
  assert.equal(result.kind, 'ok');
  if (result.kind === 'ok') {
    assert.equal(result.slug, 'kyc');
    assert.equal(result.page, '/');
    assert.equal(result.check, 'kyc');
    assert.equal(result.console, null);
    assert.equal(result.view.state, 'approved');
    assert.equal(result.receipt, null);
    assert.equal(result.storage, false);
  }
});

test('the check follows the workspace key, looks included', () => {
  const check = (slug: 'selfie-lumo' | 'kyc-lumo' | 'eudi-wallet') => {
    const result = resultFromVerification({ ...BASE, slug, verification: { external_id: 'visitor-a', status: 'approved', reason: null } });
    return result.kind === 'ok' ? result.check : null;
  };
  assert.equal(check('selfie-lumo'), 'selfie');
  assert.equal(check('kyc-lumo'), 'kyc');
  assert.equal(check('eudi-wallet'), 'selfie');
});
