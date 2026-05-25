'use client';

/**
 * app/dashboard/clubs/page.jsx
 *
 * Premium Clubs Listing Page for CampusGrid.
 * Replicates the interactive events layout for student club hubs.
 */

import { useState, useMemo } from 'react';
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
  Bookmark,
  Check,
  Zap,
  Globe
} from 'lucide-react';
import DashboardNavbar from '@/components/layout/DashboardNavbar';

const MOCK_CLUBS_DATA = [
  {
    id: 'c1',
    title: 'GDG Campus',
    category: 'Technical',
    desc: 'Official Google Developer Groups student branch. We build mobile, web, and AI solutions.',
    members: 124,
    status: 'Active',
    type: 'recommended',
    icon: Code,
    gradient: 'from-blue-600/30 via-indigo-950/20 to-zinc-950',
    cover: '/images/campus_night_glow.png'
  },
  {
    id: 'c2',
    title: 'UX Designers Hub',
    category: 'Creative',
    desc: 'A space for UI/UX design collaboration, Figma critique sessions, and portfolio reviews.',
    members: 85,
    status: 'Verified',
    type: 'recommended',
    icon: Palette,
    gradient: 'from-fuchsia-600/30 via-purple-950/20 to-zinc-950',
    cover: ''
  },
  {
    id: 'c3',
    title: 'Debate Society',
    category: 'Public Speaking',
    desc: 'Sharpen your rhetoric, critical thinking, and communication skills through debate.',
    members: 58,
    status: 'Active',
    type: 'joined',
    icon: MessageSquare,
    gradient: 'from-amber-600/30 via-yellow-950/20 to-zinc-950',
    cover: ''
  },
  {
    id: 'c4',
    title: 'Robotics Club',
    category: 'Engineering',
    desc: 'Building autonomous rovers and drones. Access local hardware labs and microcontrollers.',
    members: 92,
    status: 'Verified',
    type: 'discover',
    icon: Zap,
    gradient: 'from-emerald-600/30 via-teal-950/20 to-zinc-950',
    cover: ''
  },
  {
    id: 'c5',
    title: 'Web3 & Blockchain',
    category: 'Technical',
    desc: 'Smart contract development, dApps auditing, and decentralized networks research.',
    members: 40,
    status: 'Active',
    type: 'discover',
    icon: Globe,
    gradient: 'from-purple-600/30 via-violet-950/20 to-zinc-950',
    cover: ''
  }
];

export default function ClubsPage() {
  const [activeTab, setActiveTab] = useState('recommended'); // recommended, joined, discover
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarkedClubs, setBookmarkedClubs] = useState([]);
  const [joinedClubs, setJoinedClubs] = useState(['c3']); // pre-join debate society

  // Mock User Session
  const user = { username: 'arjun', role: 'admin', email: 'arjun@college.ac.in' };
  const handleLogout = () => alert('Logout clicked');

  const toggleBookmark = (id) => {
    if (bookmarkedClubs.includes(id)) {
      setBookmarkedClubs(bookmarkedClubs.filter(clubId => clubId !== id));
    } else {
      setBookmarkedClubs([...bookmarkedClubs, id]);
    }
  };

  const toggleJoin = (id) => {
    if (joinedClubs.includes(id)) {
      setJoinedClubs(joinedClubs.filter(clubId => clubId !== id));
    } else {
      setJoinedClubs([...joinedClubs, id]);
    }
  };

  // Filter clubs based on active tab and search query
  const filteredClubs = useMemo(() => {
    return MOCK_CLUBS_DATA.filter((club) => {
      const matchesTab = club.type === activeTab;
      const matchesSearch = club.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            club.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            club.desc.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchQuery]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden pb-20">
      {/* Background Gradients */}
      <div className="absolute top-0 right-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-accent/5 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-violet-500/5 blur-3xl" />

      {/* Dashboard Navbar */}
      <DashboardNavbar user={user} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-6 pt-10 space-y-8">
        
        {/* Header Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-900 pb-5">
          {/* Left Side: Title & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">All Clubs</h1>
              <span className="inline-flex items-center rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-bold text-violet-400 border border-violet-500/20">
                {MOCK_CLUBS_DATA.length}
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
          {/* Card Grid */}
          {filteredClubs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredClubs.map((club) => {
                const ClubIcon = club.icon;
                const isBookmarked = bookmarkedClubs.includes(club.id);
                const isJoined = joinedClubs.includes(club.id);

                return (
                  <div 
                    key={club.id}
                    className="relative rounded-[24px] border border-zinc-900 bg-zinc-900/10 backdrop-blur-xl overflow-hidden shadow-lg transition-all hover:border-zinc-800 hover:bg-zinc-900/20 group flex flex-col min-h-[460px]"
                  >
                    {/* Cover Image / Gradient */}
                    <div className="relative h-48 w-full overflow-hidden shrink-0">
                      <Link href={`/dashboard/clubs/${club.id}`} className="block h-full w-full cursor-pointer">
                        {club.cover ? (
                          <img 
                            src={club.cover} 
                            alt={club.title} 
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className={`h-full w-full bg-gradient-to-tr ${club.gradient} flex items-center justify-center relative overflow-hidden`}>
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(255,255,255,0.03),transparent)]" />
                            <ClubIcon className="h-12 w-12 text-zinc-700/40" />
                          </div>
                        )}
                      </Link>

                      {/* Members Badge */}
                      <div className="absolute top-4 left-4 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-xl px-3 py-1.5 text-center shrink-0 min-w-[70px] pointer-events-none">
                        <span className="block text-[8px] font-bold text-accent uppercase tracking-widest">
                          Members
                        </span>
                        <span className="block text-sm font-extrabold text-white mt-0.5">
                          {club.members}
                        </span>
                      </div>

                      {/* Bookmark Button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleBookmark(club.id);
                        }}
                        className="absolute top-4 right-4 h-9 w-9 rounded-full bg-zinc-950/70 backdrop-blur-md border border-zinc-800/80 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer z-10"
                      >
                        <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-accent text-accent' : ''}`} />
                      </button>
                    </div>

                    {/* Content Section */}
                    <div className="p-6 flex flex-col justify-between flex-grow">
                      <div className="space-y-3">
                        {/* Icon & Subtitle Category */}
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                            <ClubIcon className="h-4.5 w-4.5" />
                          </div>
                          <span className="text-xs font-bold text-violet-400 tracking-wide uppercase">
                            {club.category}
                          </span>
                        </div>

                        {/* Title */}
                        <Link href={`/dashboard/clubs/${club.id}`} className="block">
                          <h3 className="text-lg font-bold text-zinc-100 group-hover:text-white hover:text-violet-400 transition-colors cursor-pointer">
                            {club.title}
                          </h3>
                        </Link>

                        {/* Description */}
                        <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                          {club.desc}
                        </p>
                      </div>

                      {/* Bottom Meta & Button Row */}
                      <div className="pt-6 border-t border-zinc-900/80 flex items-center justify-between mt-auto">
                        {/* Status Check tag */}
                        <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Zap className="h-3.5 w-3.5 text-zinc-550" />
                            <span>{club.status}</span>
                          </span>
                          <span className="text-zinc-700">|</span>
                          <span className="text-emerald-450">Active Hub</span>
                        </div>

                        {/* Join Button */}
                        <button
                          onClick={() => toggleJoin(club.id)}
                          className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-md cursor-pointer ${
                            isJoined 
                              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600/30'
                              : 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-600/10'
                          }`}
                        >
                          {isJoined ? (
                            <span className="flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5" /> Joined
                            </span>
                          ) : (
                            'Join Club'
                          )}
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[28px] border border-zinc-900 bg-zinc-900/10 backdrop-blur-xl p-12 text-center">
              <span className="text-3xl">👥</span>
              <h3 className="text-base font-bold text-zinc-300 mt-3">No clubs found</h3>
              <p className="text-xs text-zinc-550 mt-1.5">Try changing your discover filters or search term parameters.</p>
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
