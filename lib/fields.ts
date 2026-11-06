import type { VerificationDocument } from '@proofage/node';
import type { Check } from './demo-pages.ts';
import type { RedactedPayload } from './redaction.ts';

type DocumentFieldKey = keyof VerificationDocument['document']['fields'];
type DocumentKey = 'type' | 'issuing_country';

export type FieldRow = {
  label: string;
  source: { field: DocumentFieldKey } | { document: DocumentKey };
  checks: Readonly<Record<Check, boolean>>;
};

/** tsc fails here when the SDK adds or drops a document field: update FIELD_ROWS with it. */
const ALL_FIELDS = {
  first_name: true,
  middle_name: true,
  last_name: true,
  date_of_birth: true,
  gender: true,
  nationality: true,
  place_of_birth: true,
  address: true,
  document_number: true,
  issue_date: true,
  expiry_date: true,
} satisfies Record<DocumentFieldKey, true>;

export const DOCUMENT_FIELD_KEYS = Object.keys(ALL_FIELDS) as DocumentFieldKey[];

const ID_CHECKS = { selfie: false, 'age-id': true, kyc: true } as const;
const KYC_ONLY = { selfie: false, 'age-id': false, kyc: true } as const;

/** Country and document type first, as in the console; then the printed fields. */
export const FIELD_ROWS: readonly FieldRow[] = [
  { label: 'Issuing country', source: { document: 'issuing_country' }, checks: ID_CHECKS },
  { label: 'Document type', source: { document: 'type' }, checks: ID_CHECKS },
  { label: 'First name', source: { field: 'first_name' }, checks: ID_CHECKS },
  { label: 'Middle name', source: { field: 'middle_name' }, checks: KYC_ONLY },
  { label: 'Last name', source: { field: 'last_name' }, checks: ID_CHECKS },
  { label: 'Date of birth', source: { field: 'date_of_birth' }, checks: ID_CHECKS },
  { label: 'Gender', source: { field: 'gender' }, checks: KYC_ONLY },
  { label: 'Nationality', source: { field: 'nationality' }, checks: KYC_ONLY },
  { label: 'Place of birth', source: { field: 'place_of_birth' }, checks: KYC_ONLY },
  { label: 'Address', source: { field: 'address' }, checks: KYC_ONLY },
  { label: 'Document number', source: { field: 'document_number' }, checks: ID_CHECKS },
  { label: 'Issue date', source: { field: 'issue_date' }, checks: KYC_ONLY },
  { label: 'Expiry date', source: { field: 'expiry_date' }, checks: KYC_ONLY },
];

/** The document rows, filled from this payload; null = not printed. */
export function receivedFields(check: Check, payload: RedactedPayload): { label: string; value: string | null }[] {
  const document = asRecord(payload.document);
  if (!document) {
    return [];
  }
  const fields = asRecord(document.fields) ?? {};
  return FIELD_ROWS.flatMap((row) => {
    if (!row.checks[check]) {
      return [];
    }
    if ('field' in row.source) {
      return [{ label: row.label, value: asText(fields[row.source.field]) }];
    }
    if ('document' in row.source) {
      return [{ label: row.label, value: asText(document[row.source.document]) }];
    }
    return [];
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asText(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}
