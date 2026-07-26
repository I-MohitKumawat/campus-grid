'use client';

/**
 * app/dashboard/organizer/events/[id]/edit/page.jsx
 *
 * Dedicated Event Settings & Edit Page for Organizers.
 * Allows editing event fields (venue, date, capacity, registration mode).
 * Features schedule change warnings that notify registered students.
 */

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, AlertTriangle, Sparkles, Building2, Calendar, MapPin, Users } from 'lucide-react';
import DashboardNavbar from '@/components/layout/DashboardNavbar';
import { useAuth } from '@/components/providers/AuthProvider';

export default function EditEventPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'hackathon',
    visibility: 'public',
    event_date: '',
    duration_minutes: 120,
    venue: '',
    online_link: '',
    capacity: 100,
    registration_mode: 'instant',
    registration_deadline: '',
    speaker_info: '',
    status: 'draft'
  });

  const fetchEventDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/events/${eventId}`, { cache: 'no-store' });
      const result = await res.json().catch(() => null);
      if (res.ok && result?.success && result?.data) {
        const e = result.data;
        setFormData({
          title: e.title || '',
          description: e.description || '',
          event_type: e.event_type || 'hackathon',
          visibility: e.visibility || 'public',
          event_date: e.event_date ? new Date(e.event_date).toISOString().slice(0, 16) : '',
          duration_minutes: e.duration_minutes || 120,
          venue: e.venue || '',
          online_link: e.online_link || '',
          capacity: e.capacity || 100,
          registration_mode: e.registration_mode || 'instant',
          registration_deadline: e.registration_deadline ? new Date(e.registration_deadline).toISOString().slice(0, 16) : '',
          speaker_info: e.speaker_info || '',
          status: e.status || 'draft'
        });
      }
    } catch (err) {
      console.error('Failed to fetch event detail for edit:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventDetail();
  }, [eventId]);

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/v1/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          capacity: Number(formData.capacity) || null,
          duration_minutes: Number(formData.duration_minutes) || 120,
          event_date: new Date(formData.event_date).toISOString(),
          registration_deadline: formData.registration_deadline ? new Date(formData.registration_deadline).toISOString() : null
        })
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setFeedback({
          type: 'success',
          msg: formData.status === 'published'
            ? 'Event updated! Schedule notification dispatched to all registered attendees.'
            : 'Event details saved successfully!'
        });
        setTimeout(() => {
          router.push('/dashboard/event-studio');
        }, 1500);
      } else {
        setFeedback({ type: 'error', msg: result?.error?.message || 'Failed to update event.' });
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Server error updating event.' });
    } finally {
      setSaving(false);
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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-bold text-amber-400">
            <Sparkles className="h-3.5 w-3.5" /> Event Settings & Configuration
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-2">Edit Event Details</h1>
          <p className="text-xs text-zinc-400 mt-1">Update venue, date, capacity limits, and registration rules.</p>
        </div>

        {formData.status === 'published' && (
          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Editing a Published Event: Updating venue or event date will automatically dispatch an in-app notification alert to all registered students.</span>
          </div>
        )}

        {feedback && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold ${
            feedback.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}>
            <span>{feedback.msg}</span>
            <button onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-white">✕</button>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent mx-auto" />
            <p className="mt-3 text-xs text-zinc-400">Loading event parameters...</p>
          </div>
        ) : (
          <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 sm:p-8 space-y-6">
            
            {/* Title & Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">Event Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-zinc-100 outline-none focus:border-accent"
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
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-zinc-100 outline-none focus:border-accent"
              />
            </div>

            {/* Date, Time & Venue */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">Event Date & Time</label>
                <input
                  type="datetime-local"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-zinc-100 outline-none focus:border-accent"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">Venue / Location</label>
                <input
                  type="text"
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
                <label className="text-xs font-bold text-zinc-300">Capacity</label>
                <input
                  type="number"
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
                  <option value="instant">Instant Registration</option>
                  <option value="approval">Approval Required</option>
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

            <div className="flex justify-end pt-4 border-t border-zinc-900">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 rounded-xl bg-accent hover:bg-accent/90 text-xs font-bold text-white shadow-lg inline-flex items-center gap-2 cursor-pointer transition-all"
              >
                <Save className="h-4 w-4" /> {saving ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
