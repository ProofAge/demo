export const DEMO_PAGES = {
  'ember-box': '/',
  'eudi-wallet': '/eudi-wallet-age-verification',
} as const;

export type DemoSlug = keyof typeof DEMO_PAGES;

export function isDemoSlug(value: unknown): value is DemoSlug {
  return typeof value === 'string' && Object.hasOwn(DEMO_PAGES, value);
}

export function pathForSlug(slug: string): string {
  return isDemoSlug(slug) ? DEMO_PAGES[slug] : '/';
}
