import Link from 'next/link';
import type { ReactNode } from 'react';
import { Footer } from '@/components/Footer';

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold text-ink">
            <svg viewBox="0 0 64 64" aria-hidden="true" className="size-6">
              <rect width="64" height="64" rx="12" fill="#0f1a16" />
              <rect x="20" y="20" width="24" height="24" fill="#159068" />
            </svg>
            <span>
              ProofAge <span className="font-normal text-muted">live demo</span>
            </span>
          </Link>
          <a href="https://proofage.net" className="text-sm text-muted hover:text-ink">
            proofage.net
          </a>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-10 md:px-8">{children}</main>
      <Footer />
    </div>
  );
}
