'use client';

/**
 * app/dashboard/clubs/page.jsx
 *
 * Unified Clubs Hub for CampusGrid.
 * Provides public browsing for students, real Joined clubs view, and contextual management controls.
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, 
  Users, 
  Sparkles, 
  Check, 
  Zap, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  X,
  UserCheck,
  Building2,
  BookmarkCheck,
  Compass
} from 'lucide-react';
import DashboardNavbar from '@/components/layout/DashboardNavbar';
import { useAuth } from '@/components/providers/AuthProvider';
import { can } from '@/lib/permissions';
import { CLUB_POSITION_LABELS } from '@/lib/constants/club-positions';

export default function ClubsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [joinedClubs, setJoinedClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('recommended'); // recommended, joined, discover
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState(null);

  const loadClubs = async () => {
    try {
      setLoading(true);
      // Load all discoverable clubs
      const clubsRes = await fetch('/api/v1/clubs', { cache: 'no-store' });
      const clubsData = await clubsRes.json().catch(() => null);
      if (clubsRes.ok && clubsData?.success && Array.isArray(clubsData.data)) {
        setClubs(clubsData.data);
      }

      // Load joined clubs if user is authenticated
      if (user) {
        const joinedRes = await fetch('/api/v1/clubs?joined=true', { cache: 'no-store' });
        const joinedData = await joinedRes.json().catch(() => null);
        if (joinedRes.ok && joinedData?.success && Array.isArray(joinedData.data)) {
          setJoinedClubs(joinedData.data);
        }
      } else {
        setJoinedClubs([]);
      }
    } catch (err) {
      console.error('Failed to load clubs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClubs();
  }, [user]);

  // Determine current list based on active tab
  const displayClubs = useMemo(() => {
    if (activeTab === 'joined') {
      return joinedClubs;
    }
    if (activeTab === 'recommended') {
      // Sort featured first, then by member count
      return [...clubs].sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return (b.member_count || 0) - (a.member_count || 0);
      });
    }
    // discover
    return clubs;
  }, [activeTab, clubs, joinedClubs]);

  // Filter clubs based on search query
  const filteredClubs = useMemo(() => {
    return displayClubs.filter((club) => {
      const titleMatch = club.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const categoryMatch = club.category?.toLowerCase().includes(searchQuery.toLowerCase());
      const descMatch = club.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return !searchQuery || titleMatch || categoryMatch || descMatch;
    });
  }, [displayClubs, searchQuery]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden pb-20">
      {/* Background Gradients */}
      <div className="absolute top-0 right-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-accent/5 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-violet-500/5 blur-3xl" />

      {/* Dashboard Navbar */}
      <DashboardNavbar />

      <main className="max-w-7xl mx-auto px-6 pt-10 space-y-8">
        
        {/* Feedback Alert */}
        {feedback && (
          <div className={`p-4 rounded-2xl flex items-center justify-between border ${
            feedback.type === 'success' ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300' : 'bg-rose-950/30 border-rose-800/40 text-rose-300'
          }`}>
            <div className="flex items-center gap-2 text-xs font-bold">
              {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span>{feedback.msg}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-zinc-500 hover:text-zinc-300 cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Header Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-900 pb-5">
          {/* Left Side: Title, Count, and Privileged Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">Campus Clubs</h1>
              <span className="inline-flex items-center rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-bold text-violet-400 border border-violet-500/20">
                {displayClubs.length}
              </span>

              {/* Contextual Privileged Action: Create Club (Admin only) */}
              {can('club:create', user) && (
                <Link
                  href="/dashboard/clubs/new"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-accent hover:bg-accent/90 text-white text-xs font-bold transition-all shadow-md cursor-pointer ml-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Club</span>
                </Link>
              )}
            </div>
            
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 border-l border-zinc-800 pl-6 h-8">
              {[
                { id: 'recommended', label: 'Recommended', icon: Sparkles },
                { id: 'joined', label: `Joined (${joinedClubs.length})`, icon: BookmarkCheck },
                { id: 'discover', label: 'Discover', icon: Compass }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-violet-600/20 text-violet-400 border border-violet-500/20'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Side: Search and Filters */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Search className="h-4 w-4 text-zinc-500" />
              </span>
              <input
                type="text"
                placeholder="Search clubs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 rounded-full border border-zinc-900 bg-zinc-900/60 pl-10 pr-4 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>

        {/* Clubs Grid */}
        <div className="relative">
        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent mx-auto mb-3" />
            Loading campus clubs...
          </div>
        ) : filteredClubs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClubs.map((club) => {
              const userRole = club.user_club_role;

              return (
                <div 
                  key={club.id}
                  className="relative rounded-[24px] border border-zinc-900 bg-zinc-900/10 backdrop-blur-xl overflow-hidden shadow-lg transition-all hover:border-zinc-800 hover:bg-zinc-900/20 group flex flex-col min-h-[420px]"
                >
                  {/* Cover Image / Gradient */}
                  <div className="relative h-48 w-full overflow-hidden shrink-0">
                    <Link href={`/dashboard/clubs/${club.slug || club.id}`} className="block h-full w-full cursor-pointer">
                      <img 
                        src={club.banner_url || club.logo_url || '/images/campus_night_glow.png'} 
                        alt={club.name} 
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                    </Link>

                    {/* Members Badge */}
                    <div className="absolute top-4 left-4 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-xl px-3 py-1.5 text-center shrink-0 min-w-[70px] pointer-events-none">
                      <span className="block text-[8px] font-bold text-accent uppercase tracking-widest">
                        Members
                      </span>
                      <span className="block text-sm font-extrabold text-white mt-0.5">
                        {club.member_count ?? 0}
                      </span>
                    </div>

                    {/* Joined Status Badge / Recruitment Badge */}
                    <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5 pointer-events-none">
                      {userRole && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-950/90 border border-emerald-500/40 px-2.5 py-1 text-[10px] font-bold text-emerald-300 backdrop-blur-md shadow-md">
                          <Check className="h-3 w-3 stroke-[3px]" />
                          {CLUB_POSITION_LABELS[userRole] || 'Member'}
                        </span>
                      )}
                      {club.recruitment_open && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-violet-950/80 border border-violet-500/30 px-2 py-0.5 text-[9px] font-bold text-violet-300 backdrop-blur-md">
                          Recruiting
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="p-6 flex flex-col justify-between flex-grow">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                          <Users className="h-4.5 w-4.5" />
                        </div>
                        <span className="text-xs font-bold text-violet-400 tracking-wide uppercase">
                          {club.category || 'General'}
                        </span>
                      </div>

                      <Link href={`/dashboard/clubs/${club.slug || club.id}`} className="block">
                        <h3 className="text-lg font-bold text-zinc-100 group-hover:text-white hover:text-violet-400 transition-colors cursor-pointer">
                          {club.name}
                        </h3>
                      </Link>

                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                        {club.description || 'No description provided.'}
                      </p>
                    </div>

                    {/* Bottom Meta & Button Row */}
                    <div className="pt-6 border-t border-zinc-900/80 flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Zap className="h-3.5 w-3.5 text-zinc-500" />
                          <span>{club.is_active ? 'Active' : 'Inactive'}</span>
                        </span>
                      </div>

                      <Link
                        href={`/dashboard/clubs/${club.slug || club.id}`}
                        className="rounded-full px-5 py-2 text-xs font-bold transition-all bg-violet-600 hover:bg-violet-700 text-white shadow-md cursor-pointer"
                      >
                        View Hub
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[28px] border border-zinc-900 bg-zinc-900/10 backdrop-blur-xl p-12 text-center">
            {activeTab === 'joined' ? (
              <>
                <span className="text-3xl">👥</span>
                <h3 className="text-base font-bold text-zinc-300 mt-3">No Joined Clubs</h3>
                <p className="text-xs text-zinc-500 mt-1.5 max-w-sm mx-auto">
                  You haven't joined any campus clubs yet. Browse the Discover tab to explore active organizations and apply to join!
                </p>
                <button
                  onClick={() => setActiveTab('discover')}
                  className="mt-4 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white shadow-lg cursor-pointer"
                >
                  Explore Clubs
                </button>
              </>
            ) : (
              <>
                <span className="text-3xl">🏛️</span>
                <h3 className="text-base font-bold text-zinc-300 mt-3">No clubs found</h3>
                <p className="text-xs text-zinc-500 mt-1.5">No student clubs match your current search query.</p>
              </>
            )}
          </div>
        )}

        </div>

        {/* Footer Index Indicators */}
        <div className="text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest pt-4">
          Showing 1-{filteredClubs.length} of {filteredClubs.length} clubs
        </div>

      </main>
    </div>
  );
}
