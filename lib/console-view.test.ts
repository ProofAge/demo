import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildConsoleView, mediaSlots, shortenUrl, type ConsoleInput } from './console-view.ts';

const NOW = new Date('2026-11-05T12:00:00Z');
const DOC = {
  type: 'id',
  issuing_country: 'FR',
  fields: { first_name: 'ALEX', last_name: 'SAMPLE', date_of_birth: '1990-04-12', document_number: '•••• 0000' },
};
const SIGNALS = { ip_address: '1.2.3.4', ip_country_code: 'FR', ip_timezone: 'Europe/Paris', device_timezone: 'Europe/Berlin' };

function input(extra: Partial<ConsoleInput> = {}): ConsoleInput {
  return {
    check: 'age-id',
    sample: false,
    now: NOW,
    verification: {
      id: 'v1', status: 'approved', workspaceName: 'Demo', url: 'https://proofageapp.test/v/0123456789abcdef0123',
      createdAt: '2026-11-05T11:59:00Z', updatedAt: '2026-11-05T11:59:50Z', externalId: '•••• AAAA', metadata: { demo: 'age-id' }, attemptId: 'a1',
    },
    payload: { status: 'approved', document: DOC, fingerprint_signals: SIGNALS },
    reasonLabel: null,
    estimation: null,
    media: [],
    mrz: null,
    webhook: { receivedAt: '2026-11-05T11:59:51Z', deliveryId: 'd1', status: 'approved', signed: true },
    delivery: 'signed',
    ...extra,
  };
}

test('mediaSlots keeps the person-facing files and hides purged urls', () => {
  const slots = mediaSlots([
    { id: 'm/1', type: 'selfie', url: 'https://x' },
    { id: 'm2', type: 'document_front', url: null },
    { id: 'm3', type: 'video', url: 'https://x' },
    { id: 'm4', type: 'liveness_audit', url: 'https://x' },
    { id: 'm5', type: 'document_back', url: 'https://x' },
  ]);
  assert.deepEqual(slots, [
    { label: 'Selfie', src: '/api/demo-media?id=m%2F1' },
    { label: 'Document front', src: null },
    { label: 'Document back', src: '/api/demo-media?id=m5' },
  ]);
});

test('technical information lists only what arrived', () => {
  assert.deepEqual(buildConsoleView(input()).technical, [
    { label: 'IP address', value: '1.2.3.4 (FR)' },
    { label: 'IP timezone', value: 'Europe/Paris' },
    { label: 'Device timezone', value: 'Europe/Berlin' },
  ]);
  const partial = buildConsoleView(input({ payload: { fingerprint_signals: { ip_address: '1.2.3.4', device: 'iPhone', browser: 'Safari', os: 'iOS' } } }));
  assert.deepEqual(partial.technical.map((r) => r.label), ['IP address', 'Device', 'Browser', 'OS']);
  assert.equal(partial.technical[0].value, '1.2.3.4');
});

test('no signals, or non-string signal values, give no rows and no crash', () => {
  assert.deepEqual(buildConsoleView(input({ payload: { status: 'approved' } })).technical, []);
  assert.deepEqual(buildConsoleView(input({ payload: null })).technical, []);
  assert.deepEqual(buildConsoleView(input({ payload: { fingerprint_signals: { ip_address: 5, device_timezone: {}, os: null } } })).technical, []);
  assert.deepEqual(buildConsoleView(input({ payload: { fingerprint_signals: 'omitted' } })).technical, []);
});

test('technical information says why it is empty', () => {
  const empty = { payload: { status: 'approved' } };
  assert.equal(buildConsoleView(input({ ...empty, delivery: 'pending' })).technicalEmpty, 'Waiting for the webhook');
  assert.equal(buildConsoleView(input({ ...empty, delivery: 'signed' })).technicalEmpty, 'Nothing arrived with this check');
  assert.equal(buildConsoleView(input({ ...empty, delivery: 'unconfigured' })).technicalEmpty, 'Not available: webhook storage is not configured');
  assert.equal(buildConsoleView(input({ delivery: 'pending' })).technicalEmpty, null, 'rows present: no note');
});

test('document data for ID checks, and for a selfie that fell back to an ID, not otherwise', () => {
  assert.equal(buildConsoleView(input()).document?.find((r) => r.label === 'First name')?.value, 'ALEX');
  assert.equal(buildConsoleView(input({ check: 'kyc' })).document?.length, 13);
  assert.ok(buildConsoleView(input({ check: 'selfie' })).document);
  assert.equal(buildConsoleView(input({ check: 'selfie', payload: { status: 'approved' } })).document, null);
  assert.equal(buildConsoleView(input({ payload: null })).document, null);
});

test('a selfie check with an empty document has no document card', () => {
  const empty = { document: { type: null, issuing_country: null, fields: { first_name: null, last_name: null, date_of_birth: null, document_number: null } } };
  assert.equal(buildConsoleView(input({ check: 'selfie', payload: empty })).document, null);
});

test('age estimation only for the selfie check', () => {
  const estimation = { minimum: 18, passed: true, gender: 'Female' };
  assert.deepEqual(buildConsoleView(input({ check: 'selfie', estimation })).estimation, { threshold: '18+', passed: true, gender: 'Female' });
  assert.equal(buildConsoleView(input({ check: 'selfie', estimation: null })).estimation, null);
  assert.equal(buildConsoleView(input({ check: 'age-id', estimation })).estimation, null);
});

test('the MRZ card is for samples with a document only', () => {
  const mrz = ['L1', 'L2'];
  assert.equal(buildConsoleView(input({ sample: false, mrz })).mrz, null, 'live checks never show an MRZ');
  assert.deepEqual(buildConsoleView(input({ sample: true, mrz })).mrz, mrz);
  assert.equal(buildConsoleView(input({ sample: true, mrz, check: 'selfie', payload: { status: 'approved' } })).mrz, null);
});

test('status badges', () => {
  const tone = (status: string) => buildConsoleView(input({ verification: { ...input().verification, status } })).overview.status;
  assert.deepEqual(tone('approved'), { label: 'Approved', tone: 'ok' });
  assert.deepEqual(tone('declined'), { label: 'Declined', tone: 'danger' });
  assert.deepEqual(tone('resubmission_requested'), { label: 'Resubmission requested', tone: 'warn' });
  assert.deepEqual(tone('review'), { label: 'Review', tone: 'warn' });
  assert.deepEqual(tone('started'), { label: 'Started', tone: 'neutral' });
});

test('overview and attempt', () => {
  const v = buildConsoleView(input({ reasonLabel: 'Document front too blurry', verification: { ...input().verification, status: 'resubmission_requested' } }));
  assert.equal(buildConsoleView(input({ reasonLabel: 'x' })).attempt.failureReason, null, 'approved has no failure');
  assert.equal(v.id, 'v1');
  assert.equal(v.overview.workspace, 'Demo');
  assert.equal(v.overview.created, '1 minute ago');
  assert.equal(v.overview.updated, '10 seconds ago');
  assert.equal(v.attempt.attemptId, 'a1');
  assert.equal(v.attempt.failureReason, 'Document front too blurry');
  assert.equal(buildConsoleView(input({ verification: { ...input().verification, workspaceName: null } })).overview.workspace, '-');
});

test('shortenUrl', () => {
  const short = shortenUrl('https://proofageapp.test/v/0123456789abcdef0123');
  assert.ok(short.startsWith('proofageapp.test'));
  assert.ok(short.length < 'https://proofageapp.test/v/0123456789abcdef0123'.length);
  assert.equal(shortenUrl('not a url'), 'not a url');
});
