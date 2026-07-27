/**
 * app/dashboard/admin/users/page.jsx
 *
 * Phase 4 — User Management & RBAC Role Assignment.
 * Features:
 * - Search students by name, email, or username
 * - View profile details & event registrations
 * - Assign platform roles (Student, Club Lead, Faculty, Admin)
 * - Immediate PostgreSQL persistence
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Search,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Users,
  Terminal,
  GraduationCap,
  Save,
  Check
} from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      if (roleFilter) queryParams.set('role', roleFilter);

      const res = await fetch(`/api/v1/admin/users?${queryParams.toString()}`, { cache: 'no-store' });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.success && json?.data) {
        setUsers(json.data);
      } else {
        setError(json?.error?.message || 'Failed to load users.');
      }
    } catch (err) {
      console.error('Error fetching admin users:', err);
      setError('Connection error loading users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [search, roleFilter]);

  // Role Assignment Handler
  const handleRoleChange = async (userId, newRole, username) => {
    try {
      setUpdatingId(userId);
      setFeedback(null);

      const res = await fetch(`/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.success) {
        setFeedback({ type: 'success', msg: `User @${username} role updated to "${newRole}".` });
        loadUsers();
      } else {
        setFeedback({ type: 'error', msg: json?.error?.message || 'Failed to update user role.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: 'Server error updating role.' });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-900">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-accent" /> Platform User Management
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Lookup students, review academic institutional records, and assign platform roles.
          </p>
        </div>
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

      {/* Search & Role Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users by name, email, or username..."
            className="w-full rounded-xl bg-zinc-900/60 border border-zinc-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent"
          />
        </div>

        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="rounded-xl bg-zinc-900/60 border border-zinc-800 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-accent"
        >
          <option value="">All Platform Roles</option>
          <option value="student">Student</option>
          <option value="club_lead">Club Lead</option>
          <option value="faculty">Faculty</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="h-64 rounded-3xl bg-zinc-900/40 border border-zinc-800 animate-pulse" />
      ) : users.length > 0 ? (
        <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/60 text-zinc-400 uppercase font-extrabold text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-4">Student / User Identity</th>
                  <th className="px-6 py-4">Department & USN</th>
                  <th className="px-6 py-4">Registrations</th>
                  <th className="px-6 py-4">Platform Role Assignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300 font-medium">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-zinc-900/40 transition-colors">
                    
                    {/* Identity */}
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-white">{u.full_name || u.username}</span>
                        <p className="text-[11px] text-zinc-400 font-mono">@{u.username} • {u.email}</p>
                      </div>
                    </td>

                    {/* Department & USN */}
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <span className="font-bold text-zinc-300">{u.department || 'General Student'}</span>
                        <p className="text-[11px] text-accent font-bold font-mono">USN: {u.roll_number || 'N/A'}</p>
                      </div>
                    </td>

                    {/* Registrations */}
                    <td className="px-6 py-4">
                      <span className="font-bold text-white">{u.registrations_count || 0} Passes</span>
                    </td>

                    {/* Role Dropdown */}
                    <td className="px-6 py-4">
                      <select
                        disabled={updatingId === u.id}
                        value={u.role || 'student'}
                        onChange={e => handleRoleChange(u.id, e.target.value, u.username)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-bold focus:outline-none transition-colors cursor-pointer ${
                          u.role === 'admin' ? 'bg-rose-950/40 border-rose-500/40 text-rose-300' :
                          u.role === 'faculty' ? 'bg-amber-950/40 border-amber-500/40 text-amber-300' :
                          u.role === 'club_lead' ? 'bg-violet-950/40 border-violet-500/40 text-violet-300' :
                          'bg-zinc-900 border-zinc-800 text-zinc-200'
                        }`}
                      >
                        <option value="student">Student</option>
                        <option value="club_lead">Club Lead</option>
                        <option value="faculty">Faculty</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center border border-dashed border-zinc-800 rounded-3xl space-y-3">
          <UserCheck className="h-10 w-10 text-zinc-600 mx-auto" />
          <h3 className="font-bold text-sm text-zinc-300">No Users Found</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Try adjusting your search criteria or role filters.
          </p>
        </div>
      )}

    </div>
  );
}
