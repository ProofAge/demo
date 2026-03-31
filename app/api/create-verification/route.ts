import { NextResponse } from 'next/server';
import { getProofAgeServerClient } from '@/lib/proofage';

/**
 * Server-side example: create a verification with HMAC signing (via @proofage/node).
 * The hosted ProofAge JS SDK also creates a session when the user calls `start()`;
 * this route is for demonstrating server-to-server integration and optional `callback_url`.
 */
export async function POST(): Promise<NextResponse> {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const callbackUrl = `${siteUrl.replace(/\/$/, '')}/api/webhooks/proofage`;

    const client = getProofAgeServerClient();
    const verification = await client.verifications().create({
      callback_url: callbackUrl,
      metadata: {
        source: 'proofage-next-demo',
        product: 'ember-box',
      },
    });

    return NextResponse.json({
      id: verification?.id ?? null,
      status: verification?.status ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create verification';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
