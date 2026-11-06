import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pollMode, toDisplay } from './demo-display.ts';
import { toResultView, type LoadedResult } from './demo-result.ts';
import type { Receipt } from './receipt.ts';
import { sampleReceipt } from './sample-payloads.ts';

const NOW = new Date('2026-11-05T12:00:00Z');
const CTX = { now: NOW, started: { look: 'lumo', opens: 'popup' } } as const;

const live = (status: string, extra: Partial<Extract<LoadedResult, { kind: 'ok' }>> = {}): LoadedResult => ({
  kind: 'ok',
  verificationId: 'v1',
  slug: 'kyc-lumo',
  check: 'kyc',
  page: '/',
  view: toResultView(status, null, 'https://x.test/v', '2026-11-05T11:59:50Z'),
  receipt: null,
  storage: true,
  console: { workspaceName: 'Demo', url: 'https://x.test/v/abc', createdAt: '2026-11-05T11:59:00Z', updatedAt: '2026-11-05T11:59:50Z', externalId: '•••• AAAA', metadata: null, attemptId: null, document: null, estimation: null, media: [] },
  ...extra,
});

test('nothing to show without a result or sample', () => {
  assert.equal(toDisplay(null, null, CTX), null);
  assert.equal(toDisplay({ kind: 'no_session' }, null, CTX), null);
  assert.equal(toDisplay({ kind: 'error' }, null, CTX), null);
});

test('no result while the check is still running or being decided', () => {
  for (const status of ['created', 'started', 'submitted', 'review', 'expired']) {
    assert.equal(toDisplay(live(status), null, CTX), null, status);
  }
});

test('a live decision without its webhook waits for it', () => {
  const display = toDisplay(live('approved'), null, CTX);
  assert.equal(display?.sample, false);
  assert.equal(display?.check, 'kyc');
  assert.equal(display?.summary.badge.label, 'Approved');
  assert.equal(display?.summary.lines.at(-1)?.value, 'waiting for the webhook');
  assert.equal(display?.console.webhook, null);
  assert.equal(display?.context.look, 'lumo');
  assert.equal(display?.key, 'v1:approved');
  assert.equal(toDisplay(live('approved', { storage: false }), null, CTX)?.summary.lines.at(-1)?.value, 'not shown, webhook storage is not configured on this deployment');
});

test('while the webhook is pending, the document read from the API fills the summary and the console', () => {
  const document = { type: 'id', issuing_country: 'FR', fields: { first_name: 'ALEX', last_name: 'SAMPLE', date_of_birth: '1990-04-12', document_number: 'SAMPLE0000' } };
  const info = (live('approved') as Extract<LoadedResult, { kind: 'ok' }>).console!;
  const pending = live('approved', { console: { ...info, document } });
  const display = toDisplay(pending, null, CTX);
  assert.equal(display?.summary.lines.find((l) => l.label === 'Name')?.value, 'Alex Sample');
  assert.equal(display?.console.document?.find((r) => r.label === 'First name')?.value, 'ALEX');
  assert.equal(display?.console.technicalEmpty, 'Waiting for the webhook');
  assert.equal(toDisplay(live('approved', { storage: false, console: { ...info, document } }), null, CTX)?.console.technicalEmpty, 'Not available: webhook storage is not configured');
});

test('a stored webhook makes the delivery signed and fills the console', () => {
  const receipt = sampleReceipt('kyc', 'approved');
  const display = toDisplay(live('approved', { receipt: { ...receipt, source: 'webhook' } }), null, CTX);
  assert.equal(display?.summary.lines.at(-1)?.value, 'as a signed webhook, signature verified');
  assert.equal(display?.console.webhook?.signed, true);
  assert.equal(display?.console.technical[0].value, '203.0.113.7 (FR)');
  assert.equal(display?.console.mrz, null, 'live checks have no MRZ');
});

test('retry shows a resubmission result, a stale receipt is ignored', () => {
  assert.equal(toDisplay(live('resubmission_requested'), null, CTX)?.summary.badge.label, 'Resubmission requested');
  const stale = live('approved', { receipt: { ...sampleReceipt('kyc', 'approved'), status: 'resubmission_requested' } });
  assert.equal(toDisplay(stale, null, CTX)?.receipt, null);
});

test('document number is masked in the console until revealed', () => {
  const receipt = { ...sampleReceipt('kyc', 'approved'), source: 'webhook' as const };
  const display = toDisplay(live('approved', { receipt }), null, CTX);
  const number = (rows: { label: string; value: string | null }[] | null) => rows?.find((r) => r.label === 'Document number')?.value;
  assert.equal(number(display?.console.document ?? null), '•••• 0000');
  assert.equal(number(display?.consoleRevealed.document ?? null), 'SAMPLE0000');
});

test('a sample replaces the live result while it is chosen', () => {
  const display = toDisplay(live('approved'), { check: 'kyc', outcome: 'declined' }, CTX);
  assert.equal(display?.sample, true);
  assert.equal(display?.summary.badge.label, 'Declined');
  assert.equal(display?.summary.lines.at(-1)?.value, 'sample payload, not signed');
  assert.equal(display?.key, 'sample:kyc:declined');
  assert.equal(display?.view, null);
});

test('the sample estimation follows the outcome', () => {
  assert.equal(toDisplay(null, { check: 'selfie', outcome: 'approved' }, CTX)?.console.estimation?.passed, true);
  assert.equal(toDisplay(null, { check: 'selfie', outcome: 'declined' }, CTX)?.console.estimation?.passed, false);
});

test('sample times are relative to now, not fixed dates', () => {
  const view = toDisplay(null, { check: 'kyc', outcome: 'approved' }, CTX)?.console;
  assert.equal(view?.overview.created, '3 minutes ago');
  assert.equal(view?.overview.updated, '2 minutes ago');
});

test('samples: MRZ for ID checks only, media illustrations, estimation for the selfie', () => {
  const kyc = toDisplay(null, { check: 'kyc', outcome: 'approved' }, CTX);
  assert.equal(kyc?.console.mrz?.length, 2);
  assert.equal(kyc?.console.media.length, 3);
  assert.equal(kyc?.console.webhook?.signed, false);
  const selfie = toDisplay(null, { check: 'selfie', outcome: 'approved' }, CTX);
  assert.equal(selfie?.console.mrz, null);
  assert.equal(selfie?.console.estimation?.threshold, '18+');
  assert.equal(selfie?.console.document, null);
});

const RECEIPT = { status: 'approved' } as Receipt;
const poll = (status: string, extra: Partial<Extract<LoadedResult, { kind: 'ok' }>> = {}): LoadedResult => live(status, extra);

test('poll mode: decision pending, person in the widget, webhook still on its way', () => {
  assert.equal(pollMode(null, false), null);
  assert.equal(pollMode({ kind: 'no_session' }, false), null);
  assert.equal(pollMode(null, true), 'person');
  assert.equal(pollMode(poll('started'), true), 'person');
  assert.equal(pollMode(poll('started'), false), null);
  assert.equal(pollMode(poll('resubmission_requested'), true), 'person');
  assert.equal(pollMode(poll('submitted'), false), 'decision');
  assert.equal(pollMode(poll('review'), false), 'decision');
  assert.equal(pollMode(poll('approved'), false), 'webhook', 'decided, no receipt yet');
  assert.equal(pollMode(poll('declined'), true), 'webhook');
  assert.equal(pollMode(poll('approved', { receipt: RECEIPT }), true), null, 'webhook arrived');
  assert.equal(pollMode(poll('approved', { receipt: { ...RECEIPT, status: 'resubmission_requested' } }), false), 'webhook');
  assert.equal(pollMode(poll('approved', { storage: false }), true), null, 'nothing will be stored');
  assert.equal(pollMode(poll('expired'), true), null);
});
