'use client';

/**
 * app/dashboard/events/page.jsx
 *
 * Premium Events Listing Page for CampusGrid.
 * Implements a 3-column interactive card design with tabs and search.
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Search, 
  SlidersHorizontal, 
  MapPin, 
  Globe, 
  Code, 
  GraduationCap, 
  Megaphone,
  Sparkles,
  Bookmark,
  Check
} from 'lucide-react';
import DashboardNavbar from '@/components/layout/DashboardNavbar';

const MOCK_EVENTS_DATA = [
  {
    id: 'e1',
    title: 'Hack India 2024',
    category: 'Hackathon',
    desc: '3 days of innovation, collaboration and building impactful solutions.',
    date: 'MAY 02-04',
    venue: 'IIT Delhi',
    isOnline: false,
    attendees: 120,
    type: 'upcoming',
    icon: Code,
    gradient: 'from-orange-600/30 via-red-950/20 to-zinc-950',
    cover: '/images/campus_night_glow.png'
  },
  {
    id: 'e2',
    title: 'WebDev Bootcamp',
    category: 'Workshop',
    desc: 'Hands-on workshop to level up your web development skills.',
    date: 'MAY 10',
    venue: 'Online',
    isOnline: true,
    attendees: 85,
    type: 'upcoming',
    icon: GraduationCap,
    gradient: 'from-blue-600/30 via-indigo-950/20 to-zinc-950',
    cover: ''
  },
  {
    id: 'e3',
    title: 'Tech Talks: Future Ready',
    category: 'Seminar',
    desc: 'Expert sessions on emerging tech and future career opportunities.',
    date: 'MAY 18',
    venue: 'New Delhi',
    isOnline: false,
    attendees: 200,
    type: 'upcoming',
    icon: Megaphone,
    gradient: 'from-violet-600/30 via-fuchsia-950/20 to-zinc-950',
    cover: ''
  },
  {
    id: 'e4',
    title: 'AI Product Design',
    category: 'Workshop',
    desc: 'Learn to design user-centered AI products with top mentors.',
    date: 'MAY 24',
    venue: 'Seminar Hall 2',
    isOnline: false,
    attendees: 45,
    type: 'ongoing',
    icon: Sparkles,
    gradient: 'from-emerald-600/30 via-teal-950/20 to-zinc-950',
    cover: ''
  },
  {
    id: 'e5',
    title: 'GDG Cloud DevFest',
    category: 'Hackathon',
    desc: 'The annual cloud developer gathering for building scalable tech.',
    date: 'APR 15',
    venue: 'Main Auditorium',
    isOnline: false,
    attendees: 350,
    type: 'past',
    icon: Code,
    gradient: 'from-sky-600/30 via-blue-950/20 to-zinc-950',
    cover: ''
  }
];

export default function EventsPage() {
  const [activeTab, setActiveTab] = useState('upcoming'); // upcoming, ongoing, past
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarkedEvents, setBookmarkedEvents] = useState([]);
  const [registeredEvents, setRegisteredEvents] = useState([]);

  // Mock User Session
  const user = { username: 'arjun', role: 'admin', email: 'arjun@college.ac.in' };
  const handleLogout = () => alert('Logout clicked');

  const toggleBookmark = (id) => {
    if (bookmarkedEvents.includes(id)) {
      setBookmarkedEvents(bookmarkedEvents.filter(eventId => eventId !== id));
    } else {
      setBookmarkedEvents([...bookmarkedEvents, id]);
    }
  };

  const toggleRegister = (id) => {
    if (registeredEvents.includes(id)) {
      setRegisteredEvents(registeredEvents.filter(eventId => eventId !== id));
    } else {
      setRegisteredEvents([...registeredEvents, id]);
    }
  };

  // Filter events based on active tab and search query
  const filteredEvents = useMemo(() => {
    return MOCK_EVENTS_DATA.filter((event) => {
      const matchesTab = event.type === activeTab;
      const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            event.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            event.venue.toLowerCase().includes(searchQuery.toLowerCase());
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
              <h1 className="text-2xl font-bold tracking-tight text-white">All Events</h1>
              <span className="inline-flex items-center rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-bold text-violet-400 border border-violet-500/20">
                {MOCK_EVENTS_DATA.length}
              </span>
            </div>
            
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 border-l border-zinc-800 pl-6 h-8">
              {['upcoming', 'ongoing', 'past'].map((tab) => (
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
                placeholder="Search events..."
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
          {filteredEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredEvents.map((event) => {
                const CategoryIcon = event.icon;
                const isBookmarked = bookmarkedEvents.includes(event.id);
                const isRegistered = registeredEvents.includes(event.id);

                return (
                  <div 
                    key={event.id}
                    className="relative rounded-[24px] border border-zinc-900 bg-zinc-900/10 backdrop-blur-xl overflow-hidden shadow-lg transition-all hover:border-zinc-800 hover:bg-zinc-900/20 group flex flex-col min-h-[460px]"
                  >
                    {/* Cover Image / Gradient */}
                    <div className="relative h-48 w-full overflow-hidden shrink-0">
                      {event.cover ? (
                        <img 
                          src={event.cover} 
                          alt={event.title} 
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className={`h-full w-full bg-gradient-to-tr ${event.gradient} flex items-center justify-center relative overflow-hidden`}>
                          {/* Abstract mesh vectors in background */}
                          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(255,255,255,0.03),transparent)]" />
                          <CategoryIcon className="h-12 w-12 text-zinc-700/40" />
                        </div>
                      )}

                      {/* Date Badge */}
                      <div className="absolute top-4 left-4 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-xl px-3 py-1.5 text-center shrink-0 min-w-[70px]">
                        <span className="block text-[8px] font-bold text-accent uppercase tracking-widest">
                          {event.date.split(' ')[0]}
                        </span>
                        <span className="block text-sm font-extrabold text-white mt-0.5">
                          {event.date.split(' ')[1] || ''}
                        </span>
                      </div>

                      {/* Bookmark Button */}
                      <button
                        onClick={() => toggleBookmark(event.id)}
                        className="absolute top-4 right-4 h-9 w-9 rounded-full bg-zinc-950/70 backdrop-blur-md border border-zinc-800/80 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
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
                            <CategoryIcon className="h-4.5 w-4.5" />
                          </div>
                          <span className="text-xs font-bold text-violet-400 tracking-wide uppercase">
                            {event.category}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-lg font-bold text-zinc-100 group-hover:text-white transition-colors">
                          {event.title}
                        </h3>

                        {/* Description */}
                        <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                          {event.desc}
                        </p>
                      </div>

                      {/* Bottom Meta & Button Row */}
                      <div className="pt-6 border-t border-zinc-900/80 flex items-center justify-between mt-auto">
                        {/* Attendees & Venue info */}
                        <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-400">
                          <span className="flex items-center gap-1">
                            {event.isOnline ? <Globe className="h-3.5 w-3.5 text-zinc-500" /> : <MapPin className="h-3.5 w-3.5 text-zinc-500" />}
                            <span>{event.venue}</span>
                          </span>
                          <span className="text-zinc-700">|</span>
                          <span className="text-emerald-400">+{event.attendees} Registered</span>
                        </div>

                        {/* Register Button */}
                        <button
                          onClick={() => toggleRegister(event.id)}
                          className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-md cursor-pointer ${
                            isRegistered 
                              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600/30'
                              : 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-600/10'
                          }`}
                        >
                          {isRegistered ? (
                            <span className="flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5" /> Registered
                            </span>
                          ) : (
                            'Register'
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
              <span className="text-3xl">📅</span>
              <h3 className="text-base font-bold text-zinc-300 mt-3">No events found</h3>
              <p className="text-xs text-zinc-550 mt-1.5">Try changing your filter tab or search query terms.</p>
            </div>
          )}

        </div>

        {/* Footer Index Indicators */}
        <div className="text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest pt-4">
          Showing 1-{filteredEvents.length} of {filteredEvents.length} events
        </div>

      </main>
    </div>
  );
}
