'use client';

import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useCallback, useRef, useState } from 'react';
import type { DemoSlug } from '@/lib/demo-pages';

const AUTO_CLOSE_DELAY_MS = 800;

type VerifyButtonProps = {
  slug: DemoSlug;
  apiUrl: string;
  apiKey: string;
  sdkUrl: string;
  onErrorMessage: (message: string) => void;
};

export function VerifyButton({ slug, apiUrl, apiKey, sdkUrl, onErrorMessage }: VerifyButtonProps) {
  const router = useRouter();
  const [sdkReady, setSdkReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [openInNewTab, setOpenInNewTab] = useState(false);
  const openInNewTabRef = useRef(openInNewTab);
  openInNewTabRef.current = openInNewTab;
  const verifyTabRef = useRef<Window | null>(null);

  const onErrorMessageRef = useRef(onErrorMessage);
  onErrorMessageRef.current = onErrorMessage;

  const closeVerifyTab = useCallback(() => {
    try { window.KycService?.close?.(); } catch { /* noop */ }
    if (verifyTabRef.current && !verifyTabRef.current.closed) {
      verifyTabRef.current.close();
      verifyTabRef.current = null;
    }
  }, []);

  const initSdk = useCallback(
    (newTab: boolean) => {
      if (typeof window === 'undefined' || !window.KycService) {
        return;
      }
      window.KycService.init({
        apiUrl,
        apiKey,
        theme: 'dark',
        language: 'en',
        openInNewTab: newTab,
      });
      window.KycService.onComplete(() => {
        setBusy(false);
        window.setTimeout(closeVerifyTab, AUTO_CLOSE_DELAY_MS);
        router.push('/result');
      });
      window.KycService.onError((err: unknown) => {
        setBusy(false);
        const message =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Verification failed';
        onErrorMessageRef.current(message);
      });
    },
    [apiKey, apiUrl, closeVerifyTab, router],
  );

  const configureSdk = useCallback(() => {
    initSdk(openInNewTabRef.current);
    setSdkReady(true);
  }, [initSdk]);

  const handleToggle = (newTab: boolean) => {
    setOpenInNewTab(newTab);
    openInNewTabRef.current = newTab;
    if (sdkReady) {
      initSdk(newTab);
    }
  };

  const createSession = async (): Promise<string> => {
    const response = await fetch('/api/demo-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    });
    const body = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
    if (!response.ok || !body?.url) {
      throw new Error(body?.error ?? 'Could not start the verification. Please try again.');
    }
    return body.url;
  };

  const handleClick = async () => {
    if (!sdkReady || !window.KycService) {
      onErrorMessageRef.current('SDK is still loading. Please wait.');
      return;
    }
    setBusy(true);

    const origOpen = window.open.bind(window);
    if (openInNewTabRef.current) {
      window.open = (...args: Parameters<typeof window.open>) => {
        const opened = origOpen(...args);
        verifyTabRef.current = opened;
        return opened;
      };
    }
    try {
      const verificationUrl = await createSession();
      await window.KycService.start({ verificationUrl });
    } catch (e) {
      setBusy(false);
      onErrorMessageRef.current(e instanceof Error ? e.message : 'Failed to start verification');
    } finally {
      window.open = origOpen;
    }
  };

  const missingConfig = !apiUrl || !apiKey || !sdkUrl;

  return (
    <div className="w-full">
      <Script src={sdkUrl} strategy="afterInteractive" onLoad={configureSdk} />

      <div className="mb-5 flex items-center justify-center gap-3">
        <span className="text-[10px] uppercase tracking-[0.15em] text-ember-smoke">Open verification in:</span>
        <div className="flex overflow-hidden border border-ember-smoke/30 text-[10px] uppercase tracking-[0.15em]">
          <button
            type="button"
            onClick={() => handleToggle(true)}
            className={`px-3 py-1.5 transition ${
              openInNewTab
                ? 'bg-ember-amber/20 text-ember-amber-light'
                : 'text-ember-smoke hover:text-ember-cream'
            }`}
          >
            New tab
          </button>
          <button
            type="button"
            onClick={() => handleToggle(false)}
            className={`px-3 py-1.5 transition ${
              !openInNewTab
                ? 'bg-ember-amber/20 text-ember-amber-light'
                : 'text-ember-smoke hover:text-ember-cream'
            }`}
          >
            Popup
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleClick}
        disabled={busy || missingConfig || !sdkReady}
        className="relative w-full overflow-hidden border-none bg-ember-amber py-[18px] font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.25em] text-ember-dark transition hover:shadow-[0_8px_32px_rgba(200,134,42,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="relative z-10">{busy ? 'Starting…' : 'Verify my age'}</span>
      </button>
      {missingConfig && (
        <p className="mt-3 text-center text-[11px] text-ember-smoke">
          This demo is not configured. Set NEXT_PUBLIC_PROOFAGE_API_URL, NEXT_PUBLIC_PROOFAGE_SDK_URL and PROOFAGE_DEMO_WORKSPACES.
        </p>
      )}
    </div>
  );
}
