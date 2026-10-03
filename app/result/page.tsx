import type { Metadata } from 'next';
import { ResultScreen } from '@/components/ResultScreen';
import { loadResult } from '@/lib/demo-session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your result',
  robots: { index: false, follow: false },
};

export default async function ResultPage() {
  return <ResultScreen initial={await loadResult()} />;
}
