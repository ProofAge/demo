export const buttonPrimary =
  'inline-flex w-full items-center justify-center rounded-md bg-accent px-4 py-3 text-base font-medium text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60';
export const buttonSecondary =
  'inline-flex items-center justify-center rounded-md border border-line-strong bg-surface px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-50';
export const textLink = 'text-accent underline underline-offset-4 hover:text-accent-strong';
export const surfaceCard = 'rounded-lg border border-line bg-surface';
export const sectionTitle = 'text-xl font-semibold text-ink';
export const badgeBase = 'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium';
export const badgeTone = {
  ok: 'bg-ok-tint text-ok',
  warn: 'bg-warn-tint text-warn',
  danger: 'bg-danger-tint text-danger',
  neutral: 'bg-sunken text-muted',
} as const;
