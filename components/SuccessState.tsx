export function SuccessState() {
  return (
    <div className="animate-fade-in text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 animate-scale-in items-center justify-center rounded-full border border-ember-amber text-2xl text-ember-amber">
        ✓
      </div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-light text-ember-cream md:text-4xl">
        Age verified
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-ember-smoke">
        You are confirmed as 18+. Welcome to Ember Box — this is a fictional demo storefront powered by ProofAge.
      </p>
      <p className="mt-8 text-[11px] uppercase tracking-[0.2em] text-ember-smoke/70">
        Verified by{' '}
        <a
          href="https://proofage.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="text-ember-amber underline-offset-4 hover:underline"
        >
          ProofAge
        </a>
      </p>
    </div>
  );
}
