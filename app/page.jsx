/**
 * app/page.jsx
 *
 * Public landing/marketing page for CampusGrid.
 * Renders server-side, detects session cookie, and shows corresponding dynamic CTAs.
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { verifyToken } from '@/lib/jwt';
import Navbar from '@/components/layout/Navbar';
import InteractivePreview from '@/components/preview/InteractivePreview';
import ProfileCard from '@/components/profile/ProfileCard';
import { 
  UserCheck, 
  Star, 
  Users, 
  BookOpen, 
  Calendar, 
  Building2 
} from 'lucide-react';

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('cg_token')?.value;

  if (token) {
    try {
      verifyToken(token);
      redirect('/dashboard');
    } catch {
      // Invalid token, render public landing page
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-900 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-50">
      {/* Navigation */}
      <Navbar isLoggedIn={isLoggedIn} />

      {/* Main Content */}
      <main className="flex-1">
        
        {/* Hero Section */}
        <section className="relative overflow-hidden pb-28 sm:pb-36 lg:pb-40">
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)]" />

          {/* Background Accent Gradients */}
          <div className="absolute top-0 right-1/4 -z-10 h-72 w-72 rounded-full bg-accent/10 blur-3xl dark:bg-accent/5" />
          <div className="absolute bottom-10 left-1/4 -z-10 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-500/5" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-8 items-center">
              
              {/* Left Column: Hero Content */}
              <div className="text-center lg:text-left lg:col-span-7 flex flex-col items-center lg:items-start">
                {/* Tagline */}
                <h1 className="font-display text-4xl font-extrabold tracking-tight text-brand dark:text-zinc-50 sm:text-5xl lg:text-6xl xl:text-7xl leading-none">
                  Build. Connect. Grow.{' '}
                  <span className="bg-gradient-to-r from-accent via-violet-500 to-indigo-600 bg-clip-text text-transparent block sm:inline">
                    All in Campus Grid.
                  </span>
                </h1>

                {/* Subheadline */}
                <p className="mt-8 text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
                  Meet talented students, showcase your work, join campus communities, and discover opportunities that actually matter.
                </p>

                {/* Action Buttons */}
                <div className="mt-10 flex flex-col gap-4 sm:flex-row w-full sm:w-auto justify-center lg:justify-start">
                  <Link
                    href={isLoggedIn ? '/dashboard' : '/sign-in'}
                    className="inline-flex items-center justify-center rounded-xl bg-brand px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand/10 transition-all duration-300 hover:bg-brand/90 hover:scale-102 hover:shadow-xl dark:bg-accent dark:shadow-accent/15 dark:hover:bg-accent/90"
                  >
                    {isLoggedIn ? 'Access Dashboard' : 'Join CampusGrid'}
                  </Link>
                  <a
                    href="#preview"
                    className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-6 py-3.5 text-base font-semibold text-zinc-700 shadow-sm transition-all duration-300 hover:bg-zinc-50 hover:scale-102 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    Explore Leaderboards
                  </a>
                </div>
              </div>

              {/* Right Column: Orbital Interactive Profile Card */}
              <div className="lg:col-span-5 flex items-center justify-center w-full overflow-visible">
                <ProfileCard />
              </div>

            </div>

            {/* Core Features Quick List */}
            <div className="mt-16 border-t border-zinc-100 pt-10 dark:border-zinc-900/60 max-w-3xl mx-auto">
              <dl className="grid grid-cols-1 gap-6 sm:grid-cols-3 text-center">
                <div className="flex flex-col items-center">
                  <dt className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">Domain-Restricted</dt>
                  <dd className="mt-1 text-base font-bold text-brand dark:text-zinc-300">College Email Signup Only</dd>
                </div>
                <div className="flex flex-col items-center">
                  <dt className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">Integrations</dt>
                  <dd className="mt-1 text-base font-bold text-brand dark:text-zinc-300">GitHub & LeetCode Linked</dd>
                </div>
                <div className="flex flex-col items-center">
                  <dt className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">Gamification</dt>
                  <dd className="mt-1 text-base font-bold text-brand dark:text-zinc-300">Semester Leaderboards</dd>
                </div>
              </dl>
            </div>

          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="scroll-mt-24 py-24 border-t border-zinc-100 transition-colors duration-300 dark:border-zinc-900/60 bg-white dark:bg-zinc-950">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-12 items-center">
              
              {/* Left Column: Headline and subtext */}
              <div className="lg:col-span-4 space-y-6 text-center lg:text-left flex flex-col items-center lg:items-start">
                <h2 className="font-display text-4xl font-extrabold tracking-tight text-brand dark:text-zinc-50 sm:text-5xl leading-tight">
                  Everything You Need to{' '}
                  <span className="bg-gradient-to-r from-accent via-violet-500 to-indigo-600 bg-clip-text text-transparent block sm:inline">
                    Succeed
                  </span>{' '}
                  in Campus Life
                </h2>
                <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md">
                  CampusGrid brings every aspect of your campus journey into one powerful platform.
                </p>
              </div>

              {/* Right Column: 6 Features Grid */}
              <div className="lg:col-span-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                
                {/* Feature 1: Verified Identity */}
                <div className="relative group rounded-3xl border border-zinc-200/80 p-6 bg-white transition-all duration-300 hover:scale-102 hover:border-accent/40 hover:shadow-xl dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:hover:shadow-indigo-500/5">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-rose-500 to-orange-500 text-white shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 font-display font-bold text-lg text-brand dark:text-zinc-50">Verified Identity</h3>
                  <p className="mt-2 text-sm text-zinc-500 leading-relaxed dark:text-zinc-400">
                    Link your profile directly with your college email, GitHub, and LeetCode to build instant campus trust.
                  </p>
                </div>

                {/* Feature 2: Campus Score */}
                <div className="relative group rounded-3xl border border-zinc-200/80 p-6 bg-white transition-all duration-300 hover:scale-102 hover:border-accent/40 hover:shadow-xl dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:hover:shadow-indigo-500/5">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-white shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <Star className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 font-display font-bold text-lg text-brand dark:text-zinc-50">Campus Score</h3>
                  <p className="mt-2 text-sm text-zinc-500 leading-relaxed dark:text-zinc-400">
                    Earn XP from academic feats, project updates, and coding challenges to climb the campus leaderboards.
                  </p>
                </div>

                {/* Feature 3: Collaborate */}
                <div className="relative group rounded-3xl border border-zinc-200/80 p-6 bg-white transition-all duration-300 hover:scale-102 hover:border-accent/40 hover:shadow-xl dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:hover:shadow-indigo-500/5">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-white shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <Users className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 font-display font-bold text-lg text-brand dark:text-zinc-50">Collaborate</h3>
                  <p className="mt-2 text-sm text-zinc-500 leading-relaxed dark:text-zinc-400">
                    Form cross-disciplinary teams, recruit developers or designers, and build real-world campus applications.
                  </p>
                </div>

                {/* Feature 4: Learn & Grow */}
                <div className="relative group rounded-3xl border border-zinc-200/80 p-6 bg-white transition-all duration-300 hover:scale-102 hover:border-accent/40 hover:shadow-xl dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:hover:shadow-indigo-500/5">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 text-white shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 font-display font-bold text-lg text-brand dark:text-zinc-50">Learn & Grow</h3>
                  <p className="mt-2 text-sm text-zinc-500 leading-relaxed dark:text-zinc-400">
                    Follow verified learning paths, pass skills assessments, and get personalized project recommendations.
                  </p>
                </div>

                {/* Feature 5: Events & Hackathons */}
                <div className="relative group rounded-3xl border border-zinc-200/80 p-6 bg-white transition-all duration-300 hover:scale-102 hover:border-accent/40 hover:shadow-xl dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:hover:shadow-indigo-500/5">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 text-white shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 font-display font-bold text-lg text-brand dark:text-zinc-50">Events & Hackathons</h3>
                  <p className="mt-2 text-sm text-zinc-500 leading-relaxed dark:text-zinc-400">
                    Discover local tech workshops and hackathons, register instantly, and check in via secure QR code.
                  </p>
                </div>

                {/* Feature 6: Campus Clubs */}
                <div className="relative group rounded-3xl border border-zinc-200/80 p-6 bg-white transition-all duration-300 hover:scale-102 hover:border-accent/40 hover:shadow-xl dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:hover:shadow-indigo-500/5">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 font-display font-bold text-lg text-brand dark:text-zinc-50">Campus Clubs</h3>
                  <p className="mt-2 text-sm text-zinc-500 leading-relaxed dark:text-zinc-400">
                    Join official departmental clubs, coordinate project milestones, and coordinate community initiatives.
                  </p>
                </div>

              </div>

            </div>
          </div>
        </section>

        {/* Live Interactive Preview */}
        <InteractivePreview />

        {/* Ecosystem / Stats Section */}
        <section id="stats" className="scroll-mt-24 py-24 transition-colors duration-300 bg-zinc-50 dark:bg-zinc-950/40 border-t border-zinc-100 dark:border-zinc-900/60">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16 items-center">
              
              {/* Left Column: Headline and Stats */}
              <div className="lg:col-span-6 space-y-12">
                <div className="space-y-4">
                  <h2 className="font-display text-4xl font-extrabold tracking-tight text-brand dark:text-zinc-50 sm:text-5xl leading-tight">
                    Powered by a Thriving <br />
                    <span className="bg-gradient-to-r from-accent via-violet-500 to-indigo-600 bg-clip-text text-transparent">
                      Campus Ecosystem
                    </span>
                  </h2>
                </div>

                {/* 2x2 Stats Grid */}
                <div className="grid gap-8 sm:grid-cols-2">
                  {/* Stat 1 */}
                  <div className="space-y-2 border-l-2 border-indigo-500/30 pl-4">
                    <p className="font-display text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">100%</p>
                    <p className="text-base font-bold text-brand dark:text-zinc-300">Verified Students</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Signups are strictly gated to official college email domains to ensure real student accounts.
                    </p>
                  </div>

                  {/* Stat 2 */}
                  <div className="space-y-2 border-l-2 border-amber-500/30 pl-4">
                    <p className="font-display text-4xl font-extrabold text-amber-600 dark:text-amber-500">4+</p>
                    <p className="text-base font-bold text-brand dark:text-zinc-300">Live Integrations</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Directly syncs verified activities from GitHub, LeetCode, and campus authentication systems.
                    </p>
                  </div>

                  {/* Stat 3 */}
                  <div className="space-y-2 border-l-2 border-rose-500/30 pl-4">
                    <p className="font-display text-4xl font-extrabold text-rose-500 dark:text-rose-400">1</p>
                    <p className="text-base font-bold text-brand dark:text-zinc-300">Unified Hub</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Consolidates individual profiles, scoring systems, student clubs, and event management.
                    </p>
                  </div>

                  {/* Stat 4 */}
                  <div className="space-y-2 border-l-2 border-purple-500/30 pl-4">
                    <p className="font-display text-4xl font-extrabold text-purple-600 dark:text-purple-400">Real-Time</p>
                    <p className="text-base font-bold text-brand dark:text-zinc-300">XP Tracking</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Leaderboard positions and rank updates calculate dynamically as actions are completed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Campus Image with Floating Hotspots */}
              <div className="lg:col-span-6 relative rounded-3xl overflow-hidden border border-zinc-200/60 dark:border-zinc-800/80 shadow-2xl group">
                <img 
                  src="/images/campus_night_glow.png" 
                  alt="Campus Ecosystem Illustration" 
                  className="w-full h-[450px] object-cover transition-transform duration-700 group-hover:scale-105"
                />
                
                {/* Visual Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                {/* Hotspot 1: Student profiles */}
                <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600/90 text-white border border-indigo-400 shadow-lg backdrop-blur-sm cursor-pointer hover:scale-110 transition-transform">
                    <UserCheck className="h-4 w-4" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-400"></span>
                    </span>
                  </div>
                  <span className="mt-2 text-[10px] font-bold text-white bg-zinc-950/80 px-2 py-0.5 rounded-full backdrop-blur-sm border border-zinc-800">
                    Profiles
                  </span>
                </div>

                {/* Hotspot 2: Events */}
                <div className="absolute top-1/3 right-1/4 translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/90 text-white border border-amber-400 shadow-lg backdrop-blur-sm cursor-pointer hover:scale-110 transition-transform">
                    <Calendar className="h-4 w-4" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400"></span>
                    </span>
                  </div>
                  <span className="mt-2 text-[10px] font-bold text-white bg-zinc-950/80 px-2 py-0.5 rounded-full backdrop-blur-sm border border-zinc-800">
                    Events
                  </span>
                </div>

                {/* Hotspot 3: Clubs */}
                <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 flex flex-col items-center">
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-purple-600/90 text-white border border-purple-400 shadow-lg backdrop-blur-sm cursor-pointer hover:scale-110 transition-transform">
                    <Building2 className="h-4 w-4" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-400"></span>
                    </span>
                  </div>
                  <span className="mt-2 text-[10px] font-bold text-white bg-zinc-950/80 px-2 py-0.5 rounded-full backdrop-blur-sm border border-zinc-800">
                    Clubs
                  </span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Final CTA Banner */}
        <section id="qr" className="scroll-mt-24 relative overflow-hidden py-24 transition-colors duration-300 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-900/60">
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:14px_24px] dark:bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)]" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* The Gradient-Border Premium Card */}
            <div className="relative rounded-[32px] p-8 sm:p-12 lg:p-16 overflow-hidden bg-zinc-950 border border-zinc-800 shadow-2xl text-white">
              
              {/* Concentric radar circle SVG lines in the background */}
              <div className="absolute top-1/2 right-10 -translate-y-1/2 -z-0 opacity-20 pointer-events-none hidden lg:block">
                <svg className="w-[500px] h-[500px]" viewBox="0 0 100 100" fill="none" stroke="currentColor">
                  <circle cx="50" cy="50" r="10" strokeWidth="0.5" stroke="#a855f7" />
                  <circle cx="50" cy="50" r="20" strokeWidth="0.5" stroke="#a855f7" />
                  <circle cx="50" cy="50" r="30" strokeWidth="0.5" stroke="#818cf8" strokeDasharray="2 2" />
                  <circle cx="50" cy="50" r="40" strokeWidth="0.5" stroke="#4f46e5" />
                </svg>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
                
                {/* Left Side Content */}
                <div className="lg:col-span-7 space-y-8 text-center lg:text-left flex flex-col items-center lg:items-start">
                  <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl leading-tight">
                    Ready to Transform Your <br />
                    Campus Experience?
                  </h2>
                  <p className="text-lg text-zinc-400 leading-relaxed max-w-xl">
                    Join thousands of students already building their future on CampusGrid.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto">
                    <Link
                      href={isLoggedIn ? '/dashboard' : '/sign-in'}
                      className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-rose-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-pink-500/20 hover:scale-102 hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
                    >
                      {isLoggedIn ? 'Access Dashboard' : 'Create Your Account'}
                    </Link>

                    {/* Avatars and text */}
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2.5">
                        <div className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-white">AD</div>
                        <div className="w-8 h-8 rounded-full border border-zinc-800 bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">SK</div>
                        <div className="w-8 h-8 rounded-full border border-zinc-800 bg-amber-500 flex items-center justify-center text-[10px] font-bold text-white">MK</div>
                        <div className="w-8 h-8 rounded-full border border-zinc-800 bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white">RS</div>
                      </div>
                      <span className="text-xs font-semibold text-zinc-400">
                        Join our verified campus network
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side Smartphone Mockup */}
                <div className="lg:col-span-5 flex justify-center items-center">
                  <div className="relative w-[250px] h-[480px] rounded-[42px] border-[8px] border-zinc-800 bg-zinc-950 shadow-2xl p-4 flex flex-col justify-between items-center text-white overflow-hidden">
                    {/* Notch */}
                    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-5 bg-zinc-800 rounded-2xl flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-zinc-900 absolute left-4"></div>
                      <div className="w-10 h-1 bg-zinc-900 rounded-full"></div>
                    </div>

                    {/* Logo & Header */}
                    <div className="mt-8 flex items-center gap-1.5">
                      <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-tr from-accent to-violet-500">
                        <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <rect x="3" y="3" width="7" height="7" rx="1" />
                          <rect x="14" y="3" width="7" height="7" rx="1" />
                          <rect x="14" y="14" width="7" height="7" rx="1" />
                          <rect x="3" y="14" width="7" height="7" rx="1" />
                        </svg>
                      </div>
                      <span className="font-display text-xs font-bold tracking-tight">CampusGrid</span>
                    </div>

                    {/* QR Code Section */}
                    <div className="flex flex-col items-center space-y-4">
                      <div className="text-center space-y-1">
                        <p className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase">Your Campus Identity</p>
                        <p className="text-xs font-bold">All in One QR</p>
                      </div>

                      {/* Vector SVG Styled QR Code */}
                      <svg className="w-36 h-36 bg-white p-2.5 rounded-2xl shadow-inner text-black" viewBox="0 0 100 100" fill="currentColor">
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

                    {/* Scan Action Button */}
                    <div className="w-full mb-4 px-2">
                      <button className="w-full py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 text-xs font-bold tracking-wider hover:bg-zinc-800 hover:border-zinc-700 transition-colors uppercase">
                        Scan
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/60 transition-colors duration-300 bg-white dark:border-zinc-900/60 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 border-b border-zinc-200/60 pb-12 dark:border-zinc-900/60">
            
            {/* Brand Column */}
            <div className="md:col-span-5 space-y-4 col-span-1">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-accent to-violet-500 shadow-sm transition-all duration-300 group-hover:scale-105">
                  <svg className="h-4.5 w-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                  </svg>
                </div>
                <span className="font-display text-lg font-bold tracking-tight text-brand dark:text-zinc-50">
                  Campus<span className="bg-gradient-to-r from-accent to-violet-500 bg-clip-text text-transparent">Grid</span>
                </span>
              </Link>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">
                The unified, domain-verified student network. Showcase your verified contributions, connect with peers, discover student clubs, and attend campus tech events.
              </p>
            </div>

            {/* Links Columns */}
            <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 col-span-1">
              
              {/* Column 1: Platform */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Platform</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="#features" className="text-zinc-500 hover:text-accent dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
                      Features
                    </a>
                  </li>
                  <li>
                    <a href="#preview" className="text-zinc-500 hover:text-accent dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
                      Live Preview
                    </a>
                  </li>
                  <li>
                    <a href="#stats" className="text-zinc-500 hover:text-accent dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
                      Ecosystem
                    </a>
                  </li>
                  <li>
                    <a href="#qr" className="text-zinc-500 hover:text-accent dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
                      QR Identity
                    </a>
                  </li>
                </ul>
              </div>

              {/* Column 2: Resources */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Resources</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/sign-in" className="text-zinc-500 hover:text-accent dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
                      Student Login
                    </Link>
                  </li>
                  <li>
                    <Link href="/sign-up" className="text-zinc-500 hover:text-accent dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
                      Register Domain
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard" className="text-zinc-500 hover:text-accent dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
                      Dashboard
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Column 3: Legal */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <span className="text-zinc-400 cursor-default select-none">Privacy Policy</span>
                  </li>
                  <li>
                    <span className="text-zinc-400 cursor-default select-none">Terms of Service</span>
                  </li>
                  <li>
                    <span className="text-zinc-400 cursor-default select-none">Domain Terms</span>
                  </li>
                </ul>
              </div>

            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-center">
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              &copy; {new Date().getFullYear()} CampusGrid. All rights reserved. Built by students, for students.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
