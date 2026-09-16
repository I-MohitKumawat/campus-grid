'use client';

/**
 * app/dashboard/clubs/new/page.jsx
 *
 * Dedicated Campus Club Creation Page.
 * Allows administrators to establish a verified campus club with full domain properties:
 * - Identity (Name, Slug preview, Category, Mission description)
 * - Visual Branding (Logo, Banner upload with client-side preview & validation)
 * - Domain Tags / Focus Areas (Multi-tag chip input)
 * - Social Profiles (Website, Instagram, LinkedIn, GitHub, Discord)
 * - Access & Visibility Policy (Public, Campus Only, Invite Only)
 * - Recruitment Configuration (Open / Closed)
 * - Leadership Assignment (Club Lead linked to club_memberships)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  ShieldCheck,
  Upload,
  Globe,
  Share2,
  Code,
  MessageSquare,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Trash2,
  Tag,
  Sparkles,
  Lock,
  Eye,
  UserCheck,
  Save,
  Image as ImageIcon
} from 'lucide-react';
import DashboardNavbar from '@/components/layout/DashboardNavbar';
import { useAuth } from '@/components/providers/AuthProvider';
import { can } from '@/lib/permissions';

const PRESET_DOMAIN_TAGS = [
  'Web Development',
  'AI / Machine Learning',
  'Robotics & Automation',
  'Cybersecurity',
  'Cloud Computing',
  'Open Source',
  'UI / UX Design',
  'Competitive Programming',
  'Mobile Apps',
  'Blockchain & Web3',
  'Data Science',
  'Hardware & IoT'
];

const CLUB_CATEGORIES = [
  'Technical',
  'Cultural',
  'Sports',
  'Academic',
  'Social Initiative',
  'Entrepreneurship',
  'Arts & Design',
  'General'
];

export default function CreateClubPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Users list for leadership assignment
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    customSlug: false,
    category: 'Technical',
    type: 'Technical',
    description: '',
    logo_url: '',
    banner_url: '',
    domain_tags: [],
    social_links: {
      website: '',
      instagram: '',
      linkedin: '',
      github: '',
      discord: ''
    },
    visibility: 'public',
    recruitment_open: true,
    lead_user_id: ''
  });

  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // Auto-slugify when name changes (unless user explicitly edited the slug)
  const generatedSlug = useMemo(() => {
    return formData.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
  }, [formData.name]);

  const activeSlug = formData.customSlug ? formData.slug : generatedSlug;

  // Load Users List for Lead Assignment
  useEffect(() => {
    async function loadUsers() {
      if (!user || !can('club:create', user)) return;
      try {
        setLoadingUsers(true);
        const res = await fetch('/api/v1/admin/users', { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.success && Array.isArray(json.data)) {
          setUsersList(json.data);
        }
      } catch (err) {
        console.error('Failed to load users for lead assignment:', err);
      } finally {
        setLoadingUsers(false);
      }
    }
    loadUsers();
  }, [user]);

  // Handle Logo Upload (Client-side Data URL preview)
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      setFeedback({ type: 'error', msg: 'Please select a valid image file (PNG, JPG, WEBP, or SVG).' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', msg: 'Logo file size cannot exceed 5MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result;
      if (typeof dataUrl === 'string') {
        setFormData((prev) => ({ ...prev, logo_url: dataUrl }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Banner Upload (Client-side Data URL preview)
  const handleBannerUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFeedback({ type: 'error', msg: 'Please select a valid banner image file (PNG, JPG, or WEBP).' });
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setFeedback({ type: 'error', msg: 'Banner file size cannot exceed 8MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result;
      if (typeof dataUrl === 'string') {
        setFormData((prev) => ({ ...prev, banner_url: dataUrl }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Add Domain Tag
  const handleAddTag = (tagToAdd) => {
    const cleanTag = tagToAdd.trim();
    if (!cleanTag) return;
    if (formData.domain_tags.includes(cleanTag)) return;
    if (formData.domain_tags.length >= 10) {
      setFeedback({ type: 'error', msg: 'Maximum 10 domain tags allowed.' });
      return;
    }
    setFormData((prev) => ({
      ...prev,
      domain_tags: [...prev.domain_tags, cleanTag]
    }));
    setTagInput('');
  };

  // Remove Domain Tag
  const handleRemoveTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      domain_tags: prev.domain_tags.filter((t) => t !== tagToRemove)
    }));
  };

  // Validation
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Club name is required.';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Club name must be at least 2 characters.';
    }

    if (activeSlug && !/^[a-z0-9-]+$/.test(activeSlug)) {
      errors.slug = 'Slug must only contain lowercase alphanumeric characters and hyphens.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      setFeedback({ type: 'error', msg: 'Please correct the errors in the form before submitting.' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    const payload = {
      name: formData.name.trim(),
      slug: activeSlug || undefined,
      category: formData.category,
      type: formData.category,
      description: formData.description.trim() || undefined,
      logo_url: formData.logo_url || undefined,
      banner_url: formData.banner_url || undefined,
      domain_tags: formData.domain_tags,
      social_links: {
        website: formData.social_links.website.trim() || undefined,
        instagram: formData.social_links.instagram.trim() || undefined,
        linkedin: formData.social_links.linkedin.trim() || undefined,
        github: formData.social_links.github.trim() || undefined,
        discord: formData.social_links.discord.trim() || undefined
      },
      visibility: formData.visibility,
      recruitment_open: formData.recruitment_open,
      lead_user_id: formData.lead_user_id || undefined
    };

    try {
      const res = await fetch('/api/v1/admin/clubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.success && json?.data) {
        setFeedback({ type: 'success', msg: `Club "${formData.name}" established successfully!` });
        const createdSlug = json.data.slug || json.data.id;
        setTimeout(() => {
          router.push(`/dashboard/clubs/${createdSlug}`);
        }, 1200);
      } else {
        setFeedback({
          type: 'error',
          msg: json?.error?.message || 'Failed to establish campus club.'
        });
        setSaving(false);
      }
    } catch (err) {
      console.error('Error creating club:', err);
      setFeedback({ type: 'error', msg: 'Network error communicating with the server.' });
      setSaving(false);
    }
  };

  // Access Control Guard
  if (!authLoading && user && !can('club:create', user)) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <DashboardNavbar />
        <main className="max-w-xl mx-auto px-6 py-24 text-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-white">Administrator Access Required</h1>
          <p className="text-xs text-zinc-400">Establishing new campus clubs requires platform administrative capabilities.</p>
          <Link href="/dashboard/clubs" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-xs font-bold text-white shadow-md">
            <ArrowLeft className="h-4 w-4" /> Return to Campus Clubs
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden pb-28 font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-1/4 -z-10 h-[600px] w-[600px] rounded-full bg-accent/5 blur-[120px]" />
      <div className="absolute bottom-0 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-violet-600/5 blur-[120px]" />

      <DashboardNavbar />

      <main className="max-w-4xl mx-auto px-6 pt-8 space-y-8">
        
        {/* Navigation & Header */}
        <div className="space-y-3">
          <Link
            href="/dashboard/clubs"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Campus Clubs</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-6 pt-2">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/20 px-3 py-1 text-xs font-bold text-accent">
                <ShieldCheck className="h-3.5 w-3.5" /> Official Campus Society Setup
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight mt-2">
                Establish Campus Club
              </h1>
              <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                Define the club entity, assign leadership, configure visibility policies, and establish the organization across the campus grid.
              </p>
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`p-4 rounded-2xl flex items-center justify-between border animate-fadeIn ${
            feedback.type === 'success' ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300' : 'bg-rose-950/30 border-rose-800/40 text-rose-300'
          }`}>
            <div className="flex items-center gap-2.5 text-xs font-bold">
              {feedback.type === 'success' ? <CheckCircle2 className="h-4.5 w-4.5" /> : <AlertCircle className="h-4.5 w-4.5" />}
              <span>{feedback.msg}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-zinc-500 hover:text-zinc-300 cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* ── SECTION A: CLUB IDENTITY ─────────────────────────────────── */}
          <section className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="border-b border-zinc-900/80 pb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="h-4.5 w-4.5 text-accent" /> Club Identity & Basics
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Primary identification and descriptive mission statement.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Club Name */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Club Name *</span>
                  <span className="text-[10px] text-zinc-500 font-normal">{formData.name.length}/100</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  placeholder="e.g. Autonomous Robotics Society"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full rounded-2xl border bg-zinc-950/60 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all ${
                    formErrors.name ? 'border-rose-500 focus:border-rose-500' : 'border-zinc-800 focus:border-accent'
                  }`}
                />
                {formErrors.name && <p className="text-[11px] text-rose-400 font-medium">{formErrors.name}</p>}
              </div>

              {/* Slug Preview & Customization */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Club Slug (Directory URL)</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, customSlug: !formData.customSlug, slug: activeSlug })}
                    className="text-[10px] text-accent hover:underline lowercase font-semibold cursor-pointer"
                  >
                    {formData.customSlug ? 'Reset to auto-generated' : 'Customize slug'}
                  </button>
                </label>
                
                {formData.customSlug ? (
                  <input
                    type="text"
                    placeholder="autonomous-robotics-society"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 text-xs text-zinc-100 outline-none focus:border-accent font-mono"
                  />
                ) : (
                  <div className="p-3 rounded-2xl border border-zinc-900 bg-zinc-950/40 text-xs font-mono text-zinc-400 flex items-center gap-2">
                    <span className="text-zinc-600">/dashboard/clubs/</span>
                    <span className="text-accent font-bold">{activeSlug || 'club-slug-preview'}</span>
                  </div>
                )}
                {formErrors.slug && <p className="text-[11px] text-rose-400 font-medium">{formErrors.slug}</p>}
              </div>

              {/* Category / Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Category / Classification *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value, type: e.target.value })}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-xs text-zinc-200 outline-none focus:border-accent cursor-pointer"
                >
                  {CLUB_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Short Description */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Mission & Description</span>
                  <span className="text-[10px] text-zinc-500 font-normal">{formData.description.length}/1000</span>
                </label>
                <textarea
                  rows={4}
                  maxLength={1000}
                  placeholder="Describe the club's objectives, regular activities, community initiatives, and member opportunities..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-accent leading-relaxed resize-none"
                />
              </div>

            </div>
          </section>

          {/* ── SECTION B: BRANDING & ASSETS ─────────────────────────────── */}
          <section className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="border-b border-zinc-900/80 pb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ImageIcon className="h-4.5 w-4.5 text-accent" /> Visual Branding & Identity
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Upload club emblem logo and showcase cover banner.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              
              {/* Logo Area (col-span-4) */}
              <div className="md:col-span-4 space-y-3">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                  Club Logo Emblem
                </label>

                <div className="relative h-40 w-full rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 flex flex-col items-center justify-center overflow-hidden group">
                  {formData.logo_url ? (
                    <div className="relative h-full w-full flex items-center justify-center p-4">
                      <img src={formData.logo_url} alt="Logo Preview" className="h-28 w-28 object-contain rounded-xl shadow-md" />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, logo_url: '' })}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-zinc-950/80 hover:bg-rose-950 border border-zinc-800 text-zinc-400 hover:text-rose-400 transition-colors"
                        title="Remove Logo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="h-full w-full flex flex-col items-center justify-center cursor-pointer p-4 hover:bg-zinc-900/20 transition-colors text-center space-y-2">
                      <div className="h-10 w-10 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
                        <Upload className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-zinc-300 block">Upload Logo</span>
                        <span className="text-[10px] text-zinc-500 block mt-0.5">PNG, JPG, SVG up to 5MB</span>
                      </div>
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              {/* Banner Area (col-span-8) */}
              <div className="md:col-span-8 space-y-3">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                  Cover Banner
                </label>

                <div className="relative h-40 w-full rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 flex flex-col items-center justify-center overflow-hidden group">
                  {formData.banner_url ? (
                    <div className="relative h-full w-full">
                      <img src={formData.banner_url} alt="Banner Preview" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 to-transparent" />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, banner_url: '' })}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-zinc-950/80 hover:bg-rose-950 border border-zinc-800 text-zinc-400 hover:text-rose-400 transition-colors"
                        title="Remove Banner"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="h-full w-full flex flex-col items-center justify-center cursor-pointer p-4 hover:bg-zinc-900/20 transition-colors text-center space-y-2">
                      <div className="h-10 w-10 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
                        <Upload className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-zinc-300 block">Upload Cover Banner</span>
                        <span className="text-[10px] text-zinc-500 block mt-0.5">Landscape 16:9 ratio recommended</span>
                      </div>
                      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleBannerUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

            </div>
          </section>

          {/* ── SECTION C: FOCUS AREAS & RECRUITMENT ─────────────────────── */}
          <section className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="border-b border-zinc-900/80 pb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Tag className="h-4.5 w-4.5 text-accent" /> Focus Domains & Recruitment
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Categorize domain areas and configure whether recruitment is currently active.</p>
            </div>

            <div className="space-y-6">
              
              {/* Domain Tags Multi-Selector */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Domain / Interest Areas ({formData.domain_tags.length}/10)</span>
                </label>

                {/* Selected Tag Chips */}
                {formData.domain_tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/40">
                    {formData.domain_tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 px-3 py-1 text-xs font-bold text-violet-300 shadow-sm"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-rose-400 cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Tag Input Box */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type a custom domain tag (e.g. Embedded C++) and press Enter..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag(tagInput);
                      }
                    }}
                    className="flex-grow rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTag(tagInput)}
                    className="px-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-accent text-zinc-300 hover:text-white text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Preset Suggestions */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider">Suggested Domains:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_DOMAIN_TAGS.filter((t) => !formData.domain_tags.includes(t)).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleAddTag(tag)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 text-[11px] font-medium transition-all cursor-pointer"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recruitment Status Toggle Card */}
              <div className="pt-4 border-t border-zinc-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-950/40 border border-zinc-900">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-accent" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Recruitment Status</h3>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Controls whether students can submit membership applications to join this club.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, recruitment_open: true })}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      formData.recruitment_open
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                    }`}
                  >
                    Open for Applications
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, recruitment_open: false })}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      !formData.recruitment_open
                        ? 'bg-zinc-800 text-zinc-200 border border-zinc-700 shadow-md'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                    }`}
                  >
                    Closed
                  </button>
                </div>
              </div>

            </div>
          </section>

          {/* ── SECTION D: SOCIAL PROFILES & LINKS ───────────────────────── */}
          <section className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="border-b border-zinc-900/80 pb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Globe className="h-4.5 w-4.5 text-accent" /> Web & Social Profiles
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Official community channels and portfolio URLs.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-zinc-500" /> Website URL
                </label>
                <input
                  type="url"
                  placeholder="https://robotics-society.edu"
                  value={formData.social_links.website}
                  onChange={(e) => setFormData({
                    ...formData,
                    social_links: { ...formData.social_links, website: e.target.value }
                  })}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-accent"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Share2 className="h-3.5 w-3.5 text-pink-400" /> Instagram Handle / URL
                </label>
                <input
                  type="text"
                  placeholder="https://instagram.com/robotics_society"
                  value={formData.social_links.instagram}
                  onChange={(e) => setFormData({
                    ...formData,
                    social_links: { ...formData.social_links, instagram: e.target.value }
                  })}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-accent"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Share2 className="h-3.5 w-3.5 text-blue-400" /> LinkedIn Organization
                </label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/company/campus-robotics"
                  value={formData.social_links.linkedin}
                  onChange={(e) => setFormData({
                    ...formData,
                    social_links: { ...formData.social_links, linkedin: e.target.value }
                  })}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-accent"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Code className="h-3.5 w-3.5 text-zinc-400" /> GitHub Organization
                </label>
                <input
                  type="text"
                  placeholder="https://github.com/campus-robotics"
                  value={formData.social_links.github}
                  onChange={(e) => setFormData({
                    ...formData,
                    social_links: { ...formData.social_links, github: e.target.value }
                  })}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-accent"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-indigo-400" /> Discord Server / Community Invite
                </label>
                <input
                  type="text"
                  placeholder="https://discord.gg/robotics-hub"
                  value={formData.social_links.discord}
                  onChange={(e) => setFormData({
                    ...formData,
                    social_links: { ...formData.social_links, discord: e.target.value }
                  })}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-accent"
                />
              </div>

            </div>
          </section>

          {/* ── SECTION E: VISIBILITY POLICY ─────────────────────────────── */}
          <section className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="border-b border-zinc-900/80 pb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Eye className="h-4.5 w-4.5 text-accent" /> Visibility & Access Policy
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Determine which campus audiences can discover and view this organization.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Public */}
              <div
                onClick={() => setFormData({ ...formData, visibility: 'public' })}
                className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  formData.visibility === 'public'
                    ? 'bg-violet-600/10 border-violet-500/40 shadow-lg shadow-violet-900/15'
                    : 'bg-zinc-950/40 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Public Discovery</span>
                  <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                    formData.visibility === 'public' ? 'border-accent bg-accent' : 'border-zinc-700'
                  }`}>
                    {formData.visibility === 'public' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Visible to all campus users and discoverable in the public student directory.
                </p>
              </div>

              {/* Campus Only */}
              <div
                onClick={() => setFormData({ ...formData, visibility: 'campus_only' })}
                className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  formData.visibility === 'campus_only'
                    ? 'bg-violet-600/10 border-violet-500/40 shadow-lg shadow-violet-900/15'
                    : 'bg-zinc-950/40 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Campus Members Only</span>
                  <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                    formData.visibility === 'campus_only' ? 'border-accent bg-accent' : 'border-zinc-700'
                  }`}>
                    {formData.visibility === 'campus_only' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Restricted to authenticated university accounts with active campus credentials.
                </p>
              </div>

              {/* Invite Only */}
              <div
                onClick={() => setFormData({ ...formData, visibility: 'invite_only' })}
                className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  formData.visibility === 'invite_only'
                    ? 'bg-violet-600/10 border-violet-500/40 shadow-lg shadow-violet-900/15'
                    : 'bg-zinc-950/40 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Invite Only</span>
                  <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                    formData.visibility === 'invite_only' ? 'border-accent bg-accent' : 'border-zinc-700'
                  }`}>
                    {formData.visibility === 'invite_only' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Hidden from public listings; accessible exclusively via private invitation.
                </p>
              </div>

            </div>
          </section>

          {/* ── SECTION F: LEADERSHIP ASSIGNMENT ─────────────────────────── */}
          <section className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="border-b border-zinc-900/80 pb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="h-4.5 w-4.5 text-accent" /> Initial Club Leadership
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Designate a student organizer as the active Club President.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Designated Club President
                </label>
                <select
                  value={formData.lead_user_id}
                  onChange={(e) => setFormData({ ...formData, lead_user_id: e.target.value })}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-xs text-zinc-200 outline-none focus:border-accent cursor-pointer"
                >
                  <option value="">-- No President Assigned (Can be assigned later) --</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name ? `${u.full_name} (@${u.username}) — ${u.role}` : `@${u.username} (${u.email}) — ${u.role}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-2xl bg-violet-600/5 border border-violet-500/20 text-xs text-violet-300 leading-relaxed flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                <span>
                  Assigning a Club Lead automatically registers their membership with role <strong className="text-white">lead</strong>, grants event publication rights, and updates their account role to <strong className="text-white">Club Lead</strong> in database records.
                </span>
              </div>
            </div>
          </section>

          {/* ── ACTION CONTROLS ─────────────────────────────────────────── */}
          <div className="flex items-center justify-between pt-6 border-t border-zinc-900">
            <Link
              href="/dashboard/clubs"
              className="px-6 py-3 rounded-2xl text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-accent hover:bg-accent/90 text-xs font-extrabold text-white shadow-xl shadow-accent/20 cursor-pointer disabled:opacity-50 transition-all hover:scale-[1.02]"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Establishing Club...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Create Campus Club</span>
                </>
              )}
            </button>
          </div>

        </form>

      </main>
    </div>
  );
}
