import { webhookHandler } from '@proofage/node';
import { slugForApiKey } from '@/lib/demo-workspaces';
import { demoWorkspaces } from '@/lib/proofage';

/**
 * ProofAge webhook receiver for every demo workspace. X-Auth-Client names the
 * workspace's public key; its secret from PROOFAGE_DEMO_WORKSPACES verifies the
 * signature. A real store would update the order or the account here.
 */
export async function POST(request: Request): Promise<Response> {
  const workspaces = demoWorkspaces();
  const slug = slugForApiKey(workspaces, request.headers.get('x-auth-client'));
  if (!slug) {
    return new Response(null, { status: 401 });
  }

  const { apiKey, secretKey } = workspaces[slug];
  const handle = webhookHandler(
    (payload) => {
      console.info('[proofage-demo] webhook received', {
        slug,
        verification_id: payload.verification_id,
        status: payload.status,
      });
    },
    {
      apiKey,
      secretKey,
      tolerance: Number(process.env.PROOFAGE_WEBHOOK_TOLERANCE ?? 300),
    },
  );
  return handle(request);
}
