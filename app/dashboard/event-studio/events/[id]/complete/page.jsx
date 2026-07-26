'use client';

/**
 * app/dashboard/organizer/events/[id]/complete/page.jsx
 *
 * Dedicated Event Completion & Attendance Locking Screen.
 * Summarizes attendance stats, locks check-in, freezes registrations,
 * and transitions event status to 'completed'.
 */

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Lock, Award, Users, AlertTriangle, Sparkles } from 'lucide-react';
import DashboardNavbar from '@/components/layout/DashboardNavbar';
import { useAuth } from '@/components/providers/AuthProvider';

export default function EventCompletionPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const [eRes, rRes] = await Promise.all([
        fetch(`/api/v1/events/${eventId}`, { cache: 'no-store' }),
        fetch(`/api/v1/organizer/events/${eventId}/registrations`, { cache: 'no-store' })
      ]);

      const eJson = await eRes.json().catch(() => null);
      const rJson = await rRes.json().catch(() => null);

      if (eRes.ok && eJson?.success) setEvent(eJson.data);
      if (rRes.ok && rJson?.success) setRegistrations(rJson.data);
    } catch (err) {
      console.error('Failed to fetch completion details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [eventId]);

  const handleCompleteEvent = async () => {
    setActionLoading(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/v1/organizer/events/${eventId}/complete`, { method: 'POST' });
      const result = await res.json();

      if (res.ok && result.success) {
        setFeedback({
          type: 'success',
          msg: 'Event marked as COMPLETED! Registrations & check-in are locked. Certificate issuance enabled.'
        });
        fetchDetails();
      } else {
        setFeedback({ type: 'error', msg: result?.error?.message || 'Failed to complete event.' });
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Server error completing event.' });
    } finally {
      setActionLoading(false);
    }
  };

  const confirmed = registrations.filter(r => r.status === 'registered' || r.status === 'attended');
  const attended = registrations.filter(r => r.status === 'attended');
  const turnOutPct = confirmed.length > 0 ? Math.round((attended.length / confirmed.length) * 100) : 0;
  const isCompleted = event?.status === 'completed';

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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
            <Lock className="h-3.5 w-3.5" /> Event Lifecycle Closure
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-2">
            Event Completion & Lockout
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Review final attendance turnout, freeze mutations, and proceed to certificate issuance for <strong className="text-zinc-200">{event?.title || 'Event'}</strong>.
          </p>
        </div>

        {feedback && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold ${
            feedback.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}>
            <span>{feedback.msg}</span>
            <button onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Turnout Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-5 space-y-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Total Confirmed</span>
            <div className="text-2xl font-extrabold text-white">{confirmed.length} Registered</div>
          </div>

          <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-5 space-y-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Actual Attended</span>
            <div className="text-2xl font-extrabold text-emerald-400">{attended.length} Checked In</div>
          </div>

          <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-5 space-y-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Turnout Rate</span>
            <div className="text-2xl font-extrabold text-accent">{turnOutPct}% Turnout</div>
          </div>
        </div>

        {/* Completion Control Box */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/30 backdrop-blur-xl p-6 sm:p-8 space-y-6">
          {isCompleted ? (
            <div className="space-y-4 text-center py-4">
              <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto" />
              <h3 className="font-extrabold text-lg text-white">This Event is Officially Completed</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Registrations and check-ins are locked. You can now issue digital participation certificates to all {attended.length} attended students.
              </p>

              <Link
                href={`/dashboard/event-studio/events/${eventId}/certificates`}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-3 text-xs font-bold text-white shadow-lg transition-all"
              >
                <Award className="h-4 w-4" /> Proceed to Certificate Issuance
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs font-bold flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-200">Warning: Freezing Action</h4>
                  <p className="text-amber-300/80 font-normal mt-0.5">
                    Marking this event as completed will permanently lock student check-in, freeze registration changes, and unlock the certificate release engine.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-zinc-900">
                <span className="text-xs text-zinc-500">
                  Verify attendance counts before finalizing completion.
                </span>

                <button
                  onClick={handleCompleteEvent}
                  disabled={actionLoading}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-lg inline-flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Lock className="h-4 w-4" /> {actionLoading ? 'Locking Event...' : 'Mark Event as Completed'}
                </button>
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
