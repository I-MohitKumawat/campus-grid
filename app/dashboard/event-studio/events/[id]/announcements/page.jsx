'use client';

/**
 * app/dashboard/organizer/events/[id]/announcements/page.jsx
 *
 * Dedicated Broadcast Announcement Page for Organizers.
 * Dispatches in-app notification alerts to all registered event attendees.
 */

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Megaphone, Send, Users, Sparkles, CheckCircle, MessageSquare } from 'lucide-react';
import DashboardNavbar from '@/components/layout/DashboardNavbar';
import { useAuth } from '@/components/providers/AuthProvider';

export default function BroadcastAnnouncementPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/v1/events/${eventId}`, { cache: 'no-store' });
        const result = await res.json().catch(() => null);
        if (res.ok && result?.success) setEvent(result.data);
      } catch (err) {
        console.error('Failed to fetch event:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  const handleSendBroadcast = async () => {
    if (!title || !message) {
      setFeedback({ type: 'error', msg: 'Title and Message are required for announcements.' });
      return;
    }

    setSending(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/v1/organizer/events/${eventId}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message })
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setFeedback({
          type: 'success',
          msg: `Announcement broadcasted! Notifications sent to ${result.data?.broadcast_count || 0} registered attendees.`
        });
        setTitle('');
        setMessage('');
      } else {
        setFeedback({ type: 'error', msg: result?.error?.message || 'Failed to send broadcast.' });
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Server error broadcasting announcement.' });
    } finally {
      setSending(false);
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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 px-3 py-1 text-xs font-bold text-violet-400">
            <Megaphone className="h-3.5 w-3.5" /> Broadcast Studio
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-2">
            Broadcast Announcement
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Send real-time in-app alerts & updates to all registered attendees of <strong className="text-zinc-200">{event?.title || 'Event'}</strong>.
          </p>
        </div>

        {feedback && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold ${
            feedback.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}>
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
              {feedback.msg}
            </span>
            <button onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-white">✕</button>
          </div>
        )}

        <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 sm:p-8 space-y-6">
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Announcement Title</label>
            <input
              type="text"
              placeholder="e.g. Venue Change to Hall B / Wi-Fi Credentials Released"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-accent"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Broadcast Message</label>
            <textarea
              rows={5}
              placeholder="Write important updates, instructions, or track assignments..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-900">
            <span className="text-xs text-zinc-500">
              This message will be instantly delivered to all registered student notification feeds.
            </span>

            <button
              onClick={handleSendBroadcast}
              disabled={sending || !title || !message}
              className="px-6 py-3 rounded-xl bg-accent hover:bg-accent/90 text-xs font-bold text-white shadow-lg inline-flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> {sending ? 'Broadcasting...' : 'Broadcast Announcement'}
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
