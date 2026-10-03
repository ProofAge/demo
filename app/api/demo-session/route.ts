import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  cookieOptions,
  isVisitorId,
  newVisitorId,
  parseSession,
  serializeSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  VISITOR_COOKIE,
  VISITOR_MAX_AGE,
} from '@/lib/demo-cookies';
import { isDemoSlug } from '@/lib/demo-pages';
import { loadResult } from '@/lib/demo-session';
import { clientFor } from '@/lib/proofage';

export const dynamic = 'force-dynamic';

function isSecure(request: Request): boolean {
  return new URL(request.url).protocol === 'https:';
}

/**
 * Creates the verification server-side, so it is HMAC-signed and carries an external_id
 * (the browser SDK's unsigned create drops it). A still-unopened one is reused.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => null)) as { slug?: unknown } | null;
  const slug = body?.slug;
  if (!isDemoSlug(slug)) {
    return NextResponse.json({ error: 'Unknown demo' }, { status: 400 });
  }

  const secure = isSecure(request);
  const store = await cookies();
  const existingVisitor = store.get(VISITOR_COOKIE)?.value;
  const visitorId = isVisitorId(existingVisitor) ? existingVisitor : newVisitorId();

  try {
    const client = clientFor(slug);
    const previous = parseSession(store.get(SESSION_COOKIE)?.value);
    if (previous && previous.slug === slug && visitorId === existingVisitor) {
      const verification = await client.verifications().find(previous.verificationId).catch(() => null);
      if (verification?.status === 'created' && verification.external_id === visitorId) {
        return NextResponse.json({ url: previous.url });
      }
    }

    const created = await client.verifications().create({
      external_id: visitorId,
      callback_url: new URL('/result', request.url).toString(),
      metadata: { demo: slug },
    });
    if (!created?.id || !created.url) {
      throw new Error('create returned no id or url');
    }

    const response = NextResponse.json({ url: created.url });
    response.cookies.set(VISITOR_COOKIE, visitorId, cookieOptions(VISITOR_MAX_AGE, secure));
    response.cookies.set(
      SESSION_COOKIE,
      serializeSession({ slug, verificationId: created.id, url: created.url }),
      cookieOptions(SESSION_MAX_AGE, secure),
    );
    return response;
  } catch (error) {
    console.error('[proofage-demo] could not create a verification', {
      slug,
      message: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'Could not start the verification. Please try again.' }, { status: 502 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(await loadResult(), { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(SESSION_COOKIE, '', cookieOptions(0, isSecure(request)));
  return response;
}
