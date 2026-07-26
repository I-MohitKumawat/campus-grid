'use client';

/**
 * app/dashboard/clubs/page.jsx
 *
 * Premium Clubs Listing Page for CampusGrid.
 * Replicates the interactive events layout for student club hubs.
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, 
  SlidersHorizontal, 
  Users, 
  ShieldAlert, 
  Code, 
  Palette, 
  MessageSquare,
  Sparkles,
  Check,
  Zap,
  Globe
} from 'lucide-react';
import DashboardNavbar from '@/components/layout/DashboardNavbar';
import { useAuth } from '@/components/providers/AuthProvider';

export default function ClubsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('recommended'); // recommended, joined, discover
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadClubs() {
      try {
        const clubsRes = await fetch('/api/v1/clubs', { cache: 'no-store' });
        const clubsData = await clubsRes.json().catch(() => null);
        if (clubsRes.ok && clubsData?.success && Array.isArray(clubsData.data)) {
          setClubs(clubsData.data);
        }
      } catch (err) {
        console.error('Failed to load clubs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadClubs();
  }, []);

  // Filter clubs based on search query
  const filteredClubs = useMemo(() => {
    return clubs.filter((club) => {
      const titleMatch = club.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const categoryMatch = club.category?.toLowerCase().includes(searchQuery.toLowerCase());
      const descMatch = club.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return !searchQuery || titleMatch || categoryMatch || descMatch;
    });
  }, [clubs, searchQuery]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden pb-20">
      {/* Background Gradients */}
      <div className="absolute top-0 right-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-accent/5 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-violet-500/5 blur-3xl" />

      {/* Dashboard Navbar */}
      <DashboardNavbar />

      <main className="max-w-7xl mx-auto px-6 pt-10 space-y-8">
        
        {/* Header Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-900 pb-5">
          {/* Left Side: Title & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">All Clubs</h1>
              <span className="inline-flex items-center rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-bold text-violet-400 border border-violet-500/20">
                {clubs.length}
              </span>
            </div>
            
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 border-l border-zinc-800 pl-6 h-8">
              {['recommended', 'joined', 'discover'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
                    activeTab === tab 
                      ? 'bg-violet-600/20 text-violet-400 border border-violet-500/20'
                      : 'text-zinc-550 hover:text-zinc-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Right Side: Search and Filters */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Search Input */}
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

            {/* Filter Button */}
            <button className="flex items-center gap-2 rounded-full border border-zinc-900 bg-zinc-900/60 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-900 transition-all cursor-pointer">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Carousel / Navigation wrapper */}
        <div className="relative">
        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent mx-auto mb-3" />
            Loading campus clubs...
          </div>
        ) : filteredClubs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClubs.map((club) => {
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
                  </div>

                  {/* Content Section */}
                  <div className="p-6 flex flex-col justify-between flex-grow">
                    <div className="space-y-3">
                      {/* Icon & Subtitle Category */}
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                          <Users className="h-4.5 w-4.5" />
                        </div>
                        <span className="text-xs font-bold text-violet-400 tracking-wide uppercase">
                          {club.category || 'General'}
                        </span>
                      </div>

                      {/* Title */}
                      <Link href={`/dashboard/clubs/${club.slug || club.id}`} className="block">
                        <h3 className="text-lg font-bold text-zinc-100 group-hover:text-white hover:text-violet-400 transition-colors cursor-pointer">
                          {club.name}
                        </h3>
                      </Link>

                      {/* Description */}
                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                        {club.description || 'No description provided.'}
                      </p>
                    </div>

                    {/* Bottom Meta & Button Row */}
                    <div className="pt-6 border-t border-zinc-900/80 flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Zap className="h-3.5 w-3.5 text-zinc-550" />
                          <span>{club.status || 'Active'}</span>
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
            <span className="text-3xl">🏛️</span>
            <h3 className="text-base font-bold text-zinc-300 mt-3">No clubs found</h3>
            <p className="text-xs text-zinc-550 mt-1.5">No student clubs match your current search query.</p>
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
