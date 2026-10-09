import type { MetadataRoute } from 'next';

const BUILD_DATE = '2026-03-31';
const WALLET_PAGE_DATE = '2026-10-03';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://demo.proofage.net').replace(/\/$/, '');
  return [
    {
      url: base,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${base}/eudi-wallet-age-verification`,
      lastModified: WALLET_PAGE_DATE,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
  ];
}
