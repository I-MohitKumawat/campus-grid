'use client';

/**
 * app/dashboard/clubs/[id]/page.jsx
 *
 * Detailed Club Hub view for CampusGrid.
 * Displays real club details, domain focus tags, social links, recruitment status,
 * members roster, Join/Apply button with real backend gating, and modal application flow.
 */

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, 
  Building2, 
  Check, 
  Edit3, 
  Sparkles, 
  ArrowLeft, 
  Calendar, 
  Save, 
  X, 
  CheckCircle2, 
  AlertCircle,
  UserCheck,
  ShieldCheck,
  Zap,
  Globe,
  Share2,
  Code,
  MessageSquare,
  Tag,
  Radio,
  Archive,
  Clock,
  Send,
  UserPlus
} from 'lucide-react';
import DashboardNavbar from '@/components/layout/DashboardNavbar';
import { useAuth } from '@/components/providers/AuthProvider';
import { can } from '@/lib/permissions';
import { CLUB_POSITION_LABELS } from '@/lib/constants/club-positions';

export default function ClubDetailPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const clubIdOrSlug = resolvedParams.id;

  const { user } = useAuth();
  const [club, setClub] = useState(null);
  const [members, setMembers] = useState([]);
  const [userMembership, setUserMembership] = useState(null);
  const [userApplication, setUserApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, members
  
  // Application Modal state
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [submittingApply, setSubmittingApply] = useState(false);
  const [applyForm, setApplyForm] = useState({
    motivation: '',
    interests: '',
    experience: ''
  });
  const [feedback, setFeedback] = useState(null);

  const loadClubDetails = async () => {
    try {
      setLoading(true);
      const clubRes = await fetch(`/api/v1/clubs/${clubIdOrSlug}`, { cache: 'no-store' });
      const clubData = await clubRes.json().catch(() => null);

      if (clubRes.ok && clubData?.success && clubData?.data) {
        const c = clubData.data;
        setClub(c);

        // Load members roster
        const memRes = await fetch(`/api/v1/clubs/${c.slug || c.id}/members`, { cache: 'no-store' }).catch(() => null);
        if (memRes && memRes.ok) {
          const memData = await memRes.json().catch(() => null);
          if (memData?.success && Array.isArray(memData.data)) {
            setMembers(memData.data);
            if (user) {
              const myMem = memData.data.find((m) => m.user_id === user.id && m.status === 'active');
              setUserMembership(myMem || null);
            }
          }
        }

        // Load user's application status if logged in
        if (user) {
          const appRes = await fetch(`/api/v1/clubs/${c.slug || c.id}/applications`, { cache: 'no-store' }).catch(() => null);
          if (appRes && appRes.ok) {
            const appData = await appRes.json().catch(() => null);
            if (appData?.success && Array.isArray(appData.data) && appData.data.length > 0) {
              setUserApplication(appData.data[0]);
            } else {
              setUserApplication(null);
            }
          }
        }
      } else {
        setClub(null);
      }
    } catch (err) {
      console.error('Failed to load club details:', err);
      setClub(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClubDetails();
  }, [clubIdOrSlug, user]);

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!club) return;
    if (!applyForm.motivation.trim() || applyForm.motivation.trim().length < 10) {
      setFeedback({ type: 'error', msg: 'Please provide a motivation of at least 10 characters.' });
      return;
    }

    setSubmittingApply(true);
    setFeedback(null);

    try {
      const interestsArray = applyForm.interests
        ? applyForm.interests.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      const res = await fetch(`/api/v1/clubs/${club.slug || club.id}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motivation: applyForm.motivation.trim(),
          interests: interestsArray,
          experience: applyForm.experience.trim() || undefined,
        }),
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.success) {
        setFeedback({
          type: 'success',
          msg: `Your application to join ${club.name} was successfully submitted!`,
        });
        setApplyModalOpen(false);
        setApplyForm({ motivation: '', interests: '', experience: '' });
        await loadClubDetails();
      } else {
        setFeedback({
          type: 'error',
          msg: json?.error?.message || json?.error || 'Failed to submit membership application.',
        });
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: 'Network error submitting application.' });
    } finally {
      setSubmittingApply(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent mb-3" />
        <p className="text-xs text-zinc-400">Loading Club Hub...</p>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <DashboardNavbar />
        <main className="max-w-3xl mx-auto px-6 py-20 text-center space-y-4">
          <Building2 className="h-12 w-12 text-zinc-600 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Club Not Found</h1>
          <p className="text-xs text-zinc-400">
            The requested campus club does not exist or may have been deleted.
          </p>
          <Link
            href="/dashboard/clubs"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-xs font-bold text-white shadow-lg cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Clubs
          </Link>
        </main>
      </div>
    );
  }

  const isManager = can('club:manage', user, { club });
  const socials = club.social_links && typeof club.social_links === 'object' ? club.social_links : {};
  const isMember = Boolean(userMembership);
  const hasPendingApp = userApplication && userApplication.status === 'pending';

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 relative overflow-hidden pb-24 font-sans">
      <DashboardNavbar />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        
        {/* Feedback Alert */}
        {feedback && (
          <div className={`p-4 rounded-2xl flex items-center justify-between border ${
            feedback.type === 'success' ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300' : 'bg-rose-950/30 border-rose-800/40 text-rose-300'
          }`}>
            <div className="flex items-center gap-2 text-xs font-bold">
              {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{feedback.msg}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-zinc-500 hover:text-zinc-300 cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Navigation & Header Actions */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/clubs"
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Campus Clubs</span>
          </Link>

          {/* Contextual Action Bar */}
          <div className="flex items-center gap-3">
            {isManager && (
              <Link
                href={`/dashboard/clubs/${club.slug || club.id}/manage`}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-accent text-zinc-200 hover:text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5 text-accent" />
                <span>Manage Club Workspace</span>
              </Link>
            )}

            {!club.archived_at && !isManager && (
              <>
                {isMember ? (
                  <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                    <Check className="h-3.5 w-3.5 stroke-[3px]" />
                    <span>Member ({CLUB_POSITION_LABELS[userMembership.role] || 'Member'})</span>
                  </span>
                ) : hasPendingApp ? (
                  <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs font-bold">
                    <Clock className="h-3.5 w-3.5 animate-pulse" />
                    <span>Application Pending</span>
                  </span>
                ) : club.recruitment_open ? (
                  <button
                    onClick={() => {
                      if (!user) {
                        router.push('/sign-in');
                      } else {
                        setApplyModalOpen(true);
                      }
                    }}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-lg shadow-violet-600/20 cursor-pointer"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Apply to Join</span>
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 text-xs font-bold">
                    <span>Recruitment Closed</span>
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── ARCHIVED STATUS BANNER ───────────────────────────────────── */}
        {club.archived_at && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-300 shadow-lg">
            <Archive className="h-5 w-5 shrink-0 text-amber-400" />
            <div className="text-xs">
              <strong className="font-bold text-amber-200">Archived Organization:</strong> This club was archived on{' '}
              {new Date(club.archived_at).toLocaleDateString()}
              {club.archived_by_username && ` by @${club.archived_by_username}`}. Historical event attendance, certificates, and memberships remain preserved for institutional verification.
            </div>
          </div>
        )}

        {/* ── CLUB HERO BANNER ────────────────────────────────────────── */}
        <div className="relative rounded-[32px] border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl overflow-hidden shadow-2xl">
          
          {/* Banner Cover Image (if available) */}
          {club.banner_url && (
            <div className="relative h-48 sm:h-64 w-full bg-zinc-950 overflow-hidden">
              <img src={club.banner_url} alt={club.name} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
            </div>
          )}

          <div className="p-8 sm:p-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
              
              {/* Club Logo Emblem */}
              <div className="relative h-28 w-28 rounded-2xl border border-zinc-800 bg-zinc-950 flex items-center justify-center overflow-hidden shrink-0 shadow-xl">
                {club.logo_url ? (
                  <img src={club.logo_url} alt={club.name} className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-12 w-12 text-violet-400" />
                )}
              </div>

              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1 text-[10px] font-bold text-violet-400 border border-violet-500/20 uppercase tracking-wider">
                    <Check className="h-3 w-3 stroke-[3px]" /> Verified Campus Club
                  </span>
                  
                  <span className="inline-flex items-center rounded-full bg-zinc-800/80 px-2.5 py-0.5 text-[10px] font-bold text-zinc-300 border border-zinc-700">
                    {club.category || club.type || 'Technical'}
                  </span>

                  {club.recruitment_open ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                      Recruiting Members
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-zinc-800 px-2.5 py-0.5 text-[10px] font-bold text-zinc-400 border border-zinc-700">
                      Recruitment Closed
                    </span>
                  )}
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{club.name}</h1>
                <p className="text-xs text-zinc-400 leading-relaxed">{club.description || 'No descriptive mission provided.'}</p>
                
                {/* Meta Row: Members & Lead */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-1 text-xs font-semibold text-zinc-400">
                  <span className="flex items-center gap-1.5 text-zinc-300">
                    <Users className="h-4 w-4 text-violet-400" />
                    {club.member_count ?? members.length} Active Members
                  </span>
                  <span className="text-zinc-700">•</span>
                  <span className="flex items-center gap-1.5 text-accent">
                    <UserCheck className="h-4 w-4" />
                    Lead: {club.lead_full_name ? `${club.lead_full_name} (@${club.lead_username})` : club.lead_username ? `@${club.lead_username}` : 'Unassigned'}
                  </span>
                </div>
              </div>
            </div>

            {/* Social Channels Quick Links */}
            <div className="flex items-center gap-2 shrink-0">
              {socials.website && (
                <a href={socials.website} target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-accent text-zinc-400 hover:text-white flex items-center justify-center transition-colors">
                  <Globe className="h-4 w-4" />
                </a>
              )}
              {socials.instagram && (
                <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-accent text-zinc-400 hover:text-pink-400 flex items-center justify-center transition-colors" title="Instagram">
                  <Share2 className="h-4 w-4" />
                </a>
              )}
              {socials.linkedin && (
                <a href={socials.linkedin} target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-accent text-zinc-400 hover:text-blue-400 flex items-center justify-center transition-colors" title="LinkedIn">
                  <Share2 className="h-4 w-4" />
                </a>
              )}
              {socials.github && (
                <a href={socials.github} target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-accent text-zinc-400 hover:text-white flex items-center justify-center transition-colors" title="GitHub">
                  <Code className="h-4 w-4" />
                </a>
              )}
              {socials.discord && (
                <a href={socials.discord} target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-accent text-zinc-400 hover:text-indigo-400 flex items-center justify-center transition-colors">
                  <MessageSquare className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── CONTENT TABS ────────────────────────────────────────────── */}
        <div className="space-y-6">
          <div className="flex items-center gap-6 border-b border-zinc-900 pb-3">
            <button
              onClick={() => setActiveTab('overview')}
              className={`text-xs font-bold uppercase tracking-wider transition-all pb-3 relative cursor-pointer ${
                activeTab === 'overview' ? 'text-violet-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Overview & Focus Areas
              {activeTab === 'overview' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-full" />}
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`text-xs font-bold uppercase tracking-wider transition-all pb-3 relative cursor-pointer ${
                activeTab === 'members' ? 'text-violet-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Members Roster ({members.length})
              {activeTab === 'members' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-full" />}
            </button>
          </div>

          {activeTab === 'overview' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left 2 Cols: Mission Statement */}
              <div className="lg:col-span-2 rounded-3xl border border-zinc-900 bg-zinc-900/10 backdrop-blur-xl p-8 space-y-6 shadow-xl">
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-white">About the Organization</h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">{club.description || 'No detailed mission statement recorded.'}</p>
                </div>

                {/* Domain Focus Tags */}
                {Array.isArray(club.domain_tags) && club.domain_tags.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-zinc-900">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-accent" /> Focus Domains & Technologies
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {club.domain_tags.map((tag) => (
                        <span key={tag} className="px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-bold shadow-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Col: Details Summary Card */}
              <div className="rounded-3xl border border-zinc-900 bg-zinc-900/10 backdrop-blur-xl p-6 space-y-5 shadow-xl">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Society Details</h3>
                
                <div className="space-y-3.5 text-xs">
                  <div className="flex items-center justify-between py-2 border-b border-zinc-900">
                    <span className="text-zinc-500">Access Policy</span>
                    <span className="font-bold text-zinc-200 capitalize">{club.visibility || 'Public'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-zinc-900">
                    <span className="text-zinc-500">Classification</span>
                    <span className="font-bold text-zinc-200">{club.category || club.type || 'Technical'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-zinc-900">
                    <span className="text-zinc-500">Established</span>
                    <span className="font-bold text-zinc-200">{new Date(club.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-zinc-500">Recruitment</span>
                    <span className={`font-bold ${club.recruitment_open ? 'text-emerald-400' : 'text-zinc-400'}`}>
                      {club.recruitment_open ? 'Open for Applications' : 'Closed'}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="rounded-3xl border border-zinc-900 bg-zinc-900/10 backdrop-blur-xl p-6">
              {members.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {members.map((m) => (
                    <div key={m.id || m.user_id} className="p-4 rounded-2xl bg-zinc-950/40 border border-zinc-900 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center font-bold text-xs text-violet-400 uppercase shrink-0">
                        {m.username?.charAt(0) || 'U'}
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-xs font-bold text-zinc-200 truncate">{m.full_name || m.username}</h4>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                          {CLUB_POSITION_LABELS[m.role] || m.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-zinc-500">
                  No registered members roster available for this club.
                </div>
              )}
            </div>
          )}
        </div>

      </main>

      {/* ── STUDENT MEMBERSHIP APPLICATION MODAL ───────────────────────── */}
      {applyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-950 border border-violet-500/30 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Apply to {club.name}</h3>
                  <p className="text-xs text-zinc-400">Submit your membership application</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApplyModalOpen(false)}
                className="text-zinc-500 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">
                  Motivation & Statement of Purpose <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={applyForm.motivation}
                  onChange={(e) => setApplyForm({ ...applyForm, motivation: e.target.value })}
                  placeholder="Why do you want to join this club and what do you hope to contribute or learn?"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent"
                />
                <p className="text-[10px] text-zinc-500">Minimum 10 characters.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">
                  Areas of Interest / Domains <span className="text-zinc-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={applyForm.interests}
                  onChange={(e) => setApplyForm({ ...applyForm, interests: e.target.value })}
                  placeholder="e.g. Embedded Systems, ROS, Frontend, Outreach (comma-separated)"
                  className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">
                  Relevant Past Experience <span className="text-zinc-500">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={applyForm.experience}
                  onChange={(e) => setApplyForm({ ...applyForm, experience: e.target.value })}
                  placeholder="Any prior projects, hackathons, or club experience..."
                  className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setApplyModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingApply || !applyForm.motivation.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-violet-600/20 cursor-pointer transition"
                >
                  {submittingApply ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>Submit Application</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
