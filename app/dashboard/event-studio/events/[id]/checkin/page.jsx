'use client';

/**
 * app/dashboard/organizer/events/[id]/checkin/page.jsx
 *
 * Dedicated Organizer Check-in Screen for Event Day.
 * Features Attendance Statistics, QR Scan token processing, Manual Student Search,
 * and Duplicate Scan Warning Alerts.
 */

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  QrCode, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  ArrowLeft, 
  Users, 
  UserCheck, 
  Clock, 
  Sparkles,
  ShieldCheck,
  Building2
} from 'lucide-react';
import DashboardNavbar from '@/components/layout/DashboardNavbar';
import { useAuth } from '@/components/providers/AuthProvider';

export default function OrganizerCheckInPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [scanToken, setScanToken] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [scanFeedback, setScanFeedback] = useState(null); // { type: 'success'|'duplicate'|'error', msg: string }

  const fetchCheckInData = async () => {
    setLoading(true);
    try {
      const [eventRes, regRes] = await Promise.all([
        fetch(`/api/v1/events/${eventId}`, { cache: 'no-store' }),
        fetch(`/api/v1/organizer/events/${eventId}/registrations`, { cache: 'no-store' })
      ]);

      const eventJson = await eventRes.json().catch(() => null);
      const regJson = await regRes.json().catch(() => null);

      if (eventRes.ok && eventJson?.success) setEvent(eventJson.data);
      if (regRes.ok && regJson?.success) setRegistrations(regJson.data);
    } catch (err) {
      console.error('Failed to fetch check-in data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCheckInData();
  }, [eventId]);

  // Compute Attendance Stats
  const confirmedAttendees = registrations.filter(r => r.status === 'registered' || r.status === 'attended');
  const checkedInCount = registrations.filter(r => r.status === 'attended').length;
  const totalCount = confirmedAttendees.length;
  const checkInPct = totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0;

  // Process Attendance Check-In (QR Token or User ID)
  const processAttendanceCheckIn = async (identifier) => {
    if (!identifier) return;
    setActionLoading(true);
    setScanFeedback(null);

    try {
      // Find matching registration to check if already attended
      const existing = registrations.find(r => 
        r.user_id === identifier || 
        r.username === identifier || 
        r.qr_token === identifier
      );

      if (existing && existing.status === 'attended') {
        const timeStr = existing.checked_in_at ? new Date(existing.checked_in_at).toLocaleTimeString() : 'earlier';
        setScanFeedback({
          type: 'duplicate',
          msg: `Duplicate Scan Warning: ${existing.full_name || existing.username} was ALREADY checked in at ${timeStr}.`
        });
        setScanToken('');
        return;
      }

      const isQr = identifier.startsWith('QR-');
      const payload = isQr ? { qr_token: identifier } : { user_id: identifier };

      const res = await fetch(`/api/v1/events/${eventId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setScanFeedback({
          type: 'success',
          msg: `Check-in Successful! Student marked as ATTENDED.`
        });
        setScanToken('');
        fetchCheckInData();
      } else {
        setScanFeedback({
          type: 'error',
          msg: result?.error?.message || 'Invalid pass token or student not registered.'
        });
      }
    } catch {
      setScanFeedback({ type: 'error', msg: 'Server error processing check-in.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Filter for manual student search
  const searchedRegistrations = confirmedAttendees.filter(r => {
    if (!searchQuery) return true;
    const name = (r.full_name || '').toLowerCase();
    const uname = (r.username || '').toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || uname.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden pb-24">
      {/* Backlight Gradients */}
      <div className="absolute top-0 right-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-accent/5 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-violet-500/5 blur-3xl" />

      <DashboardNavbar />

      <main className="max-w-7xl mx-auto px-6 pt-6 space-y-6">
        
        {/* Back Link */}
        <Link href="/dashboard/event-studio" className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Event Studio
        </Link>

        {/* Title */}
        <div className="border-b border-zinc-900 pb-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
            <QrCode className="h-3.5 w-3.5" /> Event Day Live Check-in Portal
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-2">
            {event?.title || 'Event Check-in'}
          </h1>
        </div>

        {/* Real-time Attendance Statistics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-5 space-y-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Total Checked-In</span>
            <div className="text-2xl font-extrabold text-emerald-400 flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-emerald-400" /> {checkedInCount} Attendees
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-5 space-y-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Remaining Confirmed</span>
            <div className="text-2xl font-extrabold text-zinc-200 flex items-center gap-2">
              <Clock className="h-6 w-6 text-amber-400" /> {Math.max(0, totalCount - checkedInCount)} Pending
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-5 space-y-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Check-In Progress</span>
            <div className="text-2xl font-extrabold text-accent">
              {checkInPct}% Complete
            </div>
            <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-accent transition-all duration-500" style={{ width: `${checkInPct}%` }} />
            </div>
          </div>
        </div>

        {/* QR SCANNER & MANUAL TOKEN INPUT CONTAINER */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/30 backdrop-blur-xl p-6 space-y-4">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <QrCode className="h-4.5 w-4.5 text-accent" /> Scan or Enter Digital Pass Token
          </h3>

          <form onSubmit={(e) => { e.preventDefault(); processAttendanceCheckIn(scanToken); }} className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Scan QR token or paste student ID / token..."
              value={scanToken}
              onChange={(e) => setScanToken(e.target.value)}
              className="flex-grow rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-accent font-mono"
            />
            <button
              type="submit"
              disabled={actionLoading || !scanToken}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-3 text-xs font-bold text-white shadow-lg cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? 'Processing...' : 'Mark Present'}
            </button>
          </form>

          {/* Feedback Alerts (Success vs Duplicate Scan Warning) */}
          {scanFeedback && (
            <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold animate-fadeIn ${
              scanFeedback.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' :
              scanFeedback.type === 'duplicate' ? 'bg-amber-950/40 border-amber-500/40 text-amber-300' :
              'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}>
              <span className="flex items-center gap-2">
                {scanFeedback.type === 'duplicate' && <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />}
                {scanFeedback.type === 'success' && <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />}
                {scanFeedback.msg}
              </span>
              <button onClick={() => setScanFeedback(null)} className="text-zinc-400 hover:text-white cursor-pointer">✕</button>
            </div>
          )}
        </div>

        {/* MANUAL STUDENT SEARCH & ONE-CLICK CHECK-IN TABLE */}
        <div className="rounded-3xl border border-zinc-900 bg-zinc-900/10 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
            <h3 className="font-bold text-base text-zinc-100">Manual Student Roster Check-in</h3>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search student by name or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-9 pr-3 py-2 text-xs text-zinc-200 outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="divide-y divide-zinc-900/60">
            {searchedRegistrations.map((reg) => {
              const isCheckedIn = reg.status === 'attended';

              return (
                <div key={reg.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-zinc-200 block">{reg.full_name || reg.username}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">@{reg.username}</span>
                  </div>

                  <div>
                    {isCheckedIn ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-900/50 px-3 py-1.5 rounded-xl">
                        <CheckCircle className="h-3.5 w-3.5" /> Checked In
                      </span>
                    ) : (
                      <button
                        onClick={() => processAttendanceCheckIn(reg.user_id)}
                        disabled={actionLoading}
                        className="rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-emerald-600 hover:text-white hover:border-emerald-500 px-4 py-1.5 text-xs font-bold text-zinc-300 transition-all cursor-pointer disabled:opacity-50"
                      >
                        Mark Present
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </main>
    </div>
  );
}
