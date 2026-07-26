'use client';

/**
 * app/dashboard/clubs/[id]/page.jsx
 *
 * Detailed Club Hub view matching the premium design mockup.
 * Displays club overview, about tabs, members list, and core team carousel.
 */

import { useState, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, 
  Code, 
  Palette, 
  MessageSquare,
  Zap,
  Globe,
  Check,
  MoreHorizontal,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Star
} from 'lucide-react';
import DashboardNavbar from '@/components/layout/DashboardNavbar';
import { useAuth } from '@/components/providers/AuthProvider';

export default function ClubDetailPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const clubId = resolvedParams.id;

  const { user } = useAuth();
  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, aboutUs
  const [startIndex, setStartIndex] = useState(0);

  useEffect(() => {
    async function loadClubDetails() {
      try {
        const clubRes = await fetch(`/api/v1/clubs/${clubId}`, { cache: 'no-store' });
        const clubData = await clubRes.json().catch(() => null);
        if (clubRes.ok && clubData?.success && clubData?.data) {
          setClub(clubData.data);
        } else {
          setClub(null);
        }
      } catch (err) {
        console.error('Failed to load club details:', err);
        setClub(null);
      } finally {
        setLoading(false);
      }
    }
    loadClubDetails();
  }, [clubId]);

  // Carousel Pagination for Core Team
  const visibleTeam = useMemo(() => {
    const team = club?.members || [];
    if (team.length <= 5) return team;
    const result = [];
    for (let i = 0; i < 5; i++) {
      const index = (startIndex + i) % team.length;
      result.push(team[index]);
    }
    return result;
  }, [club, startIndex]);

  const handleNextTeam = () => {
    const teamLen = club?.members?.length || 1;
    setStartIndex((prev) => (prev + 1) % teamLen);
  };

  const handlePrevTeam = () => {
    const teamLen = club?.members?.length || 1;
    setStartIndex((prev) => (prev - 1 + teamLen) % teamLen);
  };

  const ClubIcon = club.icon;

  // Render a customized avatar with matching gradients if the photo is missing
  const renderAvatar = (member) => {
    if (member.image) {
      return (
        <img 
          src={member.image} 
          alt={member.name}
          className="h-full w-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
        />
      );
    }
    // Generate static gradient based on name hash
    const colors = [
      'from-blue-500 to-indigo-600',
      'from-purple-500 to-pink-600',
      'from-emerald-500 to-teal-600',
      'from-orange-500 to-red-600',
      'from-fuchsia-500 to-rose-600'
    ];
    const nameCode = member.name.charCodeAt(0) + member.name.charCodeAt(member.name.length - 1);
    const gradient = colors[nameCode % colors.length];
    const initials = member.name.split(' ').map(n => n[0]).join('');

    return (
      <div className={`h-full w-full bg-gradient-to-tr ${gradient} flex items-center justify-center text-xs font-bold text-white tracking-wider`}>
        {initials}
      </div>
    );
  };

  if (loading) return null;
  if (!club) return <div>Club not found</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden pb-20">
      {/* Background ambient glowing spheres */}
      <div className="absolute top-0 right-1/4 -z-10 h-[600px] w-[600px] rounded-full bg-violet-600/5 blur-[120px]" />
      <div className="absolute bottom-0 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-cyan-600/5 blur-[120px]" />

      {/* Top navbar */}
      <DashboardNavbar />

      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-8">
        
        {/* Back navigation button */}
        <div className="flex items-center justify-between">
          <Link 
            href="/dashboard/clubs" 
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Clubs</span>
          </Link>
        </div>

        {/* TOP PANEL: MAIN CLUB CARD HEADER */}
        <div className="relative rounded-[28px] border border-zinc-900 bg-zinc-900/10 backdrop-blur-xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden shadow-2xl">
          
          {/* Left area: Logo + Status join button below */}
          <div className="flex flex-col items-center gap-4 shrink-0">
            {/* Logo box */}
            <div className="relative h-32 w-32 rounded-[24px] border border-zinc-800 bg-zinc-950 flex items-center justify-center overflow-hidden group shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/10 via-cyan-500/10 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(255,255,255,0.03),transparent)]" />
              <ClubIcon className={`h-14 w-14 ${club.coverIconColor} relative z-10 drop-shadow-[0_0_15px_rgba(139,92,246,0.3)]`} />
            </div>

            {/* Joined Button */}
            <button
              onClick={handleToggleJoin}
              className={`w-32 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border shadow-md ${
                isJoined 
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20'
                  : 'bg-violet-600 hover:bg-violet-700 text-white border-violet-500/20 shadow-violet-600/15'
              }`}
            >
              {isJoined ? (
                <>
                  <Check className="h-3.5 w-3.5 stroke-[3px]" /> Joined
                </>
              ) : (
                'Join Club'
              )}
            </button>
          </div>

          {/* Center area: metadata */}
          <div className="flex-grow text-center md:text-left space-y-4 max-w-xl">
            {/* Verified badge */}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1 text-[10px] font-bold text-violet-400 border border-violet-500/20">
              <Check className="h-3 w-3 stroke-[3px]" /> Verified Club
            </div>

            {/* Club Title */}
            <h2 className="text-3xl font-extrabold text-white tracking-tight leading-none">
              {club.title}
            </h2>

            {/* Tagline */}
            <p className="text-sm font-medium text-zinc-400">
              {club.tagline}
            </p>

            {/* Stats row */}
            <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-semibold text-zinc-400">
              <Users className="h-4 w-4 text-violet-400" />
              <span>{club.membersCount} Members</span>
              <span className="text-zinc-700">•</span>
              <span>Established {club.established}</span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center md:justify-start gap-3 pt-2">
              <button className="bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500 hover:brightness-110 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg hover:scale-[1.02] cursor-pointer">
                View Projects
              </button>
              <button className="h-9 w-9 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 hover:text-white text-zinc-400 flex items-center justify-center transition-all cursor-pointer">
                <MoreHorizontal className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Right area: concentric animated glowing orbits */}
          <div className="relative w-full md:w-[320px] h-[220px] md:h-[240px] flex items-center justify-center shrink-0 overflow-hidden bg-zinc-950/20 rounded-2xl border border-zinc-900/40">
            {/* Center glow */}
            <div className="absolute h-28 w-28 rounded-full bg-violet-600/10 blur-xl pointer-events-none" />
            <div className="absolute h-20 w-20 rounded-full bg-cyan-600/5 blur-lg pointer-events-none" />

            {/* Outer ring */}
            <div className="absolute w-[220px] h-[220px] rounded-full border border-dashed border-violet-500/15 animate-[spin_60s_linear_infinite]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-950 border border-violet-500/30 h-9 w-9 rounded-full flex items-center justify-center shadow-lg shadow-violet-500/10">
                <Code className="h-3.5 w-3.5 text-violet-400" />
              </div>
            </div>

            {/* Middle ring (reversed direction) */}
            <div className="absolute w-[160px] h-[160px] rounded-full border border-dashed border-cyan-500/15 animate-[spin_40s_linear_infinite_reverse]">
              <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 bg-zinc-950 border border-cyan-500/30 h-9 w-9 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/10">
                <Users className="h-3.5 w-3.5 text-cyan-400" />
              </div>
            </div>

            {/* Inner ring */}
            <div className="absolute w-[100px] h-[100px] rounded-full border border-dashed border-emerald-500/15 animate-[spin_25s_linear_infinite]">
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-zinc-950 border border-emerald-500/30 h-9 w-9 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <GraduationCap className="h-3.5 w-3.5 text-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: 2 COLUMNS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left column (Tabs & description content) */}
          <div className="lg:col-span-7 rounded-[24px] border border-zinc-900 bg-zinc-900/10 backdrop-blur-xl p-6 space-y-6">
            {/* Tabs control */}
            <div className="flex items-center gap-6 border-b border-zinc-900/80 pb-3">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`text-sm font-bold tracking-wide uppercase transition-all pb-3 relative cursor-pointer ${
                  activeTab === 'overview'
                    ? 'text-violet-400'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Overview
                {activeTab === 'overview' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-full" />
                )}
              </button>
              <button 
                onClick={() => setActiveTab('aboutUs')}
                className={`text-sm font-bold tracking-wide uppercase transition-all pb-3 relative cursor-pointer ${
                  activeTab === 'aboutUs'
                    ? 'text-violet-400'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                About Us
                {activeTab === 'aboutUs' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-full" />
                )}
              </button>
            </div>

            {/* Tab content area */}
            <div className="space-y-4">
              <div className="relative">
                <h3 className="text-lg font-bold text-zinc-100">About Club</h3>
                <div className="h-0.5 w-8 bg-violet-500 rounded-full mt-1.5" />
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {activeTab === 'overview' ? club.about : club.aboutExtended}
              </p>
            </div>
          </div>

          {/* Right column (Core Team row carousel) */}
          <div className="lg:col-span-5 rounded-[24px] border border-zinc-900 bg-zinc-900/10 backdrop-blur-xl p-6 flex flex-col justify-between">
            {/* Top metadata */}
            <div className="flex items-center justify-between border-b border-zinc-900/80 pb-4">
              <div className="flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-violet-400" />
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">Core Team</h3>
              </div>
              <span className="text-[10px] font-bold text-violet-400 hover:text-violet-300 transition-colors uppercase tracking-wider cursor-pointer">
                View All &rarr;
              </span>
            </div>

            {/* Info counters */}
            <div className="flex items-center gap-3 text-xs font-semibold text-zinc-400 pt-4">
              <span>{club.membersTotal} Core Members</span>
              <span className="text-zinc-800">|</span>
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                <span className="text-zinc-200">{club.rating}</span>
                <span className="text-zinc-550">({club.reviewsCount} Reviews)</span>
              </span>
            </div>

            {/* Carousel display box */}
            <div className="relative flex items-center justify-between gap-2 pt-6 mt-2">
              <div className="flex items-center justify-around flex-grow gap-2">
                {visibleTeam.map((member, index) => (
                  <div key={index} className="flex flex-col items-center text-center space-y-2 group w-[70px]">
                    <div className="h-12 w-12 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 p-0.5 group-hover:border-violet-500 transition-all duration-300 shadow-md">
                      <div className="h-full w-full rounded-full overflow-hidden">
                        {renderAvatar(member)}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-zinc-200 group-hover:text-white truncate max-w-[70px] leading-tight">
                        {member.name}
                      </h4>
                      <p className="text-[8px] font-semibold text-zinc-500 uppercase tracking-wider">
                        {member.role}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Slider Button */}
              {club.coreTeam.length > 5 && (
                <button 
                  onClick={handleNextTeam}
                  className="h-8 w-8 rounded-full border border-zinc-900 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer shadow-lg shrink-0"
                >
                  <ChevronRight className="h-4.5 w-4.5" />
                </button>
              )}
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
