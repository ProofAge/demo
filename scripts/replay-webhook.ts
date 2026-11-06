/**
 * Builds the decision webhook ProofAge would send for a verification (from the API's own data),
 * signs it with the workspace secret and POSTs it to the local demo. For local dev, where the
 * real webhook cannot reach localhost.
 *
 *   node --env-file=.env.local scripts/replay-webhook.ts <slug> <verification-id> [url]
 */
import { generateWebhookSignature, ProofAgeClient } from '@proofage/node';

const [slug, verificationId, target = 'http://localhost:3000/api/webhooks/proofage'] = process.argv.slice(2);
if (!slug || !verificationId) {
  console.error('usage: replay-webhook.ts <slug> <verification-id> [url]');
  process.exit(1);
}
const workspaces = JSON.parse(process.env.PROOFAGE_DEMO_WORKSPACES ?? '{}') as Record<string, { apiKey: string; secretKey: string }>;
const keys = workspaces[slug];
if (!keys) {
  console.error(`PROOFAGE_DEMO_WORKSPACES has no entry for "${slug}"`);
  process.exit(1);
}

const client = new ProofAgeClient({ ...keys, baseUrl: process.env.PROOFAGE_BASE_URL ?? 'https://api.proofage.net', version: 'v1' });
const verification = await client.verifications().find(verificationId);
if (!verification) {
  console.error('verification not found');
  process.exit(1);
}
const document = await client.verifications(verificationId).document().catch(() => null);
const firstDuplicate = verification.duplicate_check?.duplicates?.[0] ?? null;
const payload = {
  event: 'status.updated',
  verification_id: verification.id,
  status: verification.status,
  external_id: verification.external_id,
  external_metadata: verification.external_metadata,
  reason: verification.reason,
  timestamp: new Date().toISOString(),
  ...(document ? { document: document.document } : {}),
  ...(firstDuplicate
    ? {
        duplicate_detected: true,
        duplicate_count: verification.duplicate_check.duplicate_count,
        duplicate_of: { verification_id: firstDuplicate.verification_id, external_id: firstDuplicate.external_id },
      }
    : {}),
};
const timestamp = Math.floor(Date.now() / 1000);
const response = await fetch(target, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Auth-Client': keys.apiKey,
    'X-Timestamp': String(timestamp),
    'X-HMAC-Signature': generateWebhookSignature(payload, keys.secretKey, timestamp),
    'X-ProofAge-Webhook-Delivery-Id': `replay_${timestamp}`,
  },
  body: JSON.stringify(payload),
});
console.log(response.status, verification.status);
