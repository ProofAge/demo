/**
 * Sets the outcome of a verification in a TEST-mode workspace (they stop in `review`). Signs the
 * request with the workspace secret. Then replay the webhook with replay-webhook.ts.
 *
 *   node --env-file=.env.local scripts/test-outcome.ts <slug> <verification-id> <status> [reason]
 *   status: approved | declined | resubmission_requested | review
 */
import { createHmac } from 'node:crypto';

const STATUSES = ['approved', 'declined', 'resubmission_requested', 'review'];
const [slug, verificationId, status, reason] = process.argv.slice(2);
if (!slug || !verificationId || !STATUSES.includes(status)) {
  console.error(`usage: test-outcome.ts <slug> <verification-id> <${STATUSES.join('|')}> [reason]`);
  process.exit(1);
}
const workspaces = JSON.parse(process.env.PROOFAGE_DEMO_WORKSPACES ?? '{}') as Record<string, { apiKey: string; secretKey: string }>;
const keys = workspaces[slug];
if (!keys) {
  console.error(`PROOFAGE_DEMO_WORKSPACES has no entry for "${slug}"`);
  process.exit(1);
}

const path = `/v1/verifications/${verificationId}/test-outcome`;
const rawBody = JSON.stringify({ status, ...(reason ? { reason } : {}) });
const signature = createHmac('sha256', keys.secretKey).update(`POST${path}${rawBody}`).digest('hex');
const base = process.env.PROOFAGE_BASE_URL ?? 'https://api.proofage.net';
const response = await fetch(`${base}${path}`, {
  method: 'POST',
  headers: { 'X-API-Key': keys.apiKey, 'Content-Type': 'application/json', 'X-HMAC-Signature': signature },
  body: rawBody,
});
console.log(response.status);
