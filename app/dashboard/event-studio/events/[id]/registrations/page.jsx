'use client';

/**
 * app/dashboard/organizer/events/[id]/registrations/page.jsx
 *
 * Organizer Application & Registration Queue Screen.
 * Supports filtering by Confirmed, Pending, Waitlist, Rejected, Cancelled.
 * Enables search, bulk selection, bulk approval/rejection with decision notes, and CSV export.
 */

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download, 
  ArrowLeft, 
  Users, 
  CheckSquare, 
  Square, 
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import DashboardNavbar from '@/components/layout/DashboardNavbar';
import { useAuth } from '@/components/providers/AuthProvider';

export default function RegistrationQueuePage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const { user } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // all, registered, pending, waitlisted, rejected, cancelled
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [decisionModal, setDecisionModal] = useState(null); // { action: 'approve'|'reject' }
  const [feedback, setFeedback] = useState(null);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/organizer/events/${eventId}/registrations`, { cache: 'no-store' });
      const result = await res.json().catch(() => null);
      if (res.ok && result?.success && Array.isArray(result.data)) {
        setRegistrations(result.data);
      } else {
        setRegistrations([]);
      }
    } catch (err) {
      console.error('Failed to fetch registrations:', err);
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [eventId]);

  // Filter Registrations
  const filteredRegistrations = registrations.filter((reg) => {
    const matchesTab = activeTab === 'all' || reg.status === activeTab;
    const matchesSearch = !searchQuery || 
      reg.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (reg.full_name && reg.full_name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesTab && matchesSearch;
  });

  // Bulk Selection Handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRegistrations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRegistrations.map(r => r.id));
    }
  };

  const toggleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Process Application Decisions
  const handleExecuteDecision = async () => {
    if (!decisionModal || selectedIds.length === 0) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/v1/organizer/events/${eventId}/applications/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_ids: selectedIds,
          action: decisionModal.action,
          decision_notes: decisionNotes
        })
      });

      if (res.ok) {
        setFeedback({
          type: 'success',
          msg: `Successfully ${decisionModal.action}d ${selectedIds.length} registration(s). Notifications dispatched.`
        });
        setSelectedIds([]);
        setDecisionModal(null);
        setDecisionNotes('');
        fetchRegistrations();
      } else {
        const errJson = await res.json().catch(() => null);
        setFeedback({ type: 'error', msg: errJson?.error?.message || 'Decision failed.' });
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Server error processing decisions.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden pb-24">
      {/* Background Backlights */}
      <div className="absolute top-0 right-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-accent/5 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-violet-500/5 blur-3xl" />

      {/* Header */}
      <DashboardNavbar />

      <main className="max-w-7xl mx-auto px-6 pt-6 space-y-6">
        
        {/* Back link */}
        <Link href="/dashboard/event-studio" className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Event Studio
        </Link>

        {/* Page Title & CSV Export Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 px-3 py-1 text-xs font-bold text-violet-400">
              <Users className="h-3.5 w-3.5" /> Registration Queue
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight mt-2 text-white">
              Application & Registration Review
            </h1>
            <p className="text-zinc-400 text-xs mt-1">
              Screen applicants, manage waitlists, process decisions, and export attendee data.
            </p>
          </div>

          <a
            href={`/api/v1/organizer/events/${eventId}/registrations?format=csv`}
            download
            className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-xs font-bold text-zinc-200 hover:bg-zinc-800 transition-colors inline-flex items-center gap-2"
          >
            <Download className="h-4 w-4 text-emerald-400" /> Export CSV Report
          </a>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold ${
            feedback.type === 'success' ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300' : 'bg-rose-950/30 border-rose-800/40 text-rose-300'
          }`}>
            <span>{feedback.msg}</span>
            <button onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-white cursor-pointer">✕</button>
          </div>
        )}

        {/* Filters & Search Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-zinc-900/20 border border-zinc-900 rounded-2xl p-4">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'All' },
              { id: 'registered', label: 'Confirmed' },
              { id: 'pending', label: 'Pending' },
              { id: 'waitlisted', label: 'Waitlist' },
              { id: 'rejected', label: 'Rejected' },
              { id: 'cancelled', label: 'Cancelled' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedIds([]); }}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by student name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Bulk Action Controls */}
        {selectedIds.length > 0 && (
          <div className="bg-violet-950/30 border border-violet-800/40 p-4 rounded-2xl flex items-center justify-between text-xs font-bold animate-fadeIn">
            <span className="text-violet-300">
              {selectedIds.length} registration(s) selected
            </span>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setDecisionModal({ action: 'approve' })}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <CheckCircle className="h-3.5 w-3.5" /> Approve Selected
              </button>

              <button
                onClick={() => setDecisionModal({ action: 'reject' })}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <XCircle className="h-3.5 w-3.5" /> Reject Selected
              </button>
            </div>
          </div>
        )}

        {/* Registrations List / Table */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent mx-auto" />
            <p className="mt-3 text-xs text-zinc-400">Loading registrations...</p>
          </div>
        ) : filteredRegistrations.length > 0 ? (
          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 backdrop-blur-xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 border-b border-zinc-900 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="p-4 w-12 text-center">
                    <button onClick={toggleSelectAll} className="cursor-pointer text-zinc-400 hover:text-white">
                      {selectedIds.length === filteredRegistrations.length && filteredRegistrations.length > 0 ? (
                        <CheckSquare className="h-4 w-4 text-accent" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Mode</th>
                  <th className="p-4">Applied Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/60">
                {filteredRegistrations.map((reg) => {
                  const isSelected = selectedIds.includes(reg.id);

                  return (
                    <tr key={reg.id} className={`hover:bg-zinc-900/30 transition-colors ${isSelected ? 'bg-violet-950/15' : ''}`}>
                      <td className="p-4 text-center">
                        <button onClick={() => toggleSelectOne(reg.id)} className="cursor-pointer text-zinc-400 hover:text-white">
                          {isSelected ? <CheckSquare className="h-4 w-4 text-accent" /> : <Square className="h-4 w-4" />}
                        </button>
                      </td>

                      <td className="p-4 font-bold text-zinc-200">
                        <div className="space-y-0.5">
                          <span className="block text-white">{reg.full_name || reg.username}</span>
                          <span className="text-[10px] font-mono text-zinc-500">@{reg.username}</span>
                        </div>
                      </td>

                      <td className="p-4 font-bold">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          reg.status === 'registered' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          reg.status === 'pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          reg.status === 'waitlisted' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                          reg.status === 'rejected' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                          'bg-zinc-800 text-zinc-400'
                        }`}>
                          {reg.status}
                        </span>
                      </td>

                      <td className="p-4 text-zinc-400 font-semibold capitalize">{reg.attendance_mode}</td>
                      <td className="p-4 text-zinc-400 font-mono">{new Date(reg.registered_at).toLocaleDateString()}</td>

                      <td className="p-4 text-right">
                        {reg.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setSelectedIds([reg.id]); setDecisionModal({ action: 'approve' }); }}
                              className="rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-3 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-600/30 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => { setSelectedIds([reg.id]); setDecisionModal({ action: 'reject' }); }}
                              className="rounded-lg bg-rose-600/20 border border-rose-500/30 px-3 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-600/30 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-12 text-center">
            <Users className="h-8 w-8 text-zinc-600 mx-auto" />
            <h3 className="text-sm font-bold text-zinc-300 mt-2">No registrations found</h3>
            <p className="text-xs text-zinc-500 mt-1">Try changing the status tab filter or search terms.</p>
          </div>
        )}

      </main>

      {/* Decision Modal with Optional Application Notes */}
      {decisionModal && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-accent" />
              Confirm Application {decisionModal.action === 'approve' ? 'Approval' : 'Rejection'}
            </h3>

            <p className="text-xs text-zinc-400">
              Applying decision for <strong className="text-zinc-200">{selectedIds.length} candidate(s)</strong>.
            </p>

            <div className="space-y-1 text-xs">
              <label className="block text-zinc-400 font-bold">Decision Note (Optional)</label>
              <textarea
                rows={2}
                placeholder="Reason or feedback note for applicant..."
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-200 outline-none focus:border-accent"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDecisionModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteDecision}
                disabled={actionLoading}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all ${
                  decisionModal.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {actionLoading ? 'Processing...' : `Confirm ${decisionModal.action === 'approve' ? 'Approval' : 'Rejection'}`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
