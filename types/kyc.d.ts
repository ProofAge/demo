/** Passed to onComplete when the person reaches the final screen. It carries no outcome: ask the backend. */
export interface KycResult {
  verificationId: string;
  /** @deprecated Same value as verificationId. */
  sessionId: string;
}

export interface KycStartOptions {
  /** URL of a verification created server-side (`url` from POST /v1/verifications). */
  verificationUrl?: string;
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
  start: (options?: KycStartOptions) => Promise<void>;
  onComplete: (callback: (result: KycResult) => void) => void;
  /** Fires when the person dismisses the widget (not on close()). */
  onClose: (callback: () => void) => void;
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
