import { verifyWebhookSignature, WebhookVerificationError } from '@proofage/node';
import { NextResponse } from 'next/server';

/**
 * ProofAge webhook receiver. Verifies HMAC using @proofage/node, then logs the payload.
 * In production, add your business logic (update database, grant access, etc.).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const rawBody = await request.text();

  try {
    verifyWebhookSignature({
      rawBody,
      signature: request.headers.get('x-hmac-signature'),
      timestamp: request.headers.get('x-timestamp'),
      authClient: request.headers.get('x-auth-client'),
      secretKey: process.env.PROOFAGE_SECRET_KEY,
      apiKey: process.env.PROOFAGE_API_KEY,
      tolerance: Number(process.env.PROOFAGE_WEBHOOK_TOLERANCE ?? 300),
    });
  } catch (e) {
    const reason =
      e instanceof WebhookVerificationError ? `${e.code}: ${e.message}` : 'unknown verification error';
    console.warn('[proofage-demo] Webhook verification failed:', reason);
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
  } catch (parseError) {
    console.warn('[proofage-demo] Webhook body is not valid JSON:', parseError);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  console.info('[proofage-demo] Webhook received (signature verified)', {
    verification_id: payload.verification_id,
    status: payload.status,
    timestamp: payload.timestamp,
  });

  // TODO: Add your business logic here, for example:
  // - update order or user record with verification outcome
  // - send email notifications
  // - unlock age-restricted content

  return NextResponse.json({ received: true });
}
