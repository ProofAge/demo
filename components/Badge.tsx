import type { ReactNode } from 'react';
import { badgeBase, badgeTone } from '@/components/ui';
import type { Tone } from '@/lib/summary';

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`${badgeBase} ${badgeTone[tone]}`}>{children}</span>;
}
