import { ProofAgeClient } from '@proofage/node';

let client: ProofAgeClient | null = null;

export function getProofAgeServerClient(): ProofAgeClient {
  if (!client) {
    const apiKey = process.env.PROOFAGE_API_KEY;
    const secretKey = process.env.PROOFAGE_SECRET_KEY;
    if (!apiKey || !secretKey) {
      throw new Error('PROOFAGE_API_KEY and PROOFAGE_SECRET_KEY must be set for server-side API calls.');
    }
    client = new ProofAgeClient({
      apiKey,
      secretKey,
      baseUrl: process.env.PROOFAGE_BASE_URL ?? 'https://api.proofage.xyz',
      version: 'v1',
    });
  }
  return client;
}
