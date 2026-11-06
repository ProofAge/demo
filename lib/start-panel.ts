import type { DemoState } from './demo-result.ts';

export type StartPanelInput = {
  /** The widget is being opened or is open over the page. */
  busy: boolean;
  newTab: boolean;
  watching: boolean;
  timedOut: boolean;
  sdkReady: boolean;
  state: DemoState | null;
};

export type StartPanelMessage = 'none' | 'waiting_tab' | 'checking' | 'left' | 'retry' | 'ended' | 'timed_out';

export type StartPanel = { button: { label: string; disabled: boolean }; message: StartPanelMessage; optionsDisabled: boolean };

function messageFor(input: StartPanelInput): StartPanelMessage {
  const { state } = input;
  if (state === 'checking') {
    return input.timedOut ? 'timed_out' : 'checking';
  }
  if (state === 'retry') {
    return 'retry';
  }
  if (state === 'ended') {
    return 'ended';
  }
  if (input.newTab && input.watching && (state === null || state === 'not_finished')) {
    return 'waiting_tab';
  }
  if (state === 'not_finished' && !input.watching && !input.busy) {
    return 'left';
  }
  return 'none';
}

/** What the Start area shows: the button, one message, and whether the options are locked. */
export function startPanel(input: StartPanelInput): StartPanel {
  const message = messageFor(input);
  const running = input.busy || message === 'waiting_tab' || message === 'checking';
  return {
    button: { label: running ? 'In progress…' : 'Start the check', disabled: running || !input.sdkReady },
    message,
    optionsDisabled: running,
  };
}

/** "Start over": the last thing started from this page load, else the options on screen (after a reload). */
export function resolveStart<T>(last: T | null, current: T): T {
  return last ?? current;
}
