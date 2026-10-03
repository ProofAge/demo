import { randomBytes } from 'node:crypto';

export const VISITOR_COOKIE = 'pa_demo_visitor';
export const SESSION_COOKIE = 'pa_demo_session';
export const VISITOR_MAX_AGE = 60 * 60 * 24 * 30;
export const SESSION_MAX_AGE = 60 * 60 * 24;

/** Which verification the result page shows. `url` reopens it for "continue". */
export type DemoSession = { slug: string; verificationId: string; url: string };

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
  const { slug, verificationId, url } = parsed as Record<string, unknown>;
  if (typeof slug !== 'string' || typeof verificationId !== 'string' || typeof url !== 'string') {
    return null;
  }
  if (!slug || !verificationId || !isHttpUrl(url)) {
    return null;
  }
  return { slug, verificationId, url };
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
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
