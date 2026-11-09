import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { parseSession, resultRedirectPath, SESSION_COOKIE } from '@/lib/demo-cookies';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your result',
  robots: { index: false, follow: false },
};

/**
 * Where the verifications created before the demo stopped asking for a redirect still send the
 * browser. It shows nothing itself: it goes back to the page the check started on, which shows the
 * result in place. A browser without the cookies lands on / with a one-line notice.
 */
export default async function ResultPage(): Promise<never> {
  const store = await cookies();
  redirect(resultRedirectPath(parseSession(store.get(SESSION_COOKIE)?.value)));
}
