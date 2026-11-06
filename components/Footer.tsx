import type { ReactNode } from 'react';

const link = 'hover:text-ink';

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink">{title}</h2>
      <ul className="mt-3 space-y-2">{children}</ul>
    </div>
  );
}

/** Where to go next: integrate, price, talk to us. Every page ends here, so it lives in the footer. */
export function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted max-md:pb-24 md:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <Column title="Integrate">
            <li>
              <a href="https://docs.proofage.net/integration/server-sdks/node" className={link}>Create a verification</a>
            </li>
            <li>
              <a href="https://docs.proofage.net/integration/webhooks" className={link}>Webhooks</a>
            </li>
            <li>
              <a href="https://github.com/ProofAge/demo" className={link}>This demo on GitHub</a>
            </li>
          </Column>
          <Column title="Price">
            <li>
              <a href="https://proofage.net/pricing" className={link}>Pricing</a>
            </li>
          </Column>
          <Column title="Talk to us">
            <li>
              <a href="mailto:sales@proofage.net" className={link}>sales@proofage.net</a>
            </li>
            <li>
              LinkedIn: <a href="https://www.linkedin.com/company/proofage" className={link}>ProofAge</a>,{' '}
              <a href="https://www.linkedin.com/in/nikolay-zhidenko-b1b921a8/" className={link}>Nikolai Zhidenko</a>,{' '}
              <a href="https://www.linkedin.com/in/dpsw/" className={link}>Denis Pantykin</a>
            </li>
            <li>We always reply.</li>
          </Column>
          <Column title="More">
            {/* The EUDI Wallet page stays reachable by its URL but is not linked until it is ready. */}
            <li>
              <a href="https://proofage.net/privacy" className={link}>Privacy</a>
            </li>
            <li>
              <a href="https://proofage.net" className={link}>proofage.net</a>
            </li>
          </Column>
        </div>
        <p className="mt-8 border-t border-line pt-6">ProofAge</p>
      </div>
    </footer>
  );
}
