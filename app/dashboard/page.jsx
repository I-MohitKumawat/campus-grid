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
import { MOCK_TIMELINE } from '@/data/mockData';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Fetch session details on mount
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch('/api/v1/auth/session');
        const result = await res.json();
        
        if (!res.ok || !result.success) {
          router.push('/sign-in');
          return;
        }

        // If user is authenticated but not onboarded, send them back to onboarding
        if (!result.data.is_onboarded) {
          router.push('/onboarding');
          return;
        }

        setUser(result.data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load dashboard session:', err);
        router.push('/sign-in');
      }
    }
    fetchSession();
  }, [router]);

  // Handle Logout
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const res = await fetch('/api/v1/auth/session', {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/sign-in');
        router.refresh();
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-zinc-950 text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <p className="mt-4 text-sm text-zinc-400 font-medium">Entering CampusGrid Hub...</p>
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
      <DashboardNavbar user={user} onLogout={handleLogout} />

      {/* Main Dashboard Workspace */}
      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-8">
        
        {/* 1. Welcome Greeting (Directly on website base, no bubble) */}
        <div className="space-y-2 animate-fadeIn">
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 border border-accent/20 px-3 py-1 text-xs font-bold text-accent">
            <Sparkles className="h-3.5 w-3.5" /> Campus Hub Online
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Welcome to the Grid, <span className="bg-gradient-to-r from-accent to-violet-500 bg-clip-text text-transparent">{user?.username === 'arjun' ? 'Arjun Dev' : user?.username}</span>!
          </h1>
          <p className="text-zinc-400 text-sm">
            Track your milestones, enroll in verify-to-earn courses, and stay updated with your campus activities.
          </p>
        </div>

        {/* 2. Main Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* ──── LEFT COLUMN (col-span-2) ──── */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Stats Card: XP and Campus Score (XP progress bar removed) */}
            <div className="rounded-[28px] border border-zinc-900 bg-zinc-900/10 backdrop-blur-xl p-6 shadow-lg animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Stat 1: Total XP */}
                <div className="flex items-center gap-4 bg-zinc-950/40 border border-zinc-900/60 rounded-2xl p-4.5 transition-all hover:bg-zinc-950/60">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Total XP</span>
                    <span className="text-2xl font-extrabold text-emerald-450">{user?.xp ?? 100}</span>
                  </div>
                </div>

                {/* Stat 2: Campus Score */}
                <div className="flex items-center gap-4 bg-zinc-950/40 border border-zinc-900/60 rounded-2xl p-4.5 transition-all hover:bg-zinc-950/60">
                  <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Campus Score</span>
                    <span className="text-2xl font-extrabold text-violet-450">{user?.campus_score ?? 9824}</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Activities Timeline Card */}
            <div className="rounded-[28px] border border-zinc-900 bg-zinc-900/10 backdrop-blur-xl p-8 shadow-lg space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-4">
                <h2 className="font-display text-lg font-bold text-zinc-200">Activities</h2>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Activity Timeline</span>
              </div>

              <div className="relative border-l-2 border-zinc-850 ml-3 pl-6 space-y-6">
                {MOCK_TIMELINE.map((time, idx) => (
                  <div key={idx} className="relative group">
                    {/* Timeline Dot */}
                    <div className="absolute -left-[32.5px] top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-zinc-950 border-2 border-accent">
                      <div className="h-1.5 w-1.5 rounded-full bg-accent group-hover:scale-125 transition-transform" />
                    </div>
                    
                    <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-zinc-900 bg-zinc-900/20 hover:border-accent/30 transition-all duration-300">
                      <div>
                        <span className="text-[10px] font-bold text-accent uppercase tracking-widest block">
                          {time.date} · {time.type}
                        </span>
                        <h5 className="font-bold text-zinc-200 mt-1">{time.desc}</h5>
                      </div>
                      <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-emerald-950/20 px-2.5 py-0.5 text-xs font-bold text-emerald-450 border border-emerald-900/40">
                        {time.points}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Core Feature Quick Card: Learning Paths */}
            <div className="group relative rounded-2xl border border-zinc-900 bg-zinc-900/20 p-6 transition-all hover:border-zinc-800 hover:bg-zinc-900/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-400 group-hover:scale-105 transition-all">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-200">Learning Paths</h3>
                  <p className="text-xs text-zinc-500">Structured roadmaps</p>
                </div>
              </div>
              <p className="text-xs text-zinc-400 mt-4 leading-relaxed">
                Take verified courses, pass quizzes, and earn direct skill certifications recorded on your student profile.
              </p>
              <div className="mt-6 flex items-center justify-between text-xs font-bold text-accent group-hover:underline">
                <span>Explore Paths</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>

          </div>

          {/* ──── RIGHT COLUMN (col-span-1) ──── */}
          <div className="space-y-8">
            
            {/* Rank / Global Leaderboard Card (now sitting at the very top of right column!) */}
            <div className="rounded-[28px] border border-zinc-900 bg-zinc-900/10 backdrop-blur-xl p-6 shadow-lg space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="h-4.5 w-4.5 text-amber-500" /> Rank
                </span>
                <span className="text-[9px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded">
                  Leaderboard
                </span>
              </div>
              
              <div className="flex flex-col gap-3 bg-zinc-950/40 border border-zinc-900 rounded-2xl p-4">
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Global Rank</span>
                  <div className="text-3xl font-extrabold text-zinc-150 mt-1">#48</div>
                  <span className="text-[10px] text-zinc-550 mt-0.5 block">Out of 250+ active students</span>
                </div>
                
                <Link
                  href="/dashboard"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Leaderboard module coming soon!");
                  }}
                  className="rounded-xl bg-accent/15 border border-accent/25 hover:bg-accent/25 text-accent text-xs font-bold px-3.5 py-2.5 transition-all flex items-center justify-center gap-1 mt-1"
                >
                  View Rank <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Upcoming Events Card (sits directly under Rank Card) */}
            <div className="rounded-[28px] border border-zinc-900 bg-zinc-900/10 backdrop-blur-xl p-6 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5">
                <h3 className="font-bold text-sm text-zinc-300 flex items-center gap-1.5">
                  <Calendar className="h-4.5 w-4.5 text-violet-400" /> Upcoming Events
                </h3>
                <span className="text-[10px] font-bold text-zinc-500">Active</span>
              </div>

              <div className="space-y-4">
                {/* Event 1 */}
                <div className="p-4 rounded-2xl bg-zinc-950/40 border border-zinc-900 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    {/* Event Thumbnail Rocket Container */}
                    <div className="h-14 w-14 rounded-xl bg-violet-600/15 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                      <Sparkles className="h-6 w-6 text-violet-400 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-zinc-200">Hack India 2024</h4>
                      <p className="text-[10px] text-zinc-450">2-4 May, 2024</p>
                      <p className="text-[10px] text-zinc-550 flex items-center gap-0.5">
                        <span>📍 IIT Delhi</span>
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => alert("Registration successful!")}
                    className="rounded-xl bg-violet-600 hover:bg-violet-700 text-xs font-semibold text-white px-4 py-2.5 transition-all shadow-md shadow-violet-600/15 cursor-pointer"
                  >
                    Register
                  </button>
                </div>

                {/* Event 2 */}
                <div className="p-4 rounded-2xl bg-zinc-950/40 border border-zinc-900 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    {/* Event Thumbnail Terminal Container */}
                    <div className="h-14 w-14 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                      <Terminal className="h-6 w-6 text-accent" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-zinc-200">GDSC Meetup</h4>
                      <p className="text-[10px] text-zinc-450">5 May, 2024</p>
                      <p className="text-[10px] text-zinc-550 flex items-center gap-0.5">
                        <span>📍 Online</span>
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => alert("Registration successful!")}
                    className="rounded-xl bg-violet-600 hover:bg-violet-700 text-xs font-semibold text-white px-4 py-2.5 transition-all shadow-md shadow-violet-600/15 cursor-pointer"
                  >
                    Register
                  </button>
                </div>
              </div>
            </div>

            {/* Recommended student clubs */}
            <div className="rounded-[28px] border border-zinc-900 bg-zinc-900/10 backdrop-blur-xl p-6 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5">
                <h3 className="font-bold text-sm text-zinc-300 flex items-center gap-1.5">
                  <Users className="h-4.5 w-4.5 text-accent" /> Recommended Clubs
                </h3>
                <span className="text-[10px] font-bold text-zinc-500">View All</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded bg-zinc-800 flex items-center justify-center font-bold text-[10px] text-zinc-300">
                      GDG
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-300">GDG Campus</h4>
                      <p className="text-[9px] text-zinc-500">124 members</p>
                    </div>
                  </div>
                  <button className="text-[10px] font-bold text-accent hover:underline cursor-pointer">
                    Join
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded bg-zinc-800 flex items-center justify-center font-bold text-[10px] text-zinc-300">
                      DEB
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-300">Debate Society</h4>
                      <p className="text-[9px] text-zinc-500">58 members</p>
                    </div>
                  </div>
                  <button className="text-[10px] font-bold text-accent hover:underline cursor-pointer">
                    Join
                  </button>
                </div>
              </div>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
