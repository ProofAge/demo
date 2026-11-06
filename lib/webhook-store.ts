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
  /**
   * The demo asked ProofAge to erase the check (`at` null until ProofAge confirmed it). From then on
   * the page shows no personal data, even while ProofAge is still deleting it, and a webhook
   * arriving later is stored without it.
   */
  markErasing(verificationId: string): Promise<void>;
  confirmErased(verificationId: string, at: string): Promise<void>;
  /** The erasure failed for good: nothing was deleted. */
  clearErasing(verificationId: string): Promise<void>;
  erasureOf(verificationId: string): Promise<{ at: string | null } | null>;
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
    markErasing: async (id) => {
      await client.set(erasedKey(id), { at: null }, { ex: TTL_SECONDS });
    },
    confirmErased: async (id, at) => {
      await client.set(erasedKey(id), { at }, { ex: TTL_SECONDS });
    },
    clearErasing: async (id) => {
      await client.del(erasedKey(id));
    },
    erasureOf: (id) => client.get<{ at: string | null }>(erasedKey(id)),
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
    markErasing: async (id) => {
      write(erasedKey(id), { at: null });
    },
    confirmErased: async (id, at) => {
      write(erasedKey(id), { at });
    },
    clearErasing: async (id) => {
      map.delete(erasedKey(id));
    },
    erasureOf: async (id) => read<{ at: string | null }>(erasedKey(id)),
  };
}
