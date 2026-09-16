'use client';

/**
 * app/dashboard/events/page.jsx
 *
 * Premium Events Listing Page for CampusGrid.
 * Displays filterable event cards. Clicking any card navigates to /dashboard/events/[id].
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, 
  MapPin, 
  Globe, 
  Code, 
  GraduationCap, 
  Megaphone,
  Sparkles,
  ArrowRight,
  Calendar,
  Users,
  Plus,
  Edit3
} from 'lucide-react';
import DashboardNavbar from '@/components/layout/DashboardNavbar';
import { useAuth } from '@/components/providers/AuthProvider';
import { can } from '@/lib/permissions';

export default function EventsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming'); // upcoming, ongoing, past
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      try {
        const endpoint = activeTab === 'past' ? '/api/v1/events/past' : '/api/v1/events';
        const eventsRes = await fetch(endpoint, { cache: 'no-store' });
        const eventsData = await eventsRes.json().catch(() => null);
        if (eventsRes.ok && eventsData?.success && Array.isArray(eventsData.data)) {
          setEvents(eventsData.data);
        } else {
          setEvents([]);
        }
      } catch (err) {
        console.error('Failed to load events:', err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, [activeTab]);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const titleMatch = event.title?.toLowerCase().includes(searchQuery.toLowerCase());
      const descMatch = event.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const venueMatch = event.venue?.toLowerCase().includes(searchQuery.toLowerCase());
      const categoryMatch = event.event_type?.toLowerCase().includes(searchQuery.toLowerCase());
      const clubMatch = event.club_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSearch = !searchQuery || titleMatch || descMatch || venueMatch || categoryMatch || clubMatch;
      if (!matchesSearch) return false;

      const eventDate = new Date(event.event_date);
      const now = new Date();
      const duration = Number(event.duration_minutes || 120);
      const eventEndDate = new Date(eventDate.getTime() + duration * 60000);

      if (activeTab === 'upcoming') return eventDate >= now;
      if (activeTab === 'ongoing') return now >= eventDate && now <= eventEndDate;
      if (activeTab === 'past') return event.status === 'completed' || eventEndDate < now;
      return true;
    });
  }, [events, activeTab, searchQuery]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden pb-24">
      {/* Backlight Gradients */}
      <div className="absolute top-0 right-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-accent/5 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-violet-500/5 blur-3xl" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#ffffff01_1px,transparent_1px),linear-gradient(to_bottom,#ffffff01_1px,transparent_1px)] bg-[size:30px_30px]" />

      {/* Header Navigation */}
      <DashboardNavbar />

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-8">
        
        {/* Page Title & Search Bar Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-900 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 px-3 py-1 text-xs font-bold text-violet-400">
                <Calendar className="h-3.5 w-3.5" /> Campus Events
              </span>

              {/* Contextual Privileged Control: Create Event */}
              {can('event:create', user) && (
                <Link
                  href="/dashboard/event-studio/events/new"
                  className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-accent hover:bg-accent/90 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Event</span>
                </Link>
              )}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mt-2 text-white">
              Explore & Attend Events
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Select any event card to view full details, schedule, agenda, and register your seat.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search events, workshops..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 pl-10 pr-4 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-accent transition-all"
            />
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 border-b border-zinc-900/80 pb-4">
          {[
            { id: 'upcoming', label: 'Upcoming Events' },
            { id: 'ongoing', label: 'Happening Now' },
            { id: 'past', label: 'Past Events' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Event Cards Grid */}
        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent mx-auto mb-3" />
            Loading campus events...
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => {
              const dateObj = new Date(event.event_date);
              const monthStr = dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();
              const dayStr = dateObj.getDate();

              return (
                <div
                  key={event.id}
                  onClick={() => router.push(`/dashboard/events/${event.id}`)}
                  className="group relative rounded-[24px] border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl overflow-hidden hover:border-violet-500/40 hover:bg-zinc-900/40 transition-all duration-300 shadow-lg flex flex-col cursor-pointer"
                >
                  {/* Thumbnail Banner Image */}
                  <div className="relative h-44 w-full bg-zinc-950 overflow-hidden">
                    <img
                      src={event.banner_url || '/images/campus_night_glow.png'}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

                    {/* Date Badge */}
                    <div className="absolute top-4 left-4 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-xl px-3 py-1.5 text-center shrink-0 min-w-[70px]">
                      <span className="block text-[8px] font-bold text-accent uppercase tracking-widest">
                        {monthStr}
                      </span>
                      <span className="block text-sm font-extrabold text-white mt-0.5">
                        {dayStr}
                      </span>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="p-6 flex flex-col justify-between flex-grow space-y-4">
                    <div className="space-y-2.5">
                      {/* Icon & Category */}
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                          <Code className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-[10px] font-bold text-violet-400 tracking-wide uppercase">
                          {event.event_type}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-zinc-100 group-hover:text-white transition-colors line-clamp-2">
                        {event.title}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                        {event.description || 'No description provided.'}
                      </p>
                    </div>

                    {/* Meta Info & CTA Row */}
                    <div className="pt-4 border-t border-zinc-900/80 flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-3 text-[10px] text-zinc-400">
                        <span className="flex items-center gap-1">
                          {event.online_link ? <Globe className="h-3.5 w-3.5 text-zinc-500" /> : <MapPin className="h-3.5 w-3.5 text-zinc-500" />}
                          <span className="truncate max-w-[120px]">{event.venue || 'Online'}</span>
                        </span>
                        <span className="text-zinc-700">·</span>
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Users className="h-3 w-3" /> +{event.attendee_count ?? 0}
                        </span>
                      </div>

                      <span className="inline-flex items-center gap-1 text-accent font-bold group-hover:translate-x-0.5 transition-transform">
                        View Details <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[28px] border border-zinc-900 bg-zinc-900/10 backdrop-blur-xl p-12 text-center space-y-2">
            <Calendar className="h-10 w-10 text-zinc-600 mx-auto mb-2" />
            <h3 className="text-base font-bold text-zinc-300">No events found</h3>
            <p className="text-xs text-zinc-500">There are no {activeTab === 'past' ? 'past' : activeTab === 'ongoing' ? 'ongoing' : 'upcoming'} events matching your search query.</p>
          </div>
        )}

      </main>
    </div>
  );
}
