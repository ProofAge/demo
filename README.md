# ProofAge Next.js demo

Single-page demo of ProofAge age verification: **Ember Box** (fictional brand), **hosted JS SDK** on the client, **HMAC-signed** server routes using [`@proofage/node`](../proofage-node-client), and a **webhook** endpoint with signature verification.

## Features

- **Client**: `kyc-loader.js` (`KycService`) — init, `start()`, `onComplete` / `onError`.
- **Server**: `POST /api/create-verification` — creates a verification with `callback_url` pointing at this app’s webhook (shows server-side HMAC usage).
- **Webhook**: `POST /api/webhooks/proofage` — verifies `X-HMAC-Signature` / `X-Timestamp` / `X-Auth-Client` via `@proofage/node`, then logs the payload (add your business logic where noted).
- **Polling**: `GET /api/verification/[id]` — fetch verification by id (server-side).

**Note:** The SDK creates its own verification session when the user clicks **Verify my age** (it calls the public API with your publishable key). The `create-verification` route is an additional **server-to-server** example; use it when you need `callback_url` or want to avoid exposing flows to the browser.

## Setup

1. Copy `.env.example` to `.env.local`.

2. Fill in keys from your ProofAge workspace (test keys for development).

3. Install dependencies (from this folder):

   ```bash
   npm install
   ```

4. Ensure `@proofage/node` resolves (this repo uses `file:../proofage-node-client` in `package.json`).

5. Run the dev server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

## Webhooks in development

ProofAge must reach your webhook URL. For local development use a tunnel (e.g. ngrok, Cloudflare Tunnel) and set `NEXT_PUBLIC_SITE_URL` to the public HTTPS origin so `callback_url` in `create-verification` is correct.

## Deploy (Vercel)

1. Connect the repository and set the same environment variables in the Vercel project settings.

2. Set `NEXT_PUBLIC_SITE_URL` to your production URL (e.g. `https://demo.proofage.xyz`).

3. Configure the webhook URL in the ProofAge dashboard to `https://your-domain/api/webhooks/proofage` if you use server-created verifications with `callback_url`.

## Reference

- Static HTML concept page (earlier iteration): `reference-example.html` (if present in this repo).
