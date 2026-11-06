'use client';

import type { ReactNode } from 'react';
import {
  CHECK_LABELS,
  CHECK_SHORT_LABELS,
  CHECK_YOU_GET,
  CHECK_NOTE,
  LOOK_LABELS,
  LOOK_LINE,
  OPENS_LABELS,
  OPENS_LINE,
  PHONE_LINE,
  type DemoOptions,
} from '@/lib/demo-options';
import { LOOKS, OPENS, type Check } from '@/lib/demo-pages';

/** Fullest check first. */
const CHECK_ORDER: readonly Check[] = ['kyc', 'age-id', 'selfie'];
import { surfaceCard } from '@/components/ui';

function Segmented<T extends string>({
  name,
  legend,
  values,
  labels,
  shortLabels,
  value,
  onChange,
  disabled,
  swatch,
  describedBy,
}: {
  name: string;
  legend: string;
  values: readonly T[];
  labels: Record<T, string>;
  /** Shown instead of `labels` on narrow phones. */
  shortLabels?: Record<T, string>;
  value: T;
  onChange: (next: T) => void;
  disabled: boolean;
  swatch?: Record<T, string>;
  /** Id of the line that explains the current value. */
  describedBy: string;
}) {
  return (
    <fieldset disabled={disabled} aria-describedby={describedBy} className="min-w-0">
      <legend className="mb-1.5 text-sm font-medium text-ink">{legend}</legend>
      <div className="flex w-full rounded-md border border-control bg-surface p-0.5">
        {values.map((option) => (
          <label key={option} className="flex min-w-0 flex-1">
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="peer sr-only"
            />
            <span className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded px-2 py-2 text-center text-sm font-medium text-body transition-colors peer-checked:bg-accent peer-checked:text-on-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-disabled:cursor-not-allowed peer-disabled:opacity-60 hover:bg-sunken peer-checked:hover:bg-accent">
              {swatch && <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full ring-1 ring-white/60" style={{ background: swatch[option] }} />}
              {shortLabels ? (
                <>
                  <span className="sm:hidden">{shortLabels[option]}</span>
                  <span className="max-sm:hidden">{labels[option]}</span>
                </>
              ) : (
                labels[option]
              )}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Row({ children, hint, id, className = '' }: { children: ReactNode; hint: ReactNode; id: string; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {children}
      <p id={id} className="text-sm text-muted">
        {hint}
      </p>
    </div>
  );
}

/** Check, how it opens, which look: three rows of equal weight, nothing collapsed. */
export function OptionsCard({ options, onChange, disabled }: { options: DemoOptions; onChange: (next: DemoOptions) => void; disabled: boolean }) {
  return (
    <section aria-label="Session options" className={`${surfaceCard} space-y-5 p-4 md:p-5`}>
      <Row id="hint-check" hint={<CheckHint check={options.check} />}>
        <Segmented name="check" legend="Which flow to try" values={CHECK_ORDER} labels={CHECK_LABELS} shortLabels={CHECK_SHORT_LABELS} value={options.check} onChange={(check) => onChange({ ...options, check })} disabled={disabled} describedBy="hint-check" />
      </Row>
      <Row id="hint-opens" className="hidden md:block" hint={OPENS_LINE}>
        <Segmented name="opens" legend="Opens" values={OPENS} labels={OPENS_LABELS} value={options.opens} onChange={(opens) => onChange({ ...options, opens })} disabled={disabled} describedBy="hint-opens" />
      </Row>
      <p className="text-sm text-muted md:hidden">{PHONE_LINE}</p>
      <Row id="hint-look" hint={LOOK_LINE}>
        <Segmented
          name="look"
          legend="Look"
          values={LOOKS}
          labels={LOOK_LABELS}
          value={options.look}
          onChange={(look) => onChange({ ...options, look })}
          disabled={disabled}
          swatch={{ proofage: '#0b6e4f', lumo: '#3052B9' }}
          describedBy="hint-look"
        />
      </Row>
    </section>
  );
}

/**
 * The line under the check tabs. Every check's line sits in the same grid cell and only the chosen
 * one is visible, so the cell is always as tall as the longest: switching never moves the card.
 */
function CheckHint({ check }: { check: Check }) {
  return (
    <span className="grid">
      {CHECK_ORDER.map((c) => (
        <span key={c} aria-hidden={c !== check} className={`[grid-area:1/1] ${c === check ? '' : 'invisible'}`}>
          {CHECK_YOU_GET[c]}
          {CHECK_NOTE[c] && <span className="mt-1 block">{CHECK_NOTE[c]}</span>}
        </span>
      ))}
    </span>
  );
}
