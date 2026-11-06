'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { CHECKS, LOOKS } from '@/lib/demo-pages';
import type { Check, Look } from '@/lib/demo-pages';

const SCREENS: Record<Check, [string, string, string]> = {
  selfie: ['Start and consent screen', 'Selfie screen', 'Result screen'],
  'age-id': ['Start and consent screen', 'Front of the ID screen', 'Selfie screen'],
  kyc: ['Start and consent screen', 'Front of the ID screen', 'Selfie screen'],
};

const CAPTIONS: Record<Check, string> = {
  selfie: 'A selfie, about 1 minute, no document*',
  'age-id': 'An ID and a selfie, about 2 minutes',
  kyc: 'An ID and a selfie, about 2 minutes',
};

/** Real screenshots of the widget: three phones, the middle one larger and in front. */
export function FlowPreview({ check, look }: { check: Check; look: Look }) {
  // Switching Check or Look should swap all three phones at once, not leave the side ones blank while
  // they load: fetch every screen (18 small webp files) once the page is idle.
  useEffect(() => {
    const load = () => {
      for (const c of CHECKS) for (const l of LOOKS) for (const n of [1, 2, 3]) new window.Image().src = screenSrc(c, l, n);
    };
    const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 1500));
    idle(load);
  }, []);
  return (
    <figure aria-label="What your users see">
      <div className="flex items-center justify-center">
        {SCREENS[check].map((alt, index) => {
          const middle = index === 1;
          return (
            <div
              key={`${check}-${look}-${index}`}
              className={`overflow-hidden rounded-[1.75rem] border-[5px] border-ink bg-surface shadow-float ${
                middle ? 'relative z-10 -mx-3 w-[38%] max-w-[210px] sm:-mx-4' : 'w-[30%] max-w-[170px]'
              }`}
            >
              <Image
                src={screenSrc(check, look, index + 1)}
                alt={`${alt}, ${look === 'lumo' ? 'with the Lumo look' : 'with the ProofAge look'}`}
                width={390}
                height={844}
                unoptimized
                className="block h-auto w-full"
                priority={middle}
              />
            </div>
          );
        })}
      </div>
      <figcaption className="mt-4 text-center text-sm text-muted">
        {CAPTIONS[check]}
        {look === 'lumo' && <> · shown as Lumo, a brand we made up</>}
      </figcaption>
    </figure>
  );
}

/** The files are already sized and compressed; served as they are, so the preload above hits the same URL. */
function screenSrc(check: Check, look: Look, n: number): string {
  return `/flow/${check}-${look}-${n}.webp`;
}
