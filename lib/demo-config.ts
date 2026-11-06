type Env = Record<string, string | undefined>;

/** DEMO_MASK_ALL=true masks personal fields server-side, for recording. */
export function isMaskAll(env: Env = process.env): boolean {
  return env.DEMO_MASK_ALL === 'true';
}
