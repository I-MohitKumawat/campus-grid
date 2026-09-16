'use client';

/**
 * app/dashboard/organizer/events/[id]/certificates/page.jsx
 *
 * Dedicated Certificate Generation MVP Page for Organizers.
 * Displays attended students, allows 1-click batch issuance of digital participation certificates,
 * and tracks verified certificate tokens.
 */

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Award, CheckCircle, ShieldCheck, Sparkles, Download, ExternalLink, Users } from 'lucide-react';
import DashboardNavbar from '@/components/layout/DashboardNavbar';
import { useAuth } from '@/components/providers/AuthProvider';

export default function CertificateGenerationPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchCertData = async () => {
    setLoading(true);
    try {
      const [eRes, cRes, rRes] = await Promise.all([
        fetch(`/api/v1/events/${eventId}`, { cache: 'no-store' }),
        fetch(`/api/v1/organizer/events/${eventId}/certificates`, { cache: 'no-store' }),
        fetch(`/api/v1/organizer/events/${eventId}/registrations`, { cache: 'no-store' })
      ]);

      const eJson = await eRes.json().catch(() => null);
      const cJson = await cRes.json().catch(() => null);
      const rJson = await rRes.json().catch(() => null);

      if (eRes.ok && eJson?.success) setEvent(eJson.data);
      if (cRes.ok && cJson?.success) setCertificates(cJson.data);
      if (rRes.ok && rJson?.success) setRegistrations(rJson.data);
    } catch (err) {
      console.error('Failed to fetch certificate data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertData();
  }, [eventId]);

  const handleIssueCertificates = async () => {
    setIssuing(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/v1/organizer/events/${eventId}/certificates`, { method: 'POST' });
      const result = await res.json();

      if (res.ok && result.success) {
        setFeedback({
          type: 'success',
          msg: `Success! ${result.data?.issued_count || 0} digital certificates issued and student notifications dispatched.`
        });
        fetchCertData();
      } else {
        setFeedback({ type: 'error', msg: result?.error?.message || 'Failed to issue certificates.' });
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Server error issuing certificates.' });
    } finally {
      setIssuing(false);
    }
  };

  const attendedStudents = registrations.filter(r => r.status === 'attended');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden pb-24">
      {/* Background Glow */}
      <div className="absolute top-0 right-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-accent/5 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-violet-500/5 blur-3xl" />

      <DashboardNavbar />

      <main className="max-w-5xl mx-auto px-6 pt-6 space-y-6">
        <Link href="/dashboard/event-studio" className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Event Studio
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
              <Award className="h-3.5 w-3.5" /> Digital Credential Engine
            </span>
            <h1 className="text-3xl font-extrabold text-white mt-2">
              Certificate Generation Studio
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Batch generate cryptographic verification tokens & certificates for verified attendees of <strong className="text-zinc-200">{event?.title || 'Event'}</strong>.
            </p>
          </div>

          <button
            onClick={handleIssueCertificates}
            disabled={issuing || attendedStudents.length === 0}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white px-5 py-3 shadow-lg inline-flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            <Award className="h-4 w-4" /> {issuing ? 'Generating Credentials...' : 'Issue All Certificates'}
          </button>
        </div>

        {feedback && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold ${
            feedback.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}>
            <span>{feedback.msg}</span>
            <button onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Issued Certificates Roster Table */}
        <div className="rounded-3xl border border-zinc-900 bg-zinc-900/10 p-6 space-y-4">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <ShieldCheck className="h-4.5 w-4.5 text-accent" /> Verified Issued Certificates ({certificates.length})
          </h3>

          {loading ? (
            <div className="py-12 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent mx-auto" />
              <p className="mt-3 text-xs text-zinc-400">Loading certificate registry...</p>
            </div>
          ) : certificates.length > 0 ? (
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900 border-b border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Student</th>
                    <th className="p-4">Verification Token</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Issued At</th>
                    <th className="p-4 text-right">Verification Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {certificates.map((cert) => (
                    <tr key={cert.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="p-4 font-bold text-zinc-200">
                        {cert.full_name || cert.username}
                        <span className="block text-[10px] font-mono text-zinc-500">@{cert.username}</span>
                      </td>

                      <td className="p-4 font-mono text-emerald-400 font-bold">{cert.verification_token}</td>
                      <td className="p-4 font-semibold capitalize text-zinc-400">{cert.certificate_type}</td>
                      <td className="p-4 font-mono text-zinc-400">{new Date(cert.issued_at).toLocaleDateString()}</td>

                      <td className="p-4 text-right">
                        <Link
                          href={`/certificates/verify/${cert.verification_token}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:underline"
                        >
                          Verify Public Key <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-12 text-center">
              <Award className="h-8 w-8 text-zinc-600 mx-auto" />
              <h4 className="text-sm font-bold text-zinc-300 mt-2">No certificates issued yet</h4>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                Once the event is marked completed and attendance is verified, click "Issue All Certificates" above to release digital credentials.
              </p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
