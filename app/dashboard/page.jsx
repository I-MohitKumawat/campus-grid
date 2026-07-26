'use client';

/**
 * app/dashboard/page.jsx
 *
 * Premium dashboard landing page for CampusGrid.
 * Displays user's XP progress, study status, and links to different sections.
 * Implements session checks, logout, activity timelines, leaderboard links,
 * and upcoming events cards.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Sparkles, 
  BookOpen, 
  Award, 
  Calendar, 
  Users, 
  ChevronRight, 
  TrendingUp, 
  CheckCircle,
  Terminal
} from 'lucide-react';
import DashboardNavbar from '@/components/layout/DashboardNavbar';
import { useAuth } from '@/components/providers/AuthProvider';

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [dataLoading, setDataLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [recommendedClubs, setRecommendedClubs] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchDashboardData = async () => {
    setDataLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch Notifications for Activity Timeline
      const notifRes = await fetch('/api/v1/notifications', { cache: 'no-store' }).catch(() => null);
      if (notifRes && notifRes.ok) {
        const notifResult = await notifRes.json().catch(() => null);
        if (notifResult?.success && Array.isArray(notifResult.data)) {
          setActivities(notifResult.data);
        }
      }

      // 2. Fetch Published Upcoming Events
      const eventsRes = await fetch('/api/v1/events', { cache: 'no-store' }).catch(() => null);
      if (eventsRes && eventsRes.ok) {
        const eventsResult = await eventsRes.json().catch(() => null);
        if (eventsResult?.success && Array.isArray(eventsResult.data)) {
          setUpcomingEvents(eventsResult.data.slice(0, 3));
        }
      }

      // 3. Fetch Recommended Clubs
      const clubsRes = await fetch('/api/v1/clubs', { cache: 'no-store' }).catch(() => null);
      if (clubsRes && clubsRes.ok) {
        const clubsResult = await clubsRes.json().catch(() => null);
        if (clubsResult?.success && Array.isArray(clubsResult.data)) {
          setRecommendedClubs(clubsResult.data.slice(0, 3));
        }
      }

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setErrorMsg('Network error connecting to CampusGrid services.');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Handle Logout
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const res = await fetch('/api/v1/auth/session', { method: 'DELETE' });
      if (res.ok) {
        window.location.href = '/sign-in';
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-zinc-950 text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <p className="mt-4 text-sm text-zinc-400 font-medium">Entering CampusGrid Hub...</p>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in';
    }
    return null;
  }

  if (errorMsg && !user) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-zinc-950 text-white p-6">
        <div className="max-w-md w-full rounded-3xl border border-zinc-800 bg-zinc-900/30 backdrop-blur-xl p-8 text-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
            <Terminal className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Dashboard Connection Error</h2>
          <p className="text-xs text-zinc-400">{errorMsg}</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={fetchDashboardData}
              className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-xs font-bold text-white shadow-lg cursor-pointer"
            >
              Retry Connection
            </button>
            <button
              onClick={() => { window.location.href = '/sign-in'; }}
              className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-300 cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden pb-20">
      {/* Dynamic Background Backlights */}
      <div className="absolute top-0 right-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-accent/5 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-violet-500/5 blur-3xl" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#ffffff01_1px,transparent_1px),linear-gradient(to_bottom,#ffffff01_1px,transparent_1px)] bg-[size:30px_30px]" />

      {/* Navbar header */}
      <DashboardNavbar />

      {/* Main Dashboard Workspace */}
      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-8">
        
        {/* 1. Welcome Greeting */}
        <div className="space-y-2 animate-fadeIn">
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 border border-accent/20 px-3 py-1 text-xs font-bold text-accent">
            <Sparkles className="h-3.5 w-3.5" /> Campus Hub Online
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Welcome to the Grid, <span className="bg-gradient-to-r from-accent to-violet-500 bg-clip-text text-transparent">{user?.username}</span>!
          </h1>
          <p className="text-zinc-400 text-sm">
            Track your milestones, enroll in verify-to-earn courses, and stay updated with your campus activities.
          </p>
        </div>

        {/* 2. Main Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* ──── LEFT COLUMN (col-span-2) ──── */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Stats Card: XP and Campus Score */}
            <div className="rounded-[28px] border border-zinc-900 bg-zinc-900/10 backdrop-blur-xl p-6 shadow-lg animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Stat 1: Total XP */}
                <div className="flex items-center gap-4 bg-zinc-950/40 border border-zinc-900/60 rounded-2xl p-4.5 transition-all hover:bg-zinc-950/60">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Total XP</span>
                    <span className="text-2xl font-extrabold text-emerald-450">{user?.xp ?? 0}</span>
                  </div>
                </div>

                {/* Stat 2: Campus Score */}
                <div className="flex items-center gap-4 bg-zinc-950/40 border border-zinc-900/60 rounded-2xl p-4.5 transition-all hover:bg-zinc-950/60">
                  <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Campus Score</span>
                    <span className="text-2xl font-extrabold text-violet-450">{user?.campus_score ?? 0}</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Activities Timeline Card */}
            <div className="rounded-[28px] border border-zinc-900 bg-zinc-900/10 backdrop-blur-xl p-8 shadow-lg space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-4">
                <h2 className="font-display text-lg font-bold text-zinc-200">Activities</h2>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Activity Stream</span>
              </div>

              {activities.length > 0 ? (
                <div className="relative border-l-2 border-zinc-850 ml-3 pl-6 space-y-6">
                  {activities.map((item) => (
                    <div key={item.id} className="relative group">
                      <div className="absolute -left-[32.5px] top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-zinc-950 border-2 border-accent">
                        <div className="h-1.5 w-1.5 rounded-full bg-accent group-hover:scale-125 transition-transform" />
                      </div>
                      
                      <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-zinc-900 bg-zinc-900/20 hover:border-accent/30 transition-all duration-300">
                        <div>
                          <span className="text-[10px] font-bold text-accent uppercase tracking-widest block">
                            {new Date(item.created_at).toLocaleDateString()} · {item.type.replace('_', ' ')}
                          </span>
                          <h5 className="font-bold text-zinc-200 mt-1">{item.title}</h5>
                          <p className="text-xs text-zinc-400 mt-0.5">{item.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-zinc-500">
                  No activity notifications recorded yet. Register for events to build your activity history!
                </div>
              )}
            </div>

          </div>

          {/* ──── RIGHT COLUMN (col-span-1) ──── */}
          <div className="space-y-8">
            
            {/* Rank Card */}
            <div className="rounded-[28px] border border-zinc-900 bg-zinc-900/10 backdrop-blur-xl p-6 shadow-lg space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="h-4.5 w-4.5 text-amber-500" /> Rank
                </span>
                <span className="text-[9px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded">
                  Level Tier
                </span>
              </div>
              
              <div className="flex flex-col gap-3 bg-zinc-950/40 border border-zinc-900 rounded-2xl p-4">
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active Role</span>
                  <div className="text-2xl font-extrabold text-zinc-150 capitalize mt-1">{user?.role || 'Student'}</div>
                  <span className="text-[10px] text-zinc-500 mt-0.5 block">Verified Campus Contributor</span>
                </div>
                
                <Link
                  href="/dashboard/events"
                  className="rounded-xl bg-accent/15 border border-accent/25 hover:bg-accent/25 text-accent text-xs font-bold px-3.5 py-2.5 transition-all flex items-center justify-center gap-1 mt-1"
                >
                  Explore Events <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Upcoming Events Card */}
            <div className="rounded-[28px] border border-zinc-900 bg-zinc-900/10 backdrop-blur-xl p-6 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5">
                <h3 className="font-bold text-sm text-zinc-300 flex items-center gap-1.5">
                  <Calendar className="h-4.5 w-4.5 text-violet-400" /> Published Events
                </h3>
                <span className="text-[10px] font-bold text-zinc-500">Live</span>
              </div>

              {upcomingEvents.length > 0 ? (
                <div className="space-y-4">
                  {upcomingEvents.map((evt) => (
                    <div key={evt.id} className="p-4 rounded-2xl bg-zinc-950/40 border border-zinc-900 flex items-center justify-between gap-4">
                      <div className="space-y-1 overflow-hidden">
                        <h4 className="text-xs font-bold text-zinc-200 truncate">{evt.title}</h4>
                        <p className="text-[10px] text-zinc-450">{new Date(evt.event_date).toLocaleDateString()}</p>
                        <p className="text-[10px] text-zinc-500 truncate">📍 {evt.venue || 'Online'}</p>
                      </div>
                      <Link
                        href={`/dashboard/events/${evt.id}`}
                        className="rounded-xl bg-violet-600 hover:bg-violet-700 text-xs font-semibold text-white px-3 py-2 transition-all shrink-0"
                      >
                        View Details
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-zinc-500">
                  No published events available right now.
                </div>
              )}
            </div>

            {/* Recommended student clubs */}
            <div className="rounded-[28px] border border-zinc-900 bg-zinc-900/10 backdrop-blur-xl p-6 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5">
                <h3 className="font-bold text-sm text-zinc-300 flex items-center gap-1.5">
                  <Users className="h-4.5 w-4.5 text-accent" /> Student Clubs
                </h3>
                <Link href="/dashboard/clubs" className="text-[10px] font-bold text-accent hover:underline">View All</Link>
              </div>

              {recommendedClubs.length > 0 ? (
                <div className="space-y-3">
                  {recommendedClubs.map((club) => (
                    <div key={club.id} className="flex items-center justify-between gap-2 p-2 rounded-xl border border-zinc-900 bg-zinc-950/40">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="h-7 w-7 rounded bg-zinc-800 flex items-center justify-center font-bold text-[10px] text-zinc-300 shrink-0">
                          {club.name.substring(0, 3).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="text-xs font-bold text-zinc-300 truncate">{club.name}</h4>
                          <p className="text-[9px] text-zinc-500">{club.member_count ?? 0} members</p>
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/clubs/${club.slug || club.id}`}
                        className="text-[10px] font-bold text-accent hover:underline shrink-0"
                      >
                        View Hub
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-zinc-500">
                  No active clubs available right now.
                </div>
              )}
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
