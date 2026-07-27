/**
 * app/dashboard/admin/events/page.jsx
 *
 * Phase 3 — Operational Event Management.
 * Features:
 * - Search & Status Filters
 * - Publish / Unpublish / Cancel / Complete / Archive Events
 * - Complete Event triggers system certificate issuance
 * - Real-time PostgreSQL persistence
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  Play,
  Pause,
  Ban,
  Archive,
  Award,
  Check,
  Eye
} from 'lucide-react';

export default function AdminEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [feedback, setFeedback] = useState(null);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      if (statusFilter) queryParams.set('status', statusFilter);

      const res = await fetch(`/api/v1/admin/events?${queryParams.toString()}`, { cache: 'no-store' });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.success && json?.data) {
        setEvents(json.data);
      } else {
        setError(json?.error?.message || 'Failed to load events.');
      }
    } catch (err) {
      console.error('Error fetching admin events:', err);
      setError('Connection error loading events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [search, statusFilter]);

  // Status Change Handler
  const handleUpdateStatus = async (eventId, newStatus, eventTitle) => {
    try {
      setFeedback(null);
      const res = await fetch(`/api/v1/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.success) {
        setFeedback({ type: 'success', msg: `Event "${eventTitle}" status updated to ${newStatus}.` });
        loadEvents();
      } else {
        setFeedback({ type: 'error', msg: json?.error?.message || 'Failed to update event status.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: 'Server error updating event status.' });
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-900">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-accent" /> Event Operations & Audit
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Publish draft events, audit registrations, cancel, or complete events to issue certificates.
          </p>
        </div>

        <Link
          href="/dashboard/event-studio/events/new"
          className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-bold text-xs shadow-md inline-flex items-center gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" /> Create New Event
        </Link>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold ${
          feedback.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
        }`}>
          <span>{feedback.msg}</span>
          <button onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search events by title..."
            className="w-full rounded-xl bg-zinc-900/60 border border-zinc-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-xl bg-zinc-900/60 border border-zinc-800 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-accent"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft / Pending</option>
          <option value="published">Published</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Events Table */}
      {loading ? (
        <div className="h-64 rounded-3xl bg-zinc-900/40 border border-zinc-800 animate-pulse" />
      ) : events.length > 0 ? (
        <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/60 text-zinc-400 uppercase font-extrabold text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-4">Event Details</th>
                  <th className="px-6 py-4">Host Club</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Registrations</th>
                  <th className="px-6 py-4 text-right">Operational Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300 font-medium">
                {events.map(evt => (
                  <tr key={evt.id} className="hover:bg-zinc-900/40 transition-colors">
                    
                    {/* Title & Date */}
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <Link href={`/dashboard/events/${evt.id}`} className="font-extrabold text-white hover:text-accent transition-colors">
                          {evt.title}
                        </Link>
                        <p className="text-[11px] text-zinc-500 font-mono">
                          {new Date(evt.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {evt.venue || 'Campus Venue'}
                        </p>
                      </div>
                    </td>

                    {/* Host Club */}
                    <td className="px-6 py-4">
                      <span className="font-bold text-zinc-300">{evt.club_name || 'CampusGrid Central'}</span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase border ${
                        evt.status === 'published' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                        evt.status === 'completed' ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' :
                        evt.status === 'cancelled' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                        'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      }`}>
                        {evt.status}
                      </span>
                    </td>

                    {/* Registrations */}
                    <td className="px-6 py-4">
                      <span className="font-bold text-white">{evt.registration_count || 0} Registered</span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {evt.status !== 'published' && (
                          <button
                            onClick={() => handleUpdateStatus(evt.id, 'published', evt.title)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/40 text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Play className="h-3 w-3 fill-emerald-300" /> Publish
                          </button>
                        )}

                        {evt.status === 'published' && (
                          <button
                            onClick={() => handleUpdateStatus(evt.id, 'draft', evt.title)}
                            className="px-3 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/40 text-amber-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Pause className="h-3 w-3" /> Unpublish
                          </button>
                        )}

                        {evt.status !== 'completed' && (
                          <button
                            onClick={() => handleUpdateStatus(evt.id, 'completed', evt.title)}
                            className="px-3 py-1.5 rounded-xl bg-violet-950/40 hover:bg-violet-900/60 border border-violet-800/40 text-violet-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Award className="h-3 w-3" /> Complete
                          </button>
                        )}

                        <button
                          onClick={() => handleUpdateStatus(evt.id, 'archived', evt.title)}
                          className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                          title="Archive Event"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center border border-dashed border-zinc-800 rounded-3xl space-y-3">
          <Calendar className="h-10 w-10 text-zinc-600 mx-auto" />
          <h3 className="font-bold text-sm text-zinc-300">No Events Found</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Create an event in Event Studio to manage and publish it here.
          </p>
        </div>
      )}

    </div>
  );
}
