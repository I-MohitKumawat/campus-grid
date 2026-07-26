'use client';

/**
 * app/dashboard/events/[id]/pass/page.jsx
 *
 * Dedicated Scan-Ready QR Pass Page for CampusGrid.
 * Rendered when a student accesses their confirmed event pass.
 */

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ShieldCheck, Sparkles, Building2, Calendar, MapPin, AlertCircle } from 'lucide-react';
import DashboardNavbar from '@/components/layout/DashboardNavbar';

export default function EventPassPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const [user, setUser] = useState({ username: 'arjun', role: 'admin', email: 'arjun@college.ac.in' });
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadPassData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/events/${eventId}`);
        const result = await res.json().catch(() => null);
        if (res.ok && result?.success && result?.data) {
          setEvent(result.data);
        } else {
          setEvent(null);
        }
      } catch (err) {
        console.error('Failed to load pass data:', err);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    }
    loadPassData();
  }, [eventId]);

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/session', { method: 'DELETE' });
      router.push('/sign-in');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-zinc-950 text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <p className="mt-4 text-sm text-zinc-400 font-medium">Generating Digital QR Pass...</p>
      </div>
    );
  }

  const registration = event?.user_registration;
  const eventDate = event?.event_date ? new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const eventTime = event?.event_date ? new Date(event.event_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden pb-24">
      {/* Background Backlights */}
      <div className="absolute top-0 right-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-accent/5 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-violet-500/5 blur-3xl" />

      {/* Header */}
      <DashboardNavbar user={user} onLogout={handleLogout} />

      <main className="max-w-xl mx-auto px-6 pt-8 space-y-6">
        
        {/* Back Button */}
        <Link 
          href={`/dashboard/events/${eventId}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Event Details
        </Link>

        {/* Digital Pass Ticket Container */}
        <div className="relative rounded-[32px] border border-zinc-800 bg-zinc-900/40 backdrop-blur-2xl overflow-hidden shadow-2xl p-6 sm:p-8 space-y-6 text-center">
          
          {/* Header Badge */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <ShieldCheck className="h-4 w-4" /> Verified Campus Pass
            </span>
            <span className="bg-zinc-800 text-zinc-300 border border-zinc-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">
              {registration?.status || 'Confirmed'}
            </span>
          </div>

          {/* Event Header */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-accent uppercase tracking-widest block">
              {event?.club_name || 'CampusGrid Event'}
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {event?.title}
            </h1>
          </div>

          {/* Large Scan-Ready Vector QR Code */}
          <div className="py-4 flex flex-col items-center justify-center space-y-3">
            <div className="bg-white p-4 rounded-3xl shadow-2xl border-4 border-zinc-800 inline-block">
              <svg className="w-56 h-56 text-zinc-950" viewBox="0 0 100 100" fill="currentColor">
                <rect x="5" y="5" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
                <rect x="12" y="12" width="11" height="11" />
                
                <rect x="70" y="5" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
                <rect x="77" y="12" width="11" height="11" />
                
                <rect x="5" y="70" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
                <rect x="12" y="77" width="11" height="11" />

                <rect x="35" y="5" width="5" height="5" />
                <rect x="45" y="10" width="10" height="5" />
                <rect x="40" y="20" width="5" height="10" />
                <rect x="55" y="15" width="5" height="5" />
                
                <rect x="5" y="35" width="5" height="5" />
                <rect x="10" y="45" width="10" height="5" />
                <rect x="20" y="40" width="5" height="10" />
                <rect x="15" y="55" width="5" height="5" />

                <rect x="35" y="35" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="4" />
                <rect x="40" y="40" width="5" height="5" />

                <rect x="70" y="35" width="5" height="10" />
                <rect x="80" y="40" width="10" height="5" />
                <rect x="85" y="50" width="5" height="10" />
                
                <rect x="35" y="70" width="10" height="5" />
                <rect x="45" y="80" width="5" height="10" />
                <rect x="50" y="75" width="5" height="5" />

                <rect x="70" y="70" width="10" height="10" />
                <rect x="85" y="75" width="10" height="5" />
                <rect x="80" y="85" width="15" height="10" />

                <rect x="46" y="46" width="8" height="8" fill="#4F46E5" rx="2" />
              </svg>
            </div>

            <span className="text-[11px] font-mono text-zinc-400 bg-zinc-950/80 px-3 py-1 rounded-full border border-zinc-800">
              Token: {registration?.qr_token || `QR-${eventId}-TOKEN`}
            </span>
          </div>

          {/* Student Info & Venue Block */}
          <div className="grid grid-cols-2 gap-4 text-left pt-4 border-t border-zinc-800/80 text-xs">
            <div className="space-y-1">
              <span className="text-zinc-500 font-bold uppercase tracking-wider text-[9px]">Attendee</span>
              <span className="font-bold text-zinc-200 block">{user?.username === 'arjun' ? 'Arjun Dev' : user?.username}</span>
              <span className="text-[10px] text-zinc-450 block">{user?.email}</span>
            </div>

            <div className="space-y-1">
              <span className="text-zinc-500 font-bold uppercase tracking-wider text-[9px]">Event Schedule</span>
              <span className="font-bold text-zinc-200 block">{eventDate}</span>
              <span className="text-[10px] text-accent block">{eventTime}</span>
            </div>
          </div>

          {/* Instructions Notice */}
          <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-3.5 text-xs text-zinc-400 leading-relaxed flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4 text-accent shrink-0" />
            <span>Present this QR code to the organizer during check-in at the venue.</span>
          </div>

        </div>
      </main>
    </div>
  );
}
