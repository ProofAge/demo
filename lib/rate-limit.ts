import { Redis } from '@upstash/redis';

/** New verifications one visitor (IP address) may create per hour. */
export const CREATE_LIMIT = 25;
export const CREATE_WINDOW_SECONDS = 60 * 60;

export type Counter = (key: string, windowSeconds: number) => Promise<number>;

/**
 * Fixed-window limit: counts this hit and says whether it is still within `limit`, and if not, how many
 * seconds until the window resets.
 */
export async function hit(
  counter: Counter,
  input: { scope: string; id: string; limit: number; windowSeconds: number; now: number },
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  const window = Math.floor(input.now / 1000 / input.windowSeconds);
  const count = await counter(`pa_demo:rl:${input.scope}:${input.id}:${window}`, input.windowSeconds);
  if (count <= input.limit) {
    return { ok: true };
  }
  const resetsAt = (window + 1) * input.windowSeconds;
  return { ok: false, retryAfter: Math.max(1, resetsAt - Math.floor(input.now / 1000)) };
}

let redis: Redis | null = null;
const globalForCounter = globalThis as typeof globalThis & { __paDemoCounts?: Map<string, { count: number; expiresAt: number }> };

/**
 * Upstash Redis when KV_REST_API_URL/KV_REST_API_TOKEN are set (shared by every instance), otherwise a
 * per-process map: enough for local dev, best effort on a deployment without Redis.
 */
export function counter(): Counter {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (url && token) {
    redis ??= new Redis({ url, token });
    const client = redis;
    return async (key, windowSeconds) => {
      const count = await client.incr(key);
      if (count === 1) {
        await client.expire(key, windowSeconds);
      }
      return count;
    };
  }
  const map = (globalForCounter.__paDemoCounts ??= new Map());
  return async (key, windowSeconds) => {
    const now = Date.now();
    const entry = map.get(key);
    const next = entry && entry.expiresAt > now ? { ...entry, count: entry.count + 1 } : { count: 1, expiresAt: now + windowSeconds * 1000 };
    map.set(key, next);
    return next.count;
  };
}

/**
 * The visitor's IP address as the host reports it. On Vercel `x-forwarded-for` is set by the platform
 * (its first entry is the client); elsewhere put the app behind a proxy that does the same.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || headers.get('x-real-ip')?.trim() || 'unknown';
}

/**
 * Only this site's own pages may create a session: a browser marks cross-site requests with
 * `Sec-Fetch-Site`, and older ones still send `Origin`. Scripts without either are left to the limit.
 */
export function isSameOrigin(request: Request): boolean {
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') {
    return false;
  }
  const origin = request.headers.get('origin');
  if (!origin) {
    return true;
  }
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}
