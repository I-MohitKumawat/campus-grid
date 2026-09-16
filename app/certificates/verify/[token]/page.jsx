'use client';

/**
 * app/certificates/verify/[token]/page.jsx
 *
 * Standalone Public Certificate Verification Page.
 * Accessible by anyone without authentication.
 *
 * Displays verifiable credential details, host club, recipient identity,
 * and cryptographic verification proof.
 */

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Award,
  Calendar,
  Building2,
  User,
  Copy,
  Check,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Lock,
  Sparkles
} from 'lucide-react';

export default function PublicCertificateVerificationPage({ params }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadCertificate() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/v1/certificates/verify/${token}`, { cache: 'no-store' });
        const json = await res.json().catch(() => null);

        if (res.ok && json?.success && json?.data) {
          setCert(json.data);
        } else {
          setError(json?.error?.message || 'Certificate verification failed or credential does not exist.');
        }
      } catch (err) {
        console.error('Error verifying certificate:', err);
        setError('Network error while verifying credential. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      loadCertificate();
    }
  }, [token]);

  const handleCopyToken = () => {
    if (typeof window !== 'undefined' && cert?.verification_token) {
      navigator.clipboard.writeText(cert.verification_token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const certificateTypeLabel = cert?.certificate_type
    ? `Certificate of ${cert.certificate_type.charAt(0).toUpperCase() + cert.certificate_type.slice(1).replace('_', ' ')}`
    : 'Certificate of Participation';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden flex flex-col justify-between selection:bg-accent/20">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 h-[600px] w-[800px] rounded-full bg-accent/5 blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-violet-600/5 blur-[100px]" />

      {/* Top Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white font-extrabold text-base tracking-tight hover:opacity-90 transition-opacity">
            <span className="h-8 w-8 rounded-xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center font-black">
              CG
            </span>
            <span>CampusGrid <span className="text-zinc-500 font-medium text-xs">| Verification</span></span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-400">
              <Lock className="h-3 w-3" /> Public Registry
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-3xl mx-auto px-6 py-12 w-full flex-1 flex flex-col justify-center">
        {loading ? (
          <div className="py-20 text-center space-y-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent mx-auto" />
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Verifying Cryptographic Credential...</p>
          </div>
        ) : error || !cert ? (
          <div className="rounded-3xl border border-rose-900/40 bg-zinc-900/30 backdrop-blur-xl p-8 sm:p-12 text-center space-y-6 shadow-2xl">
            <div className="h-16 w-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-rose-400">Credential Verification Result</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Certificate Invalid or Not Found</h1>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
                {error || 'The token provided does not match any valid, active certificate issued on CampusGrid.'}
              </p>
            </div>

            <div className="pt-4 flex items-center justify-center gap-3">
              <Link
                href="/"
                className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-300 transition-colors inline-flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Return to CampusGrid
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fadeIn">
            {/* Status Banner */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 backdrop-blur-md p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">Official Verified Credential</h2>
                  <p className="text-[11px] text-emerald-300/80">Issued and verified by the host institution on CampusGrid.</p>
                </div>
              </div>

              <span className="hidden sm:inline-flex text-[10px] font-mono font-bold text-emerald-400/90 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/40">
                ACTIVE & VALID
              </span>
            </div>

            {/* Certificate Card */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-2xl p-8 sm:p-12 shadow-2xl relative overflow-hidden space-y-8">
              {/* Subtle Watermark Decoration */}
              <div className="absolute -top-12 -right-12 opacity-5 pointer-events-none">
                <Award className="h-64 w-64 text-white" />
              </div>

              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-widest text-accent font-bold">
                    {cert.club_name ? `${cert.club_name} • Event Credential` : 'Institutional Credential'}
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
                    {certificateTypeLabel}
                  </h1>
                </div>

                <div className="h-12 w-12 rounded-2xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center shrink-0">
                  <Award className="h-6 w-6" />
                </div>
              </div>

              {/* Recipient Presentation */}
              <div className="space-y-2 text-center sm:text-left">
                <span className="text-[11px] uppercase tracking-widest font-bold text-zinc-500">This certifies that</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {cert.recipient_name || cert.recipient_username}
                </h2>
                {cert.recipient_department && (
                  <p className="text-xs text-zinc-400 font-medium">
                    Department of {cert.recipient_department}
                  </p>
                )}
                <p className="text-xs text-zinc-400 pt-2 leading-relaxed">
                  has successfully attended and completed all participation requirements for
                </p>
              </div>

              {/* Event Information Box */}
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5 space-y-3">
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-accent" /> {cert.event_title}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-400 pt-1">
                  {cert.event_date && (
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 font-medium">Date:</span>
                      <span className="text-zinc-200 font-semibold">
                        {new Date(cert.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  )}

                  {cert.club_name && (
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 font-medium">Host:</span>
                      <span className="text-zinc-200 font-semibold">{cert.club_name}</span>
                    </div>
                  )}

                  {cert.venue && (
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 font-medium">Venue:</span>
                      <span className="text-zinc-200 font-semibold">{cert.venue}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 font-medium">Issued:</span>
                    <span className="text-zinc-200 font-semibold">
                      {new Date(cert.issued_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cryptographic Verification Proof */}
              <div className="border-t border-zinc-800/80 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Cryptographic Verification Token
                  </span>
                  <p className="font-mono text-xs font-bold text-emerald-400 break-all select-all">
                    {cert.verification_token}
                  </p>
                </div>

                <button
                  onClick={handleCopyToken}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied Token
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-zinc-400" /> Copy Token
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-500">
        <p>CampusGrid Institutional Verification Registry • Tamper-proof digital credentials</p>
      </footer>
    </div>
  );
}
