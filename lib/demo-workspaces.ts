export type DemoWorkspaceKeys = { apiKey: string; secretKey: string };
export type DemoWorkspaces = Record<string, DemoWorkspaceKeys>;

export const WORKSPACES_ENV = 'PROOFAGE_DEMO_WORKSPACES';

/** Parses the slug → keys map. Errors name the env var, never its content. */
export function parseDemoWorkspaces(raw: string | undefined): DemoWorkspaces {
  if (!raw) {
    throw new Error(`${WORKSPACES_ENV} is not set`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${WORKSPACES_ENV} is not valid JSON`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${WORKSPACES_ENV} must be a JSON object keyed by demo slug`);
  }
  const workspaces: DemoWorkspaces = {};
  for (const [slug, value] of Object.entries(parsed)) {
    const keys = value as Partial<DemoWorkspaceKeys> | null;
    if (!keys || typeof keys.apiKey !== 'string' || !keys.apiKey || typeof keys.secretKey !== 'string' || !keys.secretKey) {
      throw new Error(`${WORKSPACES_ENV}["${slug}"] needs non-empty apiKey and secretKey`);
    }
    workspaces[slug] = { apiKey: keys.apiKey, secretKey: keys.secretKey };
  }
  return workspaces;
}

export function workspaceFor(workspaces: DemoWorkspaces, slug: string): DemoWorkspaceKeys {
  if (!Object.hasOwn(workspaces, slug)) {
    throw new Error(`${WORKSPACES_ENV} has no entry for "${slug}"`);
  }
  return workspaces[slug];
}

/** The slug whose public key sent a webhook (`X-Auth-Client`), or null. */
export function slugForApiKey(workspaces: DemoWorkspaces, apiKey: string | null): string | null {
  if (!apiKey) {
    return null;
  }
  const match = Object.entries(workspaces).find(([, keys]) => keys.apiKey === apiKey);
  return match ? match[0] : null;
}
