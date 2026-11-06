import { Redis } from '@upstash/redis';
import type { WebhookRecord } from '@/lib/webhook-record';

const TTL_SECONDS = 60 * 60;

export type WebhookStore = {
  kind: 'redis' | 'memory';
  getRecord(verificationId: string): Promise<WebhookRecord | null>;
  saveRecord(verificationId: string, record: WebhookRecord): Promise<void>;
  getSubmittedSeenAt(verificationId: string): Promise<string | null>;
  /** The caller decides when to overwrite (`shouldRecordSubmission`). */
  setSubmittedSeen(verificationId: string, at: string): Promise<void>;
  /** The check was erased in ProofAge: a webhook arriving later is stored without its personal data. */
  markErased(verificationId: string): Promise<void>;
  isErased(verificationId: string): Promise<boolean>;
};

const recordKey = (id: string) => `pa_demo:webhook:${id}`;
const seenKey = (id: string) => `pa_demo:submitted:${id}`;
const erasedKey = (id: string) => `pa_demo:erased:${id}`;

let redis: Redis | null = null;

/**
 * Upstash Redis when KV_REST_API_URL/KV_REST_API_TOKEN are set (Vercel Marketplace). Local dev
 * without them gets an in-memory store so the panel works on localhost; production gets null
 * and the panel says storage is not configured.
 */
export function webhookStore(): WebhookStore | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (url && token) {
    redis ??= new Redis({ url, token });
    return redisStore(redis);
  }
  return process.env.NODE_ENV === 'production' ? null : memoryStore();
}

function redisStore(client: Redis): WebhookStore {
  return {
    kind: 'redis',
    getRecord: (id) => client.get<WebhookRecord>(recordKey(id)),
    saveRecord: async (id, record) => {
      await client.set(recordKey(id), record, { ex: TTL_SECONDS });
    },
    getSubmittedSeenAt: async (id) => (await client.get<{ at: string }>(seenKey(id)))?.at ?? null,
    setSubmittedSeen: async (id, at) => {
      await client.set(seenKey(id), { at }, { ex: TTL_SECONDS });
    },
    markErased: async (id) => {
      await client.set(erasedKey(id), 1, { ex: TTL_SECONDS });
    },
    isErased: async (id) => (await client.exists(erasedKey(id))) === 1,
  };
}

type MemoryEntry = { value: unknown; expiresAt: number };
const globalForStore = globalThis as typeof globalThis & { __paDemoStore?: Map<string, MemoryEntry> };

/** Shared through globalThis: in dev, route handlers and pages may load separate module copies. */
function memoryStore(): WebhookStore {
  const map = (globalForStore.__paDemoStore ??= new Map());
  const read = <T>(key: string): T | null => {
    const entry = map.get(key);
    if (!entry || entry.expiresAt < Date.now()) {
      map.delete(key);
      return null;
    }
    return entry.value as T;
  };
  const write = (key: string, value: unknown) => map.set(key, { value, expiresAt: Date.now() + TTL_SECONDS * 1000 });
  return {
    kind: 'memory',
    getRecord: async (id) => read<WebhookRecord>(recordKey(id)),
    saveRecord: async (id, record) => {
      write(recordKey(id), record);
    },
    getSubmittedSeenAt: async (id) => read<string>(seenKey(id)),
    setSubmittedSeen: async (id, at) => {
      write(seenKey(id), at);
    },
    markErased: async (id) => {
      write(erasedKey(id), true);
    },
    isErased: async (id) => read<boolean>(erasedKey(id)) === true,
  };
}
