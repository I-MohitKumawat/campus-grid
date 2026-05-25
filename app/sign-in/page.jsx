'use client';

/**
 * app/sign-in/page.jsx
 *
 * Premium client-side Authentication page for CampusGrid.
 * Supports Sign In & Sign Up flows, gates inputs to allowed domains,
 * and handles JWT session cookie setup via local backend endpoints.
 * Includes quick-access developer demo logins.
 */

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Sparkles, 
  Mail, 
  Lock, 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle,
  Fingerprint,
  UserCheck
} from 'lucide-react';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Set default mode based on query params (e.g. ?mode=signup)
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const [mode, setMode] = useState(initialMode);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Sync mode state with query changes
  useEffect(() => {
    const currentMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
    setMode(currentMode);
    setError('');
  }, [searchParams]);

  // Handle Sign In / Sign Up submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    // Basic domain validation feedback
    const emailParts = email.split('@');
    if (emailParts.length < 2) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    try {
      const emailPrefix = emailParts[0];
      
      // Simulate Firebase Auth ID token locally by passing 'dev-[username]'
      // The server-side verifyFirebaseIdToken function bypasses verification for dev- tokens in development mode.
      const idToken = `dev-${emailPrefix}`;

      const res = await fetch('/api/v1/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_token: idToken }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error?.message || 'Authentication failed.');
      }

      setSuccess(true);
      
      // Redirect to dashboard or onboarding depending on user status
      setTimeout(() => {
        if (result.data.is_onboarded) {
          router.push('/dashboard');
        } else {
          router.push('/onboarding');
        }
        router.refresh();
      }, 1000);

    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  // Quick helper for demo developer logins
  const handleQuickLogin = async (username) => {
    setError('');
    setLoading(true);
    const demoEmail = `${username}@college.ac.in`;
    setEmail(demoEmail);
    setPassword('password123');

    try {
      const idToken = `dev-${username}`;
      const res = await fetch('/api/v1/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_token: idToken }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error?.message || 'Demo authentication failed.');
      }

      setSuccess(true);
      setTimeout(() => {
        if (result.data.is_onboarded) {
          router.push('/dashboard');
        } else {
          router.push('/onboarding'); // Redirects to onboarding if new
        }
        router.refresh();
      }, 1000);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-white text-zinc-900 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-50 relative overflow-hidden px-4">
      {/* Background Accent Gradients */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)]" />
      <div className="absolute top-1/4 left-1/4 -z-10 h-96 w-96 rounded-full bg-accent/10 blur-3xl dark:bg-accent/5" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-500/5" />

      {/* Main Container */}
      <div className="w-full max-w-md">
        
        {/* Header Logo */}
        <div className="flex flex-col items-center mb-8 text-center">
          <Link href="/" className="flex items-center gap-2.5 group mb-4">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-accent to-violet-500 shadow-md shadow-accent/20 transition-all duration-300 group-hover:scale-105">
              <svg className="h-5.5 w-5.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </div>
            <span className="font-display text-2xl font-bold tracking-tight text-brand dark:text-zinc-50">
              Campus<span className="bg-gradient-to-r from-accent to-violet-500 bg-clip-text text-transparent">Grid</span>
            </span>
          </Link>
          <h2 className="font-display text-xl font-bold text-brand dark:text-zinc-50">
            {mode === 'signin' ? 'Welcome Back' : 'Create Your Account'}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5">
            {mode === 'signin' ? 'Sign in to access your campus dashboard.' : 'Enter your official college email to get started.'}
          </p>
        </div>

        {/* Card Form */}
        <div className="relative rounded-[28px] border border-zinc-200/80 bg-white p-6 shadow-2xl shadow-zinc-200/40 transition-all duration-300 dark:border-zinc-850 dark:bg-zinc-900/35 dark:shadow-none sm:p-8">
          
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-100 p-3.5 text-xs font-semibold text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-450 animate-fadeIn">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 border border-emerald-100 p-3.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-450 animate-fadeIn">
                <CheckCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span>Success! Redirecting you now...</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">College Email</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-4.5 w-4.5 text-zinc-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder="name@college.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || success}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 py-3 text-sm text-brand placeholder-zinc-400 outline-none transition-all duration-300 focus:border-accent focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-accent dark:focus:bg-zinc-950"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Password</label>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4.5 w-4.5 text-zinc-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || success}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 py-3 text-sm text-brand placeholder-zinc-400 outline-none transition-all duration-300 focus:border-accent focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-accent dark:focus:bg-zinc-950"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || success}
              className="relative w-full inline-flex items-center justify-center rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-md shadow-brand/10 transition-all duration-300 hover:bg-brand/90 hover:scale-102 dark:bg-accent dark:shadow-accent/15 dark:hover:bg-accent/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <span className="flex items-center gap-1">
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </button>
          </form>

          {/* Tab toggling info */}
          <div className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
            {mode === 'signin' ? (
              <span>
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => router.push('/sign-in?mode=signup')}
                  className="font-bold text-accent hover:underline cursor-pointer"
                >
                  Sign Up
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  onClick={() => router.push('/sign-in')}
                  className="font-bold text-accent hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </span>
            )}
          </div>

          {/* Quick Login Section */}
          <div className="mt-8 pt-6 border-t border-zinc-150 dark:border-zinc-800/80">
            <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-center mb-3 flex items-center justify-center gap-1">
              <Fingerprint className="h-3.5 w-3.5 text-accent" /> Developer Testing Credentials
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleQuickLogin('arjun')}
                disabled={loading || success}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <UserCheck className="h-3.5 w-3.5 text-accent" />
                Login as Arjun
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('riya')}
                disabled={loading || success}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <UserCheck className="h-3.5 w-3.5 text-accent" />
                Login as Riya
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}
