/**
 * app/page.tsx
 *
 * Root page — redirects authenticated users to their dashboard,
 * unauthenticated users to the sign-in page.
 *
 * Public marketing/landing page will replace this in a future milestone.
 */

import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

export default async function RootPage() {
  const { userId } = await auth();
  if (userId) {
    redirect('/dashboard');
  } else {
    redirect('/sign-in');
  }
}
