import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkOf,
  DEMO_PAGES,
  isDemoPage,
  isWorkspaceSlug,
  lookOf,
  PAGE_WORKSPACES,
  pageAllowsWorkspace,
  slugFor,
  WORKSPACE_SLUGS,
} from './demo-pages.ts';

test('known pages', () => {
  assert.deepEqual([...DEMO_PAGES].sort(), ['/', '/eudi-wallet-age-verification']);
  assert.equal(isDemoPage('/'), true);
  assert.equal(isDemoPage('/courses'), false);
  assert.equal(isDemoPage('/result'), false);
  assert.equal(isDemoPage('https://evil.test/'), false);
  assert.equal(isDemoPage(undefined), false);
});

test('seven workspace slugs', () => {
  assert.deepEqual([...WORKSPACE_SLUGS], ['selfie', 'selfie-lumo', 'age-id', 'age-id-lumo', 'kyc', 'kyc-lumo', 'eudi-wallet']);
  assert.equal(isWorkspaceSlug('kyc-lumo'), true);
  assert.equal(isWorkspaceSlug('ember-box'), false);
  assert.equal(isWorkspaceSlug('toString'), false);
});

test('page/workspace pairs', () => {
  assert.deepEqual(PAGE_WORKSPACES['/'], ['selfie', 'selfie-lumo', 'age-id', 'age-id-lumo', 'kyc', 'kyc-lumo']);
  assert.equal(pageAllowsWorkspace('/', 'eudi-wallet'), false);
  assert.equal(pageAllowsWorkspace('/', 'kyc-lumo'), true);
  assert.equal(pageAllowsWorkspace('/eudi-wallet-age-verification', 'eudi-wallet'), true);
  assert.equal(pageAllowsWorkspace('/eudi-wallet-age-verification', 'selfie'), false);
});

test('slugFor, checkOf, lookOf', () => {
  assert.equal(slugFor('age-id', 'lumo'), 'age-id-lumo');
  assert.equal(slugFor('selfie', 'proofage'), 'selfie');
  assert.equal(checkOf('selfie-lumo'), 'selfie');
  assert.equal(checkOf('eudi-wallet'), 'selfie');
  assert.equal(checkOf('kyc'), 'kyc');
  assert.equal(lookOf('kyc-lumo'), 'lumo');
  assert.equal(lookOf('age-id'), 'proofage');
  assert.equal(lookOf('eudi-wallet'), 'proofage');
});
