import { webhookHandler } from '@proofage/node';
import { slugForApiKey } from '@/lib/demo-workspaces';
import { isDemoPayload, isStoredEvent, mergeWebhook } from '@/lib/webhook-record';
import { webhookStore } from '@/lib/webhook-store';
import { demoWorkspaces } from '@/lib/proofage';

/**
 * ProofAge webhook receiver for every demo workspace. X-Auth-Client names the workspace's
 * public key; its secret verifies the signature. Verified decision payloads of demo checks
 * are kept for one hour so the page can show "what your system
 * receives". Payloads are never logged.
 */
export async function POST(request: Request): Promise<Response> {
  const workspaces = demoWorkspaces();
  const slug = slugForApiKey(workspaces, request.headers.get('x-auth-client'));
  if (!slug) {
    return new Response(null, { status: 401 });
  }

  const { apiKey, secretKey } = workspaces[slug];
  const deliveryId = request.headers.get('x-proofage-webhook-delivery-id');
  const handle = webhookHandler(
    async (payload) => {
      console.info('[proofage-demo] webhook received', {
        slug,
        verification_id: payload.verification_id,
        status: payload.status,
      });
      const store = isStoredEvent(payload) && isDemoPayload(payload) ? webhookStore() : null;
      if (!store) {
        return;
      }
      try {
        const previous = await store.getRecord(payload.verification_id);
        const record = mergeWebhook(previous, { payload: payload, receivedAt: new Date().toISOString(), deliveryId });
        await store.saveRecord(payload.verification_id, record);
      } catch {
        // Storage is a demo nicety: acknowledge the delivery anyway so ProofAge does not retry.
        console.error('[proofage-demo] could not store the webhook', { slug, verification_id: payload.verification_id });
      }
    },
    { apiKey, secretKey },
  );
  return handle(request);
}
