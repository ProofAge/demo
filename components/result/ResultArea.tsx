'use client';

import { useEffect, useRef, useState } from 'react';
import { useDemo } from '@/components/demo/DemoProvider';
import { ConsoleReplica } from '@/components/result/ConsoleReplica';
import { WhatYouGet } from '@/components/result/WhatYouGet';

/** Appears below the Start button and scrolls into view; each new result replaces the previous one. */
export function ResultArea() {
  const { display } = useDemo();
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const key = display?.key ?? null;

  useEffect(() => {
    setRevealed(false);
    if (key && ref.current) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      ref.current.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
  }, [key]);

  if (!display) {
    return null;
  }
  return (
    <div ref={ref} className="mt-12 scroll-mt-4 space-y-12" data-testid="result">
      <WhatYouGet display={display} revealed={revealed} onReveal={() => setRevealed((v) => !v)} />
      <ConsoleReplica key={display.key} display={display} revealed={revealed} onReveal={() => setRevealed((v) => !v)} />
    </div>
  );
}
