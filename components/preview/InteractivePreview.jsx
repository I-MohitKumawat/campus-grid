'use client';

/**
 * components/preview/InteractivePreview.jsx
 *
 * Premium interactive visual preview of the CampusGrid platform features:
 * 1. Decluttered, horizontal Student Profile Card
 * 2. Premium Card-style Leaderboard with a podium layout for Top 3 and cards for other ranks
 */

import { useState } from 'react';
import { MOCK_LEADERBOARD, MOCK_PROJECTS, MOCK_TIMELINE } from '@/data/mockData';
import { 
  Search, 
  Trophy, 
  Star, 
  GitBranch, 
  CheckCircle2, 
  Flame, 
  Sparkles,
  Compass
} from 'lucide-react';

export default function InteractivePreview() {
  const [activeTab, setActiveTab] = useState('profile');
  const [profileTab, setProfileTab] = useState('projects');
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');

  // Filter leaderboard based on user input
  const filteredLeaderboard = MOCK_LEADERBOARD.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === 'All' || student.dept === deptFilter;
    return matchesSearch && matchesDept;
  });

  // Extract top 3 and remaining ranks if no filters are active
  const isDefaultView = searchTerm === '' && deptFilter === 'All';
  const rank1 = MOCK_LEADERBOARD.find(s => s.rank === 1);
  const rank2 = MOCK_LEADERBOARD.find(s => s.rank === 2);
  const rank3 = MOCK_LEADERBOARD.find(s => s.rank === 3);
  const remainingRanks = filteredLeaderboard.filter(s => s.rank > 3);

  return (
    <section id="preview" className="scroll-mt-24 py-24 transition-colors duration-300 bg-zinc-50 dark:bg-zinc-900/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Title */}
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h2 className="font-display text-4xl font-extrabold tracking-tight text-brand dark:text-zinc-50 sm:text-5xl">
            Experience the <span className="bg-gradient-to-r from-accent via-violet-500 to-indigo-600 bg-clip-text text-transparent">Interactive Interface</span>
          </h2>
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
            Switch between the mock Student Profile and the Live Leaderboard below to see how CampusGrid organizes campus talent.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex rounded-xl p-1.5 bg-zinc-200/80 dark:bg-zinc-800/80 backdrop-blur-sm shadow-inner animate-fadeIn">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-300 cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-white text-accent shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Student Profile Card
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-300 cursor-pointer ${
                activeTab === 'leaderboard'
                  ? 'bg-white text-accent shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Live Leaderboard
            </button>
          </div>
        </div>

        {/* Content Box */}
        <div className="mx-auto max-w-4xl rounded-[32px] border border-zinc-200/80 bg-white p-6 shadow-2xl shadow-zinc-200/40 transition-all duration-300 dark:border-zinc-855 dark:bg-zinc-950 dark:shadow-none sm:p-8">
          {activeTab === 'profile' ? (
            /* Refined Student Profile Card Preview (Decluttered layout) */
            <div className="space-y-8 animate-fadeIn">
              
              {/* Header section (Horizontal representation) */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-100 dark:border-zinc-800/85 pb-6">
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 shrink-0 select-none">
                    <img 
                      src="/images/arjun.png" 
                      alt="Arjun Dev" 
                      className="h-full w-full rounded-2xl object-cover border border-zinc-200/50 dark:border-zinc-800"
                    />
                    <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 border border-white dark:border-zinc-950 text-white shadow-sm" title="Verified Account">
                      <CheckCircle2 className="h-3 w-3 stroke-[3]" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-bold text-brand dark:text-zinc-50 flex items-center gap-2">
                      Arjun Dev
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Computer Science · Batch of 2026</p>
                  </div>
                </div>

                {/* Scores Columns */}
                <div className="flex items-center gap-8">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Permanent XP</p>
                    <p className="text-xl font-extrabold text-brand dark:text-zinc-50 mt-0.5">1,240 XP</p>
                  </div>
                  <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800" />
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Campus Score</p>
                    <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">320 pts</p>
                  </div>
                </div>
              </div>

              {/* Bio & Skills Tagline */}
              <div className="space-y-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Full Stack developer focused on high-performance web applications and machine learning integrations. Google Developer Groups Lead at campus. Committed to open-source contributions.
                </p>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mr-1.5 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-accent" /> Verified Badges:
                  </span>
                  <span className="inline-flex items-center rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:border dark:border-zinc-800">
                    TypeScript
                  </span>
                  <span className="inline-flex items-center rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:border dark:border-zinc-800">
                    Next.js
                  </span>
                  <span className="inline-flex items-center rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:border dark:border-zinc-800">
                    Python
                  </span>
                </div>
              </div>

              {/* Nested Tabs */}
              <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-6">
                <div className="border-b border-zinc-200/60 dark:border-zinc-850 mb-6">
                  <nav className="flex gap-6">
                    <button
                      onClick={() => setProfileTab('projects')}
                      className={`pb-3 text-sm font-bold border-b-2 transition-all duration-300 cursor-pointer ${
                        profileTab === 'projects'
                          ? 'border-accent text-accent dark:border-accent dark:text-accent'
                          : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                      }`}
                    >
                      GitHub Projects ({MOCK_PROJECTS.length})
                    </button>
                    <button
                      onClick={() => setProfileTab('timeline')}
                      className={`pb-3 text-sm font-bold border-b-2 transition-all duration-300 cursor-pointer ${
                        profileTab === 'timeline'
                          ? 'border-accent text-accent dark:border-accent dark:text-accent'
                          : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                      }`}
                    >
                      Activity Timeline
                    </button>
                  </nav>
                </div>

                {profileTab === 'projects' ? (
                  /* GitHub Projects Grid */
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {MOCK_PROJECTS.map((proj, idx) => (
                      <div key={idx} className="flex flex-col justify-between rounded-xl border border-zinc-200/80 p-4.5 bg-white transition-all duration-300 hover:scale-102 hover:border-accent/40 hover:shadow-lg dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:hover:shadow-indigo-500/5">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h5 className="font-display font-bold text-sm text-brand dark:text-zinc-50 truncate">{proj.title}</h5>
                            <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200/50 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700/80 uppercase tracking-wider shrink-0">{proj.lang}</span>
                          </div>
                          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">{proj.desc}</p>
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-zinc-100/10 pt-3 dark:border-zinc-850">
                          <div className="flex items-center gap-3.5 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                            <span className="flex items-center gap-0.5 hover:text-amber-500 transition-colors">
                              <Star className="h-3.5 w-3.5 fill-amber-500/10 text-amber-500" />
                              {proj.stars}
                            </span>
                            <span className="flex items-center gap-0.5 hover:text-indigo-500 transition-colors">
                              <GitBranch className="h-3.5 w-3.5 text-indigo-500" />
                              {proj.commits}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Activity Timeline Connector Layout */
                  <div className="relative border-l-2 border-zinc-150 dark:border-zinc-800 ml-3 pl-6 space-y-6">
                    {MOCK_TIMELINE.map((time, idx) => (
                      <div key={idx} className="relative group">
                        {/* Dot */}
                        <div className="absolute -left-[32.5px] top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white border-2 border-indigo-500 dark:bg-zinc-950">
                          <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 group-hover:scale-125 transition-transform" />
                        </div>
                        
                        <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 dark:border-zinc-900 dark:bg-zinc-900/20 hover:border-indigo-500/30 transition-all duration-300">
                          <div>
                            <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest block">{time.date} · {time.type}</span>
                            <h5 className="font-bold text-brand dark:text-zinc-50 mt-1">{time.desc}</h5>
                          </div>
                          <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-600 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40">
                            {time.points}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : (
            /* Live Leaderboard Preview (Card-like Design) */
            <div className="space-y-6 animate-fadeIn">
              
              {/* Leaderboard Filters */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-zinc-50/55 dark:bg-zinc-900/10 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-900">
                {/* Search */}
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-4 w-4 text-zinc-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 py-2.5 text-sm text-brand placeholder-zinc-400 shadow-inner outline-none transition-all duration-300 focus:border-accent focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-accent dark:focus:bg-zinc-950"
                  />
                </div>

                {/* Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-widest">Department:</span>
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm font-semibold text-zinc-700 outline-none cursor-pointer dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:bg-zinc-950 transition-colors"
                  >
                    <option value="All">All Departments</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electronics & Comm.">Electronics & Comm.</option>
                    <option value="Mechanical Eng.">Mechanical Eng.</option>
                  </select>
                </div>
              </div>

              {/* Roster Display */}
              <div className="space-y-4">
                {filteredLeaderboard.length > 0 ? (
                  <>
                    {/* Top 3 Podium Cards (Rendered only on default view without search/filters to maintain layout) */}
                    {isDefaultView && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                        {/* Rank 2 Card (Left) */}
                        {rank2 && (
                          <div className="flex flex-col items-center text-center p-5 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 dark:border-zinc-850 dark:bg-zinc-900/10 transition-transform duration-300 hover:scale-102">
                            <div className="relative">
                              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-sm font-extrabold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 ring-4 ring-slate-400/20 border-2 border-slate-400">
                                {rank2.avatar}
                              </div>
                              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-400 text-white text-[10px] font-bold shadow-sm">
                                2
                              </div>
                            </div>
                            <h4 className="mt-4 font-display font-bold text-brand dark:text-zinc-100">{rank2.name}</h4>
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider">{rank2.dept}</p>
                            <p className="mt-2.5 text-sm font-extrabold text-brand dark:text-zinc-200 flex items-center gap-0.5">
                              <Flame className="h-4 w-4 text-orange-500" />
                              {rank2.xp.toLocaleString()} XP
                            </p>
                          </div>
                        )}

                        {/* Rank 1 Card (Middle Highlight) */}
                        {rank1 && (
                          <div className="flex flex-col items-center text-center p-5 rounded-2xl border border-amber-500/50 bg-amber-500/5 dark:border-amber-500/30 dark:bg-amber-500/5 shadow-md transition-transform duration-300 hover:scale-102">
                            <div className="relative">
                              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-sm font-extrabold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 ring-4 ring-amber-500/30 border-2 border-amber-500">
                                {rank1.avatar}
                              </div>
                              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold shadow-sm">
                                1
                              </div>
                            </div>
                            <h4 className="mt-4 font-display font-extrabold text-brand dark:text-zinc-100 flex items-center gap-1">
                              {rank1.name}
                              <Trophy className="h-3.5 w-3.5 text-amber-500 fill-amber-500/10 shrink-0" />
                            </h4>
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">{rank1.dept}</p>
                            <p className="mt-2.5 text-sm font-extrabold text-brand dark:text-zinc-200 flex items-center gap-0.5">
                              <Flame className="h-4 w-4 text-orange-500" />
                              {rank1.xp.toLocaleString()} XP
                            </p>
                          </div>
                        )}

                        {/* Rank 3 Card (Right) */}
                        {rank3 && (
                          <div className="flex flex-col items-center text-center p-5 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 dark:border-zinc-850 dark:bg-zinc-900/10 transition-transform duration-300 hover:scale-102">
                            <div className="relative">
                              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-sm font-extrabold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 ring-4 ring-orange-500/20 border-2 border-orange-500">
                                {rank3.avatar}
                              </div>
                              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-bold shadow-sm">
                                3
                              </div>
                            </div>
                            <h4 className="mt-4 font-display font-bold text-brand dark:text-zinc-100">{rank3.name}</h4>
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider">{rank3.dept}</p>
                            <p className="mt-2.5 text-sm font-extrabold text-brand dark:text-zinc-200 flex items-center gap-0.5">
                              <Flame className="h-4 w-4 text-orange-500" />
                              {rank3.xp.toLocaleString()} XP
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Standard Roster Cards (Renders remaining list, or ALL items if filtered) */}
                    <div className="space-y-3">
                      {(isDefaultView ? remainingRanks : filteredLeaderboard).map((row, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between p-4 rounded-xl border border-zinc-200/80 bg-white transition-all duration-300 hover:scale-[1.01] hover:border-accent/40 hover:shadow-md dark:border-zinc-850 dark:bg-zinc-900/30 dark:hover:shadow-indigo-500/5"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-extrabold text-zinc-400 dark:text-zinc-500 w-8">
                              #{row.rank}
                            </span>
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-xs font-extrabold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200/30 dark:border-zinc-800">
                              {row.avatar}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-brand dark:text-zinc-100">{row.name}</div>
                              <div className="text-[10px] text-zinc-450 dark:text-zinc-400 font-semibold">{row.dept}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40">
                              +{row.score} pts
                            </span>
                            <span className="inline-flex items-center gap-1 text-sm font-extrabold text-brand dark:text-zinc-200">
                              <Flame className="h-4 w-4 text-orange-500" />
                              {row.xp.toLocaleString()} XP
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  /* Empty Search Results */
                  <div className="py-12 text-center text-sm font-medium text-zinc-400 dark:text-zinc-500 border border-zinc-200/60 rounded-2xl dark:border-zinc-850">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Compass className="h-8 w-8 text-zinc-350 dark:text-zinc-750 animate-spin" />
                      <span>No students matched your search criteria.</span>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </section>
  );
}
