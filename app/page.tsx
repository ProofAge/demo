import { Storefront } from '@/components/Storefront';
import { publicKeyFor } from '@/lib/proofage';

export default function HomePage() {
  return (
    <Storefront
      slug="ember-box"
      apiKey={publicKeyFor('ember-box')}
      copy={{
        eyebrow: 'Members only · Demo',
        heading: (
          <>
            Curated collections for <em className="text-ember-amber-light not-italic">discerning</em> adults
          </>
        ),
        intro:
          'Ember Box is a fictional brand for this ProofAge integration demo. Verify your age to continue — quick, private, and secure.',
        cardTitle: 'Claim your Ember Box',
        cardText: 'Age verification is required before accessing restricted content. Powered by ProofAge.',
      }}
    />
  );
}
