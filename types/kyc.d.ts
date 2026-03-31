export interface KycResult {
  success: boolean;
  sessionId: string;
  verificationId?: string | null;
  status: 'completed' | 'pending' | 'failed';
  redirectUrl?: string | null;
  data?: unknown;
}

export interface KycServiceConfig {
  apiUrl: string;
  apiKey: string;
  theme?: 'light' | 'dark';
  language?: string;
  containerId?: string;
  openInNewTab?: boolean;
  metadata?: Record<string, unknown>;
}

export interface KycServiceGlobal {
  init: (config: KycServiceConfig) => void;
  start: () => Promise<void>;
  onComplete: (callback: (result: KycResult) => void) => void;
  onError: (callback: (error: unknown) => void) => void;
  /** Dismisses the popup / iframe widget (call after success to return to the host page). */
  close?: () => void;
}

declare global {
  interface Window {
    KycService?: KycServiceGlobal;
  }
}

export {};
