import { randomBytes } from 'node:crypto';
import { DEFAULT_OPTIONS, optionsQuery } from './demo-options.ts';
import { checkOf, EUDI_PATH, HOME_PATH, isDemoPage, lookOf, isWorkspaceSlug, pageAllowsWorkspace, type DemoPage, type WorkspaceSlug } from './demo-pages.ts';

const SCENARIO_PAGES = ['/courses', '/marketplaces', '/rental', '/store'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const VISITOR_COOKIE = 'pa_demo_visitor';
export const SESSION_COOKIE = 'pa_demo_session';
export const VISITOR_MAX_AGE = 60 * 60 * 24 * 30;
export const SESSION_MAX_AGE = 60 * 60 * 24;

/** Which verification a page shows. `page` is where it started; `url` reopens it for "continue". */
export type DemoSession = { slug: WorkspaceSlug; page: DemoPage; verificationId: string; url: string };

/** 128 random bits: sent as `external_id`, so it must not be guessable. */
export function newVisitorId(): string {
  return randomBytes(16).toString('base64url');
}

export function isVisitorId(value: string | undefined): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{22}$/.test(value);
}

export function serializeSession(session: DemoSession): string {
  return JSON.stringify(session);
}

export function parseSession(raw: string | undefined): DemoSession | null {
  if (!raw) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }
  const { slug, page, verificationId, url } = upgradeLegacy(parsed as Record<string, unknown>);
  if (!isWorkspaceSlug(slug) || !isDemoPage(page) || typeof verificationId !== 'string' || typeof url !== 'string') {
    return null;
  }
  if (!pageAllowsWorkspace(page, slug) || !UUID.test(verificationId) || !isHttpUrl(url)) {
    return null;
  }
  return { slug, page, verificationId, url };
}

/**
 * Cookies written by older versions: no `page` (and the age-by-ID workspace was `ember-box`), or
 * a scenario page. Map them to the single flow, so a check in flight during the deploy keeps its result.
 */
function upgradeLegacy(session: Record<string, unknown>): Record<string, unknown> {
  if (session.page === undefined) {
    if (session.slug === 'ember-box') {
      return { ...session, slug: 'age-id', page: HOME_PATH };
    }
    if (session.slug === 'eudi-wallet') {
      return { ...session, page: EUDI_PATH };
    }
    return session;
  }
  if (session.page === EUDI_PATH) {
    return session;
  }
  if (session.page === HOME_PATH) {
    return session.slug === 'eudi-wallet' ? { ...session, slug: 'selfie' } : session;
  }
  if (typeof session.page === 'string' && SCENARIO_PAGES.includes(session.page)) {
    return { ...session, page: HOME_PATH, slug: session.slug === 'eudi-wallet' ? 'selfie' : session.slug };
  }
  return session;
}

/** A session started on another page counts as no session here. */
export function sessionForPage(session: DemoSession | null, page: DemoPage): DemoSession | null {
  return session && session.page === page ? session : null;
}

/** Where /result (the callback_url) sends the browser: back to its page, or home with a notice. */
export function resultRedirectPath(session: DemoSession | null): string {
  if (!session) {
    return `${HOME_PATH}?result=elsewhere`;
  }
  if (session.page !== HOME_PATH) {
    return session.page;
  }
  // The page's options start from the defaults on a fresh load: bring back the check and look.
  return `${HOME_PATH}${optionsQuery({ ...DEFAULT_OPTIONS, check: checkOf(session.slug), look: lookOf(session.slug) })}`;
}

export function cookieOptions(maxAge: number, secure: boolean) {
  return {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure,
    path: '/' as const,
    maxAge,
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}
