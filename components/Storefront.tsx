'use client';

import { type ReactNode, useState } from 'react';
import { Footer } from '@/components/Footer';
import { Hero, type HeroCopy } from '@/components/Hero';
import type { DemoSlug } from '@/lib/demo-pages';

type StorefrontProps = {
  slug: DemoSlug;
  /** Public key of the demo's workspace, for the browser SDK's init(). */
  apiKey: string;
  copy: HeroCopy;
  /** Rendered below the storefront, above the footer. */
  children?: ReactNode;
};

export function Storefront({ slug, apiKey, copy, children }: StorefrontProps) {
  const [banner, setBanner] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_PROOFAGE_API_URL ?? 'https://api.proofage.net/v1';
  const sdkUrl = process.env.NEXT_PUBLIC_PROOFAGE_SDK_URL ?? 'https://app.proofage.net/sdk-build/kyc-loader.js';

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-ember-dark">
      <header className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 py-8 md:px-16">
        <div className="font-[family-name:var(--font-display)] text-lg font-light uppercase tracking-[0.35em] text-ember-cream">
          Ember <span className="text-ember-amber">Box</span>
        </div>
        <div className="border border-ember-smoke/30 px-4 py-1.5 text-[10px] uppercase tracking-[0.2em] text-ember-smoke">
          Members only
        </div>
      </header>

      {banner && (
        <div className="bg-red-950/80 px-4 py-3 text-center text-sm text-red-200">
          {banner}
          <button type="button" aria-label="Dismiss error" className="ml-3 underline" onClick={() => setBanner(null)}>
            Dismiss
          </button>
        </div>
      )}

      <main className="flex min-h-0 flex-1 flex-col">
        <Hero
          slug={slug}
          apiUrl={apiUrl}
          apiKey={apiKey}
          sdkUrl={sdkUrl}
          copy={copy}
          onErrorMessage={(message) => setBanner(message)}
        />
      </main>

      {children}

      <Footer />
    </div>
  );
}
