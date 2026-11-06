import type { ExpiryMarker } from '@/lib/document-expiry';

/** " – ✓ Valid" / " – ⓧ Expired" after the expiry date, as in the ProofAge console. */
export function ExpiryMark({ expiry }: { expiry: ExpiryMarker | null | undefined }) {
  if (!expiry) {
    return null;
  }
  const expired = expiry === 'expired';
  return (
    <span className="whitespace-nowrap font-sans">
      <span className="mx-1.5 text-muted" aria-hidden="true">
        –
      </span>
      <span className={`inline-flex items-center gap-1 align-[-0.15em] ${expired ? 'text-danger' : 'text-ok'}`} title="Compared against today’s date">
        <svg className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d={expired ? 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'}
          />
        </svg>
        {expired ? 'Expired' : 'Valid'}
      </span>
    </span>
  );
}
