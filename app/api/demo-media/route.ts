import { cookies } from 'next/headers';
import { isVisitorId, parseSession, SESSION_COOKIE, VISITOR_COOKIE } from '@/lib/demo-cookies';
import { authoriseMedia, mediaHeaders, sniffContentType } from '@/lib/demo-media';
import { readDetails } from '@/lib/demo-session';
import { clientFor, demoWorkspaces } from '@/lib/proofage';

export const dynamic = 'force-dynamic';

const notFound = () => new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });

/**
 * Streams one photo of the visitor's own verification. The ownership check (external_id against
 * the visitor cookie) and the media list come first; the browser never sees a ProofAge URL or key.
 */
export async function GET(request: Request): Promise<Response> {
  const mediaId = new URL(request.url).searchParams.get('id');
  const store = await cookies();
  const session = parseSession(store.get(SESSION_COOKIE)?.value);
  const visitorId = store.get(VISITOR_COOKIE)?.value;
  if (!mediaId || !session || !isVisitorId(visitorId) || !Object.hasOwn(demoWorkspaces(), session.slug)) {
    return notFound();
  }

  try {
    const client = clientFor(session.slug);
    // Ownership is checked on every request; the media list comes from the result's own cache, so
    // three photos cost three downloads, not three more document reads.
    const verification = await client.verifications().find(session.verificationId);
    const externalId = verification?.external_id ?? null;
    const { document } = externalId === visitorId && verification ? await readDetails(session.slug, session.verificationId, verification.status) : { document: null };
    const allowed = authoriseMedia({ visitorId, externalId, mediaId, media: document?.media ?? [] });
    if (!allowed.ok) {
      return notFound();
    }
    const stream = await client.verifications(session.verificationId).downloadMedia(mediaId);
    const reader = stream.getReader();
    const first = await reader.read();
    const head = first.value ?? new Uint8Array();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        if (first.value) {
          controller.enqueue(first.value);
        }
        if (first.done) {
          controller.close();
        }
      },
      async pull(controller) {
        const next = await reader.read();
        if (next.done) {
          controller.close();
        } else {
          controller.enqueue(next.value);
        }
      },
      cancel: () => reader.cancel(),
    });
    return new Response(body, { headers: mediaHeaders(sniffContentType(head)) });
  } catch {
    console.error('[proofage-demo] could not stream a media file', { slug: session.slug });
    return notFound();
  }
}
