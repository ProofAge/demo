export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#0d0a07] px-6 py-10 md:px-16">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-ember-smoke">Age verification powered by</p>
          <p className="mt-2 text-sm text-ember-smoke/60">This is a demo for ProofAge — not a real product.</p>
        </div>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-6">
          <a
            href="https://proofage.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-ember-amber/30 bg-ember-amber/10 px-5 py-2 text-[11px] uppercase tracking-[0.2em] text-ember-amber transition hover:bg-ember-amber/20"
          >
            ProofAge
          </a>
          <a
            href="https://github.com/ProofAge/demo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] uppercase tracking-[0.15em] text-ember-smoke/80 underline-offset-4 hover:text-ember-cream hover:underline"
          >
            View on GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
