import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ProofAgeError } from '@proofage/node';
import { isVisitorId, parseSession, SESSION_COOKIE, VISITOR_COOKIE } from '@/lib/demo-cookies';
import { ERASABLE_STATUSES, ERASE_REQUEST, ERASE_RETRY_MS, eraseErrorIsRetryable, scrubRecord } from '@/lib/erasure';
import { isSameOrigin } from '@/lib/rate-limit';
import { clientFor, demoWorkspaces } from '@/lib/proofage';
import { webhookStore, type WebhookStore } from '@/lib/webhook-store';

export const dynamic = 'force-dynamic';

const json = (body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

/**
 * Erases the visitor's own check in ProofAge once the page has copied what it shows. One attempt
 * per request: on 409/503 the page waits `retryAfter` seconds and asks again. The stored webhook
 * loses its personal data too, and a delivery arriving later is stored without it.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOrigin(request)) {
    return json({ error: 'forbidden' }, 403);
  }
  const body = (await request.json().catch(() => null)) as { verificationId?: unknown } | null;
  const store = await cookies();
  const session = parseSession(store.get(SESSION_COOKIE)?.value);
  const visitorId = store.get(VISITOR_COOKIE)?.value;
  // Only the check this browser's session names, and only if the page asked for that very one.
  if (!session || !isVisitorId(visitorId) || body?.verificationId !== session.verificationId || !Object.hasOwn(demoWorkspaces(), session.slug)) {
    return json({ error: 'no_session' }, 404);
  }

  const verifications = clientFor(session.slug).verifications(session.verificationId);
  const kv = webhookStore();
  try {
    const verification = await clientFor(session.slug).verifications().find(session.verificationId);
    if (!verification || verification.external_id !== visitorId) {
      return json({ error: 'no_session' }, 404);
    }
    if (!ERASABLE_STATUSES.has(verification.status)) {
      return json({ error: 'not_final' }, 422);
    }
    // Marked first: ProofAge takes a few seconds, and deletes the photos before the erasure shows in
    // the API. A reload meanwhile must already show the check as erased, and a webhook arriving
    // meanwhile is stored scrubbed. The page holds its own copy by now.
    await kv?.markErasing(session.verificationId).catch(() => undefined);
    const erased = verification.erasure ?? (await verifications.erasePersonalData(ERASE_REQUEST))?.erasure ?? null;
    if (!erased) {
      console.error('[proofage-demo] the erasure was not confirmed', { slug: session.slug });
      await kv?.clearErasing(session.verificationId).catch(() => undefined);
      return json({ error: 'failed' }, 502);
    }
    await kv?.confirmErased(session.verificationId, erased.erased_at).catch(() => undefined);
    await scrubStored(kv, session.verificationId);
    return json({ erasedAt: erased.erased_at });
  } catch (error) {
    const status = error instanceof ProofAgeError ? error.statusCode : null;
    if (eraseErrorIsRetryable(status)) {
      // Still being decided, another erasure running, or nothing deleted yet: the page asks again.
      const seconds = ERASE_RETRY_MS / 1000;
      return json({ retryAfter: seconds }, 409, { 'Retry-After': String(seconds) });
    }
    console.error('[proofage-demo] could not erase the verification', { slug: session.slug, status });
    await kv?.clearErasing(session.verificationId).catch(() => undefined);
    return json({ error: 'failed' }, 502);
  }
}

/** Storage is a demo nicety: if it is down, the record still expires within the hour. */
async function scrubStored(kv: WebhookStore | null, verificationId: string): Promise<void> {
  if (!kv) {
    return;
  }
  try {
    const record = await kv.getRecord(verificationId);
    if (record) {
      await kv.saveRecord(verificationId, scrubRecord(record));
    }
  } catch {
    console.error('[proofage-demo] could not scrub the stored webhook');
  }
}
