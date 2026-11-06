import type { WebhookPayload } from '@proofage/node';
import type { Check } from './demo-pages.ts';
import { buildReceipt, type Receipt } from './receipt.ts';

export type SampleOutcome = 'approved' | 'declined';

const SAMPLE_VISITOR = 'sample-visitor-0000000';
const DECIDED_AT = '2026-10-13T09:41:13Z';
const SAMPLE_SECONDS: Record<Check, number> = { kyc: 2.4, 'age-id': 2.2, selfie: 1.3 };
const DECLINE_REASONS: Record<Check, string> = {
  kyc: 'document.face.mismatch',
  'age-id': 'document.face.mismatch',
  selfie: 'verification.age_threshold.failed',
};

const KYC_DOCUMENT: NonNullable<WebhookPayload['document']> = {
  type: 'id',
  issuing_country: 'FR',
  issuing_subdivision: null,
  fields: {
    first_name: 'ALEX',
    middle_name: 'JORDAN',
    last_name: 'SAMPLE',
    date_of_birth: '1990-04-12',
    gender: 'X',
    nationality: 'FR',
    place_of_birth: 'SAMPLEVILLE',
    address: '1 RUE DE L’EXEMPLE\n75000 SAMPLEVILLE',
    document_number: 'SAMPLE0000',
    issue_date: '2021-06-01',
    expiry_date: '2031-05-31',
  },
};

const AGE_ID_DOCUMENT: NonNullable<WebhookPayload['document']> = {
  type: 'id',
  issuing_country: 'FR',
  fields: { first_name: 'ALEX', last_name: 'SAMPLE', date_of_birth: '1990-04-12', document_number: 'SAMPLE0000' },
};

const DOCUMENTS: Record<Check, WebhookPayload['document'] | undefined> = {
  kyc: KYC_DOCUMENT,
  'age-id': AGE_ID_DOCUMENT,
  selfie: undefined,
};

function sample(check: Check, outcome: SampleOutcome): WebhookPayload {
  const document = DOCUMENTS[check];
  return {
    verification_id: '00000000-0000-4000-8000-000000000000',
    status: outcome,
    external_id: SAMPLE_VISITOR,
    external_metadata: { demo: check, sample: true },
    reason: outcome === 'declined' ? DECLINE_REASONS[check] : null,
    timestamp: DECIDED_AT,
    fingerprint_signals: { ip_address: '203.0.113.7', ip_country_code: 'FR', ip_timezone: 'Europe/Paris', device_timezone: 'Europe/Paris' },
    ...(document ? { document } : {}),
  };
}

/** Shape-checked against the SDK: a type change there breaks the build, not the page. */
export const SAMPLE_PAYLOADS: Record<Check, Record<SampleOutcome, WebhookPayload>> = {
  selfie: { approved: sample('selfie', 'approved'), declined: sample('selfie', 'declined') },
  'age-id': { approved: sample('age-id', 'approved'), declined: sample('age-id', 'declined') },
  kyc: { approved: sample('kyc', 'approved'), declined: sample('kyc', 'declined') },
};

const SELFIE_MEDIA = { label: 'Selfie', src: '/sample/selfie.svg' };
const ID_MEDIA = [
  { label: 'Document front', src: '/sample/document-front.svg' },
  { label: 'Document back', src: '/sample/document-back.svg' },
  SELFIE_MEDIA,
];

/** What the console replica shows around a sample payload. Illustrations, never photos of people. */
export const SAMPLE_CONSOLE = {
  verificationId: '00000000-0000-4000-8000-000000000000',
  attemptId: '00000000-0000-4000-8000-0000000000a1',
  workspaceName: 'Demo workspace',
  url: 'https://app.proofage.net/v/sample0000',
  externalId: '•••• 0000',
  estimation: { minimum: 18, passed: true, gender: null as string | null },
  /** Machine readable zone of the sample document: two lines of 44 characters. */
  mrz: ['I<FRASAMPLE<<ALEX<JORDAN<<<<<<<<<<<<<<<<<<<<', 'SAMPLE00000FRA9004125X3105314<<<<<<<<<<<<<<6'] as readonly string[],
  media: { selfie: [SELFIE_MEDIA], 'age-id': ID_MEDIA, kyc: ID_MEDIA } as Record<Check, { label: string; src: string }[]>,
};

/** `decidedAt` dates the sample (the page passes "two minutes ago", as the console replica says). */
export function sampleReceipt(check: Check, outcome: SampleOutcome, decidedAt: string = DECIDED_AT): Receipt {
  const payload = { ...SAMPLE_PAYLOADS[check][outcome], timestamp: decidedAt };
  return buildReceipt({
    check,
    record: { payload, receivedAt: decidedAt, deliveryId: null, history: [{ status: payload.status, timestamp: payload.timestamp }] },
    submittedSeenAt: null,
    visitorId: SAMPLE_VISITOR,
    maskAll: false,
    source: 'sample',
    timing: { seconds: SAMPLE_SECONDS[check], approximate: false },
  });
}
