import type { WebhookPayload } from '@proofage/node';

export type RedactedPayload = Record<string, unknown>;

export const FOREIGN_DUPLICATE = '(another verification)';
export const OMITTED_STAFF = '(omitted in the demo: the console user)';

export const MASK = '••••';
const MASK_ALL_FIELDS = ['first_name', 'middle_name', 'last_name', 'date_of_birth', 'place_of_birth', 'address', 'document_number'];
const DISPLAY_MASKED_FIELDS = ['document_number', 'address'];

export function maskTail(value: string): string {
  const compact = value.replace(/\s+/g, '');
  return compact.length > 4 ? `${MASK} ${compact.slice(-4)}` : MASK;
}

/**
 * What the panel may show the visitor who owns the verification. Never: someone
 * else's ids, the console user, the visitor id in clear. Device signals are the owner's own. With `maskAll` (recording), personal fields too.
 */
export function redactPayload(payload: WebhookPayload, options: { visitorId: string; maskAll: boolean }): RedactedPayload {
  const copy = structuredClone(payload) as unknown as RedactedPayload;
  if (typeof payload.external_id === 'string') {
    copy.external_id = maskTail(payload.external_id);
  }
  if (options.maskAll && copy.fingerprint_signals && typeof copy.fingerprint_signals === 'object') {
    const signals = copy.fingerprint_signals as Record<string, unknown>;
    if ('ip_address' in signals) {
      signals.ip_address = MASK;
    }
  }
  if (payload.duplicate_of) {
    copy.duplicate_of =
      payload.duplicate_of.external_id === options.visitorId
        ? { ...payload.duplicate_of, external_id: maskTail(options.visitorId) }
        : FOREIGN_DUPLICATE;
  }
  if (payload.manual_moderation) {
    copy.manual_moderation = { ...payload.manual_moderation, performed_by: OMITTED_STAFF };
  }
  if (options.maskAll) {
    replaceFields(copy, MASK_ALL_FIELDS, () => MASK);
  }
  return copy;
}

/** The document as the API returned it, for the owner; with `maskAll` (recording) personal fields are masked. */
export function documentForOwner(document: Record<string, unknown>, maskAll: boolean): Record<string, unknown> {
  const copy = structuredClone(document);
  if (maskAll) {
    replaceFields({ document: copy }, MASK_ALL_FIELDS, () => MASK);
  }
  return copy;
}

/** Before "Reveal": the document number and address cut to their last four characters. */
export function maskForDisplay(payload: RedactedPayload): RedactedPayload {
  const copy = structuredClone(payload);
  replaceFields(copy, DISPLAY_MASKED_FIELDS, maskTail);
  return copy;
}

function replaceFields(payload: RedactedPayload, keys: readonly string[], mask: (value: string) => string): void {
  const document = payload.document;
  if (!document || typeof document !== 'object') {
    return;
  }
  const fields = (document as Record<string, unknown>).fields;
  if (!fields || typeof fields !== 'object') {
    return;
  }
  const record = fields as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value) {
      record[key] = mask(value);
    }
  }
}
