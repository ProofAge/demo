import { cookies } from 'next/headers';
import { ProofAgeError } from '@proofage/node';
import { isVisitorId, parseSession, SESSION_COOKIE, VISITOR_COOKIE } from '@/lib/demo-cookies';
import { normaliseFirstName, resultFromVerification, type LoadedResult } from '@/lib/demo-result';
import { clientFor, demoWorkspaces } from '@/lib/proofage';

/**
 * What /result shows for this browser. API failures become `error`; a missing or malformed
 * PROOFAGE_DEMO_WORKSPACES throws on purpose, so a misconfigured deploy is a 500, not a guess.
 */
export async function loadResult(): Promise<LoadedResult> {
  const store = await cookies();
  const session = parseSession(store.get(SESSION_COOKIE)?.value);
  const visitorId = store.get(VISITOR_COOKIE)?.value;
  if (!session || !isVisitorId(visitorId) || !Object.hasOwn(demoWorkspaces(), session.slug)) {
    return { kind: 'no_session' };
  }

  const client = clientFor(session.slug);
  try {
    const verification = await client.verifications().find(session.verificationId);
    let firstName: string | null = null;
    if (verification?.status === 'approved' && verification.external_id === visitorId) {
      firstName = await readFirstName(session.slug, session.verificationId);
    }
    return resultFromVerification({
      slug: session.slug,
      sessionUrl: session.url,
      visitorId,
      verification,
      firstName,
    });
  } catch (error) {
    if (error instanceof ProofAgeError && error.statusCode === 404) {
      return { kind: 'no_session' };
    }
    console.error('[proofage-demo] could not load the verification', {
      slug: session.slug,
      status: error instanceof ProofAgeError ? error.statusCode : null,
    });
    return { kind: 'error' };
  }
}

/** Only the first name, and a missing document is a guest, not an error. */
async function readFirstName(slug: string, verificationId: string): Promise<string | null> {
  try {
    const document = await clientFor(slug).verifications(verificationId).document();
    return normaliseFirstName(document?.document?.fields?.first_name);
  } catch {
    return null;
  }
}
