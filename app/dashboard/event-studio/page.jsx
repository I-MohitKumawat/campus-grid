'use client';

/**
 * app/dashboard/organizer/page.jsx
 *
 * Central Organizer Event Management Dashboard.
 * Displays events with title, status, date, registration counts, registration mode, and last updated.
 * Renders status-driven action menus for Draft, Pending, Published, Completed, and Archived lifecycle states.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  Send, 
  RotateCcw, 
  FileText, 
  Edit3, 
  Trash2, 
  Megaphone, 
  QrCode, 
  Download, 
  Archive, 
  Award,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Building2,
  Lock,
  XCircle
} from 'lucide-react';
import DashboardNavbar from '@/components/layout/DashboardNavbar';
import { useAuth } from '@/components/providers/AuthProvider';
import { can } from '@/lib/permissions';

export default function OrganizerDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // all, draft, pending, published, completed, archived
  const [feedback, setFeedback] = useState(null);

  const fetchOrganizerEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/organizer/events', { cache: 'no-store' });
      const result = await res.json().catch(() => null);
      if (res.ok && result?.success && Array.isArray(result.data)) {
        setEvents(result.data);
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error('Failed to fetch organizer events:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizerEvents();
  }, []);

  const [confirmModal, setConfirmModal] = useState(null); // { type: 'submit'|'withdraw'|'archive', eventId: string, title: string }

  // Lifecycle Action Handlers
  const handleSubmitForApproval = async (eventId) => {
    setActionLoading(true);
    setConfirmModal(null);
    try {
      const res = await fetch(`/api/v1/organizer/events/${eventId}/submit`, { method: 'POST' });
      if (res.ok) {
        setFeedback({ type: 'success', msg: 'Event submitted for faculty approval!' });
        fetchOrganizerEvents();
      } else {
        setFeedback({ type: 'error', msg: 'Failed to submit event.' });
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Server error submitting event.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdrawSubmission = async (eventId) => {
    setActionLoading(true);
    setConfirmModal(null);
    try {
      const res = await fetch(`/api/v1/organizer/events/${eventId}/withdraw`, { method: 'POST' });
      if (res.ok) {
        setFeedback({ type: 'success', msg: 'Submission withdrawn back to draft.' });
        fetchOrganizerEvents();
      } else {
        setFeedback({ type: 'error', msg: 'Failed to withdraw submission.' });
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Server error withdrawing submission.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchiveEvent = async (eventId) => {
    setActionLoading(true);
    setConfirmModal(null);
    try {
      const res = await fetch(`/api/v1/organizer/events/${eventId}/archive`, { method: 'POST' });
      if (res.ok) {
        setFeedback({ type: 'success', msg: 'Event archived into historical registry.' });
        fetchOrganizerEvents();
      } else {
        setFeedback({ type: 'error', msg: 'Failed to archive event.' });
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Server error archiving event.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelEvent = async (eventId, reason) => {
    setActionLoading(true);
    setConfirmModal(null);
    try {
      const res = await fetch(`/api/v1/organizer/events/${eventId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'Organizer requested event cancellation.' })
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setFeedback({ type: 'success', msg: 'Event cancelled. All registered attendees have been notified.' });
        fetchOrganizerEvents();
      } else {
        setFeedback({ type: 'error', msg: json?.error?.message || json?.error || 'Failed to cancel event.' });
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Server error cancelling event.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Filter events by tab
  const filteredEvents = events.filter((ev) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'draft') return ev.status === 'draft';
    if (activeTab === 'pending') return ev.status === 'pending_faculty' || ev.status === 'pending_admin';
    if (activeTab === 'published') return ev.status === 'published';
    if (activeTab === 'completed') return ev.status === 'completed';
    if (activeTab === 'cancelled') return ev.status === 'cancelled';
    if (activeTab === 'archived') return ev.archived_at != null;
    return true;
  });

  // Permission Check
  const isOrganizer = user && can('event:create', user);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden pb-24">
      {/* Background Backlights */}
      <div className="absolute top-0 right-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-accent/5 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-violet-500/5 blur-3xl" />

      {/* Header */}
      <DashboardNavbar />

      <main className="max-w-7xl mx-auto px-6 pt-6 space-y-6">
        
        {!isOrganizer && user ? (
          <div className="rounded-3xl border border-rose-900/30 bg-rose-950/10 p-12 text-center space-y-3">
            <Lock className="h-10 w-10 text-rose-500 mx-auto" />
            <h3 className="text-lg font-bold text-white">Organizer Access Required</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Your current account does not have active event organizer privileges. Contact your campus administrator or club president to request organizer access.
            </p>
          </div>
        ) : (
          <>
        
        {/* Title Header & Create Event Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/20 px-3 py-1 text-xs font-bold text-accent">
              <Building2 className="h-3.5 w-3.5" /> Event Control Studio
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight mt-2 text-white">
              Event Management Studio
            </h1>
            <p className="text-zinc-400 text-xs mt-1">
              Create, review, publish, announce, and manage student events across your campus.
            </p>
          </div>

          <Link
            href="/dashboard/event-studio/events/new"
            className="rounded-xl bg-accent hover:bg-accent/90 text-xs font-bold text-white px-5 py-3 shadow-lg inline-flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Create New Event
          </Link>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold ${
            feedback.type === 'success' ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300' : 'bg-rose-950/30 border-rose-800/40 text-rose-300'
          }`}>
            <span>{feedback.msg}</span>
            <button onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-white cursor-pointer">✕</button>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-900 pb-3 flex-wrap">
          {[
            { id: 'all', label: 'All Events' },
            { id: 'draft', label: 'Drafts' },
            { id: 'pending', label: 'Pending Review' },
            { id: 'published', label: 'Published' },
            { id: 'completed', label: 'Completed' },
            { id: 'cancelled', label: 'Cancelled' },
            { id: 'archived', label: 'Archived' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Events Grid / Roster */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent mx-auto" />
            <p className="mt-3 text-xs text-zinc-400">Loading organizer workspace...</p>
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {filteredEvents.map((event) => (
              <div 
                key={event.id}
                className="group relative rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 hover:border-zinc-800 transition-all flex flex-col justify-between space-y-4"
              >
                {/* Top Status & Mode Badge */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      event.status === 'published' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      event.status === 'draft' ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' :
                      event.status.startsWith('pending') ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      event.status === 'completed' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                      'bg-zinc-800 text-zinc-400'
                    }`}>
                      {event.status.replace('_', ' ')}
                    </span>

                    <span className="text-[10px] font-bold text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800 capitalize">
                      {event.registration_mode || 'instant'} mode
                    </span>
                  </div>

                  <h3 className="font-extrabold text-lg text-white group-hover:text-accent transition-colors line-clamp-1">
                    {event.title}
                  </h3>

                  {/* Visual Status Timeline for Review Pipeline */}
                  {event.status.startsWith('pending') && (
                    <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-900 text-[10px] space-y-1.5">
                      <span className="font-bold text-zinc-400 block">Approval Pipeline Stage:</span>
                      <div className="flex items-center justify-between font-mono text-zinc-400">
                        <span className="text-emerald-400 font-bold">Draft ✓</span>
                        <span className="text-zinc-600">→</span>
                        <span className={event.status === 'pending_faculty' ? 'text-amber-400 font-bold animate-pulse' : 'text-emerald-400 font-bold'}>Faculty Review</span>
                        <span className="text-zinc-600">→</span>
                        <span className={event.status === 'pending_admin' ? 'text-amber-400 font-bold animate-pulse' : 'text-zinc-500'}>Admin Review</span>
                      </div>
                    </div>
                  )}

                  {/* Metadata Row */}
                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase block">Event Date</span>
                      <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-accent" />
                        {new Date(event.event_date).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase block">Capacity</span>
                      <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-violet-400" />
                        {event.attendee_count || 0} / {event.capacity || '∞'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* State-Driven Action Controls */}
                <div className="pt-4 border-t border-zinc-900/80 flex items-center justify-between gap-2 flex-wrap text-xs">
                  
                  {/* Draft State Actions */}
                  {event.status === 'draft' && (
                    <>
                      <Link
                        href={`/dashboard/event-studio/events/${event.id}/edit`}
                        className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold inline-flex items-center gap-1.5"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Edit
                      </Link>

                      <button
                        onClick={() => setConfirmModal({ type: 'submit', eventId: event.id, title: event.title })}
                        disabled={actionLoading}
                        className="px-4 py-1.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Send className="h-3.5 w-3.5" /> Submit
                      </button>
                    </>
                  )}

                  {/* Pending State Actions */}
                  {event.status.startsWith('pending') && (
                    <>
                      <Link
                        href={`/dashboard/events/${event.id}`}
                        className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold"
                      >
                        View Preview
                      </Link>

                      <button
                        onClick={() => setConfirmModal({ type: 'withdraw', eventId: event.id, title: event.title })}
                        disabled={actionLoading}
                        className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Withdraw
                      </button>
                    </>
                  )}

                  {/* Published State Actions */}
                  {event.status === 'published' && (
                    <div className="flex items-center justify-between w-full gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/event-studio/events/${event.id}/registrations`}
                          className="px-3 py-1.5 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300 font-bold hover:bg-violet-600/30 transition-colors inline-flex items-center gap-1.5"
                        >
                          <Users className="h-3.5 w-3.5" /> Registrations
                        </Link>

                        <Link
                          href={`/dashboard/event-studio/events/${event.id}/checkin`}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 font-bold hover:bg-emerald-600/30 transition-colors inline-flex items-center gap-1.5"
                        >
                          <QrCode className="h-3.5 w-3.5" /> Check-in
                        </Link>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/event-studio/events/${event.id}/announcements`}
                          className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
                          title="Broadcast Announcement"
                        >
                          <Megaphone className="h-3.5 w-3.5 text-accent" />
                        </Link>

                        <Link
                          href={`/dashboard/event-studio/events/${event.id}/edit`}
                          className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
                          title="Edit Settings"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Link>

                        <Link
                          href={`/dashboard/event-studio/events/${event.id}/complete`}
                          className="p-2 rounded-xl bg-zinc-900 hover:bg-emerald-600 hover:text-white text-zinc-300 border border-zinc-800"
                          title="Complete Event"
                        >
                          <Lock className="h-3.5 w-3.5 text-emerald-400" />
                        </Link>

                        <button
                          onClick={() => setConfirmModal({ type: 'cancel', eventId: event.id, title: event.title })}
                          className="p-2 rounded-xl bg-zinc-900 hover:bg-rose-600 hover:text-white text-zinc-300 border border-zinc-800 cursor-pointer"
                          title="Cancel Event"
                        >
                          <XCircle className="h-3.5 w-3.5 text-rose-400" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Cancelled State Actions */}
                  {event.status === 'cancelled' && (
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="text-xs text-rose-400 font-bold flex items-center gap-1.5">
                        <XCircle className="h-3.5 w-3.5" /> Event Cancelled
                      </span>

                      <button
                        onClick={() => setConfirmModal({ type: 'archive', eventId: event.id, title: event.title })}
                        disabled={actionLoading}
                        className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold inline-flex items-center gap-1.5"
                      >
                        <Archive className="h-3.5 w-3.5" /> Archive
                      </button>
                    </div>
                  )}

                  {/* Completed State Actions */}
                  {event.status === 'completed' && (
                    <div className="flex items-center justify-between w-full gap-2">
                      <Link
                        href={`/dashboard/event-studio/events/${event.id}/certificates`}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold inline-flex items-center gap-1.5 shadow-md"
                      >
                        <Award className="h-3.5 w-3.5" /> Issue Certificates
                      </Link>

                      <button
                        onClick={() => setConfirmModal({ type: 'archive', eventId: event.id, title: event.title })}
                        disabled={actionLoading}
                        className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold inline-flex items-center gap-1.5"
                      >
                        <Archive className="h-3.5 w-3.5" /> Archive
                      </button>
                    </div>
                  )}

                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-zinc-900 bg-zinc-900/10 p-12 text-center space-y-3">
            <Building2 className="h-10 w-10 text-zinc-600 mx-auto" />
            <h3 className="text-base font-bold text-zinc-300">No events found in this view</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Create your first event draft to start hosting technical sessions and hackathons on CampusGrid.
            </p>
            <Link
              href="/dashboard/event-studio/events/new"
              className="inline-flex items-center gap-2 rounded-xl bg-accent hover:bg-accent/90 px-4 py-2.5 text-xs font-bold text-white mt-2"
            >
              <Plus className="h-4 w-4" /> Create Event
            </Link>
          </div>
        )}

        </>
        )}

        {/* Confirmation Modal */}
        {confirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 space-y-4 shadow-2xl">
              <h3 className="text-base font-extrabold text-white">
                {confirmModal.type === 'submit' && 'Submit Event for Approval?'}
                {confirmModal.type === 'withdraw' && 'Withdraw Submission?'}
                {confirmModal.type === 'archive' && 'Archive Event?'}
                {confirmModal.type === 'cancel' && 'Cancel Event?'}
              </h3>
              <p className="text-xs text-zinc-400">
                {confirmModal.type === 'submit' && `Are you sure you want to submit "${confirmModal.title}" for faculty review?`}
                {confirmModal.type === 'withdraw' && `Are you sure you want to withdraw "${confirmModal.title}" back to draft?`}
                {confirmModal.type === 'archive' && `Archiving "${confirmModal.title}" moves it into the read-only historical registry.`}
                {confirmModal.type === 'cancel' && `Are you sure you want to cancel "${confirmModal.title}"? All registered attendees will be notified and registrations will be closed.`}
              </p>
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-800">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (confirmModal.type === 'submit') handleSubmitForApproval(confirmModal.eventId);
                    if (confirmModal.type === 'withdraw') handleWithdrawSubmission(confirmModal.eventId);
                    if (confirmModal.type === 'archive') handleArchiveEvent(confirmModal.eventId);
                    if (confirmModal.type === 'cancel') handleCancelEvent(confirmModal.eventId);
                  }}
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer ${
                    confirmModal.type === 'cancel' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-accent hover:bg-accent/90'
                  }`}
                >
                  Confirm Action
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
