import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';

const plexSans = localFont({
  src: [
    { path: './fonts/plex-sans-regular-latin1.woff2', weight: '400', style: 'normal' },
    { path: './fonts/plex-sans-medium-latin1.woff2', weight: '500', style: 'normal' },
    { path: './fonts/plex-sans-semibold-latin1.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-plex-sans',
  display: 'swap',
});
const plexMono = localFont({
  src: [{ path: './fonts/plex-mono-regular-latin1.woff2', weight: '400', style: 'normal' }],
  variable: '--font-plex-mono',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://demo.proofage.net';
const DESCRIPTION =
  'Try the check your users will see: a selfie age check, age check by ID or identity verification (KYC). Run it on yourself, then see what your system and your team get back.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'ProofAge live demo — age and identity verification',
    template: '%s | ProofAge Demo',
  },
  description: DESCRIPTION,
  keywords: ['ProofAge demo', 'age verification demo', 'identity verification demo', 'KYC demo', 'verification webhook example'],
  openGraph: {
    title: 'ProofAge live demo — age and identity verification',
    description: DESCRIPTION,
    url: siteUrl,
    siteName: 'ProofAge Demo',
    locale: 'en_US',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'ProofAge live demo', description: DESCRIPTION },
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f8f5' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1a16' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'ProofAge live demo',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description: DESCRIPTION,
    publisher: { '@type': 'Organization', name: 'ProofAge', url: 'https://proofage.net' },
  };

  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>{children}</body>
      {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
    </html>
  );
}
