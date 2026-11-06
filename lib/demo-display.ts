import { buildConsoleView, type ConsoleInput, type ConsoleView } from './console-view.ts';
import { lookOf, type Check, type Look, type Opens } from './demo-pages.ts';
import type { LoadedResult, ResultView } from './demo-result.ts';
import type { Receipt } from './receipt.ts';
import { maskForDisplay, type RedactedPayload } from './redaction.ts';
import { reasonLabel } from './reasons.ts';
import { SAMPLE_CONSOLE, sampleReceipt, type SampleOutcome } from './sample-payloads.ts';
import { buildSummary, type Delivery, type Summary } from './summary.ts';

export type Sample = { check: Check; outcome: SampleOutcome };

/** What the result area renders: the live result, or the sample the visitor chose. */
export type DemoDisplay = {
  /** Changes when a new result should scroll into view. */
  key: string;
  check: Check;
  sample: boolean;
  context: { look: Look; opens: Opens | null; at: Date | null };
  summary: Summary;
  /** Document number and address cut to their last four characters. */
  console: ConsoleView;
  consoleRevealed: ConsoleView;
  /** The live API view; null for samples. */
  view: ResultView | null;
  receipt: Receipt | null;
  storage: boolean;
};

export type DisplayContext = {
  now: Date;
  /** Options of the check started from this page load; null after a reload. */
  started: { look: Look; opens: Opens | null } | null;
};

export function toDisplay(live: LoadedResult | null, sample: Sample | null, ctx: DisplayContext): DemoDisplay | null {
  if (sample) {
    return sampleDisplay(sample, ctx);
  }
  if (!live || live.kind !== 'ok' || !['approved', 'declined', 'retry'].includes(live.view.state)) {
    return null;
  }
  const receipt = currentReceipt(live);
  const delivery: Delivery = receipt ? 'signed' : live.storage ? 'pending' : 'unconfigured';
  const info = live.console;
  const input: ConsoleInput = {
    check: live.check,
    sample: false,
    now: ctx.now,
    verification: {
      id: live.verificationId,
      status: live.view.status,
      workspaceName: info?.workspaceName ?? null,
      url: info?.url ?? null,
      createdAt: info?.createdAt ?? '',
      updatedAt: info?.updatedAt ?? '',
      externalId: info?.externalId ?? null,
      metadata: info?.metadata ?? null,
      attemptId: info?.attemptId ?? null,
    },
    // Until the webhook arrives, the document the API returned stands in for its document.
    payload: receipt?.payload ?? (info?.document ? { document: info.document } : null),
    reasonLabel: receipt?.reasonLabel ?? reasonLabel(live.view.reason),
    estimation: info?.estimation ?? null,
    media: info?.media ?? [],
    mrz: null,
    webhook: receipt ? { receivedAt: receipt.receivedAt, deliveryId: receipt.deliveryId, status: receipt.status, signed: true } : null,
    delivery,
    erased: live.erasure !== null,
  };
  return assemble({
    key: `${live.verificationId}:${live.view.status}`,
    check: live.check,
    sample: false,
    context: { look: lookOf(live.slug), opens: ctx.started?.opens ?? null, at: parseDate(live.view.decidedAt) },
    input,
    summaryInput: { delivery, timing: receipt?.timing ?? null, reason: live.view.reason, reasonLabel: input.reasonLabel, erasure: live.erasure },
    view: live.view,
    receipt,
    storage: live.storage,
  });
}

function sampleDisplay(sample: Sample, ctx: DisplayContext): DemoDisplay {
  const receipt = sampleReceipt(sample.check, sample.outcome, new Date(ctx.now.getTime() - 2 * 60_000).toISOString());
  const input: ConsoleInput = {
    check: sample.check,
    sample: true,
    now: ctx.now,
    verification: {
      id: SAMPLE_CONSOLE.verificationId,
      status: receipt.status,
      workspaceName: SAMPLE_CONSOLE.workspaceName,
      url: SAMPLE_CONSOLE.url,
      createdAt: new Date(ctx.now.getTime() - 3 * 60_000).toISOString(),
      updatedAt: new Date(ctx.now.getTime() - 2 * 60_000).toISOString(),
      externalId: SAMPLE_CONSOLE.externalId,
      metadata: { demo: sample.check, sample: true },
      attemptId: SAMPLE_CONSOLE.attemptId,
    },
    payload: receipt.payload,
    reasonLabel: receipt.reasonLabel,
    estimation: sample.check === 'selfie' ? { ...SAMPLE_CONSOLE.estimation, passed: sample.outcome === 'approved' } : null,
    media: SAMPLE_CONSOLE.media[sample.check],
    mrz: SAMPLE_CONSOLE.mrz,
    webhook: { receivedAt: new Date(ctx.now.getTime() - 2 * 60_000).toISOString(), deliveryId: null, status: receipt.status, signed: false },
    delivery: 'sample',
  };
  return assemble({
    key: `sample:${sample.check}:${sample.outcome}`,
    check: sample.check,
    sample: true,
    context: { look: 'proofage', opens: null, at: null },
    input,
    summaryInput: { delivery: 'sample', timing: receipt.timing, reason: receipt.reason, reasonLabel: receipt.reasonLabel },
    view: null,
    receipt,
    storage: true,
  });
}

function assemble(parts: {
  key: string;
  check: Check;
  sample: boolean;
  context: DemoDisplay['context'];
  input: ConsoleInput;
  summaryInput: Pick<Parameters<typeof buildSummary>[0], 'delivery' | 'timing' | 'reason' | 'reasonLabel' | 'erasure'>;
  view: ResultView | null;
  receipt: Receipt | null;
  storage: boolean;
}): DemoDisplay {
  const { input } = parts;
  const payload: RedactedPayload | null = input.payload;
  const masked = receiptMasksAll(parts.receipt) || !payload ? payload : maskForDisplay(payload);
  return {
    key: parts.key,
    check: parts.check,
    sample: parts.sample,
    context: parts.context,
    summary: buildSummary({
      check: parts.check,
      sample: parts.sample,
      status: input.verification.status,
      payload,
      now: input.now,
      ...parts.summaryInput,
    }),
    console: buildConsoleView({ ...input, payload: masked }),
    consoleRevealed: buildConsoleView(input),
    view: parts.view,
    receipt: parts.receipt,
    storage: parts.storage,
  };
}

const receiptMasksAll = (receipt: Receipt | null) => receipt?.maskAll === true;

function parseDate(iso: string | null): Date | null {
  const date = iso ? new Date(iso) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

/** Why the page keeps asking the server, or null to stop. Each mode has its own time limit. */
export type PollMode = 'person' | 'decision' | 'webhook';

const DECIDED = new Set(['approved', 'declined', 'retry']);

/**
 * - `person`: a check started from this page load is still in the person's hands;
 * - `decision`: submitted, ProofAge is deciding;
 * - `webhook`: decided, but the decision webhook (sent right after) has not been stored yet.
 */
export function pollMode(live: LoadedResult | null, watching: boolean): PollMode | null {
  const ok = live?.kind === 'ok' ? live : null;
  const view = ok?.view ?? null;
  if (view?.pending) {
    return 'decision';
  }
  if (watching && (!view || view.state === 'not_finished' || view.state === 'retry')) {
    return 'person';
  }
  // An erased check gets no new webhook worth waiting for.
  if (ok && view && ok.storage && !ok.erasure && DECIDED.has(view.state) && !currentReceipt(ok)) {
    return 'webhook';
  }
  return null;
}

/** A stored webhook for an earlier status (a resubmission, then approved) is not the current one. */
function currentReceipt(live: Extract<LoadedResult, { kind: 'ok' }>): Receipt | null {
  return live.receipt && live.receipt.status === live.view.status ? live.receipt : null;
}
