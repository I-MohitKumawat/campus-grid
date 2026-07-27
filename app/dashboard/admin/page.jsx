/**
 * app/dashboard/admin/page.jsx
 *
 * Phase 1 — Operational Admin Dashboard.
 * Displays operational platform metrics only:
 * - Pending clubs & events
 * - Today's events
 * - Operational quick actions
 * - Recent administrative activity
 *
 * No fake charts or decorative statistics.
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Award,
  UserCheck,
  FileText
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/v1/admin/stats', { cache: 'no-store' });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.success && json?.data) {
        setStats(json.data);
      } else {
        setError(json?.error?.message || 'Failed to load operational metrics.');
      }
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      setError('Connection error loading operational metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-28 rounded-2xl bg-zinc-900/60 border border-zinc-800" />
          <div className="h-28 rounded-2xl bg-zinc-900/60 border border-zinc-800" />
          <div className="h-28 rounded-2xl bg-zinc-900/60 border border-zinc-800" />
          <div className="h-28 rounded-2xl bg-zinc-900/60 border border-zinc-800" />
        </div>
        <div className="h-64 rounded-3xl bg-zinc-900/60 border border-zinc-800" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-900">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-accent" /> Operational Platform Overview
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time management of clubs, events, user permissions, and credentials.
          </p>
        </div>

        {/* Quick Operations Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/dashboard/admin/clubs"
            className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-bold text-xs shadow-md inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Create Club
          </Link>
          <Link
            href="/dashboard/admin/events"
            className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-200 hover:text-white inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Create Event
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Operational Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-2">
          <span className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider">Active Clubs</span>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-extrabold text-white">{stats?.total_clubs || 0}</span>
            <Users className="h-6 w-6 text-accent" />
          </div>
          <p className="text-[11px] text-zinc-400">Official Campus Societies</p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-2">
          <span className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider">Total Events</span>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-extrabold text-white">{stats?.total_events || 0}</span>
            <Calendar className="h-6 w-6 text-violet-400" />
          </div>
          <p className="text-[11px] text-zinc-400">{stats?.events_today || 0} Events Scheduled Today</p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-2">
          <span className="text-[10px] uppercase font-extrabold text-amber-400 tracking-wider">Pending Approvals</span>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-extrabold text-amber-400">{stats?.pending_events || 0}</span>
            <Clock className="h-6 w-6 text-amber-400" />
          </div>
          <p className="text-[11px] text-zinc-400">Events Awaiting Review</p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-2">
          <span className="text-[10px] uppercase font-extrabold text-emerald-400 tracking-wider">Registered Users</span>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-extrabold text-emerald-400">{stats?.total_users || 0}</span>
            <UserCheck className="h-6 w-6 text-emerald-400" />
          </div>
          <p className="text-[11px] text-zinc-400">{stats?.total_certificates || 0} Issued Credentials</p>
        </div>

      </div>

      {/* Operational Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Recent Events Operational Log */}
        <div className="md:col-span-2 rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent" /> Recent Event Submissions
            </h3>
            <Link href="/dashboard/admin/events" className="text-xs font-bold text-accent hover:underline">
              Manage All Events &rarr;
            </Link>
          </div>

          {stats?.recent_events && stats.recent_events.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_events.map((evt) => (
                <div key={evt.id} className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-xs text-white">{evt.title}</h4>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                      <span>Status: <strong className="text-zinc-200 capitalize">{evt.status}</strong></span>
                      <span>•</span>
                      <span>{new Date(evt.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/admin/events`}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition-colors"
                  >
                    Action &rarr;
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center border border-dashed border-zinc-800 rounded-2xl text-xs text-zinc-500 italic">
              No recent event actions.
            </div>
          )}
        </div>

        {/* Operational Quick Links */}
        <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 space-y-4 shadow-xl">
          <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-violet-400" /> Admin Shortcuts
          </h3>

          <div className="space-y-3 text-xs">
            <Link
              href="/dashboard/admin/clubs"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 text-zinc-200 hover:text-white transition-all"
            >
              <span className="font-bold flex items-center gap-2"><Users className="h-4 w-4 text-accent" /> Manage Campus Clubs</span>
              <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />
            </Link>

            <Link
              href="/dashboard/admin/events"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 text-zinc-200 hover:text-white transition-all"
            >
              <span className="font-bold flex items-center gap-2"><Calendar className="h-4 w-4 text-violet-400" /> Publish & Audit Events</span>
              <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />
            </Link>

            <Link
              href="/dashboard/admin/users"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 text-zinc-200 hover:text-white transition-all"
            >
              <span className="font-bold flex items-center gap-2"><UserCheck className="h-4 w-4 text-emerald-400" /> Assign User Roles</span>
              <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />
            </Link>

            <Link
              href="/dashboard/admin/certificates"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 text-zinc-200 hover:text-white transition-all"
            >
              <span className="font-bold flex items-center gap-2"><Award className="h-4 w-4 text-amber-400" /> Verify Credentials</span>
              <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
