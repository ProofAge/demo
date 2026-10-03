# Demo Result Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The demo creates verifications on its own server (HMAC, `external_id`), then shows a `/result` page with the real outcome: "Hi {first name}" or "guest" when approved, plus declined / retry / pending screens.

**Architecture:** Pure modules in `lib/` (workspace map, cookies, result view) hold every decision and are unit-tested with `node --test`. Thin server code (`lib/demo-session.ts`, `app/api/demo-session`, `app/result`) fetches from the ProofAge API through `@proofage/node` and feeds the pure modules. No database: ProofAge stores `external_id`, the demo keeps two httpOnly cookies.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind v4, `@proofage/node` ^0.11.0, Node's built-in test runner (Node ≥ 22.18 strips TypeScript types natively).

**Spec:** `docs/superpowers/specs/2026-10-04-result-page-design.md` — read it before Task 1.

## Global Constraints

- Keys live only in server env `PROOFAGE_DEMO_WORKSPACES`, a JSON object `{ "<slug>": { "apiKey": "pk_…", "secretKey": "sk_…" } }`. Slugs: `ember-box` (page `/`), `eudi-wallet` (page `/eudi-wallet-age-verification`).
- No `NEXT_PUBLIC_*` API key in code. Public keys reach the browser only as a prop from a server component. Secret keys never leave the server.
- Error messages and logs never contain key values, document fields other than the first name, or the visitor id.
- Cookies: `pa_demo_visitor` (random 128-bit, base64url, 30 days) and `pa_demo_session` (JSON `{slug, verificationId, url}`, 24 hours); both `httpOnly`, `sameSite: 'lax'`, `path: '/'`, `secure` when `NODE_ENV === 'production'`.
- `/result` is `noindex, nofollow` and not in the sitemap.
- Only `document.fields.first_name` is read from the document endpoint, and only for `approved`.
- No new dependencies besides bumping `@proofage/node` to `^0.11.0`.
- Pure modules (`lib/demo-workspaces.ts`, `lib/demo-cookies.ts`, `lib/demo-result.ts`, `lib/demo-pages.ts`) import nothing from Next, React or `@/`, so `node --test` can load them directly.
- Match existing style: single quotes, 2-space indent, semicolons, Tailwind classes using the `ember-*` palette, `font-[family-name:var(--font-display)]` for display text.
- Commit after every task with a `feat:`/`refactor:`/`chore:`/`docs:` prefix and the trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Finishing on a phone after the QR handoff: `/result` opens with no cookies and must show "result is on the device where you started", not an error. Pinned in Task 3 (`resultFromVerification` / `resolveSession` with missing cookies).
2. A forged or stale `pa_demo_session` pointing at someone else's verification: `external_id` mismatch must look exactly like "no session". Pinned in Task 3.
3. First names as documents print them (`JEAN-PIERRE`, `o'neil`, `  maria  jose `, empty, null, a number): display must be clean or fall back to guest, never crash. Pinned in Task 3.
4. A status value the API adds later (e.g. `on_hold`): must render the neutral `unknown` screen, not throw. Pinned in Task 3.
5. A tampered session cookie whose `url` is `javascript:` or not a URL: must be rejected so the "continue" link can never run script. Pinned in Task 2.

---

### Task 1: Tooling and the workspace map

**Files:**
- Modify: `package.json` (add `test` script, bump `@proofage/node`)
- Modify: `tsconfig.json` (add `allowImportingTsExtensions`)
- Create: `lib/demo-workspaces.ts`
- Create: `lib/demo-workspaces.test.ts`
- Create: `lib/demo-pages.ts`

**Interfaces:**
- Produces:
  - `type DemoWorkspaceKeys = { apiKey: string; secretKey: string }`
  - `type DemoWorkspaces = Record<string, DemoWorkspaceKeys>`
  - `const WORKSPACES_ENV = 'PROOFAGE_DEMO_WORKSPACES'`
  - `parseDemoWorkspaces(raw: string | undefined): DemoWorkspaces` (throws `Error` naming the env var)
  - `workspaceFor(workspaces: DemoWorkspaces, slug: string): DemoWorkspaceKeys` (throws on unknown slug)
  - `slugForApiKey(workspaces: DemoWorkspaces, apiKey: string | null): string | null`
  - `DEMO_PAGES: Record<DemoSlug, string>`, `type DemoSlug = 'ember-box' | 'eudi-wallet'`, `isDemoSlug(value: unknown): value is DemoSlug`, `pathForSlug(slug: string): string`

- [ ] **Step 1: Tooling**

In `package.json`, add to `scripts`: `"test": "node --test lib/*.test.ts"`. Then run:

```bash
npm install @proofage/node@^0.11.0
```

In `tsconfig.json` `compilerOptions`, add `"allowImportingTsExtensions": true,` after `"noEmit": true,` (tests import `./module.ts`; Next already sets `noEmit`).

- [ ] **Step 2: Write the failing test** — `lib/demo-workspaces.test.ts`

```ts
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
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test`
Expected: FAIL, cannot find module `./demo-workspaces.ts`.

- [ ] **Step 4: Implement** — `lib/demo-workspaces.ts`

```ts
export type DemoWorkspaceKeys = { apiKey: string; secretKey: string };
export type DemoWorkspaces = Record<string, DemoWorkspaceKeys>;

export const WORKSPACES_ENV = 'PROOFAGE_DEMO_WORKSPACES';

/** Parses the slug → keys map. Errors name the env var, never its content. */
export function parseDemoWorkspaces(raw: string | undefined): DemoWorkspaces {
  if (!raw) {
    throw new Error(`${WORKSPACES_ENV} is not set`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${WORKSPACES_ENV} is not valid JSON`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${WORKSPACES_ENV} must be a JSON object keyed by demo slug`);
  }
  const workspaces: DemoWorkspaces = {};
  for (const [slug, value] of Object.entries(parsed)) {
    const keys = value as Partial<DemoWorkspaceKeys> | null;
    if (!keys || typeof keys.apiKey !== 'string' || !keys.apiKey || typeof keys.secretKey !== 'string' || !keys.secretKey) {
      throw new Error(`${WORKSPACES_ENV}["${slug}"] needs non-empty apiKey and secretKey`);
    }
    workspaces[slug] = { apiKey: keys.apiKey, secretKey: keys.secretKey };
  }
  return workspaces;
}

export function workspaceFor(workspaces: DemoWorkspaces, slug: string): DemoWorkspaceKeys {
  if (!Object.hasOwn(workspaces, slug)) {
    throw new Error(`${WORKSPACES_ENV} has no entry for "${slug}"`);
  }
  return workspaces[slug];
}

/** The slug whose public key sent a webhook (`X-Auth-Client`), or null. */
export function slugForApiKey(workspaces: DemoWorkspaces, apiKey: string | null): string | null {
  if (!apiKey) {
    return null;
  }
  const match = Object.entries(workspaces).find(([, keys]) => keys.apiKey === apiKey);
  return match ? match[0] : null;
}
```

- [ ] **Step 5: Create** `lib/demo-pages.ts`

```ts
export const DEMO_PAGES = {
  'ember-box': '/',
  'eudi-wallet': '/eudi-wallet-age-verification',
} as const;

export type DemoSlug = keyof typeof DEMO_PAGES;

export function isDemoSlug(value: unknown): value is DemoSlug {
  return typeof value === 'string' && Object.hasOwn(DEMO_PAGES, value);
}

export function pathForSlug(slug: string): string {
  return isDemoSlug(slug) ? DEMO_PAGES[slug] : '/';
}
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: PASS (6 tests). An `ExperimentalWarning` about type stripping is fine.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json lib/demo-workspaces.ts lib/demo-workspaces.test.ts lib/demo-pages.ts
git commit -m "feat: demo workspace map and node test runner"
```

---

### Task 2: Cookies

**Files:**
- Create: `lib/demo-cookies.ts`
- Create: `lib/demo-cookies.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `VISITOR_COOKIE = 'pa_demo_visitor'`, `SESSION_COOKIE = 'pa_demo_session'`, `VISITOR_MAX_AGE = 2592000`, `SESSION_MAX_AGE = 86400`
  - `type DemoSession = { slug: string; verificationId: string; url: string }`
  - `newVisitorId(): string`
  - `isVisitorId(value: string | undefined): value is string`
  - `serializeSession(session: DemoSession): string`
  - `parseSession(raw: string | undefined): DemoSession | null`
  - `cookieOptions(maxAge: number): { httpOnly: true; sameSite: 'lax'; secure: boolean; path: '/'; maxAge: number }`

- [ ] **Step 1: Write the failing test** — `lib/demo-cookies.test.ts`

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isVisitorId, newVisitorId, parseSession, serializeSession } from './demo-cookies.ts';

test('visitor ids are 22-char base64url and unique', () => {
  const a = newVisitorId();
  const b = newVisitorId();
  assert.match(a, /^[A-Za-z0-9_-]{22}$/);
  assert.notEqual(a, b);
  assert.equal(isVisitorId(a), true);
});

test('isVisitorId rejects anything else', () => {
  assert.equal(isVisitorId(undefined), false);
  assert.equal(isVisitorId(''), false);
  assert.equal(isVisitorId('short'), false);
  assert.equal(isVisitorId('a'.repeat(21) + '!'), false);
});

test('session round-trips', () => {
  const session = { slug: 'eudi-wallet', verificationId: '01a0-x', url: 'https://idv.proofage.xyz/v/tok' };
  assert.deepEqual(parseSession(serializeSession(session)), session);
});

test('parseSession rejects garbage', () => {
  assert.equal(parseSession(undefined), null);
  assert.equal(parseSession(''), null);
  assert.equal(parseSession('not json'), null);
  assert.equal(parseSession('[]'), null);
  assert.equal(parseSession(JSON.stringify({ slug: 'x', verificationId: 'y' })), null);
  assert.equal(parseSession(JSON.stringify({ slug: 1, verificationId: 'y', url: 'https://a.b' })), null);
});

test('parseSession rejects non-http urls', () => {
  const base = { slug: 'ember-box', verificationId: 'v' };
  assert.equal(parseSession(JSON.stringify({ ...base, url: 'javascript:alert(1)' })), null);
  assert.equal(parseSession(JSON.stringify({ ...base, url: 'data:text/html,x' })), null);
  assert.equal(parseSession(JSON.stringify({ ...base, url: 'not a url' })), null);
  assert.notEqual(parseSession(JSON.stringify({ ...base, url: 'https://proofage.test/v/t' })), null);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL, cannot find module `./demo-cookies.ts`.

- [ ] **Step 3: Implement** — `lib/demo-cookies.ts`

```ts
import { randomBytes } from 'node:crypto';

export const VISITOR_COOKIE = 'pa_demo_visitor';
export const SESSION_COOKIE = 'pa_demo_session';
export const VISITOR_MAX_AGE = 60 * 60 * 24 * 30;
export const SESSION_MAX_AGE = 60 * 60 * 24;

/** Which verification the result page shows. `url` reopens it for "continue". */
export type DemoSession = { slug: string; verificationId: string; url: string };

/** 128 random bits: sent as `external_id`, so it must not be guessable. */
export function newVisitorId(): string {
  return randomBytes(16).toString('base64url');
}

export function isVisitorId(value: string | undefined): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{22}$/.test(value);
}

export function serializeSession(session: DemoSession): string {
  return JSON.stringify(session);
}

export function parseSession(raw: string | undefined): DemoSession | null {
  if (!raw) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }
  const { slug, verificationId, url } = parsed as Record<string, unknown>;
  if (typeof slug !== 'string' || typeof verificationId !== 'string' || typeof url !== 'string') {
    return null;
  }
  if (!slug || !verificationId || !isHttpUrl(url)) {
    return null;
  }
  return { slug, verificationId, url };
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/' as const,
    maxAge,
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS (all tests from Tasks 1–2).

- [ ] **Step 5: Commit**

```bash
git add lib/demo-cookies.ts lib/demo-cookies.test.ts
git commit -m "feat: demo visitor and session cookies"
```

---

### Task 3: Result view

**Files:**
- Create: `lib/demo-result.ts`
- Create: `lib/demo-result.test.ts`

**Interfaces:**
- Consumes: `DemoSession` type from Task 2 (structurally; do not import across pure modules — redeclare the minimal shape inline as shown).
- Produces:
  - `type DemoState = 'not_finished' | 'checking' | 'in_review' | 'approved_named' | 'approved_guest' | 'retry' | 'declined' | 'ended' | 'unknown'`
  - `type ResultView = { state: DemoState; pending: boolean; status: string; reason: string | null; firstName: string | null; continueUrl: string | null }`
  - `type LoadedResult = { kind: 'no_session' } | { kind: 'error' } | { kind: 'ok'; slug: string; view: ResultView }`
  - `normaliseFirstName(raw: unknown): string | null`
  - `toResultView(status: string, reason: string | null, firstName: string | null, sessionUrl: string): ResultView`
  - `resultFromVerification(input: { slug: string; sessionUrl: string; visitorId: string; verification: { external_id: string | null; status: string; reason: string | null } | null; firstName: string | null }): LoadedResult`

- [ ] **Step 1: Write the failing test** — `lib/demo-result.test.ts`

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL, cannot find module `./demo-result.ts`.

- [ ] **Step 3: Implement** — `lib/demo-result.ts`

```ts
export type DemoState =
  | 'not_finished'
  | 'checking'
  | 'in_review'
  | 'approved_named'
  | 'approved_guest'
  | 'retry'
  | 'declined'
  | 'ended'
  | 'unknown';

export type ResultView = {
  state: DemoState;
  /** True while the page should keep polling for a decision. */
  pending: boolean;
  status: string;
  reason: string | null;
  firstName: string | null;
  /** The hosted verification URL, where the person can still go back in. */
  continueUrl: string | null;
};

export type LoadedResult = { kind: 'no_session' } | { kind: 'error' } | { kind: 'ok'; slug: string; view: ResultView };

const STATES: Record<string, DemoState> = {
  created: 'not_finished',
  started: 'not_finished',
  submitted: 'checking',
  review: 'in_review',
  resubmission_requested: 'retry',
  declined: 'declined',
  abandoned: 'ended',
  expired: 'ended',
};

export function toResultView(status: string, reason: string | null, firstName: string | null, sessionUrl: string): ResultView {
  const name = status === 'approved' ? firstName : null;
  const state: DemoState =
    status === 'approved' ? (name ? 'approved_named' : 'approved_guest') : (Object.hasOwn(STATES, status) ? STATES[status] : 'unknown');
  return {
    state,
    pending: state === 'checking' || state === 'in_review',
    status,
    reason,
    firstName: name,
    continueUrl: state === 'not_finished' || state === 'retry' ? sessionUrl : null,
  };
}

/** Documents print names in capitals; show "Jean-Pierre", not "JEAN-PIERRE". */
export function normaliseFirstName(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const collapsed = raw.trim().replace(/\s+/g, ' ');
  if (!collapsed) {
    return null;
  }
  return collapsed
    .toLocaleLowerCase()
    .replace(/(^|[\s\-'’])(\p{L})/gu, (_match, separator: string, letter: string) => separator + letter.toLocaleUpperCase());
}

/**
 * A verification belongs to this browser only when its external_id is the visitor cookie.
 * Anything else looks exactly like "no session", so the page never says why.
 */
export function resultFromVerification(input: {
  slug: string;
  sessionUrl: string;
  visitorId: string;
  verification: { external_id: string | null; status: string; reason: string | null } | null;
  firstName: string | null;
}): LoadedResult {
  const { verification } = input;
  if (!verification || verification.external_id !== input.visitorId) {
    return { kind: 'no_session' };
  }
  return {
    kind: 'ok',
    slug: input.slug,
    view: toResultView(verification.status, verification.reason, input.firstName, input.sessionUrl),
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS (all tests from Tasks 1–3).

- [ ] **Step 5: Commit**

```bash
git add lib/demo-result.ts lib/demo-result.test.ts
git commit -m "feat: demo result view model"
```

---

### Task 4: Server session API

**Files:**
- Modify (rewrite): `lib/proofage.ts`
- Create: `lib/demo-session.ts`
- Create: `app/api/demo-session/route.ts`
- Delete: `app/api/create-verification/route.ts`, `app/api/verification/[id]/route.ts`

**Interfaces:**
- Consumes: Tasks 1–3 exports.
- Produces:
  - `lib/proofage.ts`: `demoWorkspaces(): DemoWorkspaces`, `publicKeyFor(slug: string): string`, `clientFor(slug: string): ProofAgeClient`
  - `lib/demo-session.ts`: `loadResult(): Promise<LoadedResult>` (reads cookies itself), `siteUrl(): string`
  - `POST /api/demo-session` body `{ slug: string }` → `200 { url: string }` | `400 { error }` | `502 { error }`
  - `GET /api/demo-session` → `200 LoadedResult`
  - `DELETE /api/demo-session` → `204`, clears `pa_demo_session`

- [ ] **Step 1: Rewrite** `lib/proofage.ts`

```ts
import { ProofAgeClient } from '@proofage/node';
import { parseDemoWorkspaces, workspaceFor, type DemoWorkspaces } from '@/lib/demo-workspaces';

let workspaces: DemoWorkspaces | null = null;
const clients = new Map<string, ProofAgeClient>();

/** The slug → keys map from PROOFAGE_DEMO_WORKSPACES, parsed once per server instance. */
export function demoWorkspaces(): DemoWorkspaces {
  workspaces ??= parseDemoWorkspaces(process.env.PROOFAGE_DEMO_WORKSPACES);
  return workspaces;
}

/** Public key for the browser SDK's init(); secret keys never leave the server. */
export function publicKeyFor(slug: string): string {
  return workspaceFor(demoWorkspaces(), slug).apiKey;
}

export function clientFor(slug: string): ProofAgeClient {
  let client = clients.get(slug);
  if (!client) {
    const { apiKey, secretKey } = workspaceFor(demoWorkspaces(), slug);
    client = new ProofAgeClient({
      apiKey,
      secretKey,
      baseUrl: process.env.PROOFAGE_BASE_URL ?? 'https://api.proofage.xyz',
      version: 'v1',
    });
    clients.set(slug, client);
  }
  return client;
}
```

- [ ] **Step 2: Create** `lib/demo-session.ts`

```ts
import { cookies } from 'next/headers';
import { ProofAgeError } from '@proofage/node';
import { isVisitorId, parseSession, SESSION_COOKIE, VISITOR_COOKIE } from '@/lib/demo-cookies';
import { normaliseFirstName, resultFromVerification, type LoadedResult } from '@/lib/demo-result';
import { clientFor, demoWorkspaces } from '@/lib/proofage';

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://demo.proofage.xyz').replace(/\/$/, '');
}

/** What /result shows for this browser. Never throws; API failures become `error`. */
export async function loadResult(): Promise<LoadedResult> {
  const store = await cookies();
  const session = parseSession(store.get(SESSION_COOKIE)?.value);
  const visitorId = store.get(VISITOR_COOKIE)?.value;
  if (!session || !isVisitorId(visitorId) || !Object.hasOwn(demoWorkspaces(), session.slug)) {
    return { kind: 'no_session' };
  }

  const client = clientFor(session.slug);
  try {
    const verification = await client.verifications().find(session.verificationId);
    let firstName: string | null = null;
    if (verification?.status === 'approved' && verification.external_id === visitorId) {
      firstName = await readFirstName(session.slug, session.verificationId);
    }
    return resultFromVerification({
      slug: session.slug,
      sessionUrl: session.url,
      visitorId,
      verification,
      firstName,
    });
  } catch (error) {
    if (error instanceof ProofAgeError && error.statusCode === 404) {
      return { kind: 'no_session' };
    }
    console.error('[proofage-demo] could not load the verification', {
      slug: session.slug,
      status: error instanceof ProofAgeError ? error.statusCode : null,
    });
    return { kind: 'error' };
  }
}

/** Only the first name, and a missing document is a guest, not an error. */
async function readFirstName(slug: string, verificationId: string): Promise<string | null> {
  try {
    const document = await clientFor(slug).verifications(verificationId).document();
    return normaliseFirstName(document?.document?.fields?.first_name);
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Create** `app/api/demo-session/route.ts`

```ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  cookieOptions,
  isVisitorId,
  newVisitorId,
  parseSession,
  serializeSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  VISITOR_COOKIE,
  VISITOR_MAX_AGE,
} from '@/lib/demo-cookies';
import { isDemoSlug } from '@/lib/demo-pages';
import { loadResult, siteUrl } from '@/lib/demo-session';
import { clientFor } from '@/lib/proofage';

export const dynamic = 'force-dynamic';

/**
 * Creates the verification server-side, so it is HMAC-signed and carries an external_id
 * (the browser SDK's unsigned create drops it). A still-unopened one is reused.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => null)) as { slug?: unknown } | null;
  const slug = body?.slug;
  if (!isDemoSlug(slug)) {
    return NextResponse.json({ error: 'Unknown demo' }, { status: 400 });
  }

  const store = await cookies();
  const existingVisitor = store.get(VISITOR_COOKIE)?.value;
  const visitorId = isVisitorId(existingVisitor) ? existingVisitor : newVisitorId();

  try {
    const client = clientFor(slug);
    const previous = parseSession(store.get(SESSION_COOKIE)?.value);
    if (previous && previous.slug === slug && visitorId === existingVisitor) {
      const verification = await client.verifications().find(previous.verificationId).catch(() => null);
      if (verification?.status === 'created' && verification.external_id === visitorId) {
        return NextResponse.json({ url: previous.url });
      }
    }

    const created = await client.verifications().create({
      external_id: visitorId,
      callback_url: `${siteUrl()}/result`,
      metadata: { demo: slug },
    });
    if (!created?.id || !created.url) {
      throw new Error('create returned no id or url');
    }

    const response = NextResponse.json({ url: created.url });
    response.cookies.set(VISITOR_COOKIE, visitorId, cookieOptions(VISITOR_MAX_AGE));
    response.cookies.set(
      SESSION_COOKIE,
      serializeSession({ slug, verificationId: created.id, url: created.url }),
      cookieOptions(SESSION_MAX_AGE),
    );
    return response;
  } catch (error) {
    console.error('[proofage-demo] could not create a verification', {
      slug,
      message: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'Could not start the verification. Please try again.' }, { status: 502 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(await loadResult(), { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(): Promise<NextResponse> {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(SESSION_COOKIE, '', cookieOptions(0));
  return response;
}
```

Note: `ProofAgeError.message` for an API error carries the API's message, not keys; logging it is fine. Do not log `visitorId`.

- [ ] **Step 4: Delete the old routes**

```bash
git rm app/api/create-verification/route.ts "app/api/verification/[id]/route.ts"
```

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint app lib components`
Expected: no errors. (`app/page.tsx` and the wallet page still compile: they do not import the deleted routes.)

- [ ] **Step 6: Commit**

```bash
git add lib/proofage.ts lib/demo-session.ts app/api/demo-session/route.ts
git commit -m "feat: server-created demo sessions with external_id

Removes /api/create-verification (it sent the webhook URL as callback_url,
which is the post-verification redirect) and /api/verification/[id] (it
returned any verification of the workspace to anyone with its id)."
```

---

### Task 5: Webhook per workspace

**Files:**
- Modify (rewrite): `app/api/webhooks/proofage/route.ts`

**Interfaces:**
- Consumes: `demoWorkspaces()` (Task 4), `slugForApiKey` (Task 1), `webhookHandler` from `@proofage/node`.
- Produces: `POST /api/webhooks/proofage` → 200 verified, 401 unknown `X-Auth-Client` or bad signature, 400 invalid JSON.

- [ ] **Step 1: Rewrite the route**

```ts
import { webhookHandler } from '@proofage/node';
import { slugForApiKey } from '@/lib/demo-workspaces';
import { demoWorkspaces } from '@/lib/proofage';

/**
 * ProofAge webhook receiver for every demo workspace. X-Auth-Client names the
 * workspace's public key; its secret from PROOFAGE_DEMO_WORKSPACES verifies the
 * signature. A real store would update the order or the account here.
 */
export async function POST(request: Request): Promise<Response> {
  const workspaces = demoWorkspaces();
  const slug = slugForApiKey(workspaces, request.headers.get('x-auth-client'));
  if (!slug) {
    return new Response(null, { status: 401 });
  }

  const { apiKey, secretKey } = workspaces[slug];
  const handle = webhookHandler(
    (payload) => {
      console.info('[proofage-demo] webhook received', {
        slug,
        verification_id: payload.verification_id,
        status: payload.status,
      });
    },
    {
      apiKey,
      secretKey,
      tolerance: Number(process.env.PROOFAGE_WEBHOOK_TOLERANCE ?? 300),
    },
  );
  return handle(request);
}
```

- [ ] **Step 2: Typecheck, lint**

Run: `npx tsc --noEmit && npx eslint app lib`
Expected: no errors.

- [ ] **Step 3: Smoke test the unknown-key path**

```bash
PROOFAGE_DEMO_WORKSPACES='{"ember-box":{"apiKey":"pk_a","secretKey":"sk_a"},"eudi-wallet":{"apiKey":"pk_b","secretKey":"sk_b"}}' npx next dev -p 3130 &
sleep 8
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H 'X-Auth-Client: pk_unknown' -d '{}' http://localhost:3130/api/webhooks/proofage
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H 'X-Auth-Client: pk_a' -H 'X-Timestamp: 1' -H 'X-HMAC-Signature: bad' -d '{}' http://localhost:3130/api/webhooks/proofage
pkill -f "next dev -p 3130"
```

Expected: `401` and `401`.

- [ ] **Step 4: Commit**

```bash
git add app/api/webhooks/proofage/route.ts
git commit -m "feat: webhook verifies with the sending workspace's keys"
```

---

### Task 6: Storefront starts the server session

**Files:**
- Modify: `types/kyc.d.ts`
- Modify: `components/VerifyButton.tsx`
- Modify: `components/Hero.tsx`
- Modify: `components/Storefront.tsx`
- Modify: `app/page.tsx`
- Modify: `app/eudi-wallet-age-verification/page.tsx`
- Delete: `components/SuccessState.tsx`

**Interfaces:**
- Consumes: `POST /api/demo-session` (Task 4), `publicKeyFor(slug)` (Task 4), `DemoSlug` (Task 1).
- Produces: `Storefront` props `{ slug: DemoSlug; apiKey: string; copy: HeroCopy; children?: ReactNode }`; `Hero` props `{ slug; apiUrl; apiKey; sdkUrl; copy; onErrorMessage }`; `VerifyButton` props `{ slug; apiUrl; apiKey; sdkUrl; onErrorMessage }`.

- [ ] **Step 1: Align** `types/kyc.d.ts` **with the SDK**

Replace `KycResult` and the `start` signature:

```ts
/** Passed to onComplete when the person reaches the final screen. It carries no outcome: ask the backend. */
export interface KycResult {
  verificationId: string;
  /** @deprecated Same value as verificationId. */
  sessionId: string;
}

export interface KycStartOptions {
  /** URL of a verification created server-side (`url` from POST /v1/verifications). */
  verificationUrl?: string;
}
```

and in `KycServiceGlobal`: `start: (options?: KycStartOptions) => Promise<void>;`. Keep `KycServiceConfig` and the rest as they are.

- [ ] **Step 2: Rewrite the click path in** `components/VerifyButton.tsx`

Props become:

```ts
type VerifyButtonProps = {
  slug: DemoSlug;
  apiUrl: string;
  apiKey: string;
  sdkUrl: string;
  onErrorMessage: (message: string) => void;
};
```

Imports: add `import { useRouter } from 'next/navigation';` and `import type { DemoSlug } from '@/lib/demo-pages';`; drop the `KycResult` import if unused.

Remove `sdkMetadata`, `sdkMetadataRef`, `onVerified`, `onVerifiedRef` and the `apiKeyEnvName` prop. In `initSdk`, drop `metadata` from `init` (the server sets it now) and replace the `onComplete` callback body with:

```ts
window.KycService.onComplete(() => {
  setBusy(false);
  window.setTimeout(closeVerifyTab, AUTO_CLOSE_DELAY_MS);
  router.push('/result');
});
```

(`const router = useRouter();` at the top of the component; add `router` to `initSdk`'s dependency array.)

Add, inside the component:

```ts
const createSession = async (): Promise<string> => {
  const response = await fetch('/api/demo-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug }),
  });
  const body = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!response.ok || !body?.url) {
    throw new Error(body?.error ?? 'Could not start the verification. Please try again.');
  }
  return body.url;
};
```

Replace `handleClick` with one path for both modes (the SDK itself opens the new tab, and shows its own link overlay if the browser blocks it):

```ts
const handleClick = async () => {
  if (!sdkReady || !window.KycService) {
    onErrorMessageRef.current('SDK is still loading. Please wait.');
    return;
  }
  setBusy(true);

  const origOpen = window.open.bind(window);
  if (openInNewTabRef.current) {
    window.open = (...args: Parameters<typeof window.open>) => {
      const opened = origOpen(...args);
      verifyTabRef.current = opened;
      return opened;
    };
  }
  try {
    const verificationUrl = await createSession();
    await window.KycService.start({ verificationUrl });
  } catch (e) {
    setBusy(false);
    onErrorMessageRef.current(e instanceof Error ? e.message : 'Failed to start verification');
  } finally {
    window.open = origOpen;
  }
};
```

Change the missing-config text to: `This demo is not configured. Set NEXT_PUBLIC_PROOFAGE_API_URL, NEXT_PUBLIC_PROOFAGE_SDK_URL and PROOFAGE_DEMO_WORKSPACES.` (keep the existing `<p>` styling; drop the `<code>` around `.env.local` if it no longer fits the sentence).

- [ ] **Step 3: Simplify** `components/Hero.tsx`

- Remove `verified`, `onVerified`, `apiKeyEnvName`, `sdkMetadata` props and the `KycResult`/`SuccessState` imports.
- Add `slug: DemoSlug` (import type from `@/lib/demo-pages`).
- The left column always renders the eyebrow/heading/intro/card (drop the `verified ? <SuccessState /> : <>…</>` ternary, keep the fragment's contents).
- Pass `slug={slug}` to `VerifyButton`.

- [ ] **Step 4: Simplify** `components/Storefront.tsx`

- Props: `{ slug: DemoSlug; apiKey: string; copy: HeroCopy; children?: ReactNode }` (remove `apiKeyEnvName`, `sdkMetadata`).
- Remove the `verified` state; pass `slug`, `apiKey` and the rest to `Hero` without `verified`/`onVerified`.

- [ ] **Step 5: Pages pass slug and public key**

`app/page.tsx`:

```tsx
import { Storefront } from '@/components/Storefront';
import { publicKeyFor } from '@/lib/proofage';

export default function HomePage() {
  return (
    <Storefront
      slug="ember-box"
      apiKey={publicKeyFor('ember-box')}
      copy={{ /* unchanged copy object */ }}
    />
  );
}
```

`app/eudi-wallet-age-verification/page.tsx`: replace the three props `apiKey`, `apiKeyEnvName`, `sdkMetadata` with `slug="eudi-wallet"` and `apiKey={publicKeyFor('eudi-wallet')}`; add the `publicKeyFor` import. Keep metadata, JSON-LD and `WalletHowItWorks` as they are.

- [ ] **Step 6: Delete** `components/SuccessState.tsx`

```bash
git rm components/SuccessState.tsx
```

- [ ] **Step 7: Typecheck, lint, test, build**

```bash
npx tsc --noEmit && npx eslint app lib components && npm test
PROOFAGE_DEMO_WORKSPACES='{"ember-box":{"apiKey":"pk_a","secretKey":"sk_a"},"eudi-wallet":{"apiKey":"pk_b","secretKey":"sk_b"}}' npx next build
```

Expected: no errors; build lists `/`, `/eudi-wallet-age-verification`, `/api/demo-session`, `/api/webhooks/proofage`.

- [ ] **Step 8: Commit**

```bash
git add -A types components app
git commit -m "refactor: storefront starts a server-created session and no longer claims an outcome"
```

---

### Task 7: Result page

**Files:**
- Create: `app/result/page.tsx`
- Create: `components/ResultScreen.tsx`
- Create: `components/MembersContent.tsx`

**Interfaces:**
- Consumes: `loadResult()` (Task 4), `LoadedResult`/`ResultView` (Task 3), `pathForSlug`/`DEMO_PAGES` (Task 1), `GET`/`DELETE /api/demo-session` (Task 4), `Footer`.
- Produces: the `/result` route.

- [ ] **Step 1: Create** `app/result/page.tsx`

```tsx
import type { Metadata } from 'next';
import { ResultScreen } from '@/components/ResultScreen';
import { loadResult } from '@/lib/demo-session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your result',
  robots: { index: false, follow: false },
};

export default async function ResultPage() {
  return <ResultScreen initial={await loadResult()} />;
}
```

- [ ] **Step 2: Create** `components/MembersContent.tsx`

```tsx
const BOXES = [
  { name: 'The Smoked Oak Box', text: 'Three small-batch single malts aged in charred oak, with tasting notes from the distiller.' },
  { name: 'The Amber Hour Box', text: 'Aperitifs and bitters for slow evenings, with a card of five classic recipes.' },
  { name: 'The Night Market Box', text: 'Rare finds from independent makers, picked by our members each month.' },
];

/** Fictional members-only content: what the store unlocks once age is confirmed. */
export function MembersContent() {
  return (
    <section aria-labelledby="members-title" className="mt-14">
      <p className="text-[10px] uppercase tracking-[0.35em] text-ember-amber">Members only</p>
      <h2 id="members-title" className="mt-3 font-[family-name:var(--font-display)] text-3xl font-light text-ember-cream">
        This month&apos;s boxes
      </h2>
      <ul className="mt-8 grid gap-6 md:grid-cols-3">
        {BOXES.map((box) => (
          <li key={box.name} className="border border-ember-amber/20 bg-white/[0.03] p-6">
            <h3 className="font-[family-name:var(--font-display)] text-xl text-ember-cream">{box.name}</h3>
            <p className="mt-3 text-sm leading-relaxed text-ember-smoke">{box.text}</p>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs text-ember-smoke">Ember Box is fictional. Nothing here is for sale.</p>
    </section>
  );
}
```

- [ ] **Step 3: Create** `components/ResultScreen.tsx`

```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Footer } from '@/components/Footer';
import { MembersContent } from '@/components/MembersContent';
import { DEMO_PAGES, pathForSlug } from '@/lib/demo-pages';
import type { LoadedResult, ResultView } from '@/lib/demo-result';

const POLL_INTERVAL_MS = 3000;
const POLL_LIMIT_MS = 2 * 60 * 1000;

const primaryButton =
  'inline-block bg-ember-amber px-6 py-4 text-[11px] font-medium uppercase tracking-[0.25em] text-ember-dark transition hover:shadow-[0_8px_32px_rgba(200,134,42,0.3)]';
const textLink = 'text-ember-amber underline underline-offset-4';

export function ResultScreen({ initial }: { initial: LoadedResult }) {
  const router = useRouter();
  const [result, setResult] = useState<LoadedResult>(initial);
  const [timedOut, setTimedOut] = useState(false);
  const pending = result.kind === 'ok' && result.view.pending;

  useEffect(() => {
    if (!pending) {
      return;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(async () => {
      if (Date.now() - startedAt > POLL_LIMIT_MS) {
        window.clearInterval(timer);
        setTimedOut(true);
        return;
      }
      try {
        const response = await fetch('/api/demo-session', { cache: 'no-store' });
        if (response.ok) {
          setResult((await response.json()) as LoadedResult);
        }
      } catch {
        // Keep the last result; the next tick retries.
      }
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [pending]);

  const startOver = async (slug: string) => {
    await fetch('/api/demo-session', { method: 'DELETE' }).catch(() => null);
    router.push(pathForSlug(slug));
  };

  return (
    <div className="flex min-h-dvh flex-col bg-ember-dark">
      <header className="flex items-center justify-between px-6 py-8 md:px-16">
        <Link href="/" className="font-[family-name:var(--font-display)] text-lg font-light uppercase tracking-[0.35em] text-ember-cream">
          Ember <span className="text-ember-amber">Box</span>
        </Link>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-20 pt-8 md:px-16">
        {result.kind === 'no_session' && <NoSession />}
        {result.kind === 'error' && (
          <Message title="We couldn't load your result">
            Something went wrong on our side.{' '}
            <a href="/result" className={textLink}>
              Try again
            </a>
            .
          </Message>
        )}
        {result.kind === 'ok' && (
          <>
            <StateView view={result.view} timedOut={timedOut} onStartOver={() => startOver(result.slug)} />
            <StorePanel view={result.view} />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

function StateView({ view, timedOut, onStartOver }: { view: ResultView; timedOut: boolean; onStartOver: () => void }) {
  const startOverButton = (
    <button type="button" onClick={onStartOver} className={primaryButton}>
      Start over
    </button>
  );
  const continueLink = view.continueUrl ? (
    <a href={view.continueUrl} className={primaryButton}>
      Continue verification
    </a>
  ) : null;

  switch (view.state) {
    case 'approved_named':
      return (
        <>
          <Message title={`Hi ${view.firstName}, thanks for confirming you're 18+`}>
            Your ID was checked, so Ember Box knows who you are. Welcome to the members area.
          </Message>
          <MembersContent />
        </>
      );
    case 'approved_guest':
      return (
        <>
          <Message title="Welcome, guest. You're confirmed 18+">
            Ember Box knows one thing about you: you are over 18. We never learned your name.
          </Message>
          <MembersContent />
        </>
      );
    case 'checking':
    case 'in_review':
      return (
        <Message title={view.state === 'checking' ? 'Checking your result…' : 'A reviewer is looking at your check'}>
          {timedOut ? (
            <>
              This is taking longer than usual.{' '}
              <a href="/result" className={textLink}>
                Refresh
              </a>{' '}
              to check again.
            </>
          ) : (
            'This page updates by itself as soon as there is a decision.'
          )}
        </Message>
      );
    case 'not_finished':
      return (
        <Message title="You haven't finished the check" action={continueLink}>
          Pick up where you left off.
        </Message>
      );
    case 'retry':
      return (
        <Message title="One more try needed" action={continueLink}>
          The check could not be completed from what was sent. You can try again in the same session.
        </Message>
      );
    case 'declined':
      return (
        <Message title="We couldn't confirm your age" action={startOverButton}>
          Ember Box can&apos;t open the members area for this check.
        </Message>
      );
    case 'ended':
      return (
        <Message title="This check ended" action={startOverButton}>
          The session expired or was left unfinished.
        </Message>
      );
    default:
      return (
        <Message title="Something unexpected happened" action={startOverButton}>
          Start a new check to continue.
        </Message>
      );
  }
}

function NoSession() {
  return (
    <Message title="This result is on the device where you started">
      If you finished the check on your phone, go back to the computer you started on. Or open a demo again:{' '}
      <Link href={DEMO_PAGES['ember-box']} className={textLink}>
        selfie &amp; ID demo
      </Link>{' '}
      or{' '}
      <Link href={DEMO_PAGES['eudi-wallet']} className={textLink}>
        EUDI Wallet demo
      </Link>
      .
    </Message>
  );
}

function Message({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="max-w-2xl">
      <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.25rem,4.5vw,3.5rem)] font-light leading-[1.1] text-ember-cream">
        {title}
      </h1>
      <p className="mt-6 text-sm leading-relaxed text-ember-smoke">{children}</p>
      {action && <div className="mt-8">{action}</div>}
    </section>
  );
}

/** What the store's backend received: the fields the page is built from, nothing else. */
function StorePanel({ view }: { view: ResultView }) {
  const received = {
    status: view.status,
    reason: view.reason,
    ...(view.firstName ? { first_name: view.firstName } : {}),
  };
  return (
    <details className="mt-14 border border-white/10 p-6 text-sm text-ember-smoke">
      <summary className="cursor-pointer text-[11px] uppercase tracking-[0.2em] text-ember-cream">
        What the store received
      </summary>
      <p className="mt-4">
        Ember Box&apos;s server asked ProofAge for this result with <code>GET /v1/verifications/{'{id}'}</code>
        {view.firstName ? ' and read the first name from the document endpoint' : ''}.
      </p>
      <pre className="mt-4 overflow-x-auto bg-black/30 p-4 text-xs text-ember-cream">{JSON.stringify(received, null, 2)}</pre>
    </details>
  );
}
```

- [ ] **Step 4: Typecheck, lint, test, build**

```bash
npx tsc --noEmit && npx eslint app lib components && npm test
PROOFAGE_DEMO_WORKSPACES='{"ember-box":{"apiKey":"pk_a","secretKey":"sk_a"},"eudi-wallet":{"apiKey":"pk_b","secretKey":"sk_b"}}' npx next build
```

Expected: no errors; `/result` is listed as dynamic (ƒ).

- [ ] **Step 5: Smoke test the no-cookie screen**

```bash
PROOFAGE_DEMO_WORKSPACES='{"ember-box":{"apiKey":"pk_a","secretKey":"sk_a"},"eudi-wallet":{"apiKey":"pk_b","secretKey":"sk_b"}}' npx next start -p 3131 &
sleep 5
curl -s http://localhost:3131/result | grep -o 'This result is on the device where you started' | head -1
curl -s http://localhost:3131/result | grep -o '<meta name="robots" content="[^"]*"'
curl -s -b 'pa_demo_session={"slug":"ember-box","verificationId":"x","url":"javascript:alert(1)"}; pa_demo_visitor=AAAAAAAAAAAAAAAAAAAAAA' http://localhost:3131/result | grep -o 'This result is on the device where you started' | head -1
curl -s http://localhost:3131/sitemap.xml | grep -c '/result' ; true
pkill -f "next start -p 3131"
```

Expected: the no-session sentence twice, `noindex, nofollow`, and `0` for the sitemap count.

- [ ] **Step 6: Commit**

```bash
git add app/result components/ResultScreen.tsx components/MembersContent.tsx
git commit -m "feat: result page with the real outcome"
```

---

### Task 8: Env docs and final checks

**Files:**
- Modify: `.env.example`
- Modify: `README.md` (the environment-variable section and the "What this demo shows" table)

- [ ] **Step 1: Rewrite** `.env.example`

```env
# Public URL of this demo (metadata, sitemap, and the /result redirect). No trailing slash.
NEXT_PUBLIC_SITE_URL=https://demo.proofage.xyz

# Server-only: one entry per demo page, keyed by slug. The public key reaches the
# browser SDK through the page; the secret key signs API calls and verifies webhooks.
#   ember-box   → /
#   eudi-wallet → /eudi-wallet-age-verification
PROOFAGE_DEMO_WORKSPACES={"ember-box":{"apiKey":"pk_live_...","secretKey":"sk_live_..."},"eudi-wallet":{"apiKey":"pk_live_...","secretKey":"sk_live_..."}}

# Defaults baked into the code — only override for local dev or custom deployments:
# NEXT_PUBLIC_PROOFAGE_API_URL=https://api.proofage.xyz/v1
# NEXT_PUBLIC_PROOFAGE_SDK_URL=https://app.proofage.xyz/sdk-build/kyc-loader.js
# PROOFAGE_BASE_URL=https://api.proofage.xyz

# Optional: webhook timestamp tolerance (seconds)
PROOFAGE_WEBHOOK_TOLERANCE=300
```

- [ ] **Step 2: Update** `README.md`

- In "What this demo shows", replace the rows about `/api/create-verification` and `/api/verification/[id]` with:
  - **Server-side session** — `POST /api/demo-session` creates the verification with HMAC signing (`@proofage/node`), an `external_id` from an httpOnly visitor cookie and `callback_url` = `/result`; the browser opens it with `KycService.start({ verificationUrl })`.
  - **Result page** — `/result` asks ProofAge for the outcome (`GET /v1/verifications/{id}`, plus the document's first name when approved) and checks `external_id` against the visitor cookie before showing anything.
  - **Webhook receiver** — `POST /api/webhooks/proofage` picks the workspace by `X-Auth-Client` and verifies the signature with its secret.
- Replace the env block in "Configure environment variables" with the one from Step 1 and one sentence: "Each demo page has its own workspace; add an entry to `PROOFAGE_DEMO_WORKSPACES` and a page to add a demo."
- Remove any remaining mention of `NEXT_PUBLIC_PROOFAGE_API_KEY`, `PROOFAGE_API_KEY` or `PROOFAGE_SECRET_KEY`:

```bash
grep -n "NEXT_PUBLIC_PROOFAGE_API_KEY\|NEXT_PUBLIC_PROOFAGE_WALLET_API_KEY\|PROOFAGE_API_KEY\|PROOFAGE_SECRET_KEY" -r README.md .env.example app components lib types
```

Expected: no output.

- [ ] **Step 3: Final checks**

```bash
npm test
npx tsc --noEmit && npx eslint app lib components
PROOFAGE_DEMO_WORKSPACES='{"ember-box":{"apiKey":"pk_a","secretKey":"sk_a"},"eudi-wallet":{"apiKey":"pk_b","secretKey":"sk_b"}}' NEXT_PUBLIC_SITE_URL=https://demo.proofage.xyz npx next build
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add .env.example README.md
git commit -m "docs: demo env and server-side flow"
```

---

## After the plan (not for the implementer)

These need the owner and live systems, and are done by the coordinating session:

1. End-to-end against a test workspace (the spec's Testing section): the owner finishes the widget per scenario; `set-test-verification-outcome` drives approved / declined / resubmission; a test webhook delivery is replayed against the local server.
2. `PROOFAGE_DEMO_WORKSPACES` in Vercel with both live workspaces (secret keys copied from the console by the owner).
3. Push, deploy, one real pass per production page, Lighthouse on `/` and `/eudi-wallet-age-verification`.
4. `webhook_url` on both workspaces (preview, owner confirms), then delete the four old env vars from Vercel.
