import { buttonPrimary, sectionTitle, surfaceCard, textLink } from '@/components/ui';

const BETA_URL = 'https://proofage.net/eudi-wallet-age-verification';

const STEPS = [
  {
    title: 'Tap “Verify with my wallet”',
    text: 'ProofAge opens over the page, in a popup or a new tab. Your site only adds the button.',
  },
  {
    title: 'Share an age proof from your wallet',
    text: 'On a phone, open your wallet app or answer the browser’s own prompt (W3C Digital Credentials API). On a computer, scan the QR code with your phone. The wallet asks you before it shares anything.',
  },
  {
    title: 'Back to your site',
    text: 'Your system receives the result in a signed webhook. No wallet? A selfie age estimation takes over, followed by an ID document check if the estimate is inconclusive.',
  },
];

export function WalletHowItWorks() {
  return (
    <section aria-labelledby="how-it-works" className="mt-12">
      <h2 id="how-it-works" className={sectionTitle}>EUDI Wallet age verification, step by step</h2>
      <ol className="mt-4 grid gap-4 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className={`${surfaceCard} p-5`}>
            <span className="font-mono text-sm text-accent">{index + 1}</span>
            <h3 className="mt-2 font-semibold text-ink">{step.title}</h3>
            <p className="mt-2 text-sm text-body">{step.text}</p>
          </li>
        ))}
      </ol>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="font-semibold text-ink">Which wallets work here</h3>
          <p className="mt-2 text-sm text-body">
            The demo accepts age attestations from the EU age verification app and from EUDI-compatible wallets that
            present over OpenID4VP or the W3C Digital Credentials API. National wallets switch on as they open to
            relying parties, so availability depends on your country and device.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-ink">What your system sees</h3>
          <p className="mt-2 text-sm text-body">
            With a wallet, ProofAge requests one claim: that you are over 18. Your name, date of birth and document
            number are not shared with ProofAge or with your site. Your system gets the same result format whichever
            method was used.
          </p>
        </div>
      </div>
      <div className={`${surfaceCard} mt-8 flex flex-col items-start gap-4 p-5 md:flex-row md:items-center md:justify-between`}>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-ink">Accept EUDI Wallet age checks on your site</h3>
          <p className="mt-1 text-sm text-body">One integration for digital ID wallets, with selfie and document fallback. Private beta now open.</p>
        </div>
        <a href={`${BETA_URL}#apply`} className={`${buttonPrimary} shrink-0 md:w-auto`}>Join the private beta</a>
      </div>
      <p className="mt-4 text-sm text-body">
        Read more about <a href={BETA_URL} className={textLink}>EUDI Wallet and mobile ID age verification with ProofAge</a>.
      </p>
    </section>
  );
}
