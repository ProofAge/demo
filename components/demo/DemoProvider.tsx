'use client';

import Script from 'next/script';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DemoPage, Opens, WorkspaceSlug } from '@/lib/demo-pages';
import { pollMode, toDisplay, type DemoDisplay, type PollMode, type Sample } from '@/lib/demo-display';
import type { DemoState, LoadedResult } from '@/lib/demo-result';
import { lookOf } from '@/lib/demo-pages';
import { resolveStart, startPanel, type StartPanel } from '@/lib/start-panel';

const POLL_INTERVAL_MS = 1000;
/** How long each kind of polling may run (see `pollMode`). */
const POLL_LIMITS_MS: Record<PollMode, number> = { person: 20 * 60 * 1000, decision: 20 * 60 * 1000, webhook: 30 * 1000 };
const AUTO_CLOSE_DELAY_MS = 800;
const API_URL = process.env.NEXT_PUBLIC_PROOFAGE_API_URL ?? 'https://api.proofage.net/v1';
const SDK_URL = process.env.NEXT_PUBLIC_PROOFAGE_SDK_URL ?? 'https://app.proofage.net/sdk-build/kyc-loader.js';

type DemoContextValue = {
  display: DemoDisplay | null;
  panel: StartPanel;
  error: string | null;
  /** The hosted verification URL, where the person can still go back in. */
  continueUrl: string | null;
  start: (slug: WorkspaceSlug, opens: Opens) => void;
  /** Starts again with the same check, look and way of opening; `current` is used when nothing was started since the page loaded. */
  startOver: (current: { slug: WorkspaceSlug; opens: Opens }) => void;
  /** The person went back into the check in another tab. */
  watch: () => void;
  showSample: (sample: Sample) => void;
  dismissError: () => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

export function useDemo(): DemoContextValue {
  const value = useContext(DemoContext);
  if (!value) {
    throw new Error('useDemo needs a <DemoProvider>');
  }
  return value;
}

type DemoProviderProps = {
  page: DemoPage;
  /** Public keys only, one per workspace this page may start. */
  apiKeys: Partial<Record<WorkspaceSlug, string>>;
  /** The EUDI page opens the widget on the digital ID wallet. */
  method?: 'wallet';
  children: ReactNode;
};

/**
 * One per page: loads the SDK, creates sessions on the server, restores and polls the result
 * for this page, and holds the sample the visitor chose. The page never navigates away.
 */
export function DemoProvider({ page, apiKeys, method, children }: DemoProviderProps) {
  const [live, setLive] = useState<LoadedResult | null>(null);
  const [sample, setSample] = useState<Sample | null>(null);
  const [creating, setCreating] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [watching, setWatching] = useState(false);
  const [newTab, setNewTab] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [started, setStarted] = useState<{ look: 'proofage' | 'lumo'; opens: Opens } | null>(null);
  const verifyTabRef = useRef<Window | null>(null);
  const lastStart = useRef<{ slug: WorkspaceSlug; opens: Opens } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/demo-session?page=${encodeURIComponent(page)}`, { cache: 'no-store' });
      if (response.ok) {
        const next = (await response.json()) as LoadedResult;
        if (next.kind !== 'error') {
          setLive(next);
        }
      }
    } catch {
      // Keep the last result; the next poll retries.
    }
  }, [page]);

  // Back from a new tab, the /result redirect or a reload: show the result in place.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const mode = pollMode(live, watching);

  useEffect(() => {
    if (!mode) {
      return;
    }
    const startedAt = Date.now();
    let timer: number | undefined;
    let cancelled = false;
    const tick = async () => {
      if (Date.now() - startedAt > POLL_LIMITS_MS[mode]) {
        if (mode !== 'webhook') {
          setTimedOut(true);
          setWatching(false);
        }
        return;
      }
      await refresh();
      if (!cancelled) {
        timer = window.setTimeout(tick, POLL_INTERVAL_MS);
      }
    };
    timer = window.setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mode, refresh]);

  // A tab has no onClose: notice that the person closed it and stop waiting.
  useEffect(() => {
    if (!newTab || !watching) {
      return;
    }
    const timer = window.setInterval(() => {
      const tab = verifyTabRef.current;
      if (tab && tab.closed) {
        verifyTabRef.current = null;
        setWatching(false);
        void refresh();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [newTab, watching, refresh]);

  // Coming back from the other tab: look again right away instead of waiting for the next poll.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  const closeVerifyTab = useCallback(() => {
    try {
      window.KycService?.close?.();
    } catch {
      // The widget may already be gone.
    }
    if (verifyTabRef.current && !verifyTabRef.current.closed) {
      verifyTabRef.current.close();
    }
    verifyTabRef.current = null;
  }, []);

  const latest = useRef({ refresh, closeVerifyTab });
  latest.current = { refresh, closeVerifyTab };

  const createSession = async (slug: WorkspaceSlug): Promise<string> => {
    const response = await fetch('/api/demo-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, page }),
    });
    const body = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
    if (!response.ok || !body?.url) {
      throw new Error(body?.error ?? 'Could not start the verification. Please try again.');
    }
    return body.url;
  };

  const start = async (slug: WorkspaceSlug, opens: Opens) => {
    const sdk = window.KycService;
    const apiKey = apiKeys[slug];
    if (!sdkReady || !sdk || !apiKey) {
      setError('The verification widget is still loading. Try again in a moment.');
      return;
    }
    lastStart.current = { slug, opens };
    // Phones always get a new tab, which the polling was built for.
    const openInNewTab = opens === 'tab' || window.matchMedia('(max-width: 767px)').matches;
    setSample(null);
    setError(null);
    setTimedOut(false);
    setNewTab(openInNewTab);
    setStarted({ look: lookOf(slug), opens: openInNewTab ? 'tab' : 'popup' });
    setCreating(true);

    sdk.init({
      apiUrl: API_URL,
      apiKey,
      theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      language: 'en',
      openInNewTab,
      ...(method ? { method } : {}),
    });
    sdk.onComplete(() => {
      setPopupOpen(false);
      window.setTimeout(() => latest.current.closeVerifyTab(), AUTO_CLOSE_DELAY_MS);
      void latest.current.refresh();
    });
    sdk.onClose(() => {
      setPopupOpen(false);
      setWatching(false);
      void latest.current.refresh();
    });
    sdk.onError((err: unknown) => {
      setPopupOpen(false);
      setError(err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Verification failed');
    });

    const originalOpen = window.open.bind(window);
    // The SDK opens its tab synchronously inside start(), but start() runs after the session request
    // below, outside the tap: Safari would block it. Open the tab now, while the tap still counts, and
    // hand it to the SDK when it asks.
    let preOpened = openInNewTab ? originalOpen('about:blank', '_blank') : null;
    if (openInNewTab) {
      window.open = (...args: Parameters<typeof window.open>) => {
        const opened = preOpened && !preOpened.closed ? preOpened : originalOpen(...args);
        preOpened = null;
        verifyTabRef.current = opened;
        return opened;
      };
    }
    try {
      const verificationUrl = await createSession(slug);
      // The new session exists: only now does the previous result make way for it.
      setLive(null);
      setWatching(true);
      setPopupOpen(!openInNewTab);
      void refresh();
      await sdk.start({ verificationUrl });
    } catch (e) {
      setPopupOpen(false);
      setError(e instanceof Error ? e.message : 'Failed to start verification');
    } finally {
      // Not handed to the SDK (the session could not be created): do not leave a blank tab behind.
      if (preOpened && !preOpened.closed) {
        preOpened.close();
      }
      window.open = originalOpen;
      setCreating(false);
    }
  };

  const state: DemoState | null = live?.kind === 'ok' ? live.view.state : null;
  const display = useMemo(
    () => toDisplay(live, sample, { now: new Date(), started: started && { look: started.look, opens: started.opens } }),
    [live, sample, started],
  );
  // The widget may stay open on its "complete" screen after the decision: the page is past it.
  useEffect(() => {
    if (popupOpen && state && state !== 'not_finished') {
      setPopupOpen(false);
    }
  }, [popupOpen, state]);
  const panel = startPanel({ busy: creating || popupOpen, newTab, watching, timedOut, sdkReady, state });

  const value: DemoContextValue = {
    display,
    panel,
    error,
    continueUrl: live?.kind === 'ok' ? live.view.continueUrl : null,
    start: (slug, opens) => void start(slug, opens),
    startOver: (current) => {
      const target = resolveStart(lastStart.current, current);
      void start(target.slug, target.opens);
    },
    watch: () => {
      // Going back in through the link opens a tab this page does not track.
      verifyTabRef.current = null;
      setWatching(true);
    },
    showSample: (next) => setSample(next),
    dismissError: () => setError(null),
  };

  return (
    <DemoContext.Provider value={value}>
      <Script src={SDK_URL} strategy="afterInteractive" onReady={() => setSdkReady(true)} />
      {children}
    </DemoContext.Provider>
  );
}
