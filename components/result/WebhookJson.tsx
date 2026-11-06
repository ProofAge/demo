'use client';

import type { DemoDisplay } from '@/lib/demo-display';
import { maskForDisplay } from '@/lib/redaction';

export const jsonBlock =
  'mt-2 max-h-[28rem] overflow-auto rounded-md border border-inverse-line bg-inverse p-4 font-mono text-xs leading-relaxed text-on-inverse';

/** The webhook payload as this demo received it, with the document number and address masked until Reveal. */
export function WebhookJson({ display, revealed, onReveal }: { display: DemoDisplay; revealed: boolean; onReveal: () => void }) {
  const { receipt } = display;
  if (!receipt) {
    return (
      <p className="mt-2 text-muted">
        {display.storage
          ? 'The webhook arrives a moment after the decision. It will appear here.'
          : 'Webhook storage is not configured on this deployment.'}
      </p>
    );
  }
  const maskable = !receipt.maskAll && Boolean(receipt.payload.document);
  const payload = revealed || receipt.maskAll ? receipt.payload : maskForDisplay(receipt.payload);
  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">
          {display.sample ? 'Sample payload, not signed.' : 'The signed payload, as this demo’s server received it.'}
          {maskable && ' The document number and address are masked here; the API returns them in full.'}
        </p>
        {maskable && (
          <button type="button" onClick={onReveal} aria-pressed={revealed} className="text-sm text-accent underline underline-offset-4">
            {revealed ? 'Hide' : 'Reveal'}
          </button>
        )}
      </div>
      <pre className={jsonBlock} tabIndex={0} aria-label="Webhook JSON">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
}
