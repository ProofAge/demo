'use client';

import { buttonPrimary, textLink } from '@/components/ui';
import { useDemo } from '@/components/demo/DemoProvider';
import type { Check, Opens, WorkspaceSlug } from '@/lib/demo-pages';

const SELFIE_FOOTNOTE = '*If the selfie cannot confirm the age, the check asks for an ID.';

/** The one primary action, what is happening, the consent line and the sample link. */
export function StartArea({
  slug,
  opens,
  check,
  idleLabel,
  footnote = check === 'selfie',
  sampleLabel,
}: {
  slug: WorkspaceSlug;
  opens: Opens;
  check: Check;
  /** Replaces "Start the check" while idle. */
  idleLabel?: string;
  footnote?: boolean;
  /** Replaces the sample link's text. */
  sampleLabel?: string;
}) {
  const { panel, display, error, dismissError, continueUrl, start, startOver, watch, showSample } = useDemo();
  const continueLink = continueUrl ? (
    <a href={continueUrl} target="_blank" rel="noopener noreferrer" onClick={watch} className={textLink}>
      {panel.message === 'waiting_tab' ? 'Open the check again' : 'Continue'}
    </a>
  ) : null;
  // On phones the button stays at the bottom of the screen until there is a result: a fixed bar (a sticky
  // one cannot work inside this short section). No placeholder in the flow, which left a gap mid-page;
  // the footer's bottom padding keeps the end of the page clear of the bar.
  const pinned = !display;
  const startOverLink = (
    <button type="button" onClick={() => startOver({ slug, opens })} className={textLink}>
      Start over
    </button>
  );

  return (
    <section aria-label="Start" className="mt-5">
      <div
        className={
          pinned ? 'max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-20 max-md:border-t max-md:border-line max-md:bg-paper max-md:px-4 max-md:py-3' : ''
        }
      >
        <button type="button" className={buttonPrimary} disabled={panel.button.disabled} onClick={() => start(slug, opens)}>
          {idleLabel && panel.button.label === 'Start the check' ? idleLabel : panel.button.label}
        </button>
      </div>

      <div aria-live="polite" className="mt-3 space-y-2 text-sm">
        {error && (
          <p role="alert" className="rounded-md bg-danger-tint px-3 py-2 text-danger">
            {error}{' '}
            <button type="button" onClick={dismissError} className="underline">
              Dismiss
            </button>
          </p>
        )}
        {panel.message === 'waiting_tab' && (
          <p className="text-body">
            Waiting for you to finish in the other tab. This page updates by itself. {continueLink && <>· {continueLink} </>}· {startOverLink}
          </p>
        )}
        {panel.message === 'checking' && <p className="text-body">Checking… the result appears here by itself.</p>}
        {panel.message === 'timed_out' && <p className="text-body">This is taking longer than usual. Refresh the page to check again.</p>}
        {panel.message === 'left' && (
          <p className="text-body">
            You left the check unfinished. {continueLink && <>· {continueLink} </>}· {startOverLink}
          </p>
        )}
        {panel.message === 'retry' && <p className="text-body">One more try needed: the check could not be completed from what was sent. {continueLink && <>· {continueLink}</>}</p>}
        {panel.message === 'ended' && <p className="text-body">This check ended: it expired or was left unfinished. Start a new one.</p>}
      </div>

      <p className="mt-3 text-sm text-muted">
        The widget asks for your consent first. Any photos from this demo are deleted right after the check. Questions about your data:{' '}
        <a href="mailto:privacy@proofage.net" className={textLink}>
          privacy@proofage.net
        </a>
        .
      </p>
      <p className="mt-1 text-xs text-muted">
        ProofAge is the data controller ·{' '}
        <a href="https://proofage.net/privacy" className={textLink}>
          Privacy policy
        </a>
      </p>
      <p className="mt-4 text-sm">
        <button type="button" className={textLink} onClick={() => showSample({ check, outcome: 'approved' })}>
          {sampleLabel ?? (check === 'selfie' ? 'Rather not use your camera? See a sample result' : 'No ID at hand? See a sample result')}
        </button>
      </p>
      {footnote && <p className="mt-3 text-xs text-muted">{SELFIE_FOOTNOTE}</p>}
    </section>
  );
}
