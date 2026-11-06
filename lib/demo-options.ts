import { CHECKS, LOOKS, OPENS, type Check, type Look, type Opens } from './demo-pages.ts';

export type DemoOptions = { check: Check; look: Look; opens: Opens };

export const DEFAULT_OPTIONS: DemoOptions = { check: 'kyc', look: 'proofage', opens: 'popup' };

export const CHECK_LABELS: Record<Check, string> = {
  selfie: 'Selfie age check',
  'age-id': 'Age check by ID',
  kyc: 'Identity (KYC)',
};

/** Labels for narrow phones, where the full ones wrap onto two lines. */
export const CHECK_SHORT_LABELS: Record<Check, string> = {
  selfie: 'Selfie',
  'age-id': 'Age by ID',
  kyc: 'KYC',
};

/** Canonical names, for sentences. */
export const CHECK_NAMES: Record<Check, string> = {
  selfie: 'Selfie age check',
  'age-id': 'Age check by ID',
  kyc: 'Identity verification (KYC)',
};

export const CHECK_YOU_GET: Record<Check, string> = {
  selfie: 'You get: over 18 or not',
  'age-id': 'You get: over 18, name, date of birth, document number',
  kyc: 'You get: every field on the document',
};

/** Second hint line: the two ID checks look the same to the user. */
export const CHECK_NOTE: Record<Check, string | null> = {
  kyc: 'Your user sees the same screens as in Age check by ID.',
  'age-id': 'Your user sees the same screens as in KYC.',
  selfie: null,
};

export const OPENS_LABELS: Record<Opens, string> = { popup: 'Over this page', tab: 'In a new tab' };
export const OPENS_LINE =
  'Your choice when you integrate: a popup over your page, or a link that opens the check in a new tab. Phones always use a new tab.';
export const PHONE_LINE = 'On a phone the check opens in a new tab. Come back here: this page updates by itself.';

export const LOOK_LABELS: Record<Look, string> = { proofage: 'ProofAge', lumo: 'Your brand' };
export const LOOK_LINE =
  'Lumo is a made-up brand standing in for yours: name, logo, colours, corners and font, set in the console, no code.';

type Params = URLSearchParams | Record<string, string | string[] | undefined>;

function read(params: Params, key: string): string | undefined {
  if (params instanceof URLSearchParams) {
    return params.get(key) ?? undefined;
  }
  const value = params[key];
  return typeof value === 'string' ? value : undefined;
}

function pick<T extends string>(allowed: readonly T[], value: string | undefined, fallback: T): T {
  return value !== undefined && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Deep links: invalid or repeated values fall back to the defaults. */
export function parseOptions(params: Params): DemoOptions {
  return {
    check: pick(CHECKS, read(params, 'check'), DEFAULT_OPTIONS.check),
    look: pick(LOOKS, read(params, 'look'), DEFAULT_OPTIONS.look),
    opens: pick(OPENS, read(params, 'open'), DEFAULT_OPTIONS.opens),
  };
}

/** `''` when everything is the default, else `?check=…&look=…&open=…` with the non-defaults. */
export function optionsQuery(options: DemoOptions): string {
  const parts: string[] = [];
  if (options.check !== DEFAULT_OPTIONS.check) parts.push(`check=${options.check}`);
  if (options.look !== DEFAULT_OPTIONS.look) parts.push(`look=${options.look}`);
  if (options.opens !== DEFAULT_OPTIONS.opens) parts.push(`open=${options.opens}`);
  return parts.length ? `?${parts.join('&')}` : '';
}
