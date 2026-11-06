'use client';

import { useSearchParams } from 'next/navigation';

/** /result with no cookies (a phone after the QR handoff) lands here with ?result=elsewhere. */
export function ElsewhereNotice() {
  const params = useSearchParams();
  if (params.get('result') !== 'elsewhere') {
    return null;
  }
  return (
    <p role="status" className="mx-auto mt-6 max-w-2xl rounded-md bg-accent-tint px-4 py-3 text-sm text-ink">
      Your result is on the device where you started.
    </p>
  );
}
