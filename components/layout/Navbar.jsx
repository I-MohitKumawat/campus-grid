'use client';

/**
 * components/layout/Navbar.jsx
 *
 * Premium navigation header for the CampusGrid landing page.
 * Includes interactive theme toggle and dynamic CTA button.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

export default function Navbar({ isLoggedIn }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const handleSmoothScroll = (e, targetId) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (!element) return;

    const headerOffset = 80; // height of sticky header + extra spacing
    const currentScroll = window.scrollY !== undefined ? window.scrollY : (window.pageYOffset || 0);
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + currentScroll - headerOffset;
    const startPosition = currentScroll;
    const distance = offsetPosition - startPosition;
    const duration = 800; // duration in ms
    let start = null;

    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      const percentage = Math.min(progress / duration, 1);
      
      // Easing function: easeInOutCubic
      const ease = percentage < 0.5 
        ? 4 * percentage * percentage * percentage 
        : 1 - Math.pow(-2 * percentage + 2, 3) / 2;

      window.scrollTo(0, startPosition + distance * ease);

      if (progress < duration) {
        window.requestAnimationFrame(step);
      } else {
        window.history.pushState(null, '', `#${targetId}`);
      }
    };

    window.requestAnimationFrame(step);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 bg-white/80 backdrop-blur-md transition-colors duration-300 dark:border-zinc-800/80 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-accent to-violet-500 shadow-md shadow-accent/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-accent/40">
            {/* Grid SVG Icon */}
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-brand transition-colors duration-300 dark:text-zinc-50">
            Campus<span className="bg-gradient-to-r from-accent to-violet-500 bg-clip-text text-transparent">Grid</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <a 
            href="#features" 
            onClick={(e) => handleSmoothScroll(e, 'features')}
            className="text-sm font-medium text-zinc-600 transition-colors hover:text-accent dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Features
          </a>
          <a 
            href="#preview" 
            onClick={(e) => handleSmoothScroll(e, 'preview')}
            className="text-sm font-medium text-zinc-600 transition-colors hover:text-accent dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Live Preview
          </a>
          <a 
            href="#stats" 
            onClick={(e) => handleSmoothScroll(e, 'stats')}
            className="text-sm font-medium text-zinc-600 transition-colors hover:text-accent dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Impact
          </a>
          <a 
            href="#qr" 
            onClick={(e) => handleSmoothScroll(e, 'qr')}
            className="text-sm font-medium text-zinc-600 transition-colors hover:text-accent dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            QR Pass
          </a>
        </nav>

        {/* Right Side Controls */}
        <div className="flex items-center gap-4">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600 transition-all duration-300 hover:bg-zinc-100 hover:text-accent dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Toggle dark mode"
          >
            {mounted && resolvedTheme === 'dark' ? (
              <Sun className="h-4.5 w-4.5" />
            ) : (
              <Moon className="h-4.5 w-4.5" />
            )}
          </button>

          {/* Action CTA */}
          <Link
            href={isLoggedIn ? '/dashboard' : '/sign-in'}
            className="relative inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-brand/90 hover:scale-102 hover:shadow-md dark:bg-accent dark:hover:bg-accent/90"
          >
            {isLoggedIn ? 'Go to Dashboard' : 'Sign In'}
          </Link>
        </div>
      </div>
    </header>
  );
}
