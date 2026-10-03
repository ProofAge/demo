const BETA_URL = 'https://proofage.xyz/eudi-wallet-age-verification';

const STEPS = [
  {
    title: 'Tap “Verify my age”',
    text: 'ProofAge opens over the store, in a popup or a new tab. The store only adds the button.',
  },
  {
    title: 'Share an age proof from your wallet',
    text: 'On a phone, open your wallet app or answer the browser’s own prompt (W3C Digital Credentials API). On a computer, scan the QR code with your phone. The wallet asks you before it shares anything.',
  },
  {
    title: 'Back to the store',
    text: 'The store receives the result in a signed webhook. No wallet? A selfie age estimation takes over, followed by an ID document check if the estimate is inconclusive.',
  },
];

export function WalletHowItWorks() {
  return (
    <section aria-labelledby="how-it-works" className="border-t border-white/5 px-6 py-20 md:px-16">
      <div className="mx-auto max-w-6xl">
        <p className="text-[10px] uppercase tracking-[0.35em] text-ember-amber">How this demo works</p>
        <h2
          id="how-it-works"
          className="mt-4 max-w-3xl font-[family-name:var(--font-display)] text-[clamp(2rem,4vw,3rem)] font-light leading-tight text-ember-cream"
        >
          EUDI Wallet age verification, step by step
        </h2>

        <ol className="mt-12 grid gap-10 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="border-t border-ember-amber/20 pt-6">
              <span className="font-[family-name:var(--font-display)] text-3xl font-light text-ember-amber">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-3 text-sm font-medium uppercase tracking-[0.15em] text-ember-cream">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ember-smoke">{step.text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-16 grid gap-10 md:grid-cols-2">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-2xl font-normal text-ember-cream">
              Which wallets work here
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-ember-smoke">
              The demo accepts age attestations from the EU age verification app and from EUDI-compatible wallets that
              present over OpenID4VP or the W3C Digital Credentials API. National wallets switch on as they open to
              relying parties, so availability depends on your country and device.
            </p>
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-2xl font-normal text-ember-cream">
              What the store sees
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-ember-smoke">
              With a wallet, ProofAge requests one claim: that you are over 18. Your name, date of birth and document
              number are not shared with ProofAge or with the store. The store gets the same result format whichever
              method you used.
            </p>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start gap-6 border border-ember-amber/20 bg-white/[0.03] p-8 md:flex-row md:items-center md:justify-between md:p-10">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-2xl font-normal text-ember-cream">
              Accept EUDI Wallet age checks on your site
            </h3>
            <p className="mt-2 text-sm text-ember-smoke">
              One integration for digital ID wallets, with selfie and document fallback. Private beta now open.
            </p>
          </div>
          <a
            href={`${BETA_URL}#apply`}
            className="shrink-0 bg-ember-amber px-6 py-4 text-[11px] font-medium uppercase tracking-[0.25em] text-ember-dark transition hover:shadow-[0_8px_32px_rgba(200,134,42,0.3)]"
          >
            Join the private beta
          </a>
        </div>

        <p className="mt-8 text-sm text-ember-smoke">
          Read more about{' '}
          <a href={BETA_URL} className="text-ember-amber underline underline-offset-4">
            EUDI Wallet and mobile ID age verification with ProofAge
          </a>{' '}
          or see the{' '}
          <a
            href="https://github.com/ProofAge/demo"
            className="text-ember-amber underline underline-offset-4"
          >
            source code of this demo
          </a>
          .
        </p>
      </div>
    </section>
  );
}
