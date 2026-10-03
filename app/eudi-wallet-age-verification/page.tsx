import type { Metadata } from 'next';
import { Storefront } from '@/components/Storefront';

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

export default function EudiWalletPage() {
  return (
    <Storefront
      apiKey={process.env.NEXT_PUBLIC_PROOFAGE_WALLET_API_KEY ?? ''}
      apiKeyEnvName="NEXT_PUBLIC_PROOFAGE_WALLET_API_KEY"
      sdkMetadata={{ demo: 'ember-box-eudi-wallet' }}
      copy={{
        eyebrow: 'EUDI Wallet · Live demo',
        heading: (
          <>
            Prove you are 18+ with your <em className="text-ember-amber-light not-italic">digital ID</em> wallet
          </>
        ),
        intro:
          'Ember Box is a fictional storefront. This demo runs the ProofAge wallet age check: share an age proof from your digital identity wallet instead of uploading an ID. No wallet? A selfie age check takes over.',
        cardTitle: 'Verify with your wallet',
        cardText:
          'Works with the EU age verification app and compatible EUDI wallets, on this device or by scanning a QR code. Powered by ProofAge.',
      }}
    />
  );
}
