import { Suspense } from 'react';
import { HomeFlow } from '@/components/flow/HomeFlow';
import { ElsewhereNotice } from '@/components/ElsewhereNotice';
import { SiteShell } from '@/components/SiteShell';
import { parseOptions } from '@/lib/demo-options';
import { HOME_PATH } from '@/lib/demo-pages';
import { publicKeysFor } from '@/lib/proofage';

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const initial = parseOptions(await searchParams);
  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl md:text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">ProofAge verification demo</h1>
        <p className="mt-3 text-body">Run the check your users will go through, on yourself. Then see what your system gets back and what your team sees.</p>
      </div>
      <Suspense fallback={null}>
        <ElsewhereNotice />
      </Suspense>
      <HomeFlow initial={initial} apiKeys={publicKeysFor(HOME_PATH)} />
    </SiteShell>
  );
}
