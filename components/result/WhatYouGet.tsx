'use client';

import { Badge } from '@/components/Badge';
import { useDemo } from '@/components/demo/DemoProvider';
import { badgeBase, badgeTone, sectionTitle, surfaceCard, textLink } from '@/components/ui';
import type { DemoDisplay } from '@/lib/demo-display';
import { maskForDisplay } from '@/lib/redaction';
import { contextLine } from '@/lib/summary';
import { ExpiryMark } from '@/components/result/ExpiryMark';
import { WebhookJson } from '@/components/result/WebhookJson';

/** Part A: what your system gets, in human lines, with the webhook behind a toggle. */
export function WhatYouGet({ display, revealed, onReveal }: { display: DemoDisplay; revealed: boolean; onReveal: () => void }) {
  const { showSample } = useDemo();
  const { summary } = display;
  const declined = summary.badge.tone === 'danger';
  const context = contextLine({ check: display.check, ...display.context, sample: display.sample });

  return (
    <section aria-labelledby="what-you-get" className="mx-auto max-w-2xl">
      <div className={`${surfaceCard} p-4 md:p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="what-you-get" className={sectionTitle}>
            What you get
          </h2>
          <Badge tone={summary.badge.tone}>{summary.badge.label}</Badge>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>{context}</span>
          {display.sample && <span className={`${badgeBase} ${badgeTone.warn}`}>Sample</span>}
        </p>
        <p className="mt-1 text-sm text-muted">
          Your system receives this as a signed webhook.
          {!display.sample && ' Only you can see this result: it is tied to this browser.'}
        </p>

        <dl className="mt-4 divide-y divide-line text-sm">
          {summary.lines.map((line) => (
            <div key={line.label} className="grid grid-cols-[8.5rem_1fr] gap-3 py-2">
              <dt className="text-muted">{line.label}</dt>
              <dd className="min-w-0 break-words text-ink">{line.value}</dd>
            </div>
          ))}
        </dl>

        {declined && (
          <p className="mt-3 text-sm text-muted">
            {display.check === 'selfie'
              ? 'The webhook has the same shape, with "status": "declined" and a reason code.'
              : 'The webhook has the same shape, with "status": "declined", a reason code and the document fields that could be read.'}
          </p>
        )}

        {summary.allFields && (
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-accent underline underline-offset-4">Show all fields</summary>
            <dl className="mt-2 divide-y divide-line">
              {summary.allFields.map((row) => (
                <div key={row.label} className="grid grid-cols-[8.5rem_1fr] gap-3 py-1.5">
                  <dt className="text-muted">{row.label}</dt>
                  <dd className="min-w-0 whitespace-pre-line break-words font-mono text-xs text-ink">
                    {row.value === null ? (
                      <span className="font-sans text-muted">Not printed</span>
                    ) : (
                      <>
                        {maskedValue(display, row.label, row.value, revealed)}
                        <ExpiryMark expiry={row.expiry} />
                      </>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        )}

        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-accent underline underline-offset-4">Show the webhook</summary>
          <WebhookJson display={display} revealed={revealed} onReveal={onReveal} />
        </details>

        {display.sample && (
          <p className="mt-4 text-sm">
            <button
              type="button"
              className={textLink}
              onClick={() => showSample({ check: display.check, outcome: declined ? 'approved' : 'declined' })}
            >
              {declined ? 'See an approved sample' : 'See a declined sample'}
            </button>
          </p>
        )}
      </div>
    </section>
  );
}

/** Document number and address stay masked until Reveal, as in the JSON. */
function maskedValue(display: DemoDisplay, label: string, value: string, revealed: boolean): string {
  if (revealed || (label !== 'Document number' && label !== 'Address') || !display.receipt) {
    return value;
  }
  const key = label === 'Document number' ? 'document_number' : 'address';
  const masked = maskForDisplay({ document: { fields: { [key]: value } } }) as { document: { fields: Record<string, string> } };
  return masked.document.fields[key];
}
