import type { MetadataRoute } from 'next';
const LAST_MODIFIED = '2026-11-05';

/** The EUDI Wallet page is left out (and noindex) until it is ready. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://demo.proofage.net').replace(/\/$/, '');
  return [
    { url: base, lastModified: LAST_MODIFIED, changeFrequency: 'monthly', priority: 1 },
  ];
}
