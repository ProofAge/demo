import type { Metadata } from 'next';
import { DemoProvider } from '@/components/demo/DemoProvider';
import { StartArea } from '@/components/flow/StartArea';
import { ResultArea } from '@/components/result/ResultArea';
import { SiteShell } from '@/components/SiteShell';
import { WalletHowItWorks } from '@/components/WalletHowItWorks';
import { EUDI_PATH } from '@/lib/demo-pages';
import { publicKeysFor } from '@/lib/proofage';

const PATH = EUDI_PATH;
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
  // Not linked and not indexed until the page is ready; it still works by its URL.
  robots: { index: false, follow: false },
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

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://demo.proofage.net').replace(/\/$/, '');

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
      publisher: { '@type': 'Organization', name: 'ProofAge', url: 'https://proofage.net' },
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
    <SiteShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">Prove you are 18+ with a digital ID wallet</h1>
        <p className="mt-3 text-body">
          Share an age proof from your EUDI Wallet instead of uploading an ID. No wallet? A selfie age check takes over. Beta, with test wallet data.
        </p>
      </div>
      <DemoProvider page={PATH} apiKeys={publicKeysFor(PATH)} method="wallet">
        <div className="mx-auto mt-8 max-w-xl">
          <StartArea slug="eudi-wallet" opens="popup" check="selfie" idleLabel="Verify with my wallet" footnote={false} sampleLabel="No wallet at hand? See a sample result" />
        </div>
        <ResultArea />
      </DemoProvider>
      <WalletHowItWorks />
    </SiteShell>
  );
}
