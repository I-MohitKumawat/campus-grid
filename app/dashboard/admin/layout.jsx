/**
 * app/dashboard/admin/layout.jsx
 *
 * Operational Admin Console Layout.
 * Provides a dedicated sub-navigation bar for Admin Modules:
 * - Dashboard (Operational Overview)
 * - Clubs (Club Management & Lead Assignment)
 * - Events (Event Operations & Status Transitions)
 * - Users (Role Assignment & Student Lookup)
 * - Certificates (Credential Verification)
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DashboardNavbar from '@/components/layout/DashboardNavbar';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  Calendar,
  UserCheck,
  Award,
  Lock,
  ArrowRight,
  Building2
} from 'lucide-react';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-2 font-bold text-xs text-zinc-400">
          <ShieldCheck className="h-5 w-5 text-accent animate-spin" /> Verifying Admin Privileges...
        </div>
      </div>
    );
  }

  // RBAC Permission Guard — Strictly require admin role
  if (user && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <DashboardNavbar />
        <main className="max-w-3xl mx-auto px-6 py-20 text-center space-y-6">
          <div className="h-16 w-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <Lock className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-white">Admin Privileges Required</h1>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Your account role ({user.role}) does not have permission to access platform operations console.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-xs font-bold text-white shadow-lg"
          >
            Return to Student Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </main>
      </div>
    );
  }

  const adminTabs = [
    { name: 'Overview', href: '/dashboard/admin', icon: LayoutDashboard },
    { name: 'Clubs & Archive', href: '/dashboard/admin/clubs', icon: Building2 },
    { name: 'Users & Roles', href: '/dashboard/admin/users', icon: UserCheck },
    { name: 'Certificates', href: '/dashboard/admin/certificates', icon: Award }
  ];

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 relative overflow-hidden pb-24 font-sans">
      <DashboardNavbar />

      {/* Admin Operational Sub-Header Bar */}
      <div className="border-b border-zinc-900 bg-zinc-950/60 sticky top-20 z-40 backdrop-blur-md px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between overflow-x-auto no-scrollbar">
          
          <div className="flex items-center gap-3 py-3 shrink-0">
            <span className="h-7 w-7 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="text-xs font-extrabold text-white uppercase tracking-wider">
              Admin Operations Console
            </span>
          </div>

          {/* Module Nav Links */}
          <nav className="flex items-center gap-1">
            {adminTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href;

              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all whitespace-nowrap border-b-2 ${
                    isActive
                      ? 'border-accent text-accent bg-accent/5'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </Link>
              );
            })}
          </nav>

        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 pt-8">
        {children}
      </main>
    </div>
  );
}
