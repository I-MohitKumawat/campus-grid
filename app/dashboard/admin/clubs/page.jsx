/**
 * app/dashboard/admin/clubs/page.jsx
 *
 * Institutional Clubs & Archive Administration Console.
 * Features:
 * - Active Clubs: Overview, member counts, President info, "+ Create Club", "Manage", "Archive Club".
 * - Archived Clubs: Non-destructive historical preservation, archived date, archived by, "Restore Club", "Permanently Delete" (with exact name confirmation modal).
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  Building2,
  Archive,
  RotateCcw,
  Trash2,
  Search,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Users,
  Calendar,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  Filter,
  ArrowUpRight
} from 'lucide-react';

export default function AdminClubsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('active'); // 'active' | 'archived'
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [feedback, setFeedback] = useState(null);

  // Modal State for Permanent Delete
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetClub, setTargetClub] = useState(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Modal State for Archive confirmation
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);

  const fetchClubs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/clubs?status=${tab}`);
      const data = await res.json();
      if (data.success) {
        setClubs(data.data || []);
      } else {
        setFeedback({ type: 'error', message: data.error?.message || 'Failed to fetch clubs.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Network error fetching clubs.' });
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  const filteredClubs = clubs.filter((c) => {
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'all' || c.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const categories = Array.from(new Set(clubs.map((c) => c.category || 'General')));

  const handleArchive = async () => {
    if (!targetClub) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/clubs/${targetClub.slug}/archive`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: `Club "${targetClub.name}" has been successfully archived. Historical records are preserved.`,
        });
        setArchiveModalOpen(false);
        setTargetClub(null);
        fetchClubs();
      } else {
        setFeedback({ type: 'error', message: data.error?.message || 'Failed to archive club.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Network error archiving club.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async (club) => {
    if (!confirm(`Restore "${club.name}" back to active operational status?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/clubs/${club.slug}/restore`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: `Club "${club.name}" has been restored to active status.`,
        });
        fetchClubs();
      } else {
        setFeedback({ type: 'error', message: data.error?.message || 'Failed to restore club.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Network error restoring club.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!targetClub || confirmInput.trim() !== targetClub.name.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/clubs/${targetClub.slug}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed_name: confirmInput }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: `Club "${targetClub.name}" permanently deleted. Historical events/certificates preserved.`,
        });
        setDeleteModalOpen(false);
        setTargetClub(null);
        setConfirmInput('');
        fetchClubs();
      } else {
        setFeedback({ type: 'error', message: data.error?.message || 'Failed to permanently delete club.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Network error during permanent deletion.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Building2 className="h-6 w-6 text-accent" /> Institutional Clubs & Archive
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage university student organizations, institutional governance, non-destructive archival, and lifecycle policies.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/clubs/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-xs font-bold text-white hover:bg-accent/90 transition shadow-lg"
          >
            <Plus className="h-4 w-4" /> Create New Club
          </Link>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-zinc-500 hover:text-white text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Lifecycle Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setTab('active')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            tab === 'active'
              ? 'bg-accent/15 text-accent border border-accent/30'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Building2 className="h-4 w-4" />
          Active Clubs
          <span className="px-1.5 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-300">
            {tab === 'active' ? clubs.length : '•'}
          </span>
        </button>

        <button
          onClick={() => setTab('archived')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            tab === 'archived'
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Archive className="h-4 w-4" />
          Archived Clubs
          <span className="px-1.5 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-300">
            {tab === 'archived' ? clubs.length : '•'}
          </span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search clubs by name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Filter className="h-3.5 w-3.5 text-zinc-500" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-accent"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Club List Section */}
      {loading ? (
        <div className="py-20 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-accent" /> Loading {tab} clubs...
        </div>
      ) : filteredClubs.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-zinc-900 bg-zinc-950/40 p-8 space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-zinc-900 flex items-center justify-center mx-auto text-zinc-500">
            {tab === 'active' ? <Building2 className="h-6 w-6" /> : <Archive className="h-6 w-6" />}
          </div>
          <p className="text-sm font-bold text-zinc-300">
            {tab === 'active' ? 'No active clubs found.' : 'No archived clubs in the system.'}
          </p>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {tab === 'active'
              ? 'Create a new club or restore an archived club to populate the directory.'
              : 'Clubs archived by administrators or faculty will appear here with preserved history.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredClubs.map((club) => (
            <div
              key={club.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                tab === 'archived'
                  ? 'bg-zinc-950/60 border-amber-500/20 hover:border-amber-500/40'
                  : 'bg-zinc-950/80 border-zinc-850 hover:border-zinc-700'
              }`}
            >
              <div className="space-y-3">
                {/* Badge & Category */}
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-400">
                    {club.category || 'General'}
                  </span>
                  {tab === 'archived' ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      <Archive className="h-3 w-3" /> Archived
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3" /> Active
                    </span>
                  )}
                </div>

                {/* Club Title & Description */}
                <div>
                  <h2 className="text-base font-bold text-white group-hover:text-accent transition">
                    {club.name}
                  </h2>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">/{club.slug}</p>
                </div>

                {club.description && (
                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {club.description}
                  </p>
                )}

                {/* Metadata */}
                <div className="pt-2 border-t border-zinc-900 grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-zinc-500" />
                    <span>{club.member_count || 0} Members</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                    <span>{club.event_count || 0} Events</span>
                  </div>
                  <div className="col-span-2 text-zinc-500 text-[10px]">
                    President:{' '}
                    <span className="text-zinc-300 font-medium">
                      {club.lead_full_name || (club.lead_username ? `@${club.lead_username}` : 'None Appointed')}
                    </span>
                  </div>
                  {tab === 'archived' && club.archived_at && (
                    <div className="col-span-2 text-amber-400/80 text-[10px]">
                      Archived: {new Date(club.archived_at).toLocaleDateString()}
                      {club.archived_by_username && ` by @${club.archived_by_username}`}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-zinc-900 flex items-center justify-between gap-2">
                {tab === 'active' ? (
                  <>
                    <Link
                      href={`/dashboard/clubs/${club.slug}/manage`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
                    >
                      Manage Workspace <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>

                    <button
                      onClick={() => {
                        setTargetClub(club);
                        setArchiveModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 text-xs font-bold transition flex items-center gap-1"
                    >
                      <Archive className="h-3.5 w-3.5" /> Archive
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleRestore(club)}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Restore
                    </button>

                    <button
                      onClick={() => {
                        setTargetClub(club);
                        setConfirmInput('');
                        setDeleteModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Permanently Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ARCHIVE CONFIRMATION MODAL */}
      {archiveModalOpen && targetClub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-950 border border-amber-500/30 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Archive className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Archive Club</h3>
                <p className="text-xs text-zinc-400">Non-destructive institutional archival</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 space-y-2">
              <p>
                Are you sure you want to archive <strong className="text-white">"{targetClub.name}"</strong>?
              </p>
              <ul className="list-disc pl-4 space-y-1 text-zinc-400 text-[11px]">
                <li>Club will disappear from public student discovery.</li>
                <li>All memberships, events, certificates, and records remain <strong>100% preserved</strong>.</li>
                <li>Can be restored back to active state at any time.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setArchiveModalOpen(false);
                  setTargetClub(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchive}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-500 transition flex items-center gap-1.5 shadow-lg"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                Confirm Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERMANENT DELETE CONFIRMATION MODAL */}
      {deleteModalOpen && targetClub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-950 border border-rose-500/40 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Permanently Delete Club</h3>
                <p className="text-xs text-rose-400 font-semibold">Irreversible Administrative Action</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-zinc-300 space-y-2">
              <p className="font-semibold text-rose-200">
                This will permanently delete "{targetClub.name}" from the database.
              </p>
              <p className="text-[11px] text-zinc-400">
                Club memberships and advisor associations will be cleanly removed. Any historical campus events hosted by this club will remain preserved in student transcripts with verified certificates intact.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400">
                Type <span className="text-white font-mono select-all">"{targetClub.name}"</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={targetClub.name}
                className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setTargetClub(null);
                  setConfirmInput('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePermanentDelete}
                disabled={actionLoading || confirmInput.trim() !== targetClub.name.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5 shadow-lg shadow-rose-600/20"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
