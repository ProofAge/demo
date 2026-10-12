# Scenario demo — design

Date: 2026-10-13
Status: draft, agreed in chat on the structure; open questions at the end
Source brief: `claude/demo-overhaul-brief.md` in the ProofAge project (13 Oct 2026)
Builds on: `2026-10-04-result-page-design.md` (server-side sessions, cookies, `external_id` check)

## Goal

Today every "Try the live demo" link lands on Ember Box, a fictional
adults-only store. A TEFL school, a babysitting marketplace or a camera-rental
shop does not see itself there, and identity verification (KYC), our main
product, is hidden behind an age gate.

After this change:

- `/` shows the general flow: a video of the whole product, then a selfie
  check (nothing to upload) and an ID check (for people with a document at
  hand), then **what your system receives** — the real webhook, signed and
  timed.
- Four scenario pages (`/courses`, `/marketplaces`, `/rental`, `/store`) run
  the same flow inside a "before" card and an "after" card that look like a
  fragment of the visitor's own product: a certificate, a profile badge, a
  booking, a checkout.
- Visitors who will not upload a document can fill the After card and the
  webhook panel with **sample data**, clearly labelled, without creating a
  verification.
- Ember Box is removed entirely.

Everything a visitor cannot try alone (blocking a face, the retry being
declined, the dashboard) is shown in the video, not built.

## Non-goals

- No mock product beyond one Before and one After card per scenario: no
  catalogue, sign-up, navigation or brand inside the cards.
- No live face blocking, no "Delete my demo data" button, no new ProofAge API
  endpoints.
- No separate live flow for Age verification by ID.
- No translations, no new analytics (the existing optional GA tag stays).
- No changes to the EUDI Wallet flow itself; only its page chrome changes
  (see "EUDI page").

## Routes

| Route | What it is | Workspace slug |
|---|---|---|
| `/` | General flow, both checks | `age-selfie` and `kyc` |
| `/courses` | Scenario: course certificate | `kyc` |
| `/marketplaces` | Scenario: provider profile badge | `kyc` |
| `/rental` | Scenario: rental booking | `kyc` |
| `/store` | Scenario: age-restricted checkout | `age-selfie` |
| `/eudi-wallet-age-verification` | Existing EUDI page, new chrome | `eudi-wallet` |
| `/result` | Kept only as a resolver: redirects to the page stored in the session cookie, else `/` | — |
| `/e-wallet` | Existing 301 to the EUDI page | — |

`/result` is not 301'd to `/store` (the brief's suggestion): it is the
`callback_url` of verifications already in flight, and it is where a person
lands after finishing in a new tab. As a resolver it sends them back to the
page they started on, which then shows the result in place. Stays `noindex`.

`/` keeps its URL, so YouTube descriptions and the Shopify listing that link
to it land on the general flow.

## Workspaces

All three workspaces live in **one dedicated demo tenant**, separate from the
Shopify app and every customer (the face blocklist is shared across a
tenant's workspaces; a customer must never see demo faces).

| Slug | Check | Mode | Notes |
|---|---|---|---|
| `kyc` | Identity verification (KYC) | Protected | Duplicate detection on; returns all eleven document fields |
| `age-selfie` | Facial age check, threshold 18 | Private | Falls back to ID if inconclusive (then only the four base fields exist) |
| `eudi-wallet` | Wallet age check (beta) | Private | The existing workspace, unchanged |

`PROOFAGE_DEMO_WORKSPACES` gets `kyc`, `age-selfie` and `eudi-wallet`;
`ember-box` is removed. Each workspace's `webhook_url` is
`https://demo.proofage.net/api/webhooks/proofage`. The parsing code
(`lib/demo-workspaces.ts`) does not change.

## Scenario config

One file, `lib/scenarios.ts`, pure (no Next/React imports, testable with
`node --test`). Adding a vertical is one entry; no layout code.

```ts
type ScenarioSlug = 'courses' | 'marketplaces' | 'rental' | 'store';

type Scenario = {
  slug: ScenarioSlug;
  path: `/${string}`;
  navLabel: string;                 // "Online courses"
  workspace: 'kyc' | 'age-selfie';
  meta: { title: string; description: string };
  h1: string;
  lead: string;                     // one line under the H1
  card: 'certificate' | 'profile' | 'booking' | 'checkout';  // which card component
  before: { title: string; text: string; button: string };
  after: {
    approved: string;               // may contain {firstName}
    declined: string;
    review: string | null;          // null: not applicable
  };
  note: string | null;              // the one-line "Extra" from the table below
  siteUrl: string;                  // matching page on proofage.net
  extraAction?: { label: string; href: string };  // /store → EUDI
};
```

The four card components are small presentational components
(`components/cards/*`) taking `{ state, firstName, verifiedAt }`. They render
neutral placeholders ("Your platform", "Camera kit, 3 days"), never a brand.

### Scenario copy

| | `/courses` | `/marketplaces` | `/rental` | `/store` |
|---|---|---|---|---|
| H1 | Check the learner before you issue the certificate | Verify the person behind the profile | Check the renter before pickup | Check age at checkout |
| Before | Course progress: "Final assessment passed. Confirm your identity to receive your certificate." | Provider profile (sitter or seller), no badge: "Verify your ID to get the Verified badge." | Booking summary (camera kit, dates): "Confirm your identity before pickup." | Cart with one 18+ item: "Confirm you are over 18 to continue." |
| After, approved | Certificate preview with the first name from the document, "Identity verified" and the date | Profile with an "ID verified" badge and the first name | "Booking confirmed. Renter verified", first name shown | "Age confirmed. Continue to payment" |
| After, declined | "Certificate on hold: identity not confirmed" | "Badge not granted" | "Booking on hold: identity not confirmed" | "We could not confirm your age. Checkout blocked" |
| After, review | "Certificate pending manual review" | "Badge pending manual review" | "Booking pending manual review" | not applicable |
| Note | — | "Banned users are recognised by face on a new account. See the video." | "US and Canadian driving licences: the barcode is read and checked against the front." | "If the selfie is inconclusive, the check falls back to an ID at no extra cost." |
| Extra action | — | — | — | "Use EUDI Wallet instead (beta)" → `/eudi-wallet-age-verification` |
| Site link | proofage.net/online-courses | proofage.net/marketplaces | proofage.net/rental-and-sharing | proofage.net/age-restricted-ecommerce |

The After cards show the **first name only** (normalised with the existing
`normaliseFirstName`). The rental card says "name matches the booking" only
in sample mode, where we control both names; with a live check it says
"Renter verified" and the first name, because the demo has no booking name to
compare against.

## Session and cookies

The 4 Oct design stays: `pa_demo_visitor` (`external_id`) and
`pa_demo_session`, both httpOnly. The session cookie gains the page the
visitor started on:

```ts
type DemoSession = { slug: WorkspaceSlug; page: DemoPage; verificationId: string; url: string };
```

- `page` is validated against the known list (`/`, the four scenario paths,
  the EUDI path); anything else makes the cookie invalid.
- `POST /api/demo-session` takes `{ slug, page }`, checks that the page is
  allowed to use that workspace (from the scenario config; `/` may use both),
  and sets `callback_url` to `/result`.
- The existing reuse rule stays: a still-`created` verification for the same
  slug **and page** is reused.
- Starting a check on another page replaces the session (one live check per
  browser, as today).
- `GET /api/demo-session` returns the result view for the page that asks
  (`?page=`); a session for another page counts as no session there.

## Starting a check

The existing `VerifyButton` logic (server-created session, SDK `start`,
polling in new-tab mode, `onComplete`/`onClose`/`onError`) is kept and
restyled. Changes:

- The "Open verification in: New tab / Popup" toggle goes. Desktop opens the
  widget as a popup (iframe overlay); mobile opens it in a new tab, which is
  the case the existing polling was built for.
- On `onComplete` the page stays where it is and refreshes the result in
  place (no navigation to `/result`).
- **Phone handoff:** the brief asks for our own QR code. The widget already
  offers a QR handoff to a phone (the 4 Oct design relies on it), and the
  desktop page already polls by cookie. So: **no QR code of our own**; the
  desktop page keeps polling while the person finishes on the phone, and
  shows "Finishing on your phone? This page updates by itself." See open
  question 1.
- A phone that opens `callback_url` after a handoff has no cookies: `/result`
  redirects to `/`, which shows a one-line notice "Your result is on the
  device where you started." (existing `no_session` behaviour, new copy).

Next to every start button, before any click:

- Selfie check: "A selfie with liveness. Images are deleted right after the
  decision."
- ID check: "A photo of an ID and a selfie with liveness. Images are kept
  30 days and a face template 12 months. To delete yours sooner, write to
  support@proofage.net."
- Under both: "ProofAge (IT Brains SASU) is the controller for demo
  verifications." with a link to https://proofage.net/privacy.

Consent is collected by the widget; the page adds no checkbox.

## What your system receives (panel)

Shown on every page once a check has started (or sample data was chosen);
before that, a dimmed placeholder with the field names.

### Data source

The panel shows the **decision webhook as the demo server received it**.

1. `POST /api/webhooks/proofage` verifies the signature with
   `webhookHandler` (unchanged), then stores the payload in a KV store
   keyed by `verification_id`, **TTL 1 hour**, together with the receipt
   time and the names of the three signature headers it checked
   (`X-Auth-Client`, `X-HMAC-Signature`, `X-Timestamp`).
2. Payloads are **never logged**. The existing log line keeps
   `slug`, `verification_id` and `status` only.
3. `GET /api/demo-session` reads the stored payload for the session's
   verification **only after** the existing `external_id === visitor`
   check, and returns it with the view.
4. Several webhooks can arrive for one verification (`review`, then a
   decision; a resubmission). The key holds the latest one; a short list of
   `{status, receivedAt}` is kept alongside for the timing line.

KV: Upstash Redis through the Vercel Marketplace integration
(`KV_REST_API_URL`, `KV_REST_API_TOKEN`), via `@upstash/redis`. If the
variables are missing (local dev without KV), the webhook still answers 200,
nothing is stored, and the panel shows the API view with the line "Webhook
storage is not configured on this deployment."

### What the panel shows

1. **Summary line:** Approved / Declined / Needs review / Resubmission
   requested, the `reason` code if any, and:
   - age threshold: for `age-selfie` and `eudi-wallet`, "Over 18" when
     approved, "Not confirmed" when declined (an approved age check means
     the threshold passed);
   - duplicate: from `duplicate_detected` / `duplicate_count`;
   - face blocklist: from the `reason` code (see open question 3).
2. **Timing:** "Decision in N s", measured from `consent_accepted_at`
   (from `GET /v1/verifications/{id}`) to the decision webhook's
   `timestamp`. Consent is the closest timestamp to "the person started";
   `created_at` would also count the time spent reading the page. The
   label says exactly that: "From consent to decision". See open question 4.
3. **Signature:** "Signature valid" and the three header names. Only
   verified payloads are ever stored, so an unsigned payload cannot appear.
4. **JSON:** the payload, formatted, with:
   - `document.fields.document_number` and `document.fields.address`
     masked by default (`•••• 4821`, `•••••`), with a "Reveal" toggle and
     the note "The API returns these in full." The full values reach the
     browser only for the visitor's own verification;
   - `fingerprint_signals` replaced by `"(omitted in the demo: IP and
     device signals)"`;
   - `duplicate_of` shown in full only when its `external_id` is this
     visitor's; otherwise replaced by `"(another verification)"`, so the
     demo never shows ids from someone else's check;
   - with `DEMO_MASK_ALL=true` (for recording), the server also masks
     first, middle and last name, date of birth, place of birth and the
     document number before the payload leaves the server, and the Reveal
     toggle is hidden. The After cards then show "Alex" as the name.
5. **Duplicate line:** when `duplicate_detected` is set and `duplicate_of`
   belongs to this visitor: "We recognised your face from your previous
   check. This is duplicate detection."
6. **Needs review:** "In production, your team would review this in the
   dashboard. This is the Needs review webhook you would receive." The page
   keeps polling for up to 10 minutes. The founders are notified (see below).

### Founder notification on review

When a `review` webhook arrives for `kyc`, the webhook route sends one
message to the founders so they can resolve it from the console:
`DEMO_REVIEW_NOTIFY_URL` (a Slack or Telegram-bot webhook URL) receives
"Demo verification {id} needs review: {console link}". No personal data in
the message. If the variable is unset, nothing is sent. See open question 5.

## Sample data

A second button under every start button on scenario pages: **"Show the
result with sample data"**.

- No verification is created and no request leaves the browser except
  loading the fixture.
- Fixtures live in `lib/sample-payloads.ts`: one approved KYC payload
  (name "Alex Sample", a fictional document with an obviously fake number,
  `issuing_country: "FR"`), one approved age payload without document
  fields, plus a declined variant of each for the "Try a declined result"
  link. Shape is `WebhookPayload` from `@proofage/node`, so a type change in
  the SDK breaks the build, not the page.
- The After card and the panel are filled from the fixture with a visible
  "Sample data" label on both, and "Signature valid" is replaced by
  "Sample payload, not signed". Timing shows the fixture's value with the
  same label.
- A real check started afterwards replaces the sample.

On `/`, no sample button: the video plays that role there.

## Page layouts

### `/` (general flow)

1. H1 "See a verification, then try one"; one line "This is what your users
   see, and what your system receives."
2. Scenario nav: General · Online courses · Marketplaces · Rental · Online
   stores (plain links; current page marked with `aria-current`).
3. Video (full width, near the top).
4. "Try it yourself": two columns, stacked on mobile.
   - Selfie age check — "Nothing to upload, about 10 seconds" — "Start
     selfie check" (primary).
   - ID check (KYC) — "You need an ID document and about a minute" — "Start
     ID check" (secondary); under it "Don't want to use your own ID? The
     video above shows the whole check."
5. What your system receives.
6. "See it in your product": the four scenario links, plus "EUDI Wallet age
   verification (beta, test wallet data)".
7. Use this in your product.

### Scenario pages

1. H1, lead, scenario nav.
2. Three steps in a row (stacked on mobile): Before card (with the start and
   sample buttons) → "Verification" step (the retention line and status
   while running) → After card (dimmed, captioned "After the check", until
   a result exists).
3. Note line and extra action, if any.
4. What your system receives.
5. Video, compact: "Watch the full check, including blocking a face".
6. Use this in your product.

### Use this in your product (shared)

- "These lines created the verification you just did" → the GitHub URL of
  `app/api/demo-session/route.ts` at `main`, with a line anchor range
  (`#Lx-Ly`) for the `create` call. The range comes from a constant updated
  with the file, checked by a unit test that reads the file (fails if the
  `create(` call moves).
- Docs: create a verification, webhooks (docs.proofage.net).
- Pricing (proofage.net/pricing) and the scenario's site page.
- "Message us on LinkedIn, we always reply" (company page and both founders'
  profiles) and sales@proofage.net.

### Footer

ProofAge / IT Brains SASU · Privacy · GitHub · proofage.net.

## Video

- Config in `lib/demo-config.ts`: `mainVideo: { youtubeId, chapters:
  [{ label, seconds }] }` and `shortVideo: { youtubeId }`, both read from env
  (`DEMO_VIDEO_MAIN`, `DEMO_VIDEO_SHORT`, chapters as a JSON env or a
  constant). Empty → the block is not rendered.
- Embed: a poster image (`/video-poster.jpg`, committed) with a play button;
  only on click is a `youtube-nocookie.com` iframe inserted, with
  `start=` when a chapter was clicked.
- Chapters: "ID check", "What your system receives", "Block a face",
  "Blocked on retry", "Dashboard". Chapter links under the player jump the
  embed to the timestamp (reload the iframe with `start=`).
- The page ships before the video exists; nothing references it while the
  env is empty.

## EUDI page

The Ember Box chrome goes, the flow stays.

- Same URL, metadata and JSON-LD (publisher URL → proofage.net).
- New layout: scenario nav, H1 "Prove you are 18+ with a digital ID wallet",
  the existing `WalletHowItWorks` content, the start button (still
  `method: 'wallet'`), the result in place, and the panel.
- Copy loses "Ember Box is a fictional storefront".

## Visual direction

Ember Box's dark palette, Cormorant and uppercase tracking go. The new look
follows the site brief's Phase 2 principles:

- Light background (dark-mode via `prefers-color-scheme`), one sans-serif
  (Inter via `next/font`) and a monospace for JSON and ids.
- Sentence case, no all-caps eyebrow labels, no gradient hero, no rows of
  identical icon cards.
- The cards look like plain product UI (white surface, thin border), so they
  read as "your product", not as ProofAge marketing.
- Real artifacts over adjectives: real JSON, real ids, real seconds.

## Removed

- `components/Storefront.tsx`, `Hero.tsx`, `MembersContent.tsx`, the Ember
  Box parts of `ResultScreen.tsx`, the `ember-*` palette in
  `app/globals.css`, Cormorant/Montserrat fonts.
- The `ember-box` entry in `lib/demo-pages.ts`, `.env.example`, the README
  and tests.
- Every `proofage.xyz` link (README, JSON-LD publisher, footer). The repo
  About field typo `demo.proofage.xyx` is fixed by the owner in GitHub
  settings (listed in the report).

## Metadata

Each route has its own `title`, `description`, canonical and an Open Graph
image generated with `opengraph-image.tsx` (H1 text on a plain background),
so a link pasted in LinkedIn previews its own vertical. The sitemap lists
`/`, the four scenarios and the EUDI page. The site-wide description loses
"regulated storefronts" and Ember Box.

## Copy rules

Plain English, sentence case, canonical check names (Identity verification
(KYC), Facial age check, Wallet age check). No prices (link to Pricing), no
certification, background-check, competitor or regulator claims. No fictional
brand names, no adult wording. No "quick, private and secure", no "Powered
by".

## Testing

- Unit (`node --test`, pure modules):
  - scenario config: every scenario has all fields, paths are unique, the
    workspace is one of the configured ones, `review: null` only on `store`;
  - session cookie: `page` must be a known page; a page/workspace pair not
    allowed by the config is rejected;
  - payload redaction: masking by default, `DEMO_MASK_ALL`,
    `fingerprint_signals` removed, `duplicate_of` hidden unless it is the
    visitor's own;
  - timing: consent → decision in seconds, missing timestamps give `null`;
  - the GitHub line-range constant still points at the `create(` call.
- `tsc --noEmit`, ESLint, `next build`.
- Webhook route: replay a real test-workspace delivery against the local
  server (signature valid → stored; unknown `X-Auth-Client` → 401; nothing
  written to logs except slug, id, status).
- End to end on a preview deployment with **test** workspaces: one widget
  pass per workspace, then `set-test-verification-outcome` for approved,
  declined and resubmission; review is checked on the way (a test
  submission stops in review). Check: in-place result on each page, the
  After card states, the panel, the phone handoff from desktop, sample
  mode, and `/result` redirecting back to the right page.
- After switching to live keys, one real pass per workspace by the founder.
- Lighthouse on `/` and one scenario page: Accessibility and SEO stay 100.

## Rollout

1. Create the demo tenant and the `kyc` and `age-selfie` workspaces (test
   first, then live), with `webhook_url` set. Live secret keys are copied
   by a person from the console.
2. Add the Upstash integration in Vercel; add `PROOFAGE_DEMO_WORKSPACES`
   with the three slugs, `DEMO_MASK_ALL=false`, and optionally
   `DEMO_REVIEW_NOTIFY_URL`.
3. Merge; Vercel deploys.
4. Founder records the videos (checklist below) with `DEMO_MASK_ALL=true`
   on a preview deployment, then sets `DEMO_VIDEO_MAIN` / `DEMO_VIDEO_SHORT`.
5. Site repo: "Try the live demo" links per the brief's table.
6. Retire the `ember-box` workspace once no in-flight sessions remain
   (24 hours after deploy).

## Recording checklist (founder, not code)

- Live workspaces, own document, `DEMO_MASK_ALL=true`, timer visible.
- Main video, about 2 minutes: (1) founder on camera, then the ID check on a
  phone from Start to decision without cuts; (2) the panel: decision, time,
  JSON; (3) dashboard: open the verification, "Block this face"; (4) a new
  check with the same face → declined with the blocklist reason and the
  duplicate match; (5) dashboard: the blocklist, then unblock.
- Short cut, 60 s: chapters 1–2.
- After recording: unblock the face, and erase the recording verifications'
  personal data from the console.

## Open questions

1. **Phone handoff.** Does the widget show its QR handoff for both `kyc` and
   `age-selfie` in popup mode on desktop? If not, we add our own QR (the
   `url` from create) with a "Continue on your phone" caption, and keep
   polling.
2. **Privacy policy.** Does proofage.net/privacy cover the "demo" purpose
   (ProofAge as controller)? Needed before the live keys go in.
3. **Blocklist reason code.** Which `reason` value does a decline caused by a
   face blocklist match carry? Until confirmed, the panel shows the raw code
   and does not label it as a blocklist match.
4. **Timing.** Is there a better start timestamp than `consent_accepted_at`
   (e.g. a `submitted` time) available from the API or the webhook? If so,
   show "submitted → decision" as the processing time.
5. **Review notification.** Slack, Telegram or email for the founders'
   review alert? The spec assumes an incoming-webhook URL.
6. **Retention line.** Is "Images are kept 30 days and a face template 12
   months; write to support@proofage.net to delete sooner" acceptable as the
   KYC promise, given erasure is manual?
7. **Old links.** Do YouTube descriptions, the Shopify listing or the docs
   point at Ember Box URLs other than `/`, or describe the store in text?
