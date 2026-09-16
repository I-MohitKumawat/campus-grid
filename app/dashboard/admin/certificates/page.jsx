/**
 * app/dashboard/admin/certificates/page.jsx
 *
 * Phase 5 — Administrative Certificate Management.
 * Features:
 * - View issued certificates across all events
 * - Verify credential tokens
 * - Direct links to public verification API
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Award,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export default function AdminCertificatesPage() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/v1/admin/certificates', { cache: 'no-store' });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.success && json?.data) {
        setCertificates(json.data);
      } else {
        setError(json?.error?.message || 'Failed to load certificates.');
      }
    } catch (err) {
      console.error('Error fetching admin certificates:', err);
      setError('Connection error loading certificates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCertificates();
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-900">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Award className="h-6 w-6 text-accent" /> Digital Certificate Operations
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Audit system-issued digital credentials and test public verification tokens.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Certificates Table */}
      {loading ? (
        <div className="h-64 rounded-3xl bg-zinc-900/40 border border-zinc-800 animate-pulse" />
      ) : certificates.length > 0 ? (
        <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/60 text-zinc-400 uppercase font-extrabold text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-4">Certificate Title</th>
                  <th className="px-6 py-4">Student Recipient</th>
                  <th className="px-6 py-4">Event Source</th>
                  <th className="px-6 py-4">Issue Date</th>
                  <th className="px-6 py-4 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300 font-medium">
                {certificates.map(crt => (
                  <tr key={crt.id} className="hover:bg-zinc-900/40 transition-colors">
                    
                    {/* Title */}
                    <td className="px-6 py-4">
                      <span className="font-extrabold text-white">{crt.title}</span>
                    </td>

                    {/* Recipient */}
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <span className="font-bold text-zinc-200">{crt.full_name || crt.username}</span>
                        <p className="text-[11px] text-zinc-500 font-mono">@{crt.username}</p>
                      </div>
                    </td>

                    {/* Event */}
                    <td className="px-6 py-4">
                      <span className="font-bold text-accent">{crt.event_title || 'Campus Event'}</span>
                    </td>

                    {/* Issue Date */}
                    <td className="px-6 py-4">
                      <span className="text-zinc-400 font-mono text-[11px]">
                        {new Date(crt.issued_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      {crt.verification_token ? (
                        <Link
                          href={`/certificates/verify/${crt.verification_token}`}
                          target="_blank"
                          className="px-3 py-1.5 rounded-xl bg-violet-950/40 hover:bg-violet-900/60 border border-violet-800/40 text-violet-300 font-bold text-[11px] inline-flex items-center gap-1.5 transition-colors"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" /> Verify Credential Token &rarr;
                        </Link>
                      ) : (
                        <span className="text-zinc-600 italic">No Token</span>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center border border-dashed border-zinc-800 rounded-3xl space-y-3">
          <Award className="h-10 w-10 text-zinc-600 mx-auto" />
          <h3 className="font-bold text-sm text-zinc-300">No Certificates Issued Yet</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Certificates are automatically generated when event organizers or admins mark an event as completed.
          </p>
        </div>
      )}

    </div>
  );
}
