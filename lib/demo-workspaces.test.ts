import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDemoWorkspaces, slugForApiKey, workspaceFor } from './demo-workspaces.ts';

const RAW = JSON.stringify({
  'ember-box': { apiKey: 'pk_a', secretKey: 'sk_a' },
  'eudi-wallet': { apiKey: 'pk_b', secretKey: 'sk_b' },
});

test('parses a valid map', () => {
  const map = parseDemoWorkspaces(RAW);
  assert.deepEqual(map['eudi-wallet'], { apiKey: 'pk_b', secretKey: 'sk_b' });
});

test('missing env names the variable', () => {
  assert.throws(() => parseDemoWorkspaces(undefined), /PROOFAGE_DEMO_WORKSPACES is not set/);
  assert.throws(() => parseDemoWorkspaces(''), /PROOFAGE_DEMO_WORKSPACES is not set/);
});

test('invalid JSON names the variable and not the content', () => {
  assert.throws(
    () => parseDemoWorkspaces('{"ember-box":{"apiKey":"pk_secretish"'),
    (error: Error) => /not valid JSON/.test(error.message) && !error.message.includes('pk_secretish'),
  );
});

test('rejects arrays and entries without both keys', () => {
  assert.throws(() => parseDemoWorkspaces('[]'), /JSON object keyed by demo slug/);
  assert.throws(() => parseDemoWorkspaces('{"x":{"apiKey":"pk"}}'), /\["x"\] needs non-empty apiKey and secretKey/);
  assert.throws(() => parseDemoWorkspaces('{"x":{"apiKey":"","secretKey":"sk"}}'), /needs non-empty/);
  assert.throws(() => parseDemoWorkspaces('{"x":null}'), /needs non-empty/);
});

test('workspaceFor throws on an unknown slug', () => {
  const map = parseDemoWorkspaces(RAW);
  assert.equal(workspaceFor(map, 'ember-box').apiKey, 'pk_a');
  assert.throws(() => workspaceFor(map, 'nope'), /has no entry for "nope"/);
  assert.throws(() => workspaceFor(map, 'toString'), /has no entry for "toString"/);
});

test('slugForApiKey matches public keys only', () => {
  const map = parseDemoWorkspaces(RAW);
  assert.equal(slugForApiKey(map, 'pk_b'), 'eudi-wallet');
  assert.equal(slugForApiKey(map, 'sk_b'), null);
  assert.equal(slugForApiKey(map, null), null);
  assert.equal(slugForApiKey(map, ''), null);
});
