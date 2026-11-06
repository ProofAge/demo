import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decisionTiming, shouldRecordSubmission } from './decision-timing.ts';

const DECIDED = '2026-10-13T10:00:12.400Z';

test('API submitted_at gives an exact figure', () => {
  assert.deepEqual(
    decisionTiming({ status: 'approved', decidedAt: DECIDED, submittedAt: '2026-10-13T10:00:04Z', submittedSeenAt: '2026-10-13T10:00:05Z' }),
    { seconds: 8.4, approximate: false },
  );
});

test('the demo-side value is "about"', () => {
  assert.deepEqual(
    decisionTiming({ status: 'declined', decidedAt: DECIDED, submittedAt: null, submittedSeenAt: '2026-10-13T10:00:05Z' }),
    { seconds: 7, approximate: true },
  );
});

test('missing or unusable timestamps hide the line', () => {
  assert.equal(decisionTiming({ status: 'approved', decidedAt: DECIDED, submittedAt: null, submittedSeenAt: null }), null);
  assert.equal(decisionTiming({ status: 'approved', decidedAt: null, submittedAt: '2026-10-13T10:00:04Z', submittedSeenAt: null }), null);
  assert.equal(decisionTiming({ status: 'approved', decidedAt: 'garbage', submittedAt: '2026-10-13T10:00:04Z', submittedSeenAt: null }), null);
});

test('seen after the decision (poll lag) hides the line instead of going negative', () => {
  assert.equal(decisionTiming({ status: 'approved', decidedAt: DECIDED, submittedAt: null, submittedSeenAt: '2026-10-13T10:00:13Z' }), null);
});

test('no timing for statuses that are not a decision', () => {
  assert.equal(decisionTiming({ status: 'review', decidedAt: DECIDED, submittedAt: '2026-10-13T10:00:04Z', submittedSeenAt: null }), null);
  assert.equal(decisionTiming({ status: 'expired', decidedAt: DECIDED, submittedAt: '2026-10-13T10:00:04Z', submittedSeenAt: null }), null);
});

test('resubmission counts as a decision', () => {
  assert.equal(decisionTiming({ status: 'resubmission_requested', decidedAt: DECIDED, submittedAt: '2026-10-13T10:00:10Z', submittedSeenAt: null })?.seconds, 2.4);
});

test('a demo-side figure under a second is hidden, never "about 0 s"', () => {
  assert.equal(decisionTiming({ status: 'approved', decidedAt: DECIDED, submittedAt: null, submittedSeenAt: '2026-10-13T10:00:12.100Z' }), null);
  assert.deepEqual(decisionTiming({ status: 'approved', decidedAt: DECIDED, submittedAt: '2026-10-13T10:00:12.100Z', submittedSeenAt: null }), { seconds: 0.3, approximate: false });
});

test('the submission time is recorded once, and again after a resubmission', () => {
  assert.equal(shouldRecordSubmission(null, null), true);
  assert.equal(shouldRecordSubmission('2026-10-13T10:00:04Z', null), false);
  assert.equal(shouldRecordSubmission('2026-10-13T10:00:04Z', '2026-10-13T10:00:01Z'), false, 'event before the seen time');
  assert.equal(shouldRecordSubmission('2026-10-13T10:00:04Z', '2026-10-13T10:00:12Z'), true, 'resubmission decided after it');
});
