'use client';

import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { LoadedResult } from '@/lib/demo-result';
import type { DemoSlug } from '@/lib/demo-pages';

const AUTO_CLOSE_DELAY_MS = 800;
const POLL_INTERVAL_MS = 3000;
const POLL_LIMIT_MS = 20 * 60 * 1000;

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

  const pollTimerRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  /**
   * New tab mode: the original tab may never get onComplete (a blocked tab opens through the
   * SDK's link overlay), so ask the server until the check has left "not finished".
   */
  const pollUntilFinished = useCallback(() => {
    stopPolling();
    const startedAt = Date.now();
    const tick = async () => {
      pollTimerRef.current = null;
      if (Date.now() - startedAt > POLL_LIMIT_MS) {
        return;
      }
      try {
        const response = await fetch('/api/demo-session', { cache: 'no-store' });
        if (response.ok) {
          const result = (await response.json()) as LoadedResult;
          if (result.kind === 'ok' && result.view.state !== 'not_finished') {
            router.push('/result');
            return;
          }
        }
      } catch {
        // The next tick retries.
      }
      pollTimerRef.current = window.setTimeout(tick, POLL_INTERVAL_MS);
    };
    pollTimerRef.current = window.setTimeout(tick, POLL_INTERVAL_MS);
  }, [router, stopPolling]);

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
        stopPolling();
        setBusy(false);
        window.setTimeout(closeVerifyTab, AUTO_CLOSE_DELAY_MS);
        router.push('/result');
      });
      window.KycService.onClose(() => {
        stopPolling();
        setBusy(false);
      });
      window.KycService.onError((err: unknown) => {
        stopPolling();
        setBusy(false);
        const message =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Verification failed';
        onErrorMessageRef.current(message);
      });
    },
    [apiKey, apiUrl, closeVerifyTab, router, stopPolling],
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
      if (openInNewTabRef.current) {
        pollUntilFinished();
      }
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
      <Script src={sdkUrl} strategy="afterInteractive" onReady={configureSdk} />

      <div className="mb-5 flex items-center justify-center gap-3">
        <span className="text-[10px] uppercase tracking-[0.15em] text-ember-smoke">Open verification in:</span>
        <div className="flex overflow-hidden border border-ember-smoke/30 text-[10px] uppercase tracking-[0.15em]">
          <button
            type="button"
            disabled={busy}
            onClick={() => handleToggle(true)}
            className={`px-3 py-1.5 transition disabled:cursor-not-allowed disabled:opacity-50 ${
              openInNewTab
                ? 'bg-ember-amber/20 text-ember-amber-light'
                : 'text-ember-smoke hover:text-ember-cream'
            }`}
          >
            New tab
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleToggle(false)}
            className={`px-3 py-1.5 transition disabled:cursor-not-allowed disabled:opacity-50 ${
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
