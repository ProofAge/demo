# Demo result page — design

Date: 2026-10-04
Status: agreed in chat, pending spec review

## Goal

The demo (demo.proofage.xyz) shows the ProofAge flow but not what the store
gets from it. After the widget closes, the page says "Age verified" whether
the person was approved, declined or sent to review, because it reacts to the
SDK's `onComplete`, which carries no outcome.

After this change the demo asks its own backend for the result and shows what
a real store would: members-only content when approved, greeting the person
by first name if a document was read, and as "guest" otherwise (selfie or
wallet, where the store never learns a name). Declined, retry and pending
states get their own screens.

It also turns the demo into a correct reference integration: sessions are
created server-side with HMAC signing and an `external_id`, and the outcome
comes from `GET /v1/verifications/{id}`, as the SDK documentation asks.

## Non-goals

- No `method` field in the public API. The demo does not need to know how a
  person passed, only whether a first name exists.
- No database. ProofAge stores the session and its `external_id`; the demo
  keeps two cookies.
- The result page does not depend on webhooks: without storage a webhook has
  nowhere to leave the outcome for the browser, so the page asks the API.
- No live webhook view on the page.

## Demos and keys

Each demo is a slug bound to one workspace:

| Slug | Page | Workspace |
|---|---|---|
| `ember-box` | `/` | the current main demo workspace |
| `eudi-wallet` | `/eudi-wallet-age-verification` | eWallet (`01a0eed6-610b-73b2-94d0-117ec4a8455b`) |

Keys live in one server-only env var, a JSON map from slug to keys:

```
PROOFAGE_DEMO_WORKSPACES={"ember-box":{"apiKey":"pk_…","secretKey":"sk_…"},"eudi-wallet":{"apiKey":"pk_…","secretKey":"sk_…"}}
```

A new demo is one new entry plus one page. `NEXT_PUBLIC_PROOFAGE_API_KEY` and
`NEXT_PUBLIC_PROOFAGE_WALLET_API_KEY` are removed from the code; the page gets
its public key from the server component (the browser SDK's `init` requires
one even when it opens a server-created session). `NEXT_PUBLIC_PROOFAGE_API_URL`,
`NEXT_PUBLIC_PROOFAGE_SDK_URL` and `PROOFAGE_BASE_URL` keep their meaning.

An unknown slug or a malformed map is a server error that names the env var,
never a silent fallback to another workspace.

## Cookies

| Cookie | Value | Lifetime | Purpose |
|---|---|---|---|
| `pa_demo_visitor` | random 128-bit id (base64url) | 30 days | sent as `external_id`; proves the result belongs to this browser |
| `pa_demo_session` | `{"slug":"…","verificationId":"…"}` | 24 hours | which verification the result page shows |

Both are `httpOnly`, `Secure` (except on localhost), `SameSite=Lax`, path `/`.
Neither is signed: the result page reads a verification only when its
`external_id` equals the visitor cookie, so a forged session cookie shows
nothing without the matching visitor id, which never leaves the server.

## Flow

1. **Click.** The verify button calls `POST /api/demo-session` with the slug.
   The route ensures a visitor cookie and creates a verification through
   `@proofage/node` with:
   - `external_id`: the visitor id (only a signed server request can set it;
     the browser SDK's unsigned create drops it);
   - `callback_url`: `{SITE_URL}/result` (where the hosted page sends the
     person when it finishes, e.g. in a new tab or on a phone after the QR
     handoff);
   - `metadata`: `{ "demo": slug }`;
   then sets the session cookie and answers `{ url }`. If the session cookie
   already points at a verification of the same slug that is still
   `created`, it is reused instead of creating another one.
2. **Start.** The client calls `KycService.start({ verificationUrl: url })`.
   In "New tab" mode the SDK opens the tab itself; Chrome and Firefox allow it
   for a few seconds after the click, and where the browser blocks it (Safari)
   the SDK shows its own "open verification" link overlay
   (`showNewTabBlockedOverlay`), so the demo needs no fallback of its own.
3. **Complete.** `onComplete` navigates to `/result`.
4. **Result.** `/result` is a server component. It reads both cookies, loads
   the verification with the slug's keys, checks `external_id`, and renders
   a state (below). While the state is pending, a small client component
   polls `GET /api/demo-session` every 3 seconds for up to 2 minutes and
   re-renders; after that it shows "still checking" with a refresh link.
   `GET /api/demo-session` returns the same view model the page renders,
   never the raw API body.
5. **First name.** Only for `approved`, the route calls
   `GET /v1/verifications/{id}/document` and takes `document.fields.first_name`.
   Nothing else from the document is read, returned or logged.

## Webhook

`/api/webhooks/proofage` becomes a working receiver for every demo workspace:

- It reads `X-Auth-Client` (the workspace's public key), finds the entry in
  `PROOFAGE_DEMO_WORKSPACES` whose `apiKey` matches, and verifies the
  signature with `handleWebhook(request, { apiKey, secretKey })` from
  `@proofage/node`. An unknown public key answers 401; a bad signature
  answers what `handleWebhook` decides.
- On success it answers 200 and logs `verification_id`, `status` and the
  slug only, no personal data.
- `PROOFAGE_API_KEY` and `PROOFAGE_SECRET_KEY` are no longer read anywhere.

Both workspaces get `webhook_url` =
`https://demo.proofage.xyz/api/webhooks/proofage`. They are live, so the
change is previewed and applied only after the owner agrees.

## View model

`lib/demo-result.ts` holds a pure function from the API status (plus the
optional first name) to what the page shows:

| API status | State | Screen |
|---|---|---|
| `created`, `started` | `not_finished` | "You haven't finished the check" + continue button (reopens the same URL) |
| `submitted` | `checking` | "Checking your result…" (polls) |
| `review` | `in_review` | "A reviewer is looking at your check" (polls, then stops) |
| `approved` + first name | `approved_named` | "Hi Eric, thanks for confirming you're 18+" + members content |
| `approved`, no first name | `approved_guest` | "Welcome, guest. You're confirmed 18+ — and we never learned your name." + members content |
| `resubmission_requested` | `retry` | "One more try needed" + continue button (same URL) |
| `declined` | `declined` | "We couldn't confirm your age" + start over |
| `abandoned`, `expired` | `ended` | "This check ended" + start over |
| any other value | `unknown` | neutral "Something unexpected happened" + start over |

The first name is trimmed and capitalised for display; an empty string counts
as no name. The approved screens carry fictional Ember Box members content
(a few curated boxes, no prices or checkout).

Below the result, a collapsed "What the store received" panel shows the view
model's source fields: `status`, `reason`, and `first_name` when present. Not
the external id, not the full API body.

## Other result-page cases

- **No cookies** (the person finished on a phone after a QR handoff, or the
  cookie expired): "This result is on the device where you started", with a
  link back to the demo pages.
- **`external_id` mismatch, or the verification is not found:** the same
  screen as no cookies. It does not say why.
- **API error:** "We couldn't load your result" + retry link. The error is
  logged server-side without keys or personal data.
- **Start over** clears `pa_demo_session` and returns to the slug's page.

`/result` is `noindex, nofollow` and excluded from the sitemap.

## Removed

- `/api/create-verification`: unused by the UI, and it sends the webhook URL
  as `callback_url`, which is the post-verification redirect.
- `/api/verification/[id]`: returns any verification of the main workspace to
  anyone who knows its id.
- `components/SuccessState.tsx` and the `verified` state in `Storefront`: the
  storefront no longer claims an outcome.
- `types/kyc.d.ts` is aligned with the SDK: `onComplete` carries
  `verificationId`, and `start` accepts `{ verificationUrl }`.

## Dependencies

`@proofage/node` goes from `^0.1.0` to `^0.11.0` (current release), for
`verifications(id).document()` and the typed `CreatedVerification.url`.
No other new dependency.

## Testing

- Unit tests with the built-in `node --test` runner (Node 22.18+ strips types)
  for the pure modules: view-model mapping, workspace-map parsing, first-name
  normalisation, cookie value parsing. These modules import nothing from Next
  or `@/` aliases. A `test` script is added to `package.json`.
- `tsc --noEmit`, ESLint and `next build` pass.
- The webhook route is tested by replaying a real test-workspace delivery
  (`get-webhook-delivery-request`) against the local server: 200 for a known
  key with a valid signature, 401 for an unknown `X-Auth-Client`.
- End-to-end on a local server against a **test** workspace created for this
  (test sessions are never billed and stop in review): a person finishes the
  widget once per scenario, then `set-test-verification-outcome` drives
  `approved` (document workspace, so a name exists), `declined` and
  `resubmission_requested`. Pending and review states are checked on the way.
  The same run confirms that in popup mode the overlay closes on completion
  instead of loading `callback_url` inside the iframe, and that a new tab
  lands on `/result` with the cookies (demo and IDV hosts are same-site under
  `proofage.xyz`, so `SameSite=Lax` cookies are sent).
- After deploy, one real pass on each production page.
- Lighthouse on `/` and `/eudi-wallet-age-verification` stays at
  Accessibility 100 and SEO 100.

## Rollout

1. Add `PROOFAGE_DEMO_WORKSPACES` to Vercel Production with both entries.
   The secret keys of live workspaces are copied by a person from the
   console (API keys tab); they are never returned to the assistant.
2. Push; Vercel deploys.
3. Set `webhook_url` on both workspaces (preview, then confirm with the
   owner), and check a delivery answers 2xx with `list-webhook-deliveries`.
4. Remove `NEXT_PUBLIC_PROOFAGE_API_KEY`, `NEXT_PUBLIC_PROOFAGE_WALLET_API_KEY`,
   `PROOFAGE_API_KEY` and `PROOFAGE_SECRET_KEY` from Vercel once production
   works.
