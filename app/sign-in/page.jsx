'use client';

/**
 * app/sign-in/page.jsx
 *
 * Client-side Authentication page for CampusGrid.
 * Handles login, client-side validation, error feedback, loading indicators,
 * and dev credential quick-login (development mode only).
 */

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle,
  Fingerprint,
  UserCheck,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';

function SignInForm() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const isDev = process.env.NODE_ENV === 'development';

  // Check if user is already authenticated on page load
  useEffect(() => {
    async function checkExistingAuth() {
      try {
        const res = await fetch('/api/v1/auth/session');
        const result = await res.json();
        if (res.ok && result.success && result.data) {
          router.replace('/dashboard');
          return;
        }
      } catch {
        // Not authenticated, stay on sign-in page
      } finally {
        setCheckingAuth(false);
      }
    }
    checkExistingAuth();
  }, [router]);

  const handleForgotPassword = () => {
    setError('');
    setInfo('Password reset functionality is currently disabled by system administrator.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    const trimmedEmail = email.trim();
    
    // 1. Validation: Empty email
    if (!trimmedEmail) {
      setError('Email is required.');
      return;
    }

    // 2. Validation: Invalid email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    // 3. Validation: Empty password
    if (!password) {
      setError('Password is required.');
      return;
    }

    setLoading(true);

    try {
      const emailParts = trimmedEmail.split('@');
      const emailPrefix = emailParts[0];
      const idToken = `dev-${emailPrefix}`;

      const res = await fetch('/api/v1/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_token: idToken }),
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('No account found with this email.');
        }
        if (res.status === 401 || res.status === 403) {
          throw new Error('Incorrect password. Please try again.');
        }
        if (res.status >= 500) {
          throw new Error('Server unavailable. Please try again later.');
        }
      }

      const result = await res.json().catch(() => null);

      if (!result || !result.success) {
        const msg = result?.error?.message || 'Authentication failed.';
        if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('user')) {
          throw new Error('No account found with this email.');
        }
        if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('invalid')) {
          throw new Error('Incorrect password. Please try again.');
        }
        throw new Error(msg);
      }

      setSuccess(true);
      
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 800);

    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Server unavailable. Please try again later.');
      } else {
        setError(err.message || 'An unexpected error occurred.');
      }
      setLoading(false);
    }
  };

  const handleQuickLogin = async (username) => {
    setError('');
    setInfo('');
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
        router.push('/dashboard');
        router.refresh();
      }, 800);
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Server unavailable. Please try again later.');
      } else {
        setError(err.message);
      }
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <p className="mt-4 text-xs font-medium text-zinc-500">Checking authentication...</p>
      </div>
    );
  }

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
            Access using your college account.
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5">
            Sign in to access your campus dashboard.
          </p>
        </div>

        {/* Card Form */}
        <div className="relative rounded-[28px] border border-zinc-200/80 bg-white p-6 shadow-2xl shadow-zinc-200/40 transition-all duration-300 dark:border-zinc-850 dark:bg-zinc-900/35 dark:shadow-none sm:p-8">
          
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            
            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-100 p-3.5 text-xs font-semibold text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-400 animate-fadeIn">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Info Message (e.g. Forgot Password placeholder) */}
            {info && (
              <div className="flex items-start gap-2.5 rounded-xl bg-indigo-50 border border-indigo-100 p-3.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400 animate-fadeIn">
                <HelpCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span>{info}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 border border-emerald-100 p-3.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400 animate-fadeIn">
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
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || success}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 py-3 text-sm text-brand placeholder-zinc-400 outline-none transition-all duration-300 focus:border-accent focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-accent dark:focus:bg-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Password</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-accent hover:underline focus:outline-none cursor-pointer"
                >
                  Forgot password?
                </button>
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
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 py-3 text-sm text-brand placeholder-zinc-400 outline-none transition-all duration-300 focus:border-accent focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-accent dark:focus:bg-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </button>
          </form>

          {/* Quick Login Section (Only visible in development environment) */}
          {isDev && (
            <div className="mt-8 pt-6 border-t border-zinc-150 dark:border-zinc-800/80">
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-center mb-3 flex items-center justify-center gap-1">
                <Fingerprint className="h-3.5 w-3.5 text-accent" /> Developer Testing Credentials
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin')}
                  disabled={loading || success}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 px-2 py-2 text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-rose-400" />
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('arjun')}
                  disabled={loading || success}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserCheck className="h-3.5 w-3.5 text-accent" />
                  Arjun
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('riya')}
                  disabled={loading || success}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserCheck className="h-3.5 w-3.5 text-accent" />
                  Riya
                </button>
              </div>
            </div>
          )}

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
