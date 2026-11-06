import { ageOn } from './age.ts';
import type { DecisionTiming } from './decision-timing.ts';
import type { Check, Look, Opens } from './demo-pages.ts';
import { CHECK_NAMES } from './demo-options.ts';
import { normaliseFirstName } from './demo-result.ts';
import type { DemoErasure } from './erasure.ts';
import { receivedFields } from './fields.ts';
import { maskTail } from './redaction.ts';

export type Tone = 'ok' | 'warn' | 'danger' | 'neutral';
export type Delivery = 'signed' | 'sample' | 'pending' | 'unconfigured';

export type SummaryInput = {
  check: Check;
  sample: boolean;
  status: string;
  reason: string | null;
  reasonLabel: string | null;
  /** The redacted webhook payload, when one was received. */
  payload: Record<string, unknown> | null;
  timing: DecisionTiming | null;
  delivery: Delivery;
  now: Date;
  /** Set once the demo erased the check's personal data in ProofAge. */
  erasure?: DemoErasure | null;
};

export type SummaryLine = { label: string; value: string };

export type Summary = {
  badge: { label: string; tone: Tone };
  lines: SummaryLine[];
  /** KYC only: every field on the document. */
  allFields: { label: string; value: string | null }[] | null;
};

const BADGES: Record<string, { label: string; tone: Tone }> = {
  approved: { label: 'Approved', tone: 'ok' },
  declined: { label: 'Declined', tone: 'danger' },
  resubmission_requested: { label: 'Resubmission requested', tone: 'warn' },
};

const DOCUMENT_TYPES: Record<string, string> = { id: 'ID', passport: 'Passport', driving_license: 'Driving licence' };

const NOT_PRINTED = 'Not printed';
export const PERSONAL_DATA_NONE = 'None: no name, no date of birth, no document';

export function buildSummary(input: SummaryInput): Summary {
  const badge = BADGES[input.status] ?? { label: input.status, tone: 'neutral' as Tone };
  const lines: SummaryLine[] = [];
  const approved = input.status === 'approved';
  const document = asRecord(input.payload?.document);
  const fields = asRecord(document?.fields);

  // A selfie check that did not fall back to an ID returns no personal data: say so, it is the point.
  const noPersonalData = input.check === 'selfie' && !(fields && hasPrintedField(fields));
  if (approved) {
    if (input.check !== 'kyc') {
      lines.push({ label: 'Over 18', value: 'Yes' });
    }
    if (document && fields && (input.check !== 'selfie' || hasPrintedField(fields))) {
      lines.push(...documentLines(document, fields, input.now));
    }
  } else {
    lines.push({ label: 'Reason', value: input.reasonLabel ?? input.reason ?? 'No reason given' });
  }
  if (noPersonalData) {
    lines.push({ label: 'Personal data', value: PERSONAL_DATA_NONE });
  }

  if (input.erasure) {
    lines.push({ label: 'Erased', value: erasedText(input.erasure) });
  }

  if (input.timing) {
    lines.push({ label: 'Decision time', value: `${input.timing.approximate ? 'about ' : ''}${formatSeconds(input.timing)} s after submission` });
  }
  lines.push({ label: 'Delivered', value: deliveredText(input) });

  const allFields = approved && input.check === 'kyc' && input.payload ? receivedFields('kyc', input.payload) : [];
  return { badge, lines, allFields: allFields.length ? allFields : null };
}

/** Photos, document fields and device data are gone from ProofAge; the page may still hold its own copy. */
export function erasedText(erasure: DemoErasure): string {
  const date = new Date(erasure.erasedAt);
  const at = Number.isNaN(date.getTime()) ? '' : ` at ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  return erasure.keptInPage
    ? `Photos and personal data deleted from ProofAge${at}. This page keeps its copy until you reload it.`
    : `Photos and personal data were deleted from ProofAge${at}, right after you saw the result.`;
}

function deliveredText(input: SummaryInput): string {
  switch (input.delivery) {
    case 'sample':
      return 'sample payload, not signed';
    case 'pending':
      return input.erasure ? 'the webhook did not arrive before the data was deleted' : 'waiting for the webhook';
    case 'unconfigured':
      return 'not shown, webhook storage is not configured on this deployment';
    default:
      return input.status === 'approved' ? 'as a signed webhook, signature verified' : `Same webhook, with status: ${input.status.replace(/_/g, ' ')}`;
  }
}

function documentLines(document: Record<string, unknown>, fields: Record<string, unknown>, now: Date): SummaryLine[] {
  const text = (value: unknown) => (typeof value === 'string' && value ? value : null);
  const first = normaliseFirstName(fields.first_name);
  const last = normaliseFirstName(fields.last_name);
  const dob = text(fields.date_of_birth);
  const age = ageOn(dob, now);
  const type = text(document.type);
  const country = text(document.issuing_country);
  const number = text(fields.document_number);
  const documentParts = [type ? (DOCUMENT_TYPES[type] ?? type) : null, country, number ? `no. ${maskTail(number)}` : null].filter(Boolean);
  return [
    { label: 'Name', value: [first, last].filter(Boolean).join(' ') || NOT_PRINTED },
    { label: 'Date of birth', value: dob ? `${dob}${age === null ? '' : ` — ${age} y.o.`}` : NOT_PRINTED },
    { label: 'Document', value: documentParts.join(' · ') || NOT_PRINTED },
  ];
}

/** "Age check by ID · over this page · ProofAge look · 14:02". A sample has no time and was not opened. */
export function contextLine(input: { check: Check; look: Look; opens: Opens | null; at: Date | null; sample: boolean }): string {
  const parts: string[] = [CHECK_NAMES[input.check]];
  if (!input.sample && input.opens) {
    parts.push(input.opens === 'popup' ? 'over this page' : 'in a new tab');
  }
  parts.push(input.look === 'lumo' ? 'Lumo look' : 'ProofAge look');
  if (!input.sample && input.at) {
    parts.push(input.at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
  }
  return parts.join(' · ');
}

/** A selfie check only has document lines when it fell back to an ID and something was read. */
export function hasPrintedField(fields: Record<string, unknown>): boolean {
  return Object.values(fields).some((value) => typeof value === 'string' && value !== '');
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** "2.4" under ten seconds, whole seconds above; our own sighting ("about") is only good to a second. */
export function formatSeconds(timing: { seconds: number; approximate: boolean }): string {
  if (timing.approximate || timing.seconds >= 10) {
    return String(Math.round(timing.seconds));
  }
  return Number.isInteger(timing.seconds) ? String(timing.seconds) : timing.seconds.toFixed(1);
}
