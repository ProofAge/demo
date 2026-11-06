import type { Check } from './demo-pages.ts';
import { receivedFields } from './fields.ts';
import { relativeTime } from './relative-time.ts';
import { hasPrintedField, type Delivery, type Tone } from './summary.ts';

export type MediaSlot = { label: string; src: string | null };

export type ConsoleInput = {
  check: Check;
  sample: boolean;
  now: Date;
  verification: {
    id: string;
    status: string;
    workspaceName: string | null;
    url: string | null;
    createdAt: string;
    updatedAt: string;
    externalId: string | null;
    metadata: Record<string, unknown> | null;
    attemptId: string | null;
  };
  /** The (redacted) webhook payload; the caller decides whether document fields are masked. */
  payload: Record<string, unknown> | null;
  reasonLabel: string | null;
  estimation: { minimum: number | null; passed: boolean | null; gender: string | null } | null;
  media: MediaSlot[];
  /** Fixture data for samples. Live checks never pass it: the API does not return the MRZ. */
  mrz: readonly string[] | null;
  webhook: { receivedAt: string; deliveryId: string | null; status: string; signed: boolean } | null;
  /** Why the webhook-only parts (technical information) may be empty. */
  delivery: Delivery;
};

export type ConsoleView = {
  id: string;
  overview: {
    status: { label: string; tone: Tone };
    workspace: string;
    url: string | null;
    created: string;
    updated: string;
    externalId: string | null;
    metadata: Record<string, unknown> | null;
  };
  attempt: { status: { label: string; tone: Tone }; created: string; updated: string; attemptId: string | null; failureReason: string | null };
  technical: { label: string; value: string }[];
  /** What to say when `technical` is empty; null when there are rows. */
  technicalEmpty: string | null;
  document: { label: string; value: string | null }[] | null;
  estimation: { threshold: string; passed: boolean | null; gender: string | null } | null;
  mrz: readonly string[] | null;
  media: MediaSlot[];
  webhook: ConsoleInput['webhook'];
  sample: boolean;
};

const MEDIA_LABELS: Record<string, string> = {
  selfie: 'Selfie',
  liveness_selfie: 'Liveness selfie',
  document_front: 'Document front',
  document_back: 'Document back',
};

/** The files a person captures. Videos and liveness audit files are not shown. */
export function mediaSlots(media: { id: string; type: string; url: string | null }[]): MediaSlot[] {
  return media
    .filter((item) => Object.hasOwn(MEDIA_LABELS, item.type))
    .map((item) => ({ label: MEDIA_LABELS[item.type], src: item.url ? `/api/demo-media?id=${encodeURIComponent(item.id)}` : null }));
}

const TONES: Record<string, Tone> = { approved: 'ok', declined: 'danger', resubmission_requested: 'warn', review: 'warn' };

function badge(status: string): { label: string; tone: Tone } {
  const words = status.replace(/_/g, ' ');
  return { label: words.charAt(0).toUpperCase() + words.slice(1), tone: Object.hasOwn(TONES, status) ? TONES[status] : 'neutral' };
}

const TECHNICAL_EMPTY: Record<Delivery, string> = {
  signed: 'Nothing arrived with this check',
  sample: 'Nothing arrived with this check',
  pending: 'Waiting for the webhook',
  unconfigured: 'Not available: webhook storage is not configured',
};

const SIGNAL_ROWS: [string, string][] = [
  ['ip_timezone', 'IP timezone'],
  ['device_timezone', 'Device timezone'],
  ['device', 'Device'],
  ['browser', 'Browser'],
  ['os', 'OS'],
  ['screen', 'Screen'],
];

function technicalRows(payload: Record<string, unknown> | null): { label: string; value: string }[] {
  const signals = payload?.fingerprint_signals;
  if (!signals || typeof signals !== 'object' || Array.isArray(signals)) {
    return [];
  }
  const record = signals as Record<string, unknown>;
  const text = (key: string) => (typeof record[key] === 'string' && record[key] ? (record[key] as string) : null);
  const rows: { label: string; value: string }[] = [];
  const ip = text('ip_address');
  if (ip) {
    const country = text('ip_country_code');
    rows.push({ label: 'IP address', value: country ? `${ip} (${country})` : ip });
  }
  for (const [key, label] of SIGNAL_ROWS) {
    const value = text(key);
    if (value) {
      rows.push({ label, value });
    }
  }
  return rows;
}

export function buildConsoleView(input: ConsoleInput): ConsoleView {
  const { verification, now } = input;
  const documentFields = (input.payload?.document as { fields?: unknown } | undefined)?.fields;
  const hasDocument =
    Boolean(input.payload?.document && typeof input.payload.document === 'object') &&
    (input.check !== 'selfie' || (!!documentFields && typeof documentFields === 'object' && hasPrintedField(documentFields as Record<string, unknown>)));
  const documentRows = hasDocument && input.payload ? receivedFields(input.check === 'kyc' ? 'kyc' : 'age-id', input.payload) : [];
  const technical = technicalRows(input.payload);
  const estimation = input.check === 'selfie' ? input.estimation : null;
  return {
    id: verification.id,
    overview: {
      status: badge(verification.status),
      workspace: verification.workspaceName ?? '-',
      url: verification.url ? shortenUrl(verification.url) : null,
      created: relativeTime(verification.createdAt, now),
      updated: relativeTime(verification.updatedAt, now),
      externalId: verification.externalId,
      metadata: verification.metadata && Object.keys(verification.metadata).length ? verification.metadata : null,
    },
    attempt: {
      status: badge(verification.status),
      created: relativeTime(verification.createdAt, now),
      updated: relativeTime(verification.updatedAt, now),
      attemptId: verification.attemptId,
      failureReason: verification.status === 'approved' ? null : input.reasonLabel,
    },
    technical,
    technicalEmpty: technical.length ? null : TECHNICAL_EMPTY[input.delivery],
    document: documentRows.length ? documentRows : null,
    estimation: estimation ? { threshold: estimation.minimum === null ? '-' : `${estimation.minimum}+`, passed: estimation.passed, gender: estimation.gender } : null,
    mrz: input.sample && hasDocument ? input.mrz : null,
    media: input.media,
    webhook: input.webhook,
    sample: input.sample,
  };
}

/** Host plus the start of the path, as much as a table cell needs. */
export function shortenUrl(url: string): string {
  try {
    const { host, pathname } = new URL(url);
    const path = pathname.length > 14 ? `${pathname.slice(0, 14)}…` : pathname;
    return `${host}${path}`;
  } catch {
    return url;
  }
}
