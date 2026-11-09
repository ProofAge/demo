import type { DemoPage, WorkspaceSlug } from './demo-pages.ts';

/**
 * What a demo verification is created with. Deliberately no `callback_url` (and the demo workspaces
 * have no redirect URL): with one, the SDK reloads the whole page three seconds after an approval,
 * and the copy of the result the page keeps in memory is gone once the check is erased.
 */
export function verificationRequest(input: { visitorId: string; slug: WorkspaceSlug; page: DemoPage }) {
  return {
    external_id: input.visitorId,
    external_metadata: { demo: input.slug, page: input.page },
  };
}
