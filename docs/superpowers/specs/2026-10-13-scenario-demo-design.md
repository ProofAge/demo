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
| `/` | General flow, both checks | `eudi-wallet` (selfie) and `id-document` |
| `/courses` | Scenario: course certificate | `id-document` |
| `/marketplaces` | Scenario: provider profile badge | `id-document` |
| `/rental` | Scenario: rental booking | `id-document` |
| `/store` | Scenario: age-restricted checkout | `eudi-wallet` (selfie) |
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

No new workspaces. The demo reuses the two demo workspaces that already exist
in the IT Brains tenant, both live, both with `webhook_url` set to
`https://demo.proofage.net/api/webhooks/proofage` and
`allow_duplicate_accounts: true` (a repeat check is **approved with the
duplicate flag**, not declined):

| Env slug | Workspace | Id | Check | Used for |
|---|---|---|---|---|
| `id-document` | ProofAge ID Verification [DEMO] | `019d4851-596a-709a-8f9f-fc6d03883862` | Age verification by ID (`age_mode: document_verification`, threshold 18) | The ID check on `/`, `/courses`, `/marketplaces`, `/rental` |
| `eudi-wallet` | EUDI Wallet [DEMO] | `01a0eed6-610b-73b2-94d0-117ec4a8455b` | Facial age check (`age_mode: estimation`, threshold 18) | The selfie check on `/` and `/store` (widget opened without `method`), and the EUDI page (`method: 'wallet'`) |

Consequences:

- **The ID check returns four document fields**, not eleven: `first_name`,
  `last_name`, `date_of_birth`, `document_number` (age workspaces; see the
  webhook schema). That is enough for every After card (first name only).
  The page calls it **"ID check"**, not "Identity verification (KYC)", and
  the panel says under the JSON: "This demo runs Age verification by ID. An
  Identity verification (KYC) workspace also returns nationality, address,
  issue and expiry dates, and more." A dedicated KYC workspace can replace
  it later by changing one env entry.
- **One workspace, two checks.** The selfie check and the EUDI page share
  `eudi-wallet`; what differs is the widget's `method`. The session cookie
  keeps the page, so results never cross pages.
- `PROOFAGE_DEMO_WORKSPACES`: the `ember-box` key is renamed `id-document`
  (same keys, one env edit in Vercel); `eudi-wallet` stays. No secret keys
  are created or rotated. The webhook route keeps matching by public key,
  which works because each workspace appears once in the map.
- **The face blocklist is shared by every workspace in the tenant**,
  including production ones (KYC Live, Age Estimation, Monitoring). A face
  blocked while recording the video is blocked there too: the recording
  checklist ends with unblocking it.

## Scenario config

One file, `lib/scenarios.ts`, pure (no Next/React imports, testable with
`node --test`). Adding a vertical is one entry; no layout code.

```ts
type ScenarioSlug = 'courses' | 'marketplaces' | 'rental' | 'store';

type Scenario = {
  slug: ScenarioSlug;
  path: `/${string}`;
  navLabel: string;                 // "Online courses"
  workspace: 'id-document' | 'eudi-wallet';
  meta: { title: string; description: string };
  h1: string;
  lead: string;                     // one line under the H1
  card: 'certificate' | 'profile' | 'booking' | 'checkout';  // which card component
  before: { title: string; text: string; button: string };
  after: {
    approved: string;               // may contain {firstName}
    declined: string;
  };
  note: string | null;              // the one-line "Extra" from the table below
  siteUrl: string;                  // matching page on proofage.net
  extraAction?: { label: string; href: string };  // /store → EUDI
};
```

The four card components are small presentational components
(`components/cards/*`) taking `{ state, firstName, verifiedAt }`, where
`state` is `idle | running | approved | declined`. ProofAge has no manual
review step, so there is no "pending review" card state. They render
neutral placeholders ("Your platform", "Camera kit, 3 days"), never a brand.

### Scenario copy

| | `/courses` | `/marketplaces` | `/rental` | `/store` |
|---|---|---|---|---|
| H1 | Check the learner before you issue the certificate | Verify the person behind the profile | Check the renter before pickup | Check age at checkout |
| Before | Course progress: "Final assessment passed. Confirm your identity to receive your certificate." | Provider profile (sitter or seller), no badge: "Verify your ID to get the Verified badge." | Booking summary (camera kit, dates): "Confirm your identity before pickup." | Cart with one 18+ item: "Confirm you are over 18 to continue." |
| After, approved | Certificate preview with the first name from the document, "Identity verified" and the date | Profile with an "ID verified" badge and the first name | "Booking confirmed. Renter verified", first name shown | "Age confirmed. Continue to payment" |
| After, declined | "Certificate on hold: identity not confirmed" | "Badge not granted" | "Booking on hold: identity not confirmed" | "We could not confirm your age. Checkout blocked" |
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
   time and the signature headers it checked (`X-Auth-Client`,
   `X-HMAC-Signature`, `X-Timestamp`) plus `X-ProofAge-Webhook-Delivery-Id`.
2. Payloads are **never logged**. The existing log line keeps
   `slug`, `verification_id` and `status` only.
3. `GET /api/demo-session` reads the stored payload for the session's
   verification **only after** the existing `external_id === visitor`
   check, and returns it with the view.
4. Only `event: status.updated` (or no `event`, for old retries) is stored;
   `data.updated` (a console correction) is acknowledged and ignored. One
   verification can send several events (`resubmission_requested`, then a
   decision); the key holds the latest, and a short list of
   `{status, timestamp}` is kept alongside.

KV: Upstash Redis through the Vercel Marketplace integration
(`KV_REST_API_URL`, `KV_REST_API_TOKEN`), via `@upstash/redis`. If the
variables are missing (local dev without KV), the webhook still answers 200,
nothing is stored, and the panel shows the API view with the line "Webhook
storage is not configured on this deployment."

### What the panel shows

1. **Summary line:** Approved / Declined / Resubmission requested, the
   `reason` code if any, and:
   - age threshold: for both workspaces (both are age checks, threshold 18), "Over 18" when
     approved; "Under the age threshold" for
     `verification.age_threshold.failed`;
   - duplicate: from `duplicate_detected` / `duplicate_count`;
   - blocklist: "Face blocklist match" for `aml.blocklist.face_match`,
     "Device blocklist match" for `aml.blocklist.device_match` (codes from
     docs.proofage.net/core-technology/decision-reasons). The label is ours;
     the JSON shows the code as sent.
   - Any other `reason` is shown as the code with its meaning from a small
     map of the codes a demo visitor is likely to hit (face mismatch,
     liveness, blur, glare, attempts exhausted); unknown codes show the code
     alone.
2. **Timing:** "Decision in N s after submission": from the moment the
   person submitted (`submitted_at`) to the decision webhook's `timestamp`.
   The time the person spends taking photos is not counted.
   - **Prerequisite (web-app repo):** the API has no `submitted_at` today
     (not in `GET /v1/verifications/{id}`, not in the webhook; checked
     against the OpenAPI document on 13 Oct). Add `submitted_at` (nullable,
     ISO 8601) to the verification resource, set when the verification
     moves to `submitted`, and document it. Useful to customers too.
   - **Until it ships:** the demo records the submission time itself. While
     a check is running the page polls `GET /api/demo-session` every
     second; the first response with status `submitted` stores
     `submittedSeenAt` in KV next to the payload. The line then reads
     "Decision in about N s after submission" (accurate to about a
     second). Once `submitted_at` exists in the API, it is used instead and
     "about" goes.
   - If neither is available (the page was closed during submission), the
     timing line is hidden rather than counting from consent.
3. **Review status.** ProofAge has no manual review step in production, so
   the demo has no Needs review screen and no founder alert. `review` can
   still arrive from a **test** workspace (a test submission stops there);
   the page treats it like `submitted`: still checking, keep polling.
4. **Signature:** "Signature valid" and the three header names. Only
   verified payloads are ever stored, so an unsigned payload cannot appear.
5. **JSON:** the payload, formatted, with:
   - `document.fields.document_number` (and `address`, if a KYC
     workspace is ever plugged in) masked by default (`•••• 4821`), with a "Reveal" toggle and
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
6. **Duplicate line:** when `duplicate_detected` is set and `duplicate_of`
   belongs to this visitor: "We recognised your face from your previous
   check. This is duplicate detection."

## Sample data

A second button under every start button on scenario pages: **"Show the
result with sample data"**.

- No verification is created and no request leaves the browser except
  loading the fixture.
- Fixtures live in `lib/sample-payloads.ts`: one approved ID-check payload
  (the four age-workspace fields: name "Alex Sample", a date of birth, an
  obviously fake document number; `issuing_country: "FR"`), one approved
  selfie payload without document fields, plus a declined variant of each for the "Try a declined result"
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
   - ID check — "You need an ID document and about a minute" — "Start
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
    workspace is one of the configured ones;
  - session cookie: `page` must be a known page; a page/workspace pair not
    allowed by the config is rejected;
  - payload redaction: masking by default, `DEMO_MASK_ALL`,
    `fingerprint_signals` removed, `duplicate_of` hidden unless it is the
    visitor's own;
  - timing: `submitted_at` (or `submittedSeenAt`) → decision in seconds,
    "about" only for the demo-side value, missing timestamps give `null`;
  - reason labels: both blocklist codes and `verification.age_threshold.failed`
    map to their labels, an unknown code passes through unlabelled;
  - the GitHub line-range constant still points at the `create(` call.
- `tsc --noEmit`, ESLint, `next build`.
- Webhook route: replay a real test-workspace delivery against the local
  server (signature valid → stored; unknown `X-Auth-Client` → 401; nothing
  written to logs except slug, id, status).
- End to end on a preview deployment with **test** workspaces: one widget
  pass per workspace, then `set-test-verification-outcome` for approved,
  declined and resubmission (a test submission stops in `review` first,
  which the page must show as still checking). Check: in-place result on each page, the
  After card states, the panel, the phone handoff from desktop, sample
  mode, and `/result` redirecting back to the right page.
- After switching to live keys, one real pass per workspace by the founder.
- Lighthouse on `/` and one scenario page: Accessibility and SEO stay 100.

## Rollout

1. Web-app repo: add `submitted_at` to the verification resource (can ship
   after the demo; the demo falls back to its own measurement).
2. In Vercel, rename the `ember-box` key of `PROOFAGE_DEMO_WORKSPACES` to
   `id-document` together with the deploy (same keys).
3. Add the Upstash integration in Vercel and `DEMO_MASK_ALL=false`.
4. Merge; Vercel deploys.
5. Founder records the videos (checklist below) with `DEMO_MASK_ALL=true`
   on a preview deployment, then sets `DEMO_VIDEO_MAIN` / `DEMO_VIDEO_SHORT`.
6. Site repo: "Try the live demo" links per the brief's table.

## Recording checklist (founder, not code)

- Live workspaces, own document, `DEMO_MASK_ALL=true`, timer visible.
- Main video, about 2 minutes: (1) founder on camera, then the ID check on a
  phone from Start to decision without cuts; (2) the panel: decision, time,
  JSON; (3) dashboard: open the verification, "Block this face"; (4) a new
  check with the same face → declined with `aml.blocklist.face_match`
  and the duplicate match; (5) dashboard: the blocklist, then unblock.
- Short cut, 60 s: chapters 1–2.
- After recording: **unblock the face** (the blocklist is shared with the
  tenant's production workspaces) and erase the recording verifications'
  personal data from the console.

## Open questions

1. **Phone handoff.** Does the widget show its QR handoff for both demo
   workspaces in popup mode on desktop? If not, we add our own QR (the
   `url` from create) with a "Continue on your phone" caption, and keep
   polling.
2. **Privacy policy.** Does proofage.net/privacy cover the "demo" purpose
   (ProofAge as controller)? Needed before the live keys go in.
3. **Retention lines.** The texts next to the start buttons ("deleted right
   after the decision" for the selfie, "kept 30 days, face template 12
   months" for the ID check) were written for Private and Protected modes.
   They must match the privacy mode actually set on the two reused
   workspaces; which mode is each one in?
4. **Old links.** Do YouTube descriptions, the Shopify listing or the docs
   point at Ember Box URLs other than `/`, or describe the store in text?
5. **EUDI workspace redirect.** EUDI Wallet [DEMO] has
   `redirect_url: https://proofage.xyz/get-verified`. Every demo session
   sends its own `callback_url`, so it should not matter; change it to
   `.net` anyway (a live-workspace change, confirmed by the owner)?

## Settled on 13 Oct

- Timing is measured from submission, not from consent: the API gets
  `submitted_at`; until then the demo measures it.
- No manual review in production: no Needs review screen or alert.
- Blocklist decline codes: `aml.blocklist.face_match`,
  `aml.blocklist.device_match` (docs: Decision reasons).
- Reuse the two existing demo workspaces; no new ones for now.
- No daily limits on live checks.
