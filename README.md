# ProofAge live demo (Next.js)

Live demo: **[demo.proofage.net](https://demo.proofage.net)** &nbsp;·&nbsp; Platform: **[proofage.net](https://proofage.net)**

A full-stack reference for integrating [ProofAge](https://proofage.net) into a Next.js 15 application. Visitors run a real verification, then see the signed webhook your system would receive.

## What this demo shows

One page, `/`: set up a session (which check, how it opens, which look), run it on yourself, and see the result in place.

| Part | What it shows |
|---|---|
| Flow preview | Screenshots of the real widget for the chosen check and look (`public/flow/`) |
| Session options | Check (selfie age check, age check by ID, identity verification), how it opens (popup or new tab), look (ProofAge or Lumo, a brand we made up). Deep links: `/?check=kyc&look=lumo&open=tab` |
| What you get | A human summary of what your system receives, and the signed webhook behind a toggle |
| What your team sees | A replica of the console's "Verification details" page for this check, with your own photos |
| Sample result | A labelled fixture for visitors who will not use a camera or an ID. No verification is created |
| `/eudi-wallet-age-verification` | The wallet age check (beta, test wallet data), with the same result area |
| `/result` | The `callback_url` of every verification. It only redirects back to `/`, which shows the result in place |

| Layer | What it demonstrates |
|---|---|
| **Client SDK** | Loading `kyc-loader.js`, calling `KycService.start({ verificationUrl })`, handling `onComplete` / `onError` |
| **Server-side session** | `POST /api/demo-session` creates the verification with HMAC signing (`@proofage/node`), an `external_id` from an httpOnly visitor cookie and `callback_url` = `/result`. Same-origin requests only, 25 new verifications per IP address per hour |
| **Result in place** | `GET /api/demo-session?page=` asks ProofAge for the outcome and checks `external_id` against the visitor cookie before showing anything |
| **Webhook receiver** | `POST /api/webhooks/proofage` picks the workspace by `X-Auth-Client`, verifies the signature, and keeps the decision payload for one hour (Upstash Redis). Payloads are never logged |
| **Media** | `GET /api/demo-media?id=` streams a photo of the visitor's own verification after the ownership check, never cacheable. The browser never gets a ProofAge URL or key |

Seven workspaces back the checks: `selfie`, `age-id`, `kyc`, each with a `-lumo` twin that has the Lumo branding, and `eudi-wallet` for the wallet page. That one needs its own workspace with the digital ID wallet offered first; with the selfie keys the page would open a plain selfie check.

> **Why create the session on the server:** only a signed server request can set `external_id`; the browser SDK's unsigned create drops it. The outcome comes from the API, never from the browser's `onComplete`, which carries no result.

## Stack

- [Next.js 15](https://nextjs.org) (App Router, Turbopack), [React 19](https://react.dev), [Tailwind CSS v4](https://tailwindcss.com)
- [`@proofage/node`](https://proofage.net) for server-side HMAC signing and webhook verification
- [`@upstash/redis`](https://upstash.com) for the one-hour webhook store (in-memory in local dev)

## Run it locally

```bash
npm install
cp .env.example .env.local   # fill PROOFAGE_DEMO_WORKSPACES; leave KV_* empty for in-memory storage
npm run dev                  # http://localhost:3000
npm test                     # unit tests (node --test)
```

A webhook reaches localhost only if the workspace's webhook URL points at it. Without that,
replay one: `node --env-file=.env.local scripts/replay-webhook.ts <slug> <verification-id>`.
Test-mode workspaces stop in `review` after submission. Set the outcome, then replay the webhook:
`node --env-file=.env.local scripts/test-outcome.ts <slug> <verification-id> approved|declined|resubmission_requested [reason]`.
Against a ProofAge instance with a self-signed certificate, point `NODE_EXTRA_CA_CERTS` at its CA
for Node commands (and `npm run dev`).

## Environment

See `.env.example`. `PROOFAGE_DEMO_WORKSPACES` maps each workspace slug to its public and secret key. `KV_REST_API_URL` and `KV_REST_API_TOKEN` come from the Upstash integration in the Vercel Marketplace; without them, production stores nothing and the panel says so. `DEMO_MASK_ALL=true` masks personal fields on the server while recording.

`/` is rendered per request (deep links), but the EUDI page is prerendered, so its public key is read at build time: after changing `PROOFAGE_DEMO_WORKSPACES` in Vercel, redeploy.

`PROOFAGE_DEMO_WORKSPACES` refuses a secret key (`sk_…`) in an `apiKey` slot, since that value is rendered into the page.

## Deploy to Vercel

Connect the repository in the [Vercel dashboard](https://vercel.com), set the same environment variables, and set each workspace's webhook URL to `https://your-domain/api/webhooks/proofage`.

## Project structure

```
app/
  page.tsx                          # The single flow (deep links via searchParams)
  eudi-wallet-age-verification/     # Wallet age check
  result/page.tsx                   # Redirects to the page the check started on
  api/demo-session/route.ts         # Create (POST) and read (GET) the demo session
  api/demo-media/route.ts           # Streams the visitor's own photos
  api/webhooks/proofage/route.ts    # Webhook receiver, verified with the sending workspace's keys
components/
  flow/                             # Preview, options, start area
  result/                           # What you get, webhook JSON, console replica
  demo/DemoProvider.tsx             # SDK, polling, sample state
lib/                                # Pure modules (options, age, summary, console view, redaction, ...) with tests
scripts/                            # replay-webhook.ts, test-outcome.ts
```

## Related

- [ProofAge](https://proofage.net): sign up, manage workspaces, view verification logs
- [Live demo](https://demo.proofage.net)

| Platform | Repository | Use-case |
|---|---|---|
| **WordPress** | [ProofAge/wordpress-plugin](https://github.com/ProofAge/wordpress-plugin) | Age gate plugin for WordPress and WooCommerce |
| **Laravel** | [ProofAge/laravel-client](https://github.com/ProofAge/laravel-client) | HMAC-signed API calls, webhook handling, middleware |
| **Next.js** | this repo | Full-stack demo with JS SDK, server routes and webhook receiver |

## License

[MIT](LICENSE). The IBM Plex fonts in `app/fonts/` are under the SIL Open Font License (`app/fonts/IBM-Plex-LICENSE.txt`).
