import { cookies } from 'next/headers';
import { ProofAgeError, type VerificationDocument } from '@proofage/node';
import { isVisitorId, parseSession, SESSION_COOKIE, sessionForPage, VISITOR_COOKIE } from '@/lib/demo-cookies';
import { mediaSlots } from '@/lib/console-view';
import { isMaskAll } from '@/lib/demo-config';
import { shouldRecordSubmission } from '@/lib/decision-timing';
import { checkOf, type DemoPage, type WorkspaceSlug } from '@/lib/demo-pages';
import { resultFromVerification, type ConsoleLive, type LoadedResult } from '@/lib/demo-result';
import { buildReceipt } from '@/lib/receipt';
import { scrubRecord } from '@/lib/erasure';
import { documentForOwner, maskTail, MASK } from '@/lib/redaction';
import type { WebhookRecord } from '@/lib/webhook-record';
import { webhookStore, type WebhookStore } from '@/lib/webhook-store';
import { clientFor, demoWorkspaces } from '@/lib/proofage';

/**
 * What `page` shows for this browser. A session from another page is no session here. API
 * failures become `error`; a missing PROOFAGE_DEMO_WORKSPACES throws on purpose (500).
 */
export async function loadResult(page: DemoPage): Promise<LoadedResult> {
  const store = await cookies();
  const session = sessionForPage(parseSession(store.get(SESSION_COOKIE)?.value), page);
  const visitorId = store.get(VISITOR_COOKIE)?.value;
  if (!session || !isVisitorId(visitorId) || !Object.hasOwn(demoWorkspaces(), session.slug)) {
    return { kind: 'no_session' };
  }

  try {
    const verification = await clientFor(session.slug).verifications().find(session.verificationId);
    const owned = verification !== null && verification.external_id === visitorId;
    const kv = owned ? webhookStore() : null;
    const stored = kv && verification ? await readStored(kv, session.verificationId, verification.status, visitorId) : null;
    const maskAll = isMaskAll();
    const erasedAt = verification?.erasure?.erased_at ?? null;

    // After a decision: the document (fields, media list), the estimation and the workspace name.
    // Once erased, the fields are null and the media have no source: only the list is shown.
    const decided = owned && verification !== null && DECISIONS.has(verification.status);
    const [details, workspaceName] = decided
      ? await Promise.all([readDetails(session.slug, session.verificationId, verification.status, erasedAt), readWorkspaceName(session.slug)])
      : [null, null];
    const record = stored?.record && erasedAt ? scrubRecord(stored.record) : (stored?.record ?? null);

    const result = resultFromVerification({
      verificationId: session.verificationId,
      slug: session.slug,
      page,
      sessionUrl: session.url,
      visitorId,
      verification,
      decidedAt: stored?.record?.payload.timestamp ?? verification?.updated_at ?? null,
    });
    if (result.kind !== 'ok') {
      return result;
    }
    return {
      ...result,
      console:
        decided && verification
          ? consoleLive(verification, session.url, visitorId, maskAll, {
              document: details?.document ?? null,
              estimation: erasedAt ? null : (details?.estimation ?? null),
              workspaceName,
              erased: erasedAt !== null,
            })
          : null,
      storage: kv !== null,
      receipt: record && stored
        ? buildReceipt({ check: checkOf(session.slug), record, submittedSeenAt: stored.submittedSeenAt, visitorId, maskAll })
        : null,
      erasure: erasedAt ? { erasedAt, keptInPage: false } : null,
    };
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

/**
 * Reads the stored webhook and records when this server saw `submitted` (timing until the API
 * has submitted_at). A record whose external_id is not this visitor is ignored. Nothing is read
 * while the person is still in the widget. Storage failures degrade to "no webhook".
 */
async function readStored(
  kv: WebhookStore,
  verificationId: string,
  status: string,
  visitorId: string,
): Promise<{ record: WebhookRecord | null; submittedSeenAt: string | null }> {
  if (status === 'created' || status === 'started') {
    return { record: null, submittedSeenAt: null };
  }
  try {
    const [record, seenAt] = await Promise.all([kv.getRecord(verificationId), kv.getSubmittedSeenAt(verificationId)]);
    let submittedSeenAt = seenAt;
    if (status === 'submitted' && shouldRecordSubmission(seenAt, record?.payload.timestamp ?? null)) {
      submittedSeenAt = new Date().toISOString();
      await kv.setSubmittedSeen(verificationId, submittedSeenAt);
    }
    return { record: record?.payload.external_id === visitorId ? record : null, submittedSeenAt };
  } catch {
    console.error('[proofage-demo] webhook store unavailable');
    return { record: null, submittedSeenAt: null };
  }
}

const DECISIONS = new Set(['approved', 'declined', 'resubmission_requested']);

function consoleLive(
  verification: { created_at: string; updated_at: string; external_metadata: Record<string, unknown> | null },
  url: string,
  visitorId: string,
  maskAll: boolean,
  read: {
    document: VerificationDocument | null;
    estimation: Awaited<ReturnType<typeof readEstimation>>;
    workspaceName: string | null;
    erased: boolean;
  },
): ConsoleLive {
  return {
    workspaceName: read.workspaceName,
    url,
    createdAt: verification.created_at,
    updatedAt: verification.updated_at,
    externalId: maskAll ? MASK : maskTail(visitorId),
    metadata: verification.external_metadata,
    attemptId: read.document?.meta?.attempt_id ?? read.estimation?.attemptId ?? null,
    document: read.document?.document && !read.erased ? documentForOwner(read.document.document, maskAll) : null,
    estimation: read.estimation && { minimum: read.estimation.minimum, passed: read.estimation.passed, gender: read.estimation.gender },
    media: mediaSlots(read.document?.media ?? []),
  };
}

const DETAILS_TTL_MS = 60_000;
type Details = { document: VerificationDocument | null; estimation: Awaited<ReturnType<typeof readEstimation>> };
const detailsCache = new Map<string, { at: number; details: Details }>();

/**
 * The document and the estimation barely change after a decision, but the page polls every second
 * while it waits for the webhook: read them once per verification, status and erasure, then reuse
 * for a minute. An erasure starts a new entry, so nothing read before it is served after it.
 */
export async function readDetails(slug: WorkspaceSlug, verificationId: string, status: string, erasedAt: string | null): Promise<Details> {
  const key = `${verificationId}:${status}:${erasedAt ?? ''}`;
  const cached = detailsCache.get(key);
  if (cached && Date.now() - cached.at < DETAILS_TTL_MS) {
    return cached.details;
  }
  const [document, estimation] = await Promise.all([
    readDocument(slug, verificationId),
    checkOf(slug) === 'selfie' && !erasedAt ? readEstimation(slug, verificationId) : null,
  ]);
  for (const [oldKey, entry] of detailsCache) {
    if (Date.now() - entry.at >= DETAILS_TTL_MS) {
      detailsCache.delete(oldKey);
    }
  }
  const details = { document, estimation };
  detailsCache.set(key, { at: Date.now(), details });
  return details;
}

/** The document and its media list; a missing document is a guest, not an error. */
async function readDocument(slug: WorkspaceSlug, verificationId: string): Promise<VerificationDocument | null> {
  try {
    return await clientFor(slug).verifications(verificationId).document();
  } catch {
    return null;
  }
}

async function readEstimation(
  slug: WorkspaceSlug,
  verificationId: string,
): Promise<{ minimum: number | null; passed: boolean | null; gender: string | null; attemptId: string | null } | null> {
  try {
    const estimation = await clientFor(slug).verifications(verificationId).estimation();
    if (!estimation) {
      return null;
    }
    const gender = estimation.gender?.value;
    return {
      minimum: estimation.age_threshold.minimum,
      passed: estimation.age_threshold.passed,
      gender: gender === 0 ? 'Female' : gender === 1 ? 'Male' : null,
      attemptId: estimation.attempt_id,
    };
  } catch {
    return null;
  }
}

const workspaceNames = new Map<string, string>();

async function readWorkspaceName(slug: WorkspaceSlug): Promise<string | null> {
  const known = workspaceNames.get(slug);
  if (known) {
    return known;
  }
  try {
    const name = (await clientFor(slug).workspace().get())?.name ?? null;
    if (name) {
      workspaceNames.set(slug, name);
    }
    return name;
  } catch {
    return null;
  }
}
