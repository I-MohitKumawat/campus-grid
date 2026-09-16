'use client';

/**
 * app/dashboard/event-studio/events/[id]/checkin/page.jsx
 *
 * Dedicated Organizer Check-in Screen for Event Day.
 * Features Live Attendance Statistics, Token / QR processing, Manual Student Roster Search,
 * Filter Tabs, and Idempotent Duplicate Alerts.
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
  Building2,
  RefreshCw,
  XCircle,
  Check
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
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'checked_in' | 'pending'
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
      if (regRes.ok && regJson?.success) setRegistrations(regJson.data || []);
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
  const pendingCount = registrations.filter(r => r.status === 'registered').length;
  const checkInPct = totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0;

  // Process Attendance Check-In (QR Token or User ID)
  const processAttendanceCheckIn = async (identifier, isDirectUserId = false) => {
    if (!identifier) return;
    const cleanId = identifier.trim();
    setActionLoading(true);
    setScanFeedback(null);

    try {
      // Check if registration exists locally in our list
      const existing = registrations.find(r => 
        (isDirectUserId && r.user_id === cleanId) || 
        r.qr_token === cleanId || 
        r.user_id === cleanId
      );

      if (existing && existing.status === 'attended') {
        const timeStr = existing.checked_in_at ? new Date(existing.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'earlier';
        setScanFeedback({
          type: 'duplicate',
          msg: `Duplicate Scan: ${existing.full_name || existing.username} was ALREADY checked in at ${timeStr}.`
        });
        setScanToken('');
        setActionLoading(false);
        return;
      }

      // Build payload: if directly invoked by clicking student row, send user_id; else send qr_token or user_id
      let payload;
      if (isDirectUserId) {
        payload = { user_id: cleanId };
      } else {
        // If it looks like a registration in our list with this user_id, use user_id, otherwise treat as qr_token
        const byUserId = registrations.find(r => r.user_id === cleanId);
        if (byUserId) {
          payload = { user_id: cleanId };
        } else {
          payload = { qr_token: cleanId };
        }
      }

      const res = await fetch(`/api/v1/events/${eventId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (res.ok && result.success) {
        if (result.data?.already_checked_in) {
          setScanFeedback({
            type: 'duplicate',
            msg: result.data.message || `Attendee was already checked in.`
          });
        } else {
          const studentName = result.data?.full_name || result.data?.username || 'Attendee';
          setScanFeedback({
            type: 'success',
            msg: `Check-in Successful! ${studentName} marked as ATTENDED.`
          });
        }
        setScanToken('');
        fetchCheckInData();
      } else {
        setScanFeedback({
          type: 'error',
          msg: result?.error || result?.message || 'Invalid pass token or student not registered.'
        });
      }
    } catch {
      setScanFeedback({ type: 'error', msg: 'Server error processing check-in.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Filter for manual student search and status tabs
  const filteredRegistrations = confirmedAttendees.filter(r => {
    if (filterTab === 'checked_in' && r.status !== 'attended') return false;
    if (filterTab === 'pending' && r.status !== 'registered') return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (r.full_name || '').toLowerCase();
    const uname = (r.username || '').toLowerCase();
    const roll = (r.roll_number || '').toLowerCase();
    const dept = (r.department || '').toLowerCase();
    const email = (r.email || '').toLowerCase();
    const token = (r.qr_token || '').toLowerCase();

    return name.includes(q) || uname.includes(q) || roll.includes(q) || dept.includes(q) || email.includes(q) || token.includes(q);
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden pb-24">
      {/* Backlight Gradients */}
      <div className="absolute top-0 right-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-accent/5 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-violet-500/5 blur-3xl" />

      <DashboardNavbar />

      <main className="max-w-7xl mx-auto px-6 pt-6 space-y-6">
        
        {/* Back Link & Header */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard/event-studio" className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Event Studio
          </Link>
          <button
            onClick={fetchCheckInData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {/* Title Block */}
        <div className="border-b border-zinc-900 pb-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
            <QrCode className="h-3.5 w-3.5" /> Event Day Live Check-in Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
            {event?.title || 'Event Check-in'}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {event?.club_name ? `${event.club_name} · ` : ''}
            {event?.event_date ? new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
            {event?.venue ? ` · ${event.venue}` : ''}
          </p>
        </div>

        {/* Real-time Attendance Statistics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 space-y-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Total Checked-In</span>
            <div className="text-2xl font-extrabold text-emerald-400 flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-emerald-400" /> {checkedInCount} Attendees
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 space-y-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Remaining Confirmed</span>
            <div className="text-2xl font-extrabold text-zinc-200 flex items-center gap-2">
              <Clock className="h-6 w-6 text-amber-400" /> {pendingCount} Pending
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 space-y-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Check-In Progress</span>
            <div className="text-2xl font-extrabold text-accent">
              {checkInPct}% Complete ({checkedInCount} / {totalCount})
            </div>
            <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden mt-2 border border-zinc-800">
              <div className="h-full bg-accent transition-all duration-500" style={{ width: `${checkInPct}%` }} />
            </div>
          </div>
        </div>

        {/* QR SCANNER & MANUAL TOKEN INPUT CONTAINER */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/30 backdrop-blur-xl p-6 space-y-4">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <QrCode className="h-4.5 w-4.5 text-accent" /> Scan or Enter Digital Pass Token
          </h3>

          <form onSubmit={(e) => { e.preventDefault(); processAttendanceCheckIn(scanToken); }} className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              placeholder="Scan QR token or paste student pass UUID..."
              value={scanToken}
              onChange={(e) => setScanToken(e.target.value)}
              className="w-full flex-grow rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-accent font-mono"
            />
            <button
              type="submit"
              disabled={actionLoading || !scanToken.trim()}
              className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-3 text-xs font-bold text-white shadow-lg cursor-pointer disabled:opacity-50 transition-all shrink-0"
            >
              {actionLoading ? 'Processing...' : 'Mark Present'}
            </button>
          </form>

          {/* Feedback Alerts (Success vs Duplicate Scan Warning vs Error) */}
          {scanFeedback && (
            <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold animate-fadeIn ${
              scanFeedback.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' :
              scanFeedback.type === 'duplicate' ? 'bg-amber-950/40 border-amber-500/40 text-amber-300' :
              'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}>
              <span className="flex items-center gap-2">
                {scanFeedback.type === 'duplicate' && <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />}
                {scanFeedback.type === 'success' && <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />}
                {scanFeedback.type === 'error' && <XCircle className="h-4 w-4 text-rose-400 shrink-0" />}
                {scanFeedback.msg}
              </span>
              <button onClick={() => setScanFeedback(null)} className="text-zinc-400 hover:text-white cursor-pointer ml-4">✕</button>
            </div>
          )}
        </div>

        {/* MANUAL STUDENT SEARCH & ONE-CLICK CHECK-IN TABLE */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/20 backdrop-blur-xl p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  filterTab === 'all' ? 'bg-accent text-white' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All Attendees ({totalCount})
              </button>
              <button
                onClick={() => setFilterTab('checked_in')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  filterTab === 'checked_in' ? 'bg-emerald-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Checked In ({checkedInCount})
              </button>
              <button
                onClick={() => setFilterTab('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  filterTab === 'pending' ? 'bg-amber-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Pending ({pendingCount})
              </button>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by name, roll, email, token..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-9 pr-3 py-2 text-xs text-zinc-200 outline-none focus:border-accent"
              />
            </div>
          </div>

          {filteredRegistrations.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500 space-y-1">
              <Users className="h-8 w-8 mx-auto text-zinc-600 mb-2" />
              <p className="font-semibold text-zinc-400">No attendees found.</p>
              <p>No confirmed registrations match your current filter criteria.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {filteredRegistrations.map((reg) => {
                const isCheckedIn = reg.status === 'attended';
                const checkInTime = reg.checked_in_at ? new Date(reg.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;

                return (
                  <div key={reg.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-200">{reg.full_name || reg.username}</span>
                        {reg.roll_number && (
                          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">
                            {reg.roll_number}
                          </span>
                        )}
                        {reg.department && (
                          <span className="text-[10px] text-zinc-500">
                            {reg.department}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                        <span>@{reg.username}</span>
                        {reg.email && <span>· {reg.email}</span>}
                        <span className="font-mono text-zinc-600">· Token: {reg.qr_token}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isCheckedIn ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-900/50 px-3 py-1.5 rounded-xl">
                            <Check className="h-3.5 w-3.5" /> Checked In
                          </span>
                          {checkInTime && (
                            <span className="text-[10px] text-zinc-500 font-mono">
                              at {checkInTime}
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => processAttendanceCheckIn(reg.user_id, true)}
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
          )}
        </div>

      </main>
    </div>
  );
}
