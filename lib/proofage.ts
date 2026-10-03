import { ProofAgeClient } from '@proofage/node';
import { parseDemoWorkspaces, workspaceFor, type DemoWorkspaces } from '@/lib/demo-workspaces';

let workspaces: DemoWorkspaces | null = null;
const clients = new Map<string, ProofAgeClient>();

/** The slug → keys map from PROOFAGE_DEMO_WORKSPACES, parsed once per server instance. */
export function demoWorkspaces(): DemoWorkspaces {
  workspaces ??= parseDemoWorkspaces(process.env.PROOFAGE_DEMO_WORKSPACES);
  return workspaces;
}

/** Public key for the browser SDK's init(); secret keys never leave the server. */
export function publicKeyFor(slug: string): string {
  return workspaceFor(demoWorkspaces(), slug).apiKey;
}

export function clientFor(slug: string): ProofAgeClient {
  let client = clients.get(slug);
  if (!client) {
    const { apiKey, secretKey } = workspaceFor(demoWorkspaces(), slug);
    client = new ProofAgeClient({
      apiKey,
      secretKey,
      baseUrl: process.env.PROOFAGE_BASE_URL ?? 'https://api.proofage.xyz',
      version: 'v1',
    });
    clients.set(slug, client);
  }
  return client;
}
