/**
 * app/dashboard/profile/page.jsx
 *
 * CampusGrid Canonical Student Digital Identity.
 *
 * Features:
 * - Institutional Read-Only Information (Name, USN, Department, Program, Academic Year, College Email)
 * - Profile Correction Request Flow for Institutional Details
 * - Student Editable Information (Photo file upload, Bio, Interests, GitHub, LinkedIn, Portfolio, LeetCode)
 * - Auto-Populated Club Organizations (Read-only from DB)
 * - Verified Campus Timeline (Chronological events & seat check-ins)
 * - Pinned Accomplishment Highlights
 * - System-Generated Certificates
 * - Future-Ready Projects Showcase
 *
 * Excludes fake gamification (XP, Rank, Fake Badges, Manual Skills).
 * Strictly enforces 0 emojis and 100% Lucide Icons.
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import DashboardNavbar from '@/components/layout/DashboardNavbar';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  User,
  Calendar,
  CheckCircle2,
  Award,
  Users,
  Code2,
  Share2,
  Globe,
  Mail,
  Edit3,
  Sparkles,
  Plus,
  X,
  Save,
  ArrowRight,
  ShieldCheck,
  Building2,
  BookOpen,
  LayoutGrid,
  Activity,
  Ticket,
  QrCode,
  Copy,
  Check,
  Lock,
  GraduationCap,
  Upload,
  Camera,
  FileText,
  Pin,
  FolderKanban,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

export default function StudentProfilePage() {
  const { user: authUser, refreshSession } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, timeline, organizations, certificates, projects
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const fileInputRef = useRef(null);

  // Edit Form State (Only allowed personal fields)
  const [formData, setFormData] = useState({
    avatar_url: '',
    bio: '',
    github_url: '',
    linkedin_url: '',
    website_url: '',
    leetcode_url: '',
    interestsInput: ''
  });

  const [interestsList, setInterestsList] = useState([]);
  const [pinnedHighlights, setPinnedHighlights] = useState([]);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Fetch Profile Data
  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/v1/users/me', { cache: 'no-store' });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.success && json?.data) {
        setProfileData(json.data);
        populateFormData(json.data);
      } else {
        setError(json?.error?.message || 'Failed to load student profile.');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Connection error loading profile.');
    } finally {
      setLoading(false);
    }
  };

  const populateFormData = (data) => {
    const p = data.profile || {};
    const u = data.user || {};
    setFormData({
      avatar_url: u.avatar_url || '',
      bio: p.bio || '',
      github_url: p.github_url || '',
      linkedin_url: p.linkedin_url || '',
      website_url: p.website_url || '',
      leetcode_url: p.leetcode_url || '',
      interestsInput: ''
    });
    setAvatarPreview(u.avatar_url || null);
    setInterestsList(p.interests || []);
    setPinnedHighlights(p.pinned_highlights || []);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Handle Photo File Upload & Convert to Base64 Data URL
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setFeedback({ type: 'error', msg: 'Image size exceeds 2MB limit.' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setAvatarPreview(base64String);
        setFormData(prev => ({ ...prev, avatar_url: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Share profile link copy action
  const handleShareProfile = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Handle Profile Update Submission
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setFeedback(null);

      const payload = {
        avatar_url: formData.avatar_url,
        bio: formData.bio,
        github_url: formData.github_url,
        linkedin_url: formData.linkedin_url,
        website_url: formData.website_url,
        leetcode_url: formData.leetcode_url,
        interests: interestsList,
        pinned_highlights: pinnedHighlights
      };

      const res = await fetch('/api/v1/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.success && json?.data) {
        setProfileData(json.data);
        populateFormData(json.data);
        if (refreshSession) {
          await refreshSession();
        }
        setFeedback({ type: 'success', msg: 'Profile updated successfully!' });
        setEditModalOpen(false);
      } else {
        setFeedback({ type: 'error', msg: json?.error?.message || 'Failed to save profile.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: 'Server error updating profile.' });
    } finally {
      setSaving(false);
    }
  };

  // Add / Remove Interest Chip
  const handleAddInterest = () => {
    const trimmed = formData.interestsInput.trim();
    if (trimmed && !interestsList.includes(trimmed)) {
      setInterestsList([...interestsList, trimmed]);
      setFormData({ ...formData, interestsInput: '' });
    }
  };

  const handleRemoveInterest = (interestToRemove) => {
    setInterestsList(interestsList.filter(i => i !== interestToRemove));
  };

  // Toggle Pinned Highlights
  const togglePinHighlight = (milestoneId) => {
    if (pinnedHighlights.includes(milestoneId)) {
      setPinnedHighlights(pinnedHighlights.filter(id => id !== milestoneId));
    } else {
      if (pinnedHighlights.length >= 3) {
        setFeedback({ type: 'error', msg: 'You can pin a maximum of 3 highlights.' });
        return;
      }
      setPinnedHighlights([...pinnedHighlights, milestoneId]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <DashboardNavbar />
        <main className="max-w-6xl mx-auto px-6 py-10 space-y-8 animate-pulse">
          <div className="h-52 rounded-3xl bg-zinc-900/60 border border-zinc-800" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 rounded-3xl bg-zinc-900/60 border border-zinc-800" />
            <div className="h-64 rounded-3xl bg-zinc-900/60 border border-zinc-800" />
          </div>
        </main>
      </div>
    );
  }

  const {
    user = {},
    profile = {},
    institutionalInfo = {},
    organizations = [],
    timeline = [],
    certificates = []
  } = profileData || {};

  const initials = (institutionalInfo.full_name || user.username || 'Student')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const highlightMilestones = timeline.filter(t => pinnedHighlights.includes(t.id));

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 relative overflow-hidden pb-24 font-sans">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-1/4 -z-10 h-[600px] w-[600px] rounded-full bg-violet-600/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 -z-10 h-[600px] w-[600px] rounded-full bg-accent/5 blur-3xl pointer-events-none" />

      <DashboardNavbar />

      <main className="max-w-6xl mx-auto px-6 pt-8 space-y-8">
        
        {/* Feedback Alert */}
        {feedback && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold ${
            feedback.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}>
            <span>{feedback.msg}</span>
            <button onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-white">✕</button>
          </div>
        )}

        {/* 1. HERO IDENTITY SECTION */}
        <div className="relative rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 sm:p-8 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 h-full w-2/5 bg-gradient-to-l from-accent/10 via-violet-500/5 to-transparent pointer-events-none" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              
              {/* Profile Avatar */}
              <div className="relative group shrink-0">
                <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-full p-1 bg-gradient-to-tr from-accent via-violet-500 to-indigo-500 shadow-2xl">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={institutionalInfo.full_name}
                      className="h-full w-full rounded-full object-cover bg-zinc-950"
                    />
                  ) : (
                    <div className="h-full w-full rounded-full bg-zinc-950 flex items-center justify-center text-white text-3xl font-extrabold">
                      {initials}
                    </div>
                  )}
                </div>
              </div>

              {/* Identity & Institutional Metadata */}
              <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                    {institutionalInfo.full_name}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verified Identity
                  </span>
                </div>

                <p className="text-zinc-300 text-sm font-medium">
                  {profile.bio || 'CampusGrid Student • Participating in campus events, societies, and workshops.'}
                </p>

                {/* Institutional Metadata Badge Row */}
                <div className="flex items-center gap-3 text-xs text-zinc-400 font-semibold pt-1 flex-wrap">
                  <span className="text-accent font-bold">USN: {institutionalInfo.usn}</span>
                  <span>•</span>
                  <span className="text-zinc-300">{institutionalInfo.department}</span>
                  <span>•</span>
                  <span className="text-violet-400 font-bold">{institutionalInfo.academic_year}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
              <button
                onClick={() => setEditModalOpen(true)}
                className="rounded-xl bg-accent hover:bg-accent/90 text-white font-bold text-xs px-5 py-3 shadow-lg shadow-accent/20 inline-flex items-center gap-2 transition-all cursor-pointer"
              >
                <Edit3 className="h-4 w-4" /> Edit Personal Profile
              </button>

              <button
                onClick={handleShareProfile}
                className="rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-200 hover:text-white px-4 py-3 shadow-md inline-flex items-center gap-2 transition-all cursor-pointer"
              >
                {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4 text-zinc-400" />}
                {copiedLink ? 'Link Copied' : 'Share Profile'}
              </button>
            </div>
          </div>
        </div>

        {/* 2. PINNED ACCOMPLISHMENT HIGHLIGHTS (If Selected) */}
        {highlightMilestones.length > 0 && (
          <div className="rounded-3xl border border-zinc-900 bg-zinc-900/30 backdrop-blur-xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Pin className="h-4 w-4 text-accent fill-accent" /> Featured Campus Highlights
              </h3>
              <span className="text-[10px] font-bold text-zinc-500">{highlightMilestones.length}/3 Pinned</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {highlightMilestones.map(m => (
                <div key={m.id} className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-extrabold text-accent">{m.category}</span>
                    <button onClick={() => togglePinHighlight(m.id)} className="text-zinc-500 hover:text-rose-400" title="Unpin highlight">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <h4 className="font-extrabold text-xs text-white truncate">{m.title}</h4>
                  <p className="text-[11px] text-zinc-400">{m.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. MODULAR NAVIGATION TABS */}
        <div className="border-b border-zinc-900 flex items-center gap-2 overflow-x-auto no-scrollbar pt-2">
          
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-accent text-accent bg-accent/5 rounded-t-xl'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="h-4 w-4" /> Overview
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'timeline'
                ? 'border-accent text-accent bg-accent/5 rounded-t-xl'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Activity className="h-4 w-4" /> Campus Timeline ({timeline.length})
          </button>

          <button
            onClick={() => setActiveTab('organizations')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'organizations'
                ? 'border-accent text-accent bg-accent/5 rounded-t-xl'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="h-4 w-4" /> Organizations ({organizations.length})
          </button>

          <button
            onClick={() => setActiveTab('certificates')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'certificates'
                ? 'border-accent text-accent bg-accent/5 rounded-t-xl'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Award className="h-4 w-4" /> Certificates ({certificates.length})
          </button>

          <button
            onClick={() => setActiveTab('projects')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'projects'
                ? 'border-accent text-accent bg-accent/5 rounded-t-xl'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <FolderKanban className="h-4 w-4" /> Projects Showcase
          </button>

        </div>

        {/* 4. TAB CONTENTS */}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
            
            {/* Left Column: Read-Only Institutional Information */}
            <div className="space-y-6 lg:col-span-1">
              
              <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-accent" /> Institutional Record
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    Read-Only
                  </span>
                </div>

                <div className="space-y-3 pt-1 text-xs">
                  <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-0.5">
                    <span className="text-zinc-500 font-bold text-[10px] uppercase">Full Name</span>
                    <p className="text-white font-semibold">{institutionalInfo.full_name}</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-0.5">
                    <span className="text-zinc-500 font-bold text-[10px] uppercase">USN / Roll Number</span>
                    <p className="text-accent font-bold font-mono">{institutionalInfo.usn}</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-0.5">
                    <span className="text-zinc-500 font-bold text-[10px] uppercase">Department & Program</span>
                    <p className="text-white font-semibold">{institutionalInfo.department}</p>
                    <p className="text-zinc-400 text-[11px]">{institutionalInfo.program}</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-0.5">
                    <span className="text-zinc-500 font-bold text-[10px] uppercase">Academic Year</span>
                    <p className="text-white font-semibold">{institutionalInfo.academic_year}</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-0.5">
                    <span className="text-zinc-500 font-bold text-[10px] uppercase">College Email</span>
                    <p className="text-zinc-300 font-medium truncate">{institutionalInfo.college_email}</p>
                  </div>
                </div>

                {/* Profile Correction Trigger */}
                <div className="pt-2 border-t border-zinc-900">
                  <button
                    onClick={() => setCorrectionModalOpen(true)}
                    className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <HelpCircle className="h-3.5 w-3.5" /> Request Institutional Record Correction
                  </button>
                </div>
              </div>

              {/* Online Social Links */}
              <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 space-y-4 shadow-xl">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <Globe className="h-4 w-4 text-violet-400" /> Online Profiles
                </h3>

                <div className="space-y-3 pt-1 text-xs">
                  {profile.github_url ? (
                    <a href={profile.github_url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-all">
                      <div className="flex items-center gap-2.5"><Code2 className="h-4 w-4 text-zinc-400" /><span className="font-bold">GitHub</span></div>
                      <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />
                    </a>
                  ) : (
                    <div className="p-3 rounded-2xl bg-zinc-900/20 border border-zinc-900 text-zinc-600 flex items-center gap-2"><Code2 className="h-4 w-4 text-zinc-700" /> GitHub not linked</div>
                  )}

                  {profile.linkedin_url ? (
                    <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-all">
                      <div className="flex items-center gap-2.5"><Share2 className="h-4 w-4 text-sky-400" /><span className="font-bold">LinkedIn</span></div>
                      <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />
                    </a>
                  ) : (
                    <div className="p-3 rounded-2xl bg-zinc-900/20 border border-zinc-900 text-zinc-600 flex items-center gap-2"><Share2 className="h-4 w-4 text-zinc-700" /> LinkedIn not linked</div>
                  )}

                  {profile.leetcode_url ? (
                    <a href={profile.leetcode_url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-all">
                      <div className="flex items-center gap-2.5"><Code2 className="h-4 w-4 text-amber-400" /><span className="font-bold">LeetCode</span></div>
                      <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />
                    </a>
                  ) : null}

                  {profile.website_url ? (
                    <a href={profile.website_url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-all">
                      <div className="flex items-center gap-2.5"><Globe className="h-4 w-4 text-accent" /><span className="font-bold">Portfolio</span></div>
                      <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Right Column: Bio, Interests, Auto Organizations & Timeline Highlights */}
            <div className="space-y-6 lg:col-span-2">
              
              {/* Personal Bio */}
              <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 space-y-4 shadow-xl">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <User className="h-4 w-4 text-accent" /> Student Mission & Bio
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {profile.bio || 'No bio provided. Edit personal profile to add student mission statement.'}
                </p>

                {interestsList.length > 0 && (
                  <div className="pt-2 border-t border-zinc-900 space-y-2">
                    <span className="text-[10px] font-extrabold text-zinc-500 uppercase">Interests & Focus Areas</span>
                    <div className="flex flex-wrap gap-2">
                      {interestsList.map((int, i) => (
                        <span key={i} className="px-3 py-1 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-300 text-xs font-bold">
                          {int}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Auto Organizations Summary */}
              <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-sky-400" /> Organization Memberships
                  </h3>
                  <button onClick={() => setActiveTab('organizations')} className="text-xs text-accent font-bold hover:underline">
                    View All ({organizations.length}) &rarr;
                  </button>
                </div>

                {organizations.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {organizations.slice(0, 4).map(org => (
                      <Link
                        key={org.id}
                        href={`/dashboard/clubs/${org.slug}`}
                        className="p-3.5 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center font-bold text-xs">
                            {org.name[0]}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-xs text-white group-hover:text-accent transition-colors">{org.name}</h4>
                            <p className="text-[10px] text-zinc-500 font-bold capitalize">{org.role || 'Member'}</p>
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-accent transition-colors" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center border border-dashed border-zinc-800 rounded-2xl space-y-2">
                    <Users className="h-6 w-6 text-zinc-600 mx-auto" />
                    <p className="text-xs font-bold text-zinc-300">No organizations joined yet.</p>
                    <p className="text-[11px] text-zinc-500">Explore official campus clubs and join student societies.</p>
                    <Link href="/dashboard/clubs" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-accent text-xs font-bold text-white mt-1">
                      Explore Clubs
                    </Link>
                  </div>
                )}
              </div>

              {/* Verified Timeline Preview */}
              <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-400" /> Recent Campus Milestones
                  </h3>
                  <button onClick={() => setActiveTab('timeline')} className="text-xs text-accent font-bold hover:underline">
                    Full Timeline &rarr;
                  </button>
                </div>

                {timeline.length > 0 ? (
                  <div className="space-y-3">
                    {timeline.slice(0, 4).map(item => (
                      <div key={item.id} className="p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-white flex items-center gap-2">
                            {item.category === 'attendance' ? <QrCode className="h-3.5 w-3.5 text-emerald-400" /> : <Ticket className="h-3.5 w-3.5 text-accent" />}
                            {item.title}
                          </span>
                          <p className="text-[11px] text-zinc-400">{item.description}</p>
                        </div>
                        {item.is_highlightable && (
                          <button
                            onClick={() => togglePinHighlight(item.id)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              pinnedHighlights.includes(item.id)
                                ? 'bg-accent/20 border-accent/40 text-accent'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:text-white'
                            }`}
                            title={pinnedHighlights.includes(item.id) ? 'Unpin highlight' : 'Pin to Profile Highlights'}
                          >
                            <Pin className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center border border-dashed border-zinc-800 rounded-2xl space-y-2">
                    <Activity className="h-6 w-6 text-zinc-600 mx-auto" />
                    <p className="text-xs font-bold text-zinc-300">No campus activity yet.</p>
                    <p className="text-[11px] text-zinc-500">Register for your first event to begin your verified campus journey.</p>
                    <Link href="/dashboard/events" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-accent text-xs font-bold text-white mt-1">
                      Browse Events
                    </Link>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: CAMPUS TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
              <div>
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-400" /> Chronological Campus Timeline
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Verified system milestones generated from platform registrations, QR check-ins, and club memberships.
                </p>
              </div>
              <span className="text-xs font-bold text-zinc-500">{timeline.length} Milestones Recorded</span>
            </div>

            {timeline.length > 0 ? (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
                {timeline.map((item) => (
                  <div key={item.id} className="relative group">
                    <span className={`absolute -left-[27px] top-1 h-4 w-4 rounded-full border-2 border-zinc-950 ${
                      item.category === 'attendance' ? 'bg-emerald-400' :
                      item.category === 'certificate' ? 'bg-violet-400' :
                      item.category === 'club' ? 'bg-sky-400' : 'bg-accent'
                    }`} />

                    <div className="p-4 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/80 transition-all flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-white">{item.title}</span>
                          <span className="text-[10px] font-bold text-zinc-500">
                            {new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">{item.description}</p>
                      </div>

                      {item.is_highlightable && (
                        <button
                          onClick={() => togglePinHighlight(item.id)}
                          className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                            pinnedHighlights.includes(item.id)
                              ? 'bg-accent/20 border-accent/40 text-accent'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'
                          }`}
                        >
                          <Pin className="h-3.5 w-3.5" />
                          {pinnedHighlights.includes(item.id) ? 'Pinned' : 'Pin Highlight'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 space-y-3 border border-dashed border-zinc-800 rounded-2xl">
                <Activity className="h-8 w-8 text-zinc-600 mx-auto" />
                <h4 className="text-sm font-bold text-zinc-300">No Campus Activity Recorded Yet</h4>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Register for your first campus event or join a club to start building your verified timeline.
                </p>
                <Link href="/dashboard/events" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-xs font-bold text-white mt-2">
                  Browse Events
                </Link>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ORGANIZATIONS */}
        {activeTab === 'organizations' && (
          <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
              <div>
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-sky-400" /> Verified Club Memberships
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Official campus clubs and student organizations where this student holds active status.
                </p>
              </div>
              <span className="text-xs font-bold text-zinc-500">{organizations.length} Organizations</span>
            </div>

            {organizations.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {organizations.map(org => (
                  <Link
                    key={org.id}
                    href={`/dashboard/clubs/${org.slug}`}
                    className="p-5 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 transition-all space-y-3 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center font-bold text-sm">
                        {org.name[0]}
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-300 font-bold text-[10px] capitalize">
                        {org.role || 'Member'}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-sm text-white group-hover:text-accent transition-colors">{org.name}</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{org.category || 'Student Club'}</p>
                    </div>

                    <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-bold text-zinc-400">
                      <span>View Club Workspace</span>
                      <ArrowRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 space-y-3 border border-dashed border-zinc-800 rounded-2xl">
                <Users className="h-8 w-8 text-zinc-600 mx-auto" />
                <h4 className="text-sm font-bold text-zinc-300">No Organizations Joined Yet</h4>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Students cannot manually add organizations. Join official student clubs on CampusGrid to display membership badges.
                </p>
                <Link href="/dashboard/clubs" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-xs font-bold text-white mt-2">
                  Explore Campus Clubs
                </Link>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CERTIFICATES */}
        {activeTab === 'certificates' && (
          <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
              <div>
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-violet-400" /> Digital System Certificates
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Official participation & achievement credentials generated by event organizers.
                </p>
              </div>
              <span className="text-xs font-bold text-violet-400">{certificates.length} Credentials Earned</span>
            </div>

            {certificates.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {certificates.map(crt => (
                  <div key={crt.id} className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
                        <Award className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-bold text-zinc-500">
                        {new Date(crt.issued_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-sm text-white">{crt.title}</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Event: {crt.event_title || 'Campus Session'}</p>
                    </div>

                    {crt.verification_token && (
                      <Link
                        href={`/certificates/verify/${crt.verification_token}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline pt-2"
                      >
                        Verify Credential Token &rarr;
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 space-y-3 border border-dashed border-zinc-800 rounded-2xl">
                <Award className="h-8 w-8 text-zinc-600 mx-auto" />
                <h4 className="text-sm font-bold text-zinc-300">No Certificates Earned Yet</h4>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Attend events and complete workshops to earn verified digital credentials.
                </p>
                <Link href="/dashboard/events" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-xs font-bold text-white mt-2">
                  Browse Events
                </Link>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: PROJECTS SHOWCASE (FUTURE READY MODULAR CARD) */}
        {activeTab === 'projects' && (
          <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-8 space-y-6 shadow-xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
              <div>
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <FolderKanban className="h-5 w-5 text-accent" /> Active Projects & Collaborations
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Campus projects and hackathon builds currently in development.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent font-bold text-xs">
                Open to Collaborators
              </span>
            </div>

            <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl space-y-3 max-w-md mx-auto">
              <FolderKanban className="h-10 w-10 text-zinc-600 mx-auto" />
              <h4 className="text-sm font-extrabold text-white">Project Showcase Ready</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Campus Grid projects module will automatically link hackathon submissions and team builds directly to this student profile.
              </p>
            </div>
          </div>
        )}

      </main>

      {/* 5. EDIT PERSONAL PROFILE MODAL (ALLOWED FIELDS ONLY + IMAGE FILE UPLOAD) */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-3xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-extrabold text-white">Edit Personal Profile</h2>
              </div>
              <button onClick={() => setEditModalOpen(false)} className="p-1 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              
              {/* Photo File Upload Flow */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-300">Profile Photo</label>
                <div className="flex items-center gap-4">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="h-16 w-16 rounded-full object-cover border-2 border-accent" />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-600 font-bold text-lg">
                      {initials}
                    </div>
                  )}

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Upload className="h-4 w-4" /> Upload New Photo
                  </button>

                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={() => { setAvatarPreview(null); setFormData(p => ({ ...p, avatar_url: '' })); }}
                      className="text-xs text-rose-400 hover:underline font-bold"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-zinc-500">Supported format: JPG, PNG, WEBP (Max 2MB).</span>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">Bio / Mission Statement</label>
                <textarea
                  rows={3}
                  value={formData.bio}
                  onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  maxLength={300}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-accent"
                  placeholder="Share your student mission statement, interests, or active campus goals..."
                />
                <span className="text-[10px] text-zinc-500 float-right mt-1">{formData.bio.length}/300</span>
              </div>

              {/* Interests */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">Interests & Domains</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={formData.interestsInput}
                    onChange={e => setFormData({ ...formData, interestsInput: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddInterest(); } }}
                    className="flex-1 rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-accent"
                    placeholder="Add interest (e.g. AI/ML, Open Source)"
                  />
                  <button type="button" onClick={handleAddInterest} className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs">
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {interestsList.map((interest, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs flex items-center gap-1.5">
                      {interest}
                      <button type="button" onClick={() => handleRemoveInterest(interest)} className="text-zinc-500 hover:text-rose-400">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Social Links */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-zinc-300">Online Profile Links</label>
                <input
                  type="url"
                  value={formData.github_url}
                  onChange={e => setFormData({ ...formData, github_url: e.target.value })}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-accent"
                  placeholder="GitHub URL (https://github.com/username)"
                />
                <input
                  type="url"
                  value={formData.linkedin_url}
                  onChange={e => setFormData({ ...formData, linkedin_url: e.target.value })}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-accent"
                  placeholder="LinkedIn URL (https://linkedin.com/in/username)"
                />
                <input
                  type="url"
                  value={formData.website_url}
                  onChange={e => setFormData({ ...formData, website_url: e.target.value })}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-accent"
                  placeholder="Personal Portfolio URL (https://yourwebsite.dev)"
                />
                <input
                  type="url"
                  value={formData.leetcode_url}
                  onChange={e => setFormData({ ...formData, leetcode_url: e.target.value })}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-accent"
                  placeholder="LeetCode URL (https://leetcode.com/u/username)"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-xs font-bold shadow-lg flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 6. INSTITUTIONAL RECORD CORRECTION MODAL */}
      {correctionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-accent" />
                <h2 className="text-base font-extrabold text-white">Institutional Record Correction</h2>
              </div>
              <button onClick={() => setCorrectionModalOpen(false)} className="p-1 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-zinc-300 leading-relaxed">
              <div className="p-4 rounded-2xl bg-accent/10 border border-accent/20 text-accent flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p>
                  Institutional details (Full Name, USN, Department, Academic Year, and College Email) are synchronized directly with the university database and cannot be modified directly by students.
                </p>
              </div>

              <p>
                If your official USN, spelling, or department details require correction, please submit an inquiry to your campus administrator or IT registrar office at <strong className="text-white">registrar@college.ac.in</strong>.
              </p>
            </div>

            <div className="pt-4 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setCorrectionModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-accent text-xs font-bold text-white shadow-md"
              >
                Close Inquiry
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
