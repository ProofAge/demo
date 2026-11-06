'use client';

import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Badge } from '@/components/Badge';
import { ConsoleIcon, SIDEBAR_ICONS, SIDEBAR_LABELS } from '@/components/result/ConsoleIcons';
import { ExpiryMark } from '@/components/result/ExpiryMark';
import { jsonBlock } from '@/components/result/WebhookJson';
import type { ConsoleView, MediaSlot } from '@/lib/console-view';
import type { DemoDisplay } from '@/lib/demo-display';
import { maskForDisplay } from '@/lib/redaction';

const card = 'rounded-lg bg-surface px-4 py-3 shadow-float';
const dt = 'text-xs font-medium text-muted';

/** Part B: a replica of the console's "Verification details" page, filled with this verification. */
export function ConsoleReplica({ display, revealed, onReveal }: { display: DemoDisplay; revealed: boolean; onReveal: () => void }) {
  const view = revealed ? display.consoleRevealed : display.console;
  const [tab, setTab] = useState<TabId>('attempt');

  return (
    <section aria-labelledby="your-team-sees">
      <h2 id="your-team-sees" className="text-xl font-semibold text-ink">
        What your team sees
      </h2>
      <p className="mt-1 text-sm text-muted">
        The same check in the ProofAge console: status, document data, photos and webhook deliveries. For support,
        disputes and audits, no code.
      </p>

      <div className="mt-4 flex overflow-hidden rounded-lg border border-line bg-paper" data-testid="console-replica">
        <nav aria-label="Console sections (static)" className="hidden w-14 shrink-0 flex-col items-center gap-1 border-r border-line bg-surface py-3 md:flex">
          {SIDEBAR_ICONS.map((name) => (
            <span
              key={name}
              title={SIDEBAR_LABELS[name]}
              className={`flex size-10 items-center justify-center rounded-md ${name === 'verifications' ? 'bg-accent-tint text-accent' : 'text-muted'}`}
            >
              <ConsoleIcon name={name} />
              <span className="sr-only">{SIDEBAR_LABELS[name]}</span>
            </span>
          ))}
        </nav>

        <div className="min-w-0 flex-1 space-y-4 p-3 md:p-5">
          <Header view={view} />
          <Overview view={view} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start">
            <div className="min-w-0 space-y-4">
              <Tabs tab={tab} onChange={setTab} />
              <div role="tabpanel" id="console-panel-attempt" aria-labelledby="console-tab-attempt" hidden={tab !== 'attempt'}>
                <AttemptTab view={view} revealed={revealed} onReveal={onReveal} />
              </div>
              <div role="tabpanel" id="console-panel-webhooks" aria-labelledby="console-tab-webhooks" hidden={tab !== 'webhooks'}>
                <WebhooksTab view={view} display={display} revealed={revealed} />
              </div>
            </div>
            {view.media.length > 0 && <Media slots={view.media} erased={view.erased} />}
          </div>
        </div>
      </div>
    </section>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={label}
      onClick={() => {
        void navigator.clipboard
          ?.writeText(value)
          .then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => undefined);
      }}
      className="shrink-0 cursor-pointer rounded p-1 text-muted hover:bg-sunken hover:text-body"
    >
      <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
      <span className="sr-only">{copied ? 'Copied' : label}</span>
    </button>
  );
}

function Header({ view }: { view: ConsoleView }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <p className="text-sm text-muted">
        All verifications <span aria-hidden="true">/</span> <span className="font-medium text-ink">Verification details</span>
      </p>
      <p className="flex min-w-0 items-center gap-1 text-xs text-muted">
        <span className="font-medium">ID</span>
        <span className="truncate font-mono text-body">{view.id}</span>
        <CopyButton value={view.id} label="Copy verification ID" />
      </p>
      {view.sample && <Badge tone="warn">Sample</Badge>}
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className={dt}>{label}</dt>
      <dd className="mt-0.5 text-xs text-body">{children}</dd>
    </div>
  );
}

function Overview({ view }: { view: ConsoleView }) {
  const [showMetadata, setShowMetadata] = useState(false);
  const { overview } = view;
  return (
    <div className={card}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4 lg:grid-cols-6">
        <Field label="Status">
          <Badge tone={overview.status.tone}>{overview.status.label}</Badge>
        </Field>
        <Field label="Workspace">{overview.workspace}</Field>
        <Field label="URL" className="col-span-2 min-w-0">
          <span className="block truncate font-mono">{overview.url ?? '-'}</span>
        </Field>
        <Field label="External ID" className="col-span-2 min-w-0 sm:col-span-2">
          <span className="font-mono">{overview.externalId ?? '-'}</span>
          <span className="mt-0.5 block text-muted">In your console this links to the user in your app</span>
        </Field>
        <Field label="Metadata">
          {overview.metadata ? (
            <button type="button" onClick={() => setShowMetadata((v) => !v)} aria-expanded={showMetadata} className="text-accent underline">
              {showMetadata ? 'Hide' : 'Show'}
            </button>
          ) : (
            <span className="italic text-muted">(empty)</span>
          )}
        </Field>
        <Field label="Created">{overview.created}</Field>
        <Field label="Updated">{overview.updated}</Field>
      </dl>
      {showMetadata && overview.metadata && <pre className={jsonBlock}>{JSON.stringify(overview.metadata, null, 2)}</pre>}
    </div>
  );
}

type TabId = 'attempt' | 'webhooks';
const TAB_IDS: TabId[] = ['attempt', 'webhooks'];

/** Tabs with roving focus: arrow keys, Home and End move between them. */
function Tabs({ tab, onChange }: { tab: TabId; onChange: (next: TabId) => void }) {
  const refs = useRef<Record<TabId, HTMLButtonElement | null>>({ attempt: null, webhooks: null });
  const onKeyDown = (event: KeyboardEvent) => {
    const index = TAB_IDS.indexOf(tab);
    const next =
      event.key === 'ArrowRight' ? TAB_IDS[(index + 1) % TAB_IDS.length]
      : event.key === 'ArrowLeft' ? TAB_IDS[(index - 1 + TAB_IDS.length) % TAB_IDS.length]
      : event.key === 'Home' ? TAB_IDS[0]
      : event.key === 'End' ? TAB_IDS[TAB_IDS.length - 1]
      : null;
    if (next) {
      event.preventDefault();
      onChange(next);
      refs.current[next]?.focus();
    }
  };
  return (
    <div role="tablist" aria-label="Verification details" onKeyDown={onKeyDown} className="flex gap-1 border-b border-line">
      <TabButton id="attempt" active={tab === 'attempt'} onSelect={() => onChange('attempt')} buttonRef={(el) => (refs.current.attempt = el)}>
        Attempt 1
      </TabButton>
      <TabButton id="webhooks" active={tab === 'webhooks'} onSelect={() => onChange('webhooks')} buttonRef={(el) => (refs.current.webhooks = el)}>
        Webhooks
      </TabButton>
    </div>
  );
}

function TabButton({
  id,
  active,
  onSelect,
  buttonRef,
  children,
}: {
  id: TabId;
  active: boolean;
  onSelect: () => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      ref={buttonRef}
      id={`console-tab-${id}`}
      aria-selected={active}
      aria-controls={`console-panel-${id}`}
      tabIndex={active ? 0 : -1}
      onClick={onSelect}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${active ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-ink'}`}
    >
      {children}
    </button>
  );
}

function AttemptTab({ view, revealed, onReveal }: { view: ConsoleView; revealed: boolean; onReveal: () => void }) {
  const { attempt } = view;
  return (
    <div className="space-y-4">
      <div className={card}>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <Field label="Status">
            <Badge tone={attempt.status.tone}>{attempt.status.label}</Badge>
          </Field>
          <Field label="Created">{attempt.created}</Field>
          <Field label="Updated">{attempt.updated}</Field>
        </dl>
        <div className="mt-3 border-t border-line pt-2">
          <p className={dt}>Attempt ID</p>
          <p className="mt-0.5 flex items-center gap-1 font-mono text-xs text-body">
            <span className="truncate">{attempt.attemptId ?? '-'}</span>
            {attempt.attemptId && <CopyButton value={attempt.attemptId} label="Copy attempt ID" />}
          </p>
        </div>
        {attempt.failureReason && (
          <div className="mt-2 border-t border-line pt-2">
            <p className={dt}>Failure reason</p>
            <p className="mt-0.5 text-xs text-danger">{attempt.failureReason}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-start">
        {/* Left column: technical information with the MRZ under it, so Document data keeps its place. */}
        <div className="space-y-4">
          <div className={card}>
            <h3 className="text-sm font-medium text-ink">Technical information</h3>
          {view.technical.length ? (
            <dl className="mt-2 space-y-1.5">
              {view.technical.map((row) => (
                <div key={row.label}>
                  <dt className={dt}>{row.label}</dt>
                  <dd className="mt-0.5 break-words font-mono text-xs text-body">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-2 text-xs italic text-muted">{view.technicalEmpty}</p>
          )}
          </div>

          {view.mrz && (
            <div className={card}>
              <h3 className="text-sm font-medium text-ink">Machine readable data (MRZ)</h3>
              <pre className="mt-2 overflow-x-auto rounded bg-paper p-2 font-mono text-[11px] leading-5 text-body" aria-label="MRZ">
                {view.mrz.join('\n')}
              </pre>
            </div>
          )}
        </div>

        <div className="space-y-4">

        {view.estimation && (
          <div className={card}>
            <h3 className="text-sm font-medium text-ink">Age estimation</h3>
            <dl className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <dt className={dt}>Age threshold</dt>
                <dd className={`inline-flex items-center gap-1 text-xs font-medium ${view.estimation.passed === false ? 'text-danger' : view.estimation.passed ? 'text-ok' : 'text-muted'}`}>
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={view.estimation.passed ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'} />
                  </svg>
                  <span>{view.estimation.threshold}</span>
                  <span className="sr-only">{view.estimation.passed ? 'passed' : view.estimation.passed === false ? 'failed' : 'unknown'}</span>
                </dd>
              </div>
              {view.estimation.gender && (
                <div className="flex items-center justify-between gap-3">
                  <dt className={dt}>Gender</dt>
                  <dd className="text-xs text-body">{view.estimation.gender}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {view.document && (
          <div className={card}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-ink">Document data</h3>
              <button type="button" onClick={onReveal} aria-pressed={revealed} className="text-xs text-accent underline">
                {revealed ? 'Hide' : 'Reveal'}
              </button>
            </div>
            <dl className="mt-2 space-y-1.5">
              {view.document.map((row) => (
                <div key={row.label}>
                  <dt className={dt}>{row.label}</dt>
                  <dd className="mt-0.5 whitespace-pre-line break-words font-mono text-xs text-body">
                    {row.value ?? <span className="font-sans italic text-muted">Not printed</span>}
                    {row.value && <ExpiryMark expiry={row.expiry} />}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        </div>

      </div>
    </div>
  );
}

function WebhooksTab({ view, display, revealed }: { view: ConsoleView; display: DemoDisplay; revealed: boolean }) {
  const receipt = display.receipt;
  const payload = receipt && (revealed || receipt.maskAll ? receipt.payload : maskForDisplay(receipt.payload));
  return (
    <div className={`${card} space-y-3`}>
      <h3 className="text-sm font-medium text-ink">Webhook deliveries</h3>
      {view.webhook ? (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-sunken text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">Code</th>
                  <th scope="col" className="px-3 py-2 font-medium">Time</th>
                  <th scope="col" className="px-3 py-2 font-medium">Status</th>
                  <th scope="col" className="px-3 py-2 font-medium">Delivery ID</th>
                  <th scope="col" className="px-3 py-2 font-medium">Signed</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-line">
                  <td className="px-3 py-2"><Badge tone="ok">200</Badge></td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted">{new Date(view.webhook.receivedAt).toLocaleTimeString('en-GB')}</td>
                  <td className="px-3 py-2"><Badge tone={view.overview.status.tone}>{view.overview.status.label}</Badge></td>
                  <td className="px-3 py-2 font-mono text-body">{view.webhook.deliveryId ?? '-'}</td>
                  <td className="px-3 py-2 text-body">{view.webhook.signed ? 'Yes' : 'No, sample payload'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {payload && (
            <pre className={jsonBlock} tabIndex={0} aria-label="Webhook JSON">
              {JSON.stringify(payload, null, 2)}
            </pre>
          )}
        </>
      ) : (
        <p className="text-xs italic text-muted">No webhook delivered yet.</p>
      )}
    </div>
  );
}

function Media({ slots, erased }: { slots: MediaSlot[]; erased: boolean }) {
  const [index, setIndex] = useState(0);
  const current = slots[Math.min(index, slots.length - 1)];
  const step = (delta: number) => setIndex((i) => (i + delta + slots.length) % slots.length);
  // A swipe (or a drag with the mouse) switches files, as people try it on a photo anyway.
  const swipeFrom = useRef<number | null>(null);
  const SWIPE_PX = 40;
  return (
    <div className={`${card} lg:sticky lg:top-4`}>
      <h3 className="text-sm font-medium text-ink">Media</h3>
      <p className="mt-0.5 text-xs text-muted">Use the arrows or swipe to switch between media files.</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-medium text-body">{current.label}</span>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous media" disabled={slots.length < 2} onClick={() => step(-1)} className="rounded-full border border-line p-2 text-body hover:bg-paper disabled:opacity-50">
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-xs text-muted">
            {Math.min(index, slots.length - 1) + 1} / {slots.length}
          </span>
          <button type="button" aria-label="Next media" disabled={slots.length < 2} onClick={() => step(1)} className="rounded-full border border-line p-2 text-body hover:bg-paper disabled:opacity-50">
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
      <div
        className="mt-3 flex h-[320px] touch-pan-y select-none items-center justify-center overflow-hidden rounded-lg border border-line bg-paper sm:h-[380px]"
        onPointerDown={(event) => {
          swipeFrom.current = event.clientX;
        }}
        onPointerUp={(event) => {
          const from = swipeFrom.current;
          swipeFrom.current = null;
          if (from !== null && slots.length > 1 && Math.abs(event.clientX - from) >= SWIPE_PX) {
            step(event.clientX < from ? 1 : -1);
          }
        }}
        onPointerCancel={() => {
          swipeFrom.current = null;
        }}
      >
        {current.src ? (
          // eslint-disable-next-line @next/next/no-img-element -- own-photo stream from a no-store route; nothing to optimise
          <img key={current.src} src={current.src} alt={current.label} draggable={false} className="pointer-events-none h-full w-full object-contain" />
        ) : (
          <div className="p-4 text-center">
            <p className="text-sm font-medium text-ink">{erased ? 'Deleted' : 'No longer stored'}</p>
            <p className="mt-1 text-xs text-muted">
              {erased ? 'The demo erased this check’s personal data in ProofAge after you saw the result.' : 'This file was removed after its retention period.'}
            </p>
          </div>
        )}
      </div>
      <div className="mt-3 flex justify-center gap-1.5" role="group" aria-label="Choose a media file">
        {slots.map((slot, i) => (
          <button
            key={`${slot.label}-${i}`}
            type="button"
            aria-label={`Show ${slot.label}`}
            aria-current={i === Math.min(index, slots.length - 1)}
            onClick={() => setIndex(i)}
            className={`size-2.5 rounded-full ${i === Math.min(index, slots.length - 1) ? 'bg-accent' : 'bg-line-strong'}`}
          />
        ))}
      </div>
    </div>
  );
}
