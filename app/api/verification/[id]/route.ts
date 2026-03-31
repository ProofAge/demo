import { NextResponse } from 'next/server';
import { getProofAgeServerClient } from '@/lib/proofage';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;

  try {
    const client = getProofAgeServerClient();
    const verification = await client.verifications().find(id);
    return NextResponse.json(verification);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load verification';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
