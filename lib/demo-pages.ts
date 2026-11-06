export const CHECKS = ['selfie', 'age-id', 'kyc'] as const;
export type Check = (typeof CHECKS)[number];

export const LOOKS = ['proofage', 'lumo'] as const;
export type Look = (typeof LOOKS)[number];

export const OPENS = ['popup', 'tab'] as const;
export type Opens = (typeof OPENS)[number];

export const WORKSPACE_SLUGS = ['selfie', 'selfie-lumo', 'age-id', 'age-id-lumo', 'kyc', 'kyc-lumo', 'eudi-wallet'] as const;
export type WorkspaceSlug = (typeof WORKSPACE_SLUGS)[number];

export const HOME_PATH = '/';
export const EUDI_PATH = '/eudi-wallet-age-verification';
export type DemoPage = typeof HOME_PATH | typeof EUDI_PATH;

/** Which workspaces each page may start. A session for any other pair is refused. */
export const PAGE_WORKSPACES: Readonly<Record<DemoPage, readonly WorkspaceSlug[]>> = {
  [HOME_PATH]: ['selfie', 'selfie-lumo', 'age-id', 'age-id-lumo', 'kyc', 'kyc-lumo'],
  [EUDI_PATH]: ['eudi-wallet'],
};

export const DEMO_PAGES = Object.keys(PAGE_WORKSPACES) as DemoPage[];

export function isWorkspaceSlug(value: unknown): value is WorkspaceSlug {
  return typeof value === 'string' && (WORKSPACE_SLUGS as readonly string[]).includes(value);
}

export function isDemoPage(value: unknown): value is DemoPage {
  return typeof value === 'string' && Object.hasOwn(PAGE_WORKSPACES, value);
}

export function pageAllowsWorkspace(page: DemoPage, slug: WorkspaceSlug): boolean {
  return PAGE_WORKSPACES[page].includes(slug);
}

export function slugFor(check: Check, look: Look): WorkspaceSlug {
  return look === 'lumo' ? (`${check}-lumo` as WorkspaceSlug) : check;
}

/** The EUDI page's workspace is a selfie check. */
export function checkOf(slug: WorkspaceSlug): Check {
  return slug === 'eudi-wallet' ? 'selfie' : (slug.replace(/-lumo$/, '') as Check);
}

export function lookOf(slug: WorkspaceSlug): Look {
  return slug.endsWith('-lumo') ? 'lumo' : 'proofage';
}
