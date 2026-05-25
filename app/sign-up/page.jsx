'use client';

/**
 * app/sign-up/page.jsx
 *
 * Lightweight client-side router redirect.
 * Routes users requesting '/sign-up' to our main combined '/sign-in?mode=signup' flow.
 */

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SignUpPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/sign-in?mode=signup');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
    </div>
  );
}
