'use client';

/**
 * app/dashboard/events/[id]/page.jsx
 *
 * Dedicated Event Details Page for CampusGrid.
 * Complete Event Registration flow, button engine, specifications,
 * QR availability gating, and waitlist management.
 */

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Globe, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft, 
  Sparkles, 
  Award, 
  UserCheck, 
  Mail, 
  Building2, 
  QrCode, 
  XCircle, 
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Tag,
  ArrowRight,
  CheckCircle2,
  Edit3
} from 'lucide-react';
import DashboardNavbar from '@/components/layout/DashboardNavbar';
import { useAuth } from '@/components/providers/AuthProvider';
import { can } from '@/lib/permissions';

export default function EventDetailPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const { user, logout: handleLogout } = useAuth();
  const [event, setEvent] = useState(null);
  const [relatedEvents, setRelatedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', msg: string }

  // Fetch Event Details
  useEffect(() => {
    async function loadEventData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/events/${eventId}`);
        const result = await res.json().catch(() => null);
        
        if (res.ok && result?.success && result?.data) {
          setEvent(result.data);
          setRelatedEvents(result.data.related_events || []);
        } else {
          setEvent(null);
        }
      } catch (err) {
        console.error('Failed to fetch event:', err);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    }
    loadEventData();
  }, [eventId]);

  // Handle Registration Action
  const handleRegister = async () => {
    if (!event) return;
    setActionLoading(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/v1/events/${eventId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance_mode: 'offline' })
      });

      const result = await res.json().catch(() => null);

      if (res.ok && result?.success && result?.data) {
        const regData = result.data;
        const isApprovalMode = event.registration_mode === 'approval';

        setEvent(prev => ({
          ...prev,
          attendee_count: isApprovalMode ? prev.attendee_count : prev.attendee_count + 1,
          remaining_seats: prev.remaining_seats !== null ? Math.max(0, prev.remaining_seats - 1) : null,
          button_state: isApprovalMode ? 'PENDING_APPROVAL' : (regData.status === 'waitlisted' ? 'WAITLISTED' : 'REGISTERED'),
          user_registration: regData
        }));

        setFeedback({
          type: 'success',
          msg: isApprovalMode 
            ? 'Application Submitted! Waiting for organizer approval.' 
            : regData.status === 'waitlisted'
            ? 'Capacity reached. You have been added to the waitlist.'
            : 'Registration Successful! Your seat has been confirmed.'
        });
      } else {
        setFeedback({
          type: 'error',
          msg: result?.error?.message || result?.error || 'Registration failed. Please try again.'
        });
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Network error during registration. Please try again.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Cancellation Action
  const handleCancelRegistration = async () => {
    if (!event) return;
    setActionLoading(true);
    setFeedback(null);

    try {
      await fetch(`/api/v1/events/${eventId}/register`, { method: 'DELETE' });

      setEvent(prev => ({
        ...prev,
        attendee_count: Math.max(0, prev.attendee_count - 1),
        remaining_seats: prev.remaining_seats !== null ? prev.remaining_seats + 1 : null,
        button_state: prev.registration_mode === 'approval' ? 'APPLY' : 'REGISTER',
        user_registration: null
      }));

      setFeedback({ type: 'success', msg: 'Registration cancelled successfully.' });
    } catch (err) {
      setFeedback({ type: 'error', msg: 'Failed to cancel registration.' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-zinc-950 text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <p className="mt-4 text-sm text-zinc-400 font-medium">Loading Event Details...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6">
        <AlertCircle className="h-12 w-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold">Event Not Found</h2>
        <p className="text-sm text-zinc-400 mt-2">The event you requested does not exist or has been removed.</p>
        <Link href="/dashboard/events" className="mt-6 rounded-xl bg-brand px-6 py-2.5 text-xs font-semibold text-white">
          Back to Events
        </Link>
      </div>
    );
  }

  // Format Timestamps
  const now = new Date();
  const eventDateObj = new Date(event.event_date);
  const formattedDate = eventDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const formattedTime = eventDateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  const deadlineObj = event.registration_deadline ? new Date(event.registration_deadline) : eventDateObj;
  const formattedDeadline = deadlineObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Evaluation Rules
  const isPastDeadline = now > deadlineObj;
  const isOngoing = event.status === 'published' && now >= eventDateObj && now <= new Date(eventDateObj.getTime() + (event.duration_minutes || 120) * 60000);
  
  // Check-In Window: Check-in enabled AND within 1 hour of start time (or ongoing)
  const isCheckInOpen = event.check_in_enabled && (now >= new Date(eventDateObj.getTime() - 1 * 60 * 60 * 1000));

  // Cancellation Allowed until registration deadline
  const isCancellationAllowed = !isPastDeadline && now < eventDateObj;

  // Render Primary Action Button
  const renderPrimaryButton = () => {
    const state = event.button_state || 'REGISTER';

    switch (state) {
      case 'ATTENDED':
        return (
          <button disabled className="w-full rounded-xl bg-emerald-950/40 border border-emerald-500/30 py-3.5 text-sm font-bold text-emerald-400 flex items-center justify-center gap-2 cursor-not-allowed">
            <CheckCircle className="h-4 w-4" /> Attended Event
          </button>
        );
      case 'REGISTERED':
        return (
          <button disabled className="w-full rounded-xl bg-emerald-600/20 border border-emerald-500/30 py-3.5 text-sm font-bold text-emerald-400 flex items-center justify-center gap-2 cursor-not-allowed">
            <CheckCircle className="h-4 w-4" /> Registered
          </button>
        );
      case 'PENDING_APPROVAL':
        return (
          <button disabled className="w-full rounded-xl bg-amber-500/20 border border-amber-500/30 py-3.5 text-sm font-bold text-amber-400 flex items-center justify-center gap-2 cursor-not-allowed">
            <Clock className="h-4 w-4" /> Pending Approval
          </button>
        );
      case 'WAITLISTED':
        return (
          <button disabled className="w-full rounded-xl bg-purple-500/20 border border-purple-500/30 py-3.5 text-sm font-bold text-purple-400 flex items-center justify-center gap-2 cursor-not-allowed">
            <Clock className="h-4 w-4" /> On Waitlist
          </button>
        );
      case 'CANCELLED':
        return (
          <button disabled className="w-full rounded-xl bg-rose-950/40 border border-rose-500/30 py-3.5 text-sm font-bold text-rose-400 flex items-center justify-center gap-2 cursor-not-allowed">
            <XCircle className="h-4 w-4" /> Event Cancelled
          </button>
        );
      case 'EVENT_ENDED':
        return (
          <button disabled className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-3.5 text-sm font-bold text-zinc-500 flex items-center justify-center gap-2 cursor-not-allowed">
            Event Ended
          </button>
        );
      case 'REGISTRATION_CLOSED':
        return (
          <button disabled className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-3.5 text-sm font-bold text-zinc-500 flex items-center justify-center gap-2 cursor-not-allowed">
            Registration Closed
          </button>
        );
      case 'EVENT_FULL':
        return (
          <button disabled className="w-full rounded-xl bg-rose-950/20 border border-rose-900/40 py-3.5 text-sm font-bold text-rose-400 flex items-center justify-center gap-2 cursor-not-allowed">
            Event Full
          </button>
        );
      case 'APPLY':
        return (
          <button
            onClick={handleRegister}
            disabled={actionLoading}
            className="w-full rounded-xl bg-gradient-to-r from-accent to-violet-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-accent/20 hover:scale-102 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {actionLoading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : 'Apply'}
          </button>
        );
      case 'REGISTER':
      default:
        return (
          <button
            onClick={handleRegister}
            disabled={actionLoading}
            className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-600/20 hover:scale-102 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {actionLoading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : 'Register'}
          </button>
        );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden pb-24">
      {/* Background Gradients */}
      <div className="absolute top-0 right-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-accent/5 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-violet-500/5 blur-3xl" />

      {/* Navigation Navbar */}
      <DashboardNavbar user={user} onLogout={handleLogout} />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 pt-6 space-y-8">
        
        {/* Breadcrumb & Contextual Privileged Control */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 overflow-hidden">
            <Link href="/dashboard/events" className="flex items-center gap-1 hover:text-white transition-colors shrink-0">
              <ArrowLeft className="h-3.5 w-3.5" /> Events
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-200 truncate max-w-xs">{event.title}</span>
          </div>

          {can('event:manage', user, { event }) && (
            <Link
              href={`/dashboard/event-studio/events/${event.id}/edit`}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-accent text-zinc-200 hover:text-white text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer"
            >
              <Edit3 className="h-3.5 w-3.5 text-accent" />
              <span>Manage in Event Studio</span>
            </Link>
          )}
        </div>

        {/* ── SECTION 1: HERO BANNER ── */}
        <div className="relative rounded-[32px] border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl overflow-hidden shadow-2xl">
          <div className="relative h-64 sm:h-80 w-full bg-zinc-950 overflow-hidden">
            <img 
              src={event.banner_url || '/images/campus_night_glow.png'} 
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />

            <div className="absolute top-6 left-6 flex items-center gap-2 flex-wrap">
              <span className="rounded-full bg-violet-500/20 border border-violet-500/30 backdrop-blur-md px-3 py-1 text-xs font-bold text-violet-300 uppercase tracking-wider">
                {event.category || event.event_type}
              </span>
              <span className="rounded-full bg-zinc-950/80 border border-zinc-800 backdrop-blur-md px-3 py-1 text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" /> Published
              </span>
              {event.registration_mode === 'approval' && (
                <span className="rounded-full bg-amber-500/20 border border-amber-500/30 backdrop-blur-md px-3 py-1 text-xs font-bold text-amber-300">
                  Approval Required
                </span>
              )}
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6 relative -mt-12">
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                {event.title}
              </h1>
              
              <div className="flex items-center gap-3 text-xs text-zinc-400 pt-1">
                <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-accent">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold text-zinc-200 block">{event.club_name || 'CampusGrid Community'}</span>
                  <span className="text-[10px] text-zinc-500">Organized by {event.organiser_full_name || event.organiser_username}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-zinc-900">
              <div className="flex items-center gap-3 bg-zinc-950/40 border border-zinc-900 rounded-2xl p-3.5">
                <Calendar className="h-5 w-5 text-accent shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block">Date & Time</span>
                  <span className="text-xs font-bold text-zinc-200">{formattedDate} · {formattedTime}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-zinc-950/40 border border-zinc-900 rounded-2xl p-3.5">
                <MapPin className="h-5 w-5 text-violet-400 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block">Venue</span>
                  <span className="text-xs font-bold text-zinc-200 truncate block max-w-[200px]">{event.venue || 'Online Event'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-zinc-950/40 border border-zinc-900 rounded-2xl p-3.5">
                <Users className="h-5 w-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block">Remaining Seats</span>
                  <span className="text-xs font-bold text-zinc-200">{event.remaining_seats !== null ? event.remaining_seats : 'Unlimited'} Seats</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── REGISTRATION SUCCESS & ACTION FEEDBACK BANNER ── */}
        {feedback && (
          <div className={`p-6 rounded-2xl border space-y-4 animate-fadeIn ${
            feedback.type === 'success' ? 'bg-emerald-950/30 border-emerald-800/40' : 'bg-rose-950/30 border-rose-800/40'
          }`}>
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className={`flex items-center gap-2 ${feedback.type === 'success' ? 'text-emerald-300' : 'text-rose-300'}`}>
                {feedback.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" /> : <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />}
                <span>{feedback.msg}</span>
              </span>
              <button onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-white cursor-pointer">✕</button>
            </div>

            {/* Post-Registration Action Buttons */}
            {feedback.type === 'success' && event.user_registration && (
              <div className="flex items-center gap-3 pt-2 border-t border-emerald-900/40">
                <Link
                  href="/dashboard/events"
                  className="rounded-xl bg-emerald-600/20 border border-emerald-500/30 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-600/30 transition-colors"
                >
                  View My Events
                </Link>
                <Link
                  href="/dashboard/events"
                  className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Continue Browsing Events
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── TWO-COLUMN WORKSPACE ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ──── LEFT COLUMN (col-span-8) ──── */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* ── SECTION 2: ABOUT ── */}
            <div className="rounded-[28px] border border-zinc-900 bg-zinc-900/10 backdrop-blur-xl p-8 space-y-4">
              <h2 className="font-display text-lg font-bold text-zinc-100 flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-accent" /> About the Event
              </h2>
              
              <p className="text-sm font-semibold text-zinc-300 leading-relaxed">
                {event.short_description || event.description}
              </p>

              {event.description && event.description !== event.short_description && (
                <div className="text-xs text-zinc-400 leading-relaxed whitespace-pre-line pt-2 border-t border-zinc-900">
                  {event.description}
                </div>
              )}

              {event.domain_tags && event.domain_tags.length > 0 && (
                <div className="pt-4 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mr-2 flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Skill Domains:
                  </span>
                  {event.domain_tags.map((tag, idx) => (
                    <span key={idx} className="rounded-lg bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-[11px] font-bold text-zinc-300">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ── SECTION 3: REORDERED EVENT SPECIFICATIONS ── */}
            <div className="rounded-[28px] border border-zinc-900 bg-zinc-900/10 backdrop-blur-xl p-8 space-y-6">
              <h2 className="font-display text-lg font-bold text-zinc-100 border-b border-zinc-900 pb-4">
                Event Specifications
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                {/* 1. Organizer */}
                {event.club_name && (
                  <div className="space-y-1">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider block text-[10px]">Organizer</span>
                    <span className="font-semibold text-zinc-200">{event.club_name}</span>
                  </div>
                )}

                {/* 2. Venue */}
                {event.venue && (
                  <div className="space-y-1">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider block text-[10px]">Venue</span>
                    <span className="font-semibold text-zinc-200">{event.venue}</span>
                  </div>
                )}

                {/* 3. Duration */}
                {event.duration_minutes && (
                  <div className="space-y-1">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider block text-[10px]">Duration</span>
                    <span className="font-semibold text-zinc-200">{event.duration_minutes} Minutes</span>
                  </div>
                )}

                {/* 4. Registration Deadline */}
                {event.registration_deadline && (
                  <div className="space-y-1">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider block text-[10px]">Registration Deadline</span>
                    <span className="font-semibold text-zinc-200">{formattedDeadline}</span>
                  </div>
                )}

                {/* 5. Attendance Mode */}
                <div className="space-y-1">
                  <span className="text-zinc-500 font-bold uppercase tracking-wider block text-[10px]">Attendance Mode</span>
                  <span className="font-semibold text-zinc-200 capitalize">{event.attendance_mode || 'Offline'}</span>
                </div>

                {/* 6. Certificate */}
                <div className="space-y-1">
                  <span className="text-zinc-500 font-bold uppercase tracking-wider block text-[10px]">Certificate Available</span>
                  <span className="font-semibold text-emerald-400">{event.certificates_enabled ? 'Yes (Verified Certificate)' : 'No'}</span>
                </div>

                {/* 7. Eligibility */}
                {(event.target_departments || event.target_years) && (
                  <div className="space-y-1 sm:col-span-2">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider block text-[10px]">Eligibility</span>
                    <span className="font-semibold text-zinc-200">
                      {event.target_departments ? event.target_departments.join(', ') : 'All Departments'}
                      {event.target_years ? ` (Years: ${event.target_years.join(', ')})` : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── SECTION 4: FUTURE-PROOF AGENDA TIMELINE ── */}
            {event.agenda && event.agenda.length > 0 && (
              <div className="rounded-[28px] border border-zinc-900 bg-zinc-900/10 backdrop-blur-xl p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                  <h2 className="font-display text-lg font-bold text-zinc-100 flex items-center gap-2">
                    <Clock className="h-4.5 w-4.5 text-accent" /> Event Schedule & Agenda
                  </h2>
                  {isOngoing && (
                    <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-[10px] font-bold text-emerald-400 animate-pulse">
                      ● Live Ongoing Event
                    </span>
                  )}
                </div>

                <div className="relative border-l-2 border-zinc-850 ml-3 pl-6 space-y-6">
                  {event.agenda.map((item, idx) => {
                    // Agenda active logic: highlight first item or active session if event is ongoing
                    const isActive = isOngoing && idx === 0;

                    return (
                      <div key={idx} className="relative group">
                        <div className={`absolute -left-[32.5px] top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-zinc-950 border-2 ${
                          isActive ? 'border-emerald-400 animate-bounce' : 'border-accent'
                        }`}>
                          <div className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-accent'}`} />
                        </div>
                        
                        <div className={`p-4 rounded-xl border transition-all ${
                          isActive 
                            ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-950/30' 
                            : 'bg-zinc-950/40 border-zinc-900'
                        } space-y-1`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold uppercase tracking-widest block ${isActive ? 'text-emerald-400' : 'text-accent'}`}>
                              {item.time}
                            </span>
                            {isActive && (
                              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
                                Active Session
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-zinc-200 text-sm">{item.title}</h4>
                          <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── SECTION 5: SPEAKER (CONDITIONALLY RENDERED) ── */}
            {event.speaker_info && event.speaker_info.name && (
              <div className="rounded-[28px] border border-zinc-900 bg-zinc-900/10 backdrop-blur-xl p-8 space-y-6">
                <h2 className="font-display text-lg font-bold text-zinc-100 border-b border-zinc-900 pb-4 flex items-center gap-2">
                  <UserCheck className="h-4.5 w-4.5 text-violet-400" /> Featured Keynote Speaker
                </h2>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-5 rounded-2xl bg-zinc-950/40 border border-zinc-900">
                  <div className="h-16 w-16 rounded-2xl bg-violet-600/15 border border-violet-500/20 flex items-center justify-center font-bold text-xl text-violet-300 shrink-0">
                    {event.speaker_info.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  
                  <div className="space-y-1 flex-grow">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base text-zinc-100">{event.speaker_info.name}</h3>
                      {event.speaker_info.linkedin_url && (
                        <a href={event.speaker_info.linkedin_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-accent hover:underline flex items-center gap-1">
                          LinkedIn <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-violet-400">
                      {event.speaker_info.designation} · {event.speaker_info.organisation}
                    </p>
                    {event.speaker_info.bio && (
                      <p className="text-xs text-zinc-400 leading-relaxed pt-1">{event.speaker_info.bio}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* ──── RIGHT COLUMN: STICKY REGISTRATION CARD (col-span-4) ──── */}
          <div className="lg:col-span-4 sticky top-24 space-y-6">
            
            {/* ── SECTION 6: REGISTRATION CARD ── */}
            <div className="rounded-[28px] border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 shadow-xl space-y-6">
              
              {/* CLEAR SEAT STATS DISPLAY */}
              <div className="space-y-3 border-b border-zinc-900 pb-4">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
                  Capacity & Reservation Stats
                </span>

                <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-4 space-y-2">
                  <div className="text-xl font-extrabold text-accent">
                    {event.remaining_seats !== null ? `${event.remaining_seats} Seats Remaining` : 'Unlimited Seats'}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-zinc-900 text-zinc-400">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">Capacity</span>
                      <span className="font-bold text-zinc-200">{event.capacity || '∞'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">Registered</span>
                      <span className="font-bold text-emerald-400">{event.attendee_count}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Primary Action Button */}
              <div>
                {renderPrimaryButton()}
              </div>

              {/* STUDENT STATUS & QR PASS GATING PANEL */}
              {event.user_registration && (
                <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-900 space-y-4 pt-4">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Registration Confirmed
                    </span>
                    <span className="text-[9px] font-bold bg-emerald-950/50 text-emerald-400 border border-emerald-900/60 px-2 py-0.5 rounded capitalize">
                      {event.user_registration.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <span className="text-zinc-500 block text-[10px]">Registered On</span>
                    <span className="font-semibold text-zinc-200">
                      {new Date(event.user_registration.registered_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* QR PASS GATING SECTION */}
                  <div className="pt-2 border-t border-zinc-900 space-y-2 text-center">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Digital QR Pass</span>
                    
                    {event.user_registration?.status === 'registered' || event.user_registration?.status === 'attended' ? (
                      <Link
                        href={`/dashboard/events/${eventId}/pass`}
                        className="w-full rounded-xl bg-accent/15 border border-accent/30 py-2.5 px-4 text-xs font-bold text-accent hover:bg-accent/25 transition-all inline-flex items-center justify-center gap-1.5"
                      >
                        <QrCode className="h-4 w-4" /> View Digital Pass
                      </Link>
                    ) : (
                      <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-400 font-medium leading-normal">
                        QR Pass is only available for confirmed attendees.
                      </div>
                    )}
                  </div>

                  {/* CANCELLATION OPTION & POLICY CUTOFF */}
                  {event.button_state === 'REGISTERED' && (
                    <div className="pt-2 border-t border-zinc-900 text-center">
                      {isCancellationAllowed ? (
                        <button
                          onClick={handleCancelRegistration}
                          disabled={actionLoading}
                          className="text-xs font-semibold text-rose-400 hover:text-rose-300 py-1 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Cancel Registration
                        </button>
                      ) : (
                        <span className="text-[10px] text-zinc-500 block">
                          Registration can no longer be cancelled.
                        </span>
                      )}
                    </div>
                  )}

                </div>
              )}

            </div>

          </div>

        </div>

        {/* ── SECTION 7: RELATED EVENTS ── */}
        {relatedEvents.length > 0 && (
          <div className="pt-12 border-t border-zinc-900 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-extrabold text-white">Similar Events You Might Like</h2>
                <p className="text-xs text-zinc-400 mt-1">Recommended based on category and organizer</p>
              </div>
              <Link href="/dashboard/events" className="text-xs font-bold text-accent hover:underline flex items-center gap-1">
                View All <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedEvents.map((rel) => (
                <div
                  key={rel.id}
                  onClick={() => router.push(`/dashboard/events/${rel.id}`)}
                  className="group rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 transition-all hover:border-zinc-800 hover:bg-zinc-900/40 cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-accent uppercase tracking-widest">{rel.event_type}</span>
                    <span className="text-zinc-500">{new Date(rel.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <h4 className="font-bold text-sm text-zinc-200 group-hover:text-white line-clamp-1">{rel.title}</h4>
                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{rel.description}</p>
                  <div className="pt-2 flex items-center justify-between text-xs font-semibold text-zinc-400 group-hover:text-accent">
                    <span>{rel.venue || 'Campus Venue'}</span>
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
