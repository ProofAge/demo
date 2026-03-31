import type { MetadataRoute } from 'next';

const BUILD_DATE = '2026-03-31';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://demo.proofage.xyz';
  return [
    {
      url: base.replace(/\/$/, ''),
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
