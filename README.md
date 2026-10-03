# ProofAge — Age Verification Demo (Next.js)

Live demo: **[demo.proofage.xyz](https://demo.proofage.xyz)** &nbsp;·&nbsp; Platform: **[proofage.xyz](https://proofage.xyz)**

This repository is a full-stack reference implementation showing how to integrate [ProofAge](https://proofage.xyz) age verification into a Next.js 15 application. The demo renders **Ember Box** — a fictional spirits brand — as a realistic age gate use-case: visitors must verify their age before accessing the site's content.

---

## What is ProofAge?

[ProofAge](https://proofage.xyz) is an online age verification and age gate platform. It lets websites and apps verify that users meet a minimum age requirement (e.g. 18+ or 21+) through a hosted, privacy-safe KYC flow — no server-side handling of identity documents required. It covers use-cases such as:

- Alcohol, tobacco, and cannabis e-commerce
- Adult content platforms
- Gambling and gaming sites
- Age-restricted subscriptions and memberships

See the full platform at [proofage.xyz](https://proofage.xyz) and the live demo at [demo.proofage.xyz](https://demo.proofage.xyz).

---

## What this demo shows

| Layer | What it demonstrates |
|---|---|
| **Client SDK** | Loading `kyc-loader.js` dynamically, calling `KycService.start({ verificationUrl })`, handling `onComplete` / `onError` callbacks |
| **Server-side session** | `POST /api/demo-session` creates the verification with HMAC signing (`@proofage/node`), an `external_id` from an httpOnly visitor cookie and `callback_url` = `/result`; the browser opens it with `KycService.start({ verificationUrl })` |
| **Result page** | `/result` asks ProofAge for the outcome (`GET /v1/verifications/{id}`, plus the document's first name when approved) and checks `external_id` against the visitor cookie before showing anything |
| **Webhook receiver** | `POST /api/webhooks/proofage` picks the workspace by `X-Auth-Client` and verifies the signature with its secret |
| **Realistic UI** | A branded fictional storefront (Ember Box) with members-only content, plus declined, retry and pending screens |

> **Why create the session on the server:** only a signed server request can set `external_id`; the browser SDK's unsigned create drops it. The outcome comes from the API, never from the browser's `onComplete`, which carries no result.

---

## Stack

- [Next.js 15](https://nextjs.org) (App Router, Turbopack)
- [React 19](https://react.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [`@proofage/node`](https://proofage.xyz) — official Node.js SDK for server-side HMAC signing and webhook verification

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/ProofAge/demo.git
cd demo
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in your keys from your [ProofAge workspace](https://proofage.xyz):

```env
# Public URL of this demo (metadata, sitemap, and the /result redirect). No trailing slash.
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Server-only: one entry per demo page, keyed by slug. The public key reaches the
# browser SDK through the page; the secret key signs API calls and verifies webhooks.
#   ember-box   → /
#   eudi-wallet → /eudi-wallet-age-verification
PROOFAGE_DEMO_WORKSPACES={"ember-box":{"apiKey":"pk_test_...","secretKey":"sk_test_..."},"eudi-wallet":{"apiKey":"pk_test_...","secretKey":"sk_test_..."}}

# Defaults baked into the code — only override for local dev or custom deployments:
# NEXT_PUBLIC_PROOFAGE_API_URL=https://api.proofage.xyz/v1
# NEXT_PUBLIC_PROOFAGE_SDK_URL=https://app.proofage.xyz/sdk-build/kyc-loader.js
# PROOFAGE_BASE_URL=https://api.proofage.xyz
```

Each demo page has its own workspace; add an entry to `PROOFAGE_DEMO_WORKSPACES` and a page to add a demo.

Use **test keys** during development. Get them at [proofage.xyz](https://proofage.xyz).

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Webhooks in local development

ProofAge needs to reach your webhook endpoint to deliver age verification results. Use a tunnel during local development:

```bash
# ngrok
ngrok http 3000

# or Cloudflare Tunnel
cloudflared tunnel --url http://localhost:3000
```

Set `NEXT_PUBLIC_SITE_URL` to the public HTTPS URL the tunnel provides. The `demo-session` route uses it to build the `callback_url` (`/result`) sent to ProofAge.

---

## Deploy to Vercel

```bash
vercel
```

Or connect the repository in the [Vercel dashboard](https://vercel.com). Set the same environment variables in **Project Settings → Environment Variables**, then:

- Set `NEXT_PUBLIC_SITE_URL` to your production URL (e.g. `https://demo.proofage.xyz`)
- In your [ProofAge dashboard](https://proofage.xyz), configure the webhook URL to `https://your-domain/api/webhooks/proofage`

---

## Project structure

```
app/
  page.tsx                          # Age gate page (Ember Box storefront)
  result/page.tsx                   # Result page (outcome from the ProofAge API)
  layout.tsx                        # Root layout with fonts and metadata
  api/
    demo-session/route.ts           # Create (POST), read (GET), clear (DELETE) the demo session
    webhooks/proofage/route.ts      # Webhook receiver, verified with the sending workspace's keys
components/
  Hero.tsx                          # Main age gate UI
  VerifyButton.tsx                  # Creates the session, then starts the ProofAge SDK flow
  ResultScreen.tsx                  # Result states, polling while a decision is pending
  MembersContent.tsx                # Members-only content shown when approved
  Footer.tsx
lib/
  proofage.ts                       # Per-workspace ProofAge clients
  demo-workspaces.ts                # PROOFAGE_DEMO_WORKSPACES parsing
  demo-cookies.ts                   # Visitor and session cookies
  demo-result.ts                    # Pure mapping from API status to what the page shows
```

---

## Related

- [ProofAge platform](https://proofage.xyz) — sign up, manage workspaces, view verification logs
- [Live demo](https://demo.proofage.xyz) — see this code running in production
- [ProofAge Node.js SDK](https://proofage.xyz) — `@proofage/node` on npm

### Integrations for other platforms

| Platform | Repository | Use-case |
|---|---|---|
| **WordPress** | [ProofAge/wordpress-plugin](https://github.com/ProofAge/wordpress-plugin) | Age gate plugin for WordPress — WooCommerce age verification, age-restricted pages, adult content gating |
| **Laravel** | [ProofAge/laravel-client](https://github.com/ProofAge/laravel-client) | Laravel age verification client — HMAC-signed API calls, webhook handling, middleware for age-restricted routes |
| **Next.js** | this repo | Full-stack age verification demo with JS SDK, server routes, and webhook receiver |
