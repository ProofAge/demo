import type { Metadata } from 'next';
import { Storefront } from '@/components/Storefront';
import { WalletHowItWorks } from '@/components/WalletHowItWorks';
import { publicKeyFor } from '@/lib/proofage';

const PATH = '/eudi-wallet-age-verification';
const TITLE = 'EUDI Wallet age verification — live demo';
const DESCRIPTION =
  'Try ProofAge wallet age verification live: prove you are 18+ with the EU age verification app or a compatible digital identity wallet, with a selfie age check as fallback.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'EUDI Wallet age verification',
    'EU Digital Identity Wallet demo',
    'digital ID wallet age check',
    'OpenID4VP age verification',
    'Digital Credentials API demo',
  ],
  alternates: {
    canonical: PATH,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PATH,
    siteName: 'ProofAge Demo',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
};

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://demo.proofage.xyz').replace(/\/$/, '');

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      name: TITLE,
      description: DESCRIPTION,
      url: `${SITE_URL}${PATH}`,
      about: { '@type': 'Thing', name: 'EU Digital Identity Wallet' },
      isPartOf: { '@type': 'WebSite', name: 'ProofAge Demo', url: SITE_URL },
      publisher: { '@type': 'Organization', name: 'ProofAge', url: 'https://proofage.xyz' },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'ProofAge Demo', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'EUDI Wallet age verification', item: `${SITE_URL}${PATH}` },
      ],
    },
  ],
};

export default function EudiWalletPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Storefront
        slug="eudi-wallet"
        apiKey={publicKeyFor('eudi-wallet')}
        copy={{
          eyebrow: 'Digital ID wallet · Live demo',
          heading: (
            <>
              Prove you are 18+ with your <em className="text-ember-amber-light not-italic">EUDI Wallet</em>
            </>
          ),
          intro:
            'Ember Box is a fictional storefront. This demo runs the ProofAge wallet age check: share an age proof from your digital identity wallet instead of uploading an ID. No wallet? A selfie age check takes over.',
          cardTitle: 'Verify with your wallet',
          cardText:
            'Works with the EU age verification app and compatible EUDI wallets, on this device or by scanning a QR code. Powered by ProofAge.',
        }}
      >
        <WalletHowItWorks />
      </Storefront>
    </>
  );
}
