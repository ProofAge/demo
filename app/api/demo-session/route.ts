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
import { isDemoPage, isWorkspaceSlug, pageAllowsWorkspace } from '@/lib/demo-pages';
import { loadResult } from '@/lib/demo-session';
import { clientIp, counter, CREATE_LIMIT, CREATE_WINDOW_SECONDS, hit, isSameOrigin } from '@/lib/rate-limit';
import { clientFor } from '@/lib/proofage';
import { verificationRequest } from '@/lib/verification-request';

export const dynamic = 'force-dynamic';

function isSecure(request: Request): boolean {
  return new URL(request.url).protocol === 'https:';
}

/**
 * Creates the verification server-side, so it is HMAC-signed and carries an external_id
 * (the browser SDK's unsigned create drops it). A still-unopened one for the same check and
 * page is reused; starting on another page replaces the session.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Start the check from the demo page.' }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { slug?: unknown; page?: unknown } | null;
  const slug = body?.slug;
  const page = body?.page;
  if (!isWorkspaceSlug(slug) || !isDemoPage(page) || !pageAllowsWorkspace(page, slug)) {
    return NextResponse.json({ error: 'Unknown demo' }, { status: 400 });
  }

  const secure = isSecure(request);
  const store = await cookies();
  const existingVisitor = store.get(VISITOR_COOKIE)?.value;
  const visitorId = isVisitorId(existingVisitor) ? existingVisitor : newVisitorId();

  try {
    const client = clientFor(slug);
    const previous = parseSession(store.get(SESSION_COOKIE)?.value);
    if (previous && previous.slug === slug && previous.page === page && visitorId === existingVisitor) {
      const verification = await client.verifications().find(previous.verificationId).catch(() => null);
      if (verification?.status === 'created' && verification.external_id === visitorId) {
        return NextResponse.json({ url: previous.url });
      }
    }

    // Only new verifications count: reopening an unopened one above is free.
    const limited = await hit(counter(), {
      scope: 'create',
      id: clientIp(request.headers),
      limit: CREATE_LIMIT,
      windowSeconds: CREATE_WINDOW_SECONDS,
      now: Date.now(),
    }).catch(() => ({ ok: true as const })); // A storage outage must not take the demo down.
    if (!limited.ok) {
      return NextResponse.json(
        { error: 'Too many checks from this network. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } },
      );
    }

    const created = await client.verifications().create(verificationRequest({ visitorId, slug, page }));
    if (!created?.id || !created.url) {
      throw new Error('create returned no id or url');
    }

    const response = NextResponse.json({ url: created.url });
    response.cookies.set(VISITOR_COOKIE, visitorId, cookieOptions(VISITOR_MAX_AGE, secure));
    response.cookies.set(
      SESSION_COOKIE,
      serializeSession({ slug, page, verificationId: created.id, url: created.url }),
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

/** The result for the page that asks (`?page=`); anything else is no session. */
export async function GET(request: Request): Promise<NextResponse> {
  const page = new URL(request.url).searchParams.get('page');
  const result = isDemoPage(page) ? await loadResult(page) : { kind: 'no_session' as const };
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}
