'use client';

/**
 * app/dashboard/organizer/events/new/page.jsx
 *
 * Dedicated Event Creation Page for Organizers.
 * Supports creating events as Draft or directly submitting for Faculty/Admin Approval.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, MapPin, Users, Sparkles, Send, Save, AlertCircle, Building2 } from 'lucide-react';
import DashboardNavbar from '@/components/layout/DashboardNavbar';
import { useAuth } from '@/components/providers/AuthProvider';

export default function CreateEventPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'hackathon',
    visibility: 'public',
    club_id: '',
    event_date: '',
    duration_minutes: 120,
    venue: '',
    online_link: '',
    capacity: 100,
    registration_mode: 'instant',
    registration_deadline: '',
    speaker_info: '',
    banner_url: ''
  });

  const isAdmin = Boolean(user && user.role === 'admin');

  useEffect(() => {
    async function loadClubs() {
      try {
        const endpoint = user?.role === 'admin' ? '/api/v1/clubs' : '/api/v1/clubs?joined=true';
        const res = await fetch(endpoint);
        const json = await res.json().catch(() => null);
        if (res.ok && json?.success && Array.isArray(json.data)) {
          setClubs(json.data);
          if (json.data.length === 1 && !formData.club_id && !isAdmin) {
            setFormData(prev => ({ ...prev, club_id: json.data[0].id }));
          }
        }
      } catch (err) {
        console.error('Failed to load clubs:', err);
      }
    }
    if (user) {
      loadClubs();
    }
  }, [user, isAdmin]);

  const handleSubmit = async (isSubmitForApproval = false) => {
    if (!formData.title || !formData.event_date || !formData.venue) {
      setFeedback({ type: 'error', msg: 'Title, Event Date, and Venue are required.' });
      return;
    }

    if (!isAdmin && !formData.club_id) {
      setFeedback({ type: 'error', msg: 'Please select a host club for this event.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      // 1. Create event
      const payload = {
        ...formData,
        club_id: formData.club_id || undefined,
        capacity: Number(formData.capacity) || null,
        duration_minutes: Number(formData.duration_minutes) || 120,
        event_date: new Date(formData.event_date).toISOString(),
        registration_deadline: formData.registration_deadline ? new Date(formData.registration_deadline).toISOString() : null
      };

      const res = await fetch('/api/v1/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (res.ok && result.success) {
        const createdEventId = result.data.id;

        if (isSubmitForApproval) {
          // 2. Submit for approval if requested
          await fetch(`/api/v1/organizer/events/${createdEventId}/submit`, { method: 'POST' });
        }

        setFeedback({
          type: 'success',
          msg: isSubmitForApproval ? 'Event created and submitted for faculty approval!' : 'Event saved as draft!'
        });

        setTimeout(() => {
          router.push('/dashboard/event-studio');
        }, 1500);
      } else {
        setFeedback({ type: 'error', msg: result?.error?.message || result?.error || 'Failed to create event.' });
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Server error creating event.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden pb-24">
      {/* Background Glow */}
      <div className="absolute top-0 right-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-accent/5 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-violet-500/5 blur-3xl" />

      <DashboardNavbar />

      <main className="max-w-4xl mx-auto px-6 pt-6 space-y-6">
        <Link href="/dashboard/event-studio" className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Event Studio
        </Link>

        <div className="border-b border-zinc-900 pb-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/20 px-3 py-1 text-xs font-bold text-accent">
            <Sparkles className="h-3.5 w-3.5" /> Organizer Studio
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-2">Create New Event</h1>
          <p className="text-xs text-zinc-400 mt-1">Setup event details, registration mode, and capacity for campus release.</p>
        </div>

        {feedback && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold ${
            feedback.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}>
            <span>{feedback.msg}</span>
            <button onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-white">✕</button>
          </div>
        )}

        <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 sm:p-8 space-y-6">
          
          {/* Host Club / Organization Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
              <span>Host Club / Organization {isAdmin ? '(Optional for Institutional)' : '*'}</span>
              <span className="text-[10px] text-zinc-500 font-normal">
                {isAdmin ? 'Admins can host institutional or club-associated events' : 'Events must be hosted by a verified club'}
              </span>
            </label>
            <select
              value={formData.club_id}
              onChange={(e) => setFormData({ ...formData, club_id: e.target.value })}
              className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-zinc-100 outline-none focus:border-accent"
            >
              <option value="">{isAdmin ? '-- Institutional Platform Event (No Club) --' : '-- Select Host Club --'}</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.category ? `(${c.category})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Title & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Event Title *</label>
              <input
                type="text"
                placeholder="e.g. HackIndia 2024: National Campus Hackathon"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Event Type</label>
              <select
                value={formData.event_type}
                onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-zinc-100 outline-none focus:border-accent"
              >
                <option value="hackathon">Hackathon</option>
                <option value="workshop">Workshop</option>
                <option value="seminar">Seminar</option>
                <option value="competition">Competition</option>
                <option value="cultural">Cultural</option>
                <option value="sports">Sports</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Event Description</label>
            <textarea
              rows={4}
              placeholder="Describe event schedule, prerequisites, tracks, and prizes..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-accent"
            />
          </div>

          {/* Date, Time & Venue */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Event Date & Time *</label>
              <input
                type="datetime-local"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-zinc-100 outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Venue / Location *</label>
              <input
                type="text"
                placeholder="e.g. Main Auditorium, Block C"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-zinc-100 outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Duration (Minutes)</label>
              <input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-zinc-100 outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Capacity, Registration Mode & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Total Seat Capacity</label>
              <input
                type="number"
                placeholder="e.g. 500"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-zinc-100 outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Registration Mode</label>
              <select
                value={formData.registration_mode}
                onChange={(e) => setFormData({ ...formData, registration_mode: e.target.value })}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-zinc-100 outline-none focus:border-accent"
              >
                <option value="instant">Instant Registration (Direct Seat)</option>
                <option value="approval">Approval Required (Organizer Screening Queue)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Registration Deadline</label>
              <input
                type="datetime-local"
                value={formData.registration_deadline}
                onChange={(e) => setFormData({ ...formData, registration_deadline: e.target.value })}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-zinc-100 outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-zinc-900">
            <button
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-bold text-zinc-200 inline-flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Save className="h-4 w-4 text-amber-400" /> Save as Draft
            </button>

            <button
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-accent hover:bg-accent/90 text-xs font-bold text-white shadow-lg inline-flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Send className="h-4 w-4" /> Submit for Approval
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
