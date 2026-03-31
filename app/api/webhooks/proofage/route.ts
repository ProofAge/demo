import { webhookHandler } from '@proofage/node';

/**
 * ProofAge webhook receiver — keys and tolerance resolve from env automatically.
 * In production, replace the console.info with your business logic.
 */
export const POST = webhookHandler(async (payload) => {
  console.info('[proofage-demo] Webhook received (signature verified)', {
    verification_id: payload.verification_id,
    status: payload.status,
    timestamp: payload.timestamp,
  });

  // TODO: update order, grant access, send email, etc.
});
