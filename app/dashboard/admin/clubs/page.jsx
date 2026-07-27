/**
 * app/dashboard/admin/clubs/page.jsx
 *
 * Phase 2 — Operational Club Management.
 * Features:
 * - Create Club (Name, Description, Category, Logo upload, Assign Club Lead)
 * - Edit Club & Assign Club Lead
 * - Archive Club
 * - Search & Category Filters
 * - Real-time PostgreSQL persistence
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Plus,
  Edit3,
  Archive,
  CheckCircle2,
  AlertCircle,
  X,
  Upload,
  UserCheck,
  Building2,
  Save,
  Check
} from 'lucide-react';

export default function AdminClubsPage() {
  const [clubs, setClubs] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [feedback, setFeedback] = useState(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Technical',
    logo_url: '',
    lead_user_id: '',
    is_active: true
  });

  const [logoPreview, setLogoPreview] = useState(null);

  const loadClubs = async () => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      if (categoryFilter) queryParams.set('category', categoryFilter);

      const res = await fetch(`/api/v1/admin/clubs?${queryParams.toString()}`, { cache: 'no-store' });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.success && json?.data) {
        setClubs(json.data);
      } else {
        setError(json?.error?.message || 'Failed to load clubs.');
      }
    } catch (err) {
      console.error('Error fetching admin clubs:', err);
      setError('Connection error loading clubs.');
    } finally {
      setLoading(false);
    }
  };

  const loadUsersList = async () => {
    try {
      const res = await fetch('/api/v1/admin/users', { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        setUsersList(json.data);
      }
    } catch (err) {
      console.error('Error fetching users for lead assignment:', err);
    }
  };

  useEffect(() => {
    loadClubs();
    loadUsersList();
  }, [search, categoryFilter]);

  // Handle Logo File Upload (Base64)
  const handleLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setFeedback({ type: 'error', msg: 'Logo image size exceeds 2MB.' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setLogoPreview(base64String);
        setFormData(prev => ({ ...prev, logo_url: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Create Club Handler
  const handleCreateClub = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setFeedback(null);

      const res = await fetch('/api/v1/admin/clubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.success && json?.data) {
        setFeedback({ type: 'success', msg: `Club "${json.data.name}" created successfully!` });
        setCreateModalOpen(false);
        resetForm();
        loadClubs();
      } else {
        setFeedback({ type: 'error', msg: json?.error?.message || 'Failed to create club.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: 'Server error creating club.' });
    } finally {
      setSaving(false);
    }
  };

  // Edit Club Handler
  const handleUpdateClub = async (e) => {
    e.preventDefault();
    if (!selectedClub) return;

    try {
      setSaving(true);
      setFeedback(null);

      const res = await fetch(`/api/v1/admin/clubs/${selectedClub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.success && json?.data) {
        setFeedback({ type: 'success', msg: `Club "${json.data.name}" updated successfully!` });
        setEditModalOpen(false);
        resetForm();
        loadClubs();
      } else {
        setFeedback({ type: 'error', msg: json?.error?.message || 'Failed to update club.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: 'Server error updating club.' });
    } finally {
      setSaving(false);
    }
  };

  // Archive Club Handler
  const handleArchiveClub = async (clubId, clubName) => {
    if (!confirm(`Are you sure you want to archive club "${clubName}"?`)) return;

    try {
      const res = await fetch(`/api/v1/admin/clubs/${clubId}`, { method: 'DELETE' });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.success) {
        setFeedback({ type: 'success', msg: `Club "${clubName}" archived.` });
        loadClubs();
      } else {
        setFeedback({ type: 'error', msg: json?.error?.message || 'Failed to archive club.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: 'Server error archiving club.' });
    }
  };

  const openEditModal = (club) => {
    setSelectedClub(club);
    setFormData({
      name: club.name,
      description: club.description || '',
      category: club.category || 'Technical',
      logo_url: club.logo_url || '',
      lead_user_id: club.lead_user_id || '',
      is_active: club.is_active !== false
    });
    setLogoPreview(club.logo_url || null);
    setEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'Technical',
      logo_url: '',
      lead_user_id: '',
      is_active: true
    });
    setLogoPreview(null);
    setSelectedClub(null);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-900">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-accent" /> Club Management
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Create, update, archive campus clubs and assign official club leads.
          </p>
        </div>

        <button
          onClick={() => { resetForm(); setCreateModalOpen(true); }}
          className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-bold text-xs shadow-md inline-flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" /> Create New Club
        </button>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold ${
          feedback.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
        }`}>
          <span>{feedback.msg}</span>
          <button onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search clubs by name or slug..."
            className="w-full rounded-xl bg-zinc-900/60 border border-zinc-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="rounded-xl bg-zinc-900/60 border border-zinc-800 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-accent"
        >
          <option value="">All Categories</option>
          <option value="Technical">Technical</option>
          <option value="Cultural">Cultural</option>
          <option value="Sports">Sports</option>
          <option value="Social">Social</option>
          <option value="General">General</option>
        </select>
      </div>

      {/* Clubs List Table */}
      {loading ? (
        <div className="h-64 rounded-3xl bg-zinc-900/40 border border-zinc-800 animate-pulse" />
      ) : clubs.length > 0 ? (
        <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/60 text-zinc-400 uppercase font-extrabold text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-4">Club Organization</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Club Lead</th>
                  <th className="px-6 py-4">Active Members</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300 font-medium">
                {clubs.map(club => (
                  <tr key={club.id} className="hover:bg-zinc-900/40 transition-colors">
                    
                    {/* Name & Logo */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                          {club.logo_url ? (
                            <img src={club.logo_url} alt={club.name} className="h-full w-full object-cover" />
                          ) : (
                            club.name[0]
                          )}
                        </div>
                        <div>
                          <Link href={`/dashboard/clubs/${club.slug}`} className="font-extrabold text-white hover:text-accent transition-colors">
                            {club.name}
                          </Link>
                          <p className="text-[11px] text-zinc-500 font-mono">/{club.slug}</p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 font-bold text-[10px]">
                        {club.category || 'General'}
                      </span>
                    </td>

                    {/* Club Lead */}
                    <td className="px-6 py-4">
                      {club.lead_username ? (
                        <span className="font-bold text-accent flex items-center gap-1">
                          <UserCheck className="h-3.5 w-3.5" /> @{club.lead_username}
                        </span>
                      ) : (
                        <span className="text-zinc-500 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Members Count */}
                    <td className="px-6 py-4">
                      <span className="font-bold text-white">{club.member_count || 0} Members</span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(club)}
                          className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                          title="Edit Club"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleArchiveClub(club.id, club.name)}
                          className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-400 transition-colors"
                          title="Archive Club"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center border border-dashed border-zinc-800 rounded-3xl space-y-3">
          <Users className="h-10 w-10 text-zinc-600 mx-auto" />
          <h3 className="font-bold text-sm text-zinc-300">No Clubs Found</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Create your first official campus club to make it visible to students.
          </p>
        </div>
      )}

      {/* CREATE / EDIT CLUB MODAL */}
      {(createModalOpen || editModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-3xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-extrabold text-white">
                  {editModalOpen ? 'Edit Club Organization' : 'Create New Campus Club'}
                </h2>
              </div>
              <button
                onClick={() => { setCreateModalOpen(false); setEditModalOpen(false); }}
                className="p-1 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={editModalOpen ? handleUpdateClub : handleCreateClub} className="space-y-4">
              
              {/* Club Logo Upload */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">Club Logo</label>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-zinc-950 border border-zinc-800 text-accent flex items-center justify-center font-bold text-xl overflow-hidden shrink-0">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo preview" className="h-full w-full object-cover" />
                    ) : (
                      formData.name[0] || 'C'
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs inline-flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" /> Upload Logo
                  </button>

                  {logoPreview && (
                    <button
                      type="button"
                      onClick={() => { setLogoPreview(null); setFormData(p => ({ ...p, logo_url: '' })); }}
                      className="text-xs text-rose-400 hover:underline font-bold"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">Club Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-accent"
                    placeholder="Coding Club"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-accent"
                  >
                    <option value="Technical">Technical</option>
                    <option value="Cultural">Cultural</option>
                    <option value="Sports">Sports</option>
                    <option value="Social">Social</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-accent"
                  placeholder="Official student society dedicated to software development and open source..."
                />
              </div>

              {/* Assign Club Lead */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">Assign Club Lead</label>
                <select
                  value={formData.lead_user_id}
                  onChange={e => setFormData({ ...formData, lead_user_id: e.target.value })}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-accent"
                >
                  <option value="">-- Unassigned --</option>
                  {usersList.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.username} (@{u.username} • {u.role})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Assigning a student promotes their platform role to Club Lead.
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => { setCreateModalOpen(false); setEditModalOpen(false); }}
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
                  {saving ? 'Saving...' : editModalOpen ? 'Update Club' : 'Create Club'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
