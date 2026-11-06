/**
 * Our wording for the reason codes a demo visitor is likely to hit
 * (codes: docs.proofage.net/core-technology/decision-reasons). The JSON keeps the code as sent.
 */
const LABELS: Readonly<Record<string, string>> = {
  'aml.blocklist.face_match': 'Face blocklist match',
  'aml.blocklist.device_match': 'Device blocklist match',
  'verification.age_threshold.failed': 'Under the age threshold',
  'verification.attempts.exhausted': 'Attempts exhausted',
  'document.face.mismatch': 'The selfie does not match the document photo',
  'document.expired': 'The document has expired',
  'document.front.blur.high': 'Document front too blurry',
  'document.back.blur.high': 'Document back too blurry',
  'document.front.glare.high': 'Glare on the document front',
  'document.back.glare.high': 'Glare on the document back',
  'selfie.liveness.failed': 'Liveness check failed',
  'selfie.quality.spoof_suspected': 'Selfie liveness check failed',
  'selfie.face.not_clear': 'Face not clear on the selfie',
  'selfie.quality.lighting_poor': 'Poor lighting on the selfie',
};

export function reasonLabel(code: string | null): string | null {
  return code && Object.hasOwn(LABELS, code) ? LABELS[code] : null;
}
