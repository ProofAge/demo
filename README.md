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
| **Client SDK** | Loading `kyc-loader.js` dynamically, calling `KycService.start()`, handling `onComplete` / `onError` callbacks |
| **Server-side verification creation** | `POST /api/create-verification` — creates a verification session with `callback_url` using HMAC-signed requests via `@proofage/node` |
| **Webhook receiver** | `POST /api/webhooks/proofage` — verifies `X-HMAC-Signature`, `X-Timestamp`, `X-Auth-Client` headers and processes the age verification result |
| **Verification polling** | `GET /api/verification/[id]` — fetches a verification session server-side by ID |
| **Realistic UI** | Full-page age gate with verified / unverified states, error handling, and a branded fictional storefront (Ember Box) |

> **Client vs server flow:** The JS SDK creates its own verification session using your publishable key (browser-only, no backend needed). The `create-verification` route is an optional **server-to-server** path useful when you need `callback_url` webhooks or want to keep flow parameters off the client.

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
# Your publishable (public) key — safe to expose to the browser
NEXT_PUBLIC_PROOFAGE_API_KEY=pk_test_...

# ProofAge API base URL
NEXT_PUBLIC_PROOFAGE_API_URL=https://api.proofage.xyz/v1

# ProofAge JS SDK URL
NEXT_PUBLIC_PROOFAGE_SDK_URL=https://app.proofage.xyz/sdk-build/kyc-loader.js

# Secret key — server-side only, never expose to the browser
PROOFAGE_SECRET_KEY=sk_test_...

# Public URL of this app (used to build the webhook callback_url)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

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

Set `NEXT_PUBLIC_SITE_URL` to the public HTTPS URL the tunnel provides. The `create-verification` route uses it to build the `callback_url` sent to ProofAge.

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
  layout.tsx                        # Root layout with fonts and metadata
  api/
    create-verification/route.ts    # Server-to-server verification creation
    verification/[id]/route.ts      # Fetch verification by ID
    webhooks/proofage/route.ts      # Webhook receiver with HMAC verification
components/
  Hero.tsx                          # Main age gate UI (unverified / verified states)
  VerifyButton.tsx                  # Button that triggers the ProofAge SDK flow
  SuccessState.tsx                  # Post-verification success content
  Footer.tsx
lib/
  proofage.ts                       # Shared ProofAge client helpers
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
