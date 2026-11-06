import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveStart, startPanel, type StartPanelInput } from './start-panel.ts';

const base: StartPanelInput = { busy: false, newTab: false, watching: false, timedOut: false, sdkReady: true, state: null };
const panel = (extra: Partial<StartPanelInput>) => startPanel({ ...base, ...extra });

test('idle', () => {
  assert.deepEqual(panel({}), { button: { label: 'Start the check', disabled: false }, message: 'none', optionsDisabled: false });
  assert.equal(panel({ sdkReady: false }).button.disabled, true);
});

test('popup open: in progress, options locked', () => {
  const p = panel({ busy: true, watching: true, state: 'not_finished' });
  assert.deepEqual(p, { button: { label: 'In progress…', disabled: true }, message: 'none', optionsDisabled: true });
});

test('new tab: waiting message, options locked', () => {
  for (const state of ['not_finished', null] as const) {
    const p = panel({ newTab: true, watching: true, state });
    assert.equal(p.message, 'waiting_tab');
    assert.equal(p.button.disabled, true);
    assert.equal(p.optionsDisabled, true);
  }
});

test('checking, timed out', () => {
  const p = panel({ state: 'checking', watching: true });
  assert.equal(p.message, 'checking');
  assert.equal(p.optionsDisabled, true);
  assert.equal(panel({ state: 'checking', timedOut: true }).message, 'timed_out');
  assert.equal(panel({ state: 'checking', timedOut: true }).button.disabled, false);
});

test('left early: continue or start over, nothing locked', () => {
  const p = panel({ state: 'not_finished', watching: false });
  assert.equal(p.message, 'left');
  assert.equal(p.button.disabled, false);
  assert.equal(p.optionsDisabled, false);
});

test('retry, ended and finished states', () => {
  assert.equal(panel({ state: 'retry' }).message, 'retry');
  assert.equal(panel({ state: 'ended' }).message, 'ended');
  for (const state of ['approved', 'declined'] as const) {
    const p = panel({ state });
    assert.equal(p.message, 'none');
    assert.equal(p.button.disabled, false);
    assert.equal(p.optionsDisabled, false);
  }
});

test('start over repeats the last start, or falls back to the current options after a reload', () => {
  const current = { slug: 'kyc', opens: 'popup' } as const;
  assert.deepEqual(resolveStart({ slug: 'age-id-lumo', opens: 'tab' }, current), { slug: 'age-id-lumo', opens: 'tab' });
  assert.deepEqual(resolveStart(null, current), current);
});

test('new tab: once the tab is known closed the page is no longer waiting or locked', () => {
  const p = panel({ newTab: true, watching: false, state: 'not_finished' });
  assert.equal(p.message, 'left');
  assert.equal(p.optionsDisabled, false);
  assert.equal(p.button.disabled, false);
});
