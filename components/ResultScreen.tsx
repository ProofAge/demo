'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Footer } from '@/components/Footer';
import { MembersContent } from '@/components/MembersContent';
import { DEMO_PAGES, pathForSlug } from '@/lib/demo-pages';
import type { LoadedResult, ResultView } from '@/lib/demo-result';

const POLL_INTERVAL_MS = 3000;
const POLL_LIMIT_MS = 2 * 60 * 1000;

const primaryButton =
  'inline-block bg-ember-amber px-6 py-4 text-[11px] font-medium uppercase tracking-[0.25em] text-ember-dark transition hover:shadow-[0_8px_32px_rgba(200,134,42,0.3)]';
const textLink = 'text-ember-amber underline underline-offset-4';

export function ResultScreen({ initial }: { initial: LoadedResult }) {
  const router = useRouter();
  const [result, setResult] = useState<LoadedResult>(initial);
  const [timedOut, setTimedOut] = useState(false);
  const pending = result.kind === 'ok' && result.view.pending;

  useEffect(() => {
    if (!pending) {
      return;
    }
    const startedAt = Date.now();
    let timer: number | undefined;
    let cancelled = false;
    const tick = async () => {
      if (Date.now() - startedAt > POLL_LIMIT_MS) {
        setTimedOut(true);
        return;
      }
      try {
        const response = await fetch('/api/demo-session', { cache: 'no-store' });
        if (response.ok) {
          const next = (await response.json()) as LoadedResult;
          if (!cancelled && next.kind !== 'error') {
            setResult(next);
          }
        }
      } catch {
        // Keep the last result; the next tick retries.
      }
      if (!cancelled) {
        timer = window.setTimeout(tick, POLL_INTERVAL_MS);
      }
    };
    timer = window.setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pending]);

  const startOver = async (slug: string) => {
    await fetch('/api/demo-session', { method: 'DELETE' }).catch(() => null);
    router.push(pathForSlug(slug));
  };

  return (
    <div className="flex min-h-dvh flex-col bg-ember-dark">
      <header className="flex items-center justify-between px-6 py-8 md:px-16">
        <Link href={result.kind === 'ok' ? pathForSlug(result.slug) : '/'} className="font-[family-name:var(--font-display)] text-lg font-light uppercase tracking-[0.35em] text-ember-cream">
          Ember <span className="text-ember-amber">Box</span>
        </Link>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-20 pt-8 md:px-16">
        {result.kind === 'no_session' && <NoSession />}
        {result.kind === 'error' && (
          <Message title="We couldn't load your result">
            Something went wrong on our side.{' '}
            <a href="/result" className={textLink}>
              Try again
            </a>
            .
          </Message>
        )}
        {result.kind === 'ok' && (
          <>
            <div aria-live="polite">
              <StateView view={result.view} timedOut={timedOut} onStartOver={() => startOver(result.slug)} />
            </div>
            <StorePanel view={result.view} />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

function StateView({ view, timedOut, onStartOver }: { view: ResultView; timedOut: boolean; onStartOver: () => void }) {
  const startOverButton = (
    <button type="button" onClick={onStartOver} className={primaryButton}>
      Start over
    </button>
  );
  const continueLink = view.continueUrl ? (
    <a href={view.continueUrl} className={primaryButton}>
      Continue verification
    </a>
  ) : null;

  switch (view.state) {
    case 'approved_named':
      return (
        <>
          <Message title={`Hi ${view.firstName}, thanks for confirming you're 18+`}>
            Your ID was checked, so Ember Box knows who you are. Welcome to the members area.
          </Message>
          <MembersContent />
        </>
      );
    case 'approved_guest':
      return (
        <>
          <Message title="Welcome, guest. You're confirmed 18+">
            Ember Box knows one thing about you: you are over 18. We never learned your name.
          </Message>
          <MembersContent />
        </>
      );
    case 'checking':
    case 'in_review':
      return (
        <Message title={view.state === 'checking' ? 'Checking your result…' : 'A reviewer is looking at your check'}>
          {timedOut ? (
            <>
              This is taking longer than usual.{' '}
              <a href="/result" className={textLink}>
                Refresh
              </a>{' '}
              to check again.
            </>
          ) : (
            'This page updates by itself as soon as there is a decision.'
          )}
        </Message>
      );
    case 'not_finished':
      return (
        <Message title="You haven't finished the check" action={continueLink}>
          Pick up where you left off.
        </Message>
      );
    case 'retry':
      return (
        <Message title="One more try needed" action={continueLink}>
          The check could not be completed from what was sent. You can try again in the same session.
        </Message>
      );
    case 'declined':
      return (
        <Message title="We couldn't confirm your age" action={startOverButton}>
          Ember Box can&apos;t open the members area for this check.
        </Message>
      );
    case 'ended':
      return (
        <Message title="This check ended" action={startOverButton}>
          The session expired or was left unfinished.
        </Message>
      );
    default:
      return (
        <Message title="Something unexpected happened" action={startOverButton}>
          Start a new check to continue.
        </Message>
      );
  }
}

function NoSession() {
  return (
    <Message title="This result is on the device where you started">
      If you finished the check on your phone, go back to the computer you started on. Or open a demo again:{' '}
      <Link href={DEMO_PAGES['ember-box']} className={textLink}>
        selfie &amp; ID demo
      </Link>{' '}
      or{' '}
      <Link href={DEMO_PAGES['eudi-wallet']} className={textLink}>
        EUDI Wallet demo
      </Link>
      .
    </Message>
  );
}

function Message({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="max-w-2xl">
      <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.25rem,4.5vw,3.5rem)] font-light leading-[1.1] text-ember-cream">
        {title}
      </h1>
      <p className="mt-6 text-sm leading-relaxed text-ember-smoke">{children}</p>
      {action && <div className="mt-8">{action}</div>}
    </section>
  );
}

/** What the store's backend received: the fields the page is built from, nothing else. */
function StorePanel({ view }: { view: ResultView }) {
  const received = {
    status: view.status,
    reason: view.reason,
    ...(view.firstName ? { first_name: view.firstName } : {}),
  };
  return (
    <details className="mt-14 border border-white/10 p-6 text-sm text-ember-smoke">
      <summary className="cursor-pointer text-[11px] uppercase tracking-[0.2em] text-ember-cream">
        What the store received
      </summary>
      <p className="mt-4">
        Ember Box&apos;s server asked ProofAge for this result with <code>GET /v1/verifications/{'{id}'}</code>
        {view.firstName ? ' and read the first name from the document endpoint' : ''}.
      </p>
      <pre className="mt-4 overflow-x-auto bg-black/30 p-4 text-xs text-ember-cream">{JSON.stringify(received, null, 2)}</pre>
    </details>
  );
}
