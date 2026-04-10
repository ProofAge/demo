import type { Metadata } from 'next';
import { Cormorant_Garamond, Montserrat } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  variable: '--font-cormorant',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-montserrat',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://demo.proofage.xyz';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'ProofAge Demo — Age verification integration example',
    template: '%s | ProofAge Demo',
  },
  description:
    'ProofAge demo: age verification integration example for regulated storefronts. Ember Box is a fictional product showcasing the ProofAge SDK and webhooks.',
  keywords: [
    'ProofAge demo',
    'age verification demo',
    'identity verification example',
    'KYC integration',
    'age gate',
  ],
  openGraph: {
    title: 'ProofAge Demo — Age verification integration example',
    description:
      'Interactive demo of ProofAge age verification: SDK, server-side API, and signed webhooks.',
    url: siteUrl,
    siteName: 'ProofAge Demo',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ProofAge Demo',
    description: 'Age verification integration example powered by ProofAge.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'ProofAge Integration Demo',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'Demonstration of ProofAge age verification for e-commerce and regulated content.',
  };

  return (
    <html lang="en">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body className={`${cormorant.variable} ${montserrat.variable}`}>{children}</body>
      {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
    </html>
  );
}
