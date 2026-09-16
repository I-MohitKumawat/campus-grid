'use client';

/**
 * app/dashboard/clubs/[id]/manage/page.jsx
 *
 * Dedicated Club Management Workspace for authorized leadership (President & Admin).
 * Corrects field governance and provides fully functional officer and faculty management:
 *  - Overview & Authority (Club summary, institutional metadata, President, Faculty Advisor assignment)
 *  - Edit Profile & Branding (Club-managed fields + Admin-controlled institutional fields)
 *  - Leadership Officers (Fixed collegiate positions assignment, promotion, demotion)
 *  - Member Roster (Verified active roster with promote-to-officer controls)
 */

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Users,
  UserCheck,
  ShieldCheck,
  Tag,
  Globe,
  Share2,
  MessageSquare,
  Eye,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Upload,
  Trash2,
  Save,
  Lock,
  GraduationCap,
  Sparkles,
  Search,
  Plus,
  UserPlus,
  ShieldAlert,
  Edit3,
  UserMinus,
  ChevronDown,
  Archive,
  RotateCcw,
  AlertTriangle,
  FileText,
  XCircle,
  Clock,
  Send
} from 'lucide-react';
import DashboardNavbar from '@/components/layout/DashboardNavbar';
import { useAuth } from '@/components/providers/AuthProvider';
import { CLUB_POSITION_LABELS } from '@/lib/constants/club-positions';
import { can } from '@/lib/permissions';

export default function ClubManagementWorkspacePage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const clubIdOrSlug = resolvedParams.id;

  const { user } = useAuth();
  const [club, setClub] = useState(null);
  const [members, setMembers] = useState([]);
  const [facultyAdvisors, setFacultyAdvisors] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'profile' | 'leadership' | 'members' | 'recruitment'
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [applicationSearch, setApplicationSearch] = useState('');

  // Admin Lookup Lists
  const [usersList, setUsersList] = useState([]);
  const [facultyList, setFacultyList] = useState([]);

  // Modals & Action States
  const [officerModalOpen, setOfficerModalOpen] = useState(false);
  const [facultyModalOpen, setFacultyModalOpen] = useState(false);
  const [targetMemberForOfficer, setTargetMemberForOfficer] = useState(null);
  const [officerUsernameInput, setOfficerUsernameInput] = useState('');
  const [selectedOfficerRole, setSelectedOfficerRole] = useState('vice_president');
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [isHodFaculty, setIsHodFaculty] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Lifecycle Modals & Action States
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmDeleteInput, setConfirmDeleteInput] = useState('');

  // Recruitment Rejection Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedAppForReject, setSelectedAppForReject] = useState(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // Form Data (Includes both Club-Managed and Admin-Managed fields)
  const [formData, setFormData] = useState({
    // Club-Managed
    description: '',
    logo_url: '',
    banner_url: '',
    domain_tags: [],
    social_links: {
      website: '',
      instagram: '',
      linkedin: '',
      discord: ''
    },
    visibility: 'public',
    recruitment_open: true,
    // Admin-Managed Institutional Fields
    name: '',
    category: 'Technical',
    verification_status: 'approved',
    is_active: true,
    lead_user_id: ''
  });

  const isAdmin = Boolean(user && user.role === 'admin');

  // Load all club data from PostgreSQL
  const loadClubData = async () => {
    try {
      setLoading(true);
      setFeedback(null);

      const clubRes = await fetch(`/api/v1/clubs/${clubIdOrSlug}`, { cache: 'no-store' });
      const clubData = await clubRes.json().catch(() => null);

      if (clubRes.ok && clubData?.success && clubData?.data) {
        const c = clubData.data;
        setClub(c);

        setFormData({
          description: c.description || '',
          logo_url: c.logo_url || '',
          banner_url: c.banner_url || '',
          domain_tags: Array.isArray(c.domain_tags) ? c.domain_tags : [],
          social_links: {
            website: c.social_links?.website || '',
            instagram: c.social_links?.instagram || '',
            linkedin: c.social_links?.linkedin || '',
            discord: c.social_links?.discord || ''
          },
          visibility: c.visibility || 'public',
          recruitment_open: c.recruitment_open !== undefined ? c.recruitment_open : true,
          name: c.name || '',
          category: c.category || c.type || 'Technical',
          verification_status: c.verification_status || 'approved',
          is_active: c.is_active !== undefined ? c.is_active : true,
          lead_user_id: c.lead_user_id || ''
        });

        // Fetch members roster
        const memRes = await fetch(`/api/v1/clubs/${c.slug || c.id}/members`, { cache: 'no-store' }).catch(() => null);
        if (memRes && memRes.ok) {
          const memData = await memRes.json().catch(() => null);
          if (memData?.success && Array.isArray(memData.data)) {
            setMembers(memData.data);
          }
        }

        // Fetch faculty advisors
        const facRes = await fetch(`/api/v1/clubs/${c.slug || c.id}/faculty`, { cache: 'no-store' }).catch(() => null);
        if (facRes && facRes.ok) {
          const facData = await facRes.json().catch(() => null);
          if (facData?.success && Array.isArray(facData.data)) {
            setFacultyAdvisors(facData.data);
          }
        }

        // Fetch recruitment applications
        const appRes = await fetch(`/api/v1/clubs/${c.slug || c.id}/applications`, { cache: 'no-store' }).catch(() => null);
        if (appRes && appRes.ok) {
          const appData = await appRes.json().catch(() => null);
          if (appData?.success && Array.isArray(appData.data)) {
            setApplications(appData.data);
          }
        }
      } else {
        setClub(null);
      }
    } catch (err) {
      console.error('Failed to load club data:', err);
      setClub(null);
    } finally {
      setLoading(false);
    }
  };

  // Load Admin User Lists for institutional assignments
  const loadAdminUserLists = async () => {
    if (user?.role === 'admin') {
      try {
        const res = await fetch('/api/v1/admin/users', { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.success && Array.isArray(json.data)) {
          setUsersList(json.data);
          setFacultyList(json.data.filter((u) => u.role === 'faculty'));
        }
      } catch (err) {
        console.error('Error fetching admin users:', err);
      }
    }
  };

  useEffect(() => {
    loadClubData();
    loadAdminUserLists();
  }, [clubIdOrSlug, user]);

  // Authorization Evaluation
  const isManager = Boolean(
    user && club && (
      user.role === 'admin' ||
      (club.lead_user_id && user.id === club.lead_user_id) ||
      (user.club_position === 'president') ||
      can('club:manage', user, { club })
    )
  );

  // Logo file upload handler
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      setFeedback({ type: 'error', msg: 'Please select a valid image (PNG, JPG, WEBP, or SVG).' });
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

  // Banner file upload handler
  const handleBannerUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFeedback({ type: 'error', msg: 'Please select a valid banner image (PNG, JPG, or WEBP).' });
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

  // Domain tag management
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

  const handleRemoveTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      domain_tags: prev.domain_tags.filter((t) => t !== tagToRemove)
    }));
  };

  // Save Club Profile & Institutional Settings
  const handleSaveChanges = async (e) => {
    e.preventDefault();
    if (!club) return;

    setSaving(true);
    setFeedback(null);

    try {
      const payload = {
        description: formData.description,
        logo_url: formData.logo_url || null,
        banner_url: formData.banner_url || null,
        domain_tags: formData.domain_tags,
        social_links: {
          website: formData.social_links.website || null,
          instagram: formData.social_links.instagram || null,
          linkedin: formData.social_links.linkedin || null,
          discord: formData.social_links.discord || null
        },
        visibility: formData.visibility,
        recruitment_open: formData.recruitment_open,
        ...(isAdmin ? {
          name: formData.name,
          category: formData.category,
          verification_status: formData.verification_status,
          is_active: formData.is_active,
          lead_user_id: formData.lead_user_id || null
        } : {})
      };

      const res = await fetch(`/api/v1/clubs/${club.slug || club.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.success) {
        setFeedback({ type: 'success', msg: 'Club configuration updated successfully and persisted to database!' });
        await loadClubData();
      } else {
        setFeedback({ type: 'error', msg: json?.error?.message || json?.error || 'Failed to update club profile.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: 'Network error occurred while saving club profile.' });
    } finally {
      setSaving(false);
    }
  };

  // Assign or Update Officer Position (PATCH existing or POST invite)
  const handleAssignOfficer = async (e) => {
    e.preventDefault();
    if (!club) return;

    setSubmittingAction(true);
    setFeedback(null);

    try {
      if (targetMemberForOfficer) {
        // Update existing member's position
        const res = await fetch(`/api/v1/clubs/${club.slug || club.id}/members/${targetMemberForOfficer.user_id || targetMemberForOfficer.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: selectedOfficerRole })
        });
        const json = await res.json().catch(() => null);

        if (res.ok && json?.success) {
          setFeedback({
            type: 'success',
            msg: `Position for ${targetMemberForOfficer.full_name || targetMemberForOfficer.username} updated to ${CLUB_POSITION_LABELS[selectedOfficerRole] || selectedOfficerRole}!`
          });
          setOfficerModalOpen(false);
          setTargetMemberForOfficer(null);
          await loadClubData();
        } else {
          setFeedback({ type: 'error', msg: json?.error?.message || json?.error || 'Failed to update officer position.' });
        }
      } else if (officerUsernameInput.trim()) {
        // Invite/Assign new officer by username
        const res = await fetch(`/api/v1/clubs/${club.slug || club.id}/members/invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: officerUsernameInput.trim(),
            role: selectedOfficerRole
          })
        });
        const json = await res.json().catch(() => null);

        if (res.ok && json?.success) {
          setFeedback({
            type: 'success',
            msg: `@${officerUsernameInput.trim()} assigned as ${CLUB_POSITION_LABELS[selectedOfficerRole] || selectedOfficerRole}!`
          });
          setOfficerModalOpen(false);
          setOfficerUsernameInput('');
          await loadClubData();
        } else {
          setFeedback({ type: 'error', msg: json?.error?.message || json?.error || 'Failed to assign officer.' });
        }
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: 'Network error updating officer position.' });
    } finally {
      setSubmittingAction(false);
    }
  };

  // Demote Officer back to General Member
  const handleDemoteOfficer = async (officer) => {
    if (!club || !officer) return;
    if (officer.role === 'president' && !isAdmin) {
      setFeedback({ type: 'error', msg: 'Only Platform Administrators can demote or reassign the Club President.' });
      return;
    }

    setSubmittingAction(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/v1/clubs/${club.slug || club.id}/members/${officer.user_id || officer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'member' })
      });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.success) {
        setFeedback({ type: 'success', msg: `${officer.full_name || officer.username} demoted to Member.` });
        await loadClubData();
      } else {
        setFeedback({ type: 'error', msg: json?.error?.message || json?.error || 'Failed to demote officer.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: 'Network error demoting officer.' });
    } finally {
      setSubmittingAction(false);
    }
  };

  // Faculty Advisor Assignment (Admin only)
  const handleAssignFaculty = async (e) => {
    e.preventDefault();
    if (!club || !selectedFacultyId) return;

    setSubmittingAction(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/v1/clubs/${club.slug || club.id}/faculty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faculty_id: selectedFacultyId,
          is_hod: isHodFaculty
        })
      });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.success) {
        setFeedback({ type: 'success', msg: 'Faculty advisor assigned successfully!' });
        setFacultyModalOpen(false);
        setSelectedFacultyId('');
        setIsHodFaculty(false);
        await loadClubData();
      } else {
        setFeedback({ type: 'error', msg: json?.error?.message || json?.error || 'Failed to assign faculty advisor.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: 'Network error assigning faculty advisor.' });
    } finally {
      setSubmittingAction(false);
    }
  };

  // Faculty Advisor Removal (Admin only)
  const handleRemoveFaculty = async (facultyId) => {
    if (!club || !facultyId) return;

    setSubmittingAction(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/v1/clubs/${club.slug || club.id}/faculty?faculty_id=${facultyId}`, {
        method: 'DELETE'
      });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.success) {
        setFeedback({ type: 'success', msg: 'Faculty advisor removed successfully.' });
        await loadClubData();
      } else {
        setFeedback({ type: 'error', msg: json?.error?.message || json?.error || 'Failed to remove faculty advisor.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: 'Network error removing faculty advisor.' });
    } finally {
      setSubmittingAction(false);
    }
  };

  // Lifecycle: Archive Club (Admin & Faculty Advisor)
  const handleArchiveClub = async () => {
    if (!club) return;
    setSubmittingAction(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/v1/clubs/${club.slug || club.id}/archive`, {
        method: 'POST',
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setFeedback({ type: 'success', msg: `Club "${club.name}" archived successfully. Historical records preserved.` });
        setArchiveModalOpen(false);
        await loadClubData();
      } else {
        setFeedback({ type: 'error', msg: json?.error?.message || 'Failed to archive club.' });
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Network error archiving club.' });
    } finally {
      setSubmittingAction(false);
    }
  };

  // Lifecycle: Restore Club (Admin & Faculty Advisor)
  const handleRestoreClub = async () => {
    if (!club) return;
    setSubmittingAction(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/v1/clubs/${club.slug || club.id}/restore`, {
        method: 'POST',
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setFeedback({ type: 'success', msg: `Club "${club.name}" restored to active status.` });
        await loadClubData();
      } else {
        setFeedback({ type: 'error', msg: json?.error?.message || 'Failed to restore club.' });
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Network error restoring club.' });
    } finally {
      setSubmittingAction(false);
    }
  };

  // Lifecycle: Permanently Delete Club (Admin only, requires prior archival)
  const handlePermanentDeleteClub = async () => {
    if (!club || confirmDeleteInput.trim() !== club.name.trim()) return;
    setSubmittingAction(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/v1/clubs/${club.slug || club.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed_name: confirmDeleteInput }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        router.push('/dashboard/admin/clubs');
      } else {
        setFeedback({ type: 'error', msg: json?.error?.message || 'Failed to permanently delete club.' });
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Network error during permanent deletion.' });
    } finally {
      setSubmittingAction(false);
    }
  };

  // Recruitment: Approve application
  const handleApproveApplication = async (appId) => {
    if (!club) return;
    setSubmittingAction(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/v1/clubs/${club.slug || club.id}/applications/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setFeedback({ type: 'success', msg: 'Application approved! Student is now an active member.' });
        await loadClubData();
      } else {
        setFeedback({ type: 'error', msg: json?.error?.message || json?.error || 'Failed to approve application.' });
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Network error approving application.' });
    } finally {
      setSubmittingAction(false);
    }
  };

  // Recruitment: Reject application
  const handleRejectApplication = async () => {
    if (!club || !selectedAppForReject) return;
    setSubmittingAction(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/v1/clubs/${club.slug || club.id}/applications/${selectedAppForReject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          rejection_reason: rejectionReasonInput.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setFeedback({ type: 'success', msg: 'Application rejected.' });
        setRejectModalOpen(false);
        setSelectedAppForReject(null);
        setRejectionReasonInput('');
        await loadClubData();
      } else {
        setFeedback({ type: 'error', msg: json?.error?.message || json?.error || 'Failed to reject application.' });
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Network error rejecting application.' });
    } finally {
      setSubmittingAction(false);
    }
  };

  // Recruitment: Toggle Recruitment Window
  const handleToggleRecruitment = async () => {
    if (!club) return;
    setSubmittingAction(true);
    setFeedback(null);
    try {
      const nextState = !club.recruitment_open;
      const res = await fetch(`/api/v1/clubs/${club.slug || club.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recruitment_open: nextState }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setFeedback({
          type: 'success',
          msg: `Recruitment is now ${nextState ? 'OPEN for new student applications' : 'CLOSED'}.`,
        });
        await loadClubData();
      } else {
        setFeedback({ type: 'error', msg: json?.error?.message || 'Failed to update recruitment state.' });
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Network error toggling recruitment.' });
    } finally {
      setSubmittingAction(false);
    }
  };

  // Split members into Leadership Officers vs General Members
  const leadershipOfficers = members.filter((m) => m.role !== 'member');
  const generalMembers = members.filter((m) => m.role === 'member');

  // Split applications into Pending vs Reviewed
  const pendingApplications = applications.filter((a) => a.status === 'pending');
  const reviewedApplications = applications.filter((a) => a.status !== 'pending');

  // Filtered pending applications for search
  const filteredPendingApplications = pendingApplications.filter((a) => {
    if (!applicationSearch.trim()) return true;
    const query = applicationSearch.toLowerCase();
    return (
      a.username?.toLowerCase().includes(query) ||
      a.full_name?.toLowerCase().includes(query) ||
      a.department?.toLowerCase().includes(query) ||
      a.motivation?.toLowerCase().includes(query)
    );
  });

  // Filtered members for search
  const filteredGeneralMembers = generalMembers.filter((m) => {
    if (!memberSearch.trim()) return true;
    const query = memberSearch.toLowerCase();
    return (
      m.username?.toLowerCase().includes(query) ||
      m.full_name?.toLowerCase().includes(query) ||
      m.department?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent mb-3" />
        <p className="text-xs text-zinc-400">Loading Club Management Workspace...</p>
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
          <p className="text-xs text-zinc-400">The requested club could not be located in the database.</p>
          <Link href="/dashboard/clubs" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-xs font-bold text-white shadow-md">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Clubs
          </Link>
        </main>
      </div>
    );
  }

  // Authorization Guard Block
  if (!isManager) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <DashboardNavbar />
        <main className="max-w-3xl mx-auto px-6 py-20 text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-rose-950/40 border border-rose-800/40 text-rose-400 flex items-center justify-center mx-auto">
            <Lock className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">Management Access Restricted</h1>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            You do not hold executive management authorization for <strong className="text-zinc-200">{club.name}</strong>. Only the designated Club President and University Platform Administrators have access to this workspace.
          </p>
          <div className="pt-2">
            <Link
              href={`/dashboard/clubs/${club.slug || club.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-200 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Return to Club Page
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden pb-24">
      {/* Ambient Lighting */}
      <div className="absolute top-0 right-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-accent/5 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-violet-500/5 blur-3xl" />

      <DashboardNavbar />

      <main className="max-w-7xl mx-auto px-6 pt-6 space-y-6">

        {/* ── HEADER BREADCRUMB & CONTEXT ───────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/clubs/${club.slug || club.id}`}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-accent text-zinc-400 hover:text-white transition-colors cursor-pointer group"
              title="Return to Public Club View"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">{club.name}</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-bold text-violet-400 border border-violet-500/20 uppercase tracking-wider">
                  <ShieldCheck className="h-3 w-3" /> Management Workspace
                </span>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/20 uppercase tracking-wider">
                    Institutional Admin
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Executive administration, profile configuration, leadership officers, and member roster.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/dashboard/clubs/${club.slug || club.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-300 hover:text-white transition-all shadow-sm"
            >
              <Eye className="h-3.5 w-3.5 text-zinc-400" />
              <span>View Public Hub</span>
            </Link>
          </div>
        </div>

        {/* Feedback Alert Banner */}
        {feedback && (
          <div className={`p-4 rounded-2xl flex items-center justify-between border animate-fadeIn ${
            feedback.type === 'success' ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300' : 'bg-rose-950/30 border-rose-800/40 text-rose-300'
          }`}>
            <div className="flex items-center gap-2 text-xs font-bold">
              {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{feedback.msg}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-white cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── WORKSPACE TABS ────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 border-b border-zinc-900 pb-3 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview & Authority', icon: Building2 },
            { id: 'profile', label: 'Edit Profile & Branding', icon: Sparkles },
            { id: 'leadership', label: `Leadership Officers (${leadershipOfficers.length})`, icon: UserCheck },
            { id: 'members', label: `Member Roster (${generalMembers.length})`, icon: Users },
            { id: 'recruitment', label: `Recruitment & Applications (${pendingApplications.length})`, icon: UserPlus }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30 shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-accent' : 'text-zinc-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: OVERVIEW & AUTHORITY ───────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Top Cards: Society Metadata & Governance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: Society Info */}
              <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl border border-zinc-800 bg-zinc-950 flex items-center justify-center overflow-hidden shrink-0">
                    {club.logo_url ? (
                      <img src={club.logo_url} alt={club.name} className="h-full w-full object-cover" />
                    ) : (
                      <Building2 className="h-6 w-6 text-violet-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight">{club.name}</h3>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">slug: {club.slug}</p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-3 border-t border-zinc-900 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Official Category</span>
                    <span className="font-bold text-zinc-200">{club.category || club.type || 'Technical'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Verification</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 capitalize">
                      <Check className="h-3 w-3" /> {club.verification_status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Platform Status</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${club.is_active ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {club.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Access Policy</span>
                    <span className="font-bold text-zinc-200 capitalize">{club.visibility || 'Public'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Total Active Members</span>
                    <span className="font-bold text-violet-400">{club.member_count ?? members.length}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Club President (Executive) */}
              <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-accent" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Club President</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] font-bold text-violet-400">
                    Executive Lead
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <div className="h-12 w-12 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-sm uppercase shrink-0">
                    {club.lead_username?.charAt(0) || 'P'}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-xs font-bold text-white truncate">
                      {club.lead_full_name || club.lead_username || 'Unassigned'}
                    </h4>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      {club.lead_username ? `@${club.lead_username}` : 'No President assigned'}
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-1">Platform Role: Student</p>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-400 pt-2 border-t border-zinc-900 leading-relaxed">
                  Holds club-scoped operational authority including profile management, event creation, officer appointments, and recruitment.
                </p>
              </div>

              {/* Card 3: Institutional Faculty Advisor */}
              <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-amber-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Faculty Advisor</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-400">
                      Institutional
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => setFacultyModalOpen(true)}
                        className="p-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors"
                        title="Assign Faculty Advisor"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {facultyAdvisors.length > 0 ? (
                  <div className="space-y-3 pt-2">
                    {facultyAdvisors.map((fa) => (
                      <div key={fa.id || fa.faculty_id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {fa.username?.charAt(0) || 'F'}
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="text-xs font-bold text-white truncate">{fa.full_name || fa.username}</h4>
                            <p className="text-[10px] text-zinc-400">{fa.department || 'Academic Faculty'}</p>
                            <p className="text-[10px] text-zinc-500 font-mono">@{fa.username}</p>
                          </div>
                        </div>

                        {isAdmin && (
                          <button
                            onClick={() => handleRemoveFaculty(fa.faculty_id || fa.id)}
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950 border border-zinc-800 text-zinc-400 hover:text-rose-400 transition-colors shrink-0"
                            title="Remove Faculty Advisor"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center space-y-1">
                    <p className="text-xs font-semibold text-zinc-400">No Faculty Advisor Assigned</p>
                    <p className="text-[10px] text-zinc-500">
                      {isAdmin ? 'Click + to assign an official faculty advisor.' : 'Assigned through university administration.'}
                    </p>
                  </div>
                )}

                <p className="text-[10px] text-zinc-500 pt-2 border-t border-zinc-900 flex items-center gap-1.5">
                  <Lock className="h-3 w-3 text-zinc-500" /> Faculty assignments are institution-controlled.
                </p>
              </div>

            </div>

            {/* Mission Statement & Focus Tags Preview */}
            <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-8 space-y-6 shadow-xl">
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Mission Statement & Charter</h3>
                <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                  {club.description || 'No detailed mission statement has been recorded for this club yet.'}
                </p>
              </div>

              {Array.isArray(club.domain_tags) && club.domain_tags.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-zinc-900">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-accent" /> Active Focus Domains & Technologies
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {club.domain_tags.map((tag) => (
                      <span key={tag} className="px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-bold">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Institutional Lifecycle & Governance (Admin & Faculty Advisor) */}
            {(isAdmin || (user?.role === 'faculty' && facultyAdvisors.some((fa) => fa.faculty_id === user?.id || fa.id === user?.id))) && (
              <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Archive className="h-4 w-4 text-amber-400" /> Institutional Lifecycle & Archival
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Manage organizational lifecycle state, non-destructive historical archival, and permanent decommission policies.
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      club.archived_at
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {club.archived_at ? 'Archived State' : 'Operational / Active'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-850 space-y-3">
                  {club.archived_at ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-amber-300">
                          Archived on {new Date(club.archived_at).toLocaleDateString()}
                          {club.archived_by_username && ` by @${club.archived_by_username}`}
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          This club is hidden from public discovery. Historical memberships, events, and issued certificates remain preserved.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={handleRestoreClub}
                          disabled={submittingAction}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Restore Club
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDeleteInput('');
                              setDeleteModalOpen(true);
                            }}
                            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-600/20"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Permanently Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white">Active Operational Club</p>
                        <p className="text-[11px] text-zinc-400">
                          Archiving hides the club from student discovery while preserving all historical events, certificates, and student records.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setArchiveModalOpen(true)}
                        className="px-4 py-2 rounded-xl border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                      >
                        <Archive className="h-3.5 w-3.5" /> Archive Club
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ── TAB 2: EDIT PROFILE & BRANDING ────────────────────────────── */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveChanges} className="space-y-6 animate-fadeIn">
            
            {/* Notice: Institutional vs Club Controls */}
            {isAdmin ? (
              <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-800/40 flex items-start gap-3">
                <ShieldCheck className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-300 space-y-0.5">
                  <p className="font-bold text-rose-300">Platform Admin Controls Active</p>
                  <p>
                    As a Platform Administrator, you have institutional authority to modify official metadata (Title, Classification, Verification Status, Active State, and Appoint President) in addition to public branding assets.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex items-start gap-3">
                <Lock className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-400 space-y-0.5">
                  <p className="font-bold text-zinc-200">Institutional Governance Notice</p>
                  <p>
                    Official Society Title (<strong>{club.name}</strong>) and Classification (<strong>{club.category || club.type}</strong>) are controlled by Academic Administration. Below you may configure branding assets, descriptive charter, social connections, and recruitment status.
                  </p>
                </div>
              </div>
            )}

            {/* Section: Institutional Metadata (Admin Only) */}
            {isAdmin && (
              <div className="rounded-3xl border border-rose-900/30 bg-rose-950/10 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-xl">
                <div className="border-b border-rose-900/30 pb-3 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-rose-400" /> Institutional Metadata (Platform Admin)
                  </h3>
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider bg-rose-900/30 px-2.5 py-0.5 rounded-full border border-rose-800/40">
                    Admin Controlled
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Official Club Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 text-xs text-zinc-100 outline-none focus:border-rose-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Official Classification / Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 text-xs text-zinc-100 outline-none focus:border-rose-400"
                    >
                      <option value="Technical">Technical</option>
                      <option value="Cultural">Cultural</option>
                      <option value="Sports">Sports</option>
                      <option value="Academic">Academic</option>
                      <option value="Social Initiative">Social Initiative</option>
                      <option value="General">General</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Verification Status</label>
                    <select
                      value={formData.verification_status}
                      onChange={(e) => setFormData({ ...formData, verification_status: e.target.value })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 text-xs text-zinc-100 outline-none focus:border-rose-400"
                    >
                      <option value="approved">Approved</option>
                      <option value="pending">Pending</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Designated Club President</label>
                    <select
                      value={formData.lead_user_id}
                      onChange={(e) => setFormData({ ...formData, lead_user_id: e.target.value })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 text-xs text-zinc-100 outline-none focus:border-rose-400"
                    >
                      <option value="">-- No President Assigned --</option>
                      {usersList.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name ? `${u.full_name} (@${u.username})` : `@${u.username} (${u.email})`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Platform Operational Status:</label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                      formData.is_active
                        ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-600/20 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    {formData.is_active ? 'Active & Operational' : 'Inactive / Suspended'}
                  </button>
                </div>
              </div>
            )}

            {/* Section: Description */}
            <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 sm:p-8 space-y-4 shadow-xl">
              <div className="border-b border-zinc-900 pb-3 flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Mission Statement / About</h3>
                <span className="text-[10px] text-zinc-500 font-mono">{formData.description?.length || 0}/1000 chars</span>
              </div>
              <textarea
                rows={4}
                maxLength={1000}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your organization's mission, core activities, key projects, and community goals..."
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-accent leading-relaxed"
              />
            </div>

            {/* Section: Logo & Banner Media */}
            <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="border-b border-zinc-900 pb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Visual Identity & Assets</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">Configure the square logo emblem and 16:9 landscape header banner.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Logo Area */}
                <div className="md:col-span-4 space-y-3">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                    Emblem Logo (1:1)
                  </label>
                  <div className="relative h-40 w-full rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 flex flex-col items-center justify-center overflow-hidden group">
                    {formData.logo_url ? (
                      <div className="relative h-full w-full flex items-center justify-center p-4">
                        <img src={formData.logo_url} alt="Logo Preview" className="h-28 w-28 rounded-2xl object-cover shadow-lg border border-zinc-800" />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, logo_url: '' })}
                          className="absolute top-3 right-3 p-1.5 rounded-full bg-zinc-950/80 hover:bg-rose-950 border border-zinc-800 text-zinc-400 hover:text-rose-400 transition-colors"
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
                        <span className="text-xs font-bold text-zinc-300 block">Upload Logo</span>
                        <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoUpload} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>

                {/* Banner Area */}
                <div className="md:col-span-8 space-y-3">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                    Header Banner Cover (16:9)
                  </label>
                  <div className="relative h-40 w-full rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 flex flex-col items-center justify-center overflow-hidden group">
                    {formData.banner_url ? (
                      <div className="relative h-full w-full">
                        <img src={formData.banner_url} alt="Banner Preview" className="h-full w-full object-cover" />
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
                        <span className="text-xs font-bold text-zinc-300 block">Upload Cover Banner</span>
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleBannerUpload} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Section: Focus Domain Tags */}
            <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 sm:p-8 space-y-4 shadow-xl">
              <div className="border-b border-zinc-900 pb-3 flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-accent" /> Focus Domain Tags
                </h3>
                <span className="text-[10px] text-zinc-500">{formData.domain_tags.length}/10 configured</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {formData.domain_tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-bold">
                    <span>{tag}</span>
                    <button type="button" onClick={() => handleRemoveTag(tag)} className="text-zinc-500 hover:text-rose-400 cursor-pointer">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 max-w-md pt-2">
                <input
                  type="text"
                  placeholder="Add domain tag (e.g., Computer Vision, Web3)..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag(tagInput);
                    }
                  }}
                  className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3.5 py-2 text-xs text-zinc-200 outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag(tagInput)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-bold text-zinc-200 cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Section: Social Channels & External Links */}
            <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 sm:p-8 space-y-4 shadow-xl">
              <div className="border-b border-zinc-900 pb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-accent" /> Official Community Links & Socials
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-zinc-500" /> Website URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://robotics-society.edu"
                    value={formData.social_links.website || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      social_links: { ...formData.social_links, website: e.target.value }
                    })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3.5 py-2 text-xs text-zinc-200 outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-indigo-400" /> Discord Community Server
                  </label>
                  <input
                    type="text"
                    placeholder="https://discord.gg/robotics-hub"
                    value={formData.social_links.discord || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      social_links: { ...formData.social_links, discord: e.target.value }
                    })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3.5 py-2 text-xs text-zinc-200 outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                    <Share2 className="h-3.5 w-3.5 text-pink-400" /> Instagram Profile
                  </label>
                  <input
                    type="text"
                    placeholder="https://instagram.com/robotics_society"
                    value={formData.social_links.instagram || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      social_links: { ...formData.social_links, instagram: e.target.value }
                    })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3.5 py-2 text-xs text-zinc-200 outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                    <Share2 className="h-3.5 w-3.5 text-blue-400" /> LinkedIn Page
                  </label>
                  <input
                    type="text"
                    placeholder="https://linkedin.com/company/campus-robotics"
                    value={formData.social_links.linkedin || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      social_links: { ...formData.social_links, linkedin: e.target.value }
                    })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3.5 py-2 text-xs text-zinc-200 outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>

            {/* Section: Visibility & Recruitment Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Visibility Policy */}
              <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 space-y-4 shadow-xl">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-accent" /> Discovery & Access Policy
                </h3>
                
                <div className="space-y-2">
                  {[
                    { id: 'public', label: 'Public Discovery', desc: 'Visible to all students in campus catalog' },
                    { id: 'campus_only', label: 'Campus Members Only', desc: 'Restricted to authenticated institutional accounts' },
                    { id: 'invite_only', label: 'Private / Invite Only', desc: 'Unlisted in directory; private admission' }
                  ].map((opt) => (
                    <div
                      key={opt.id}
                      onClick={() => setFormData({ ...formData, visibility: opt.id })}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        formData.visibility === opt.id
                          ? 'bg-violet-600/15 border-violet-500/40 text-white'
                          : 'bg-zinc-950/40 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold block">{opt.label}</span>
                        <span className="text-[10px] text-zinc-500 block">{opt.desc}</span>
                      </div>
                      <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        formData.visibility === opt.id ? 'border-accent bg-accent' : 'border-zinc-700'
                      }`}>
                        {formData.visibility === opt.id && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recruitment Status */}
              <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-accent" /> Student Recruitment Status
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Toggle whether general campus students can submit applications to join your organization.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, recruitment_open: true })}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      formData.recruitment_open
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" /> Open for Applications
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, recruitment_open: false })}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      !formData.recruitment_open
                        ? 'bg-zinc-800 text-zinc-200 border border-zinc-700 shadow-md'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <X className="h-3.5 w-3.5" /> Applications Closed
                  </button>
                </div>
              </div>

            </div>

            {/* Bottom Save Bar */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-900">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent/90 text-xs font-bold text-white shadow-xl cursor-pointer disabled:opacity-50 transition-all"
              >
                {saving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{saving ? 'Persisting Changes...' : 'Save Changes'}</span>
              </button>
            </div>

          </form>
        )}

        {/* ── TAB 3: LEADERSHIP OFFICERS ────────────────────────────────── */}
        {activeTab === 'leadership' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Executive Officers & Positions</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Appointed student officers holding collegiate leadership authority.
                </p>
              </div>

              <button
                onClick={() => {
                  setTargetMemberForOfficer(null);
                  setOfficerUsernameInput('');
                  setSelectedOfficerRole('vice_president');
                  setOfficerModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-xs font-bold text-white shadow-lg cursor-pointer transition-all shrink-0"
              >
                <UserPlus className="h-4 w-4" />
                <span>Appoint / Assign Officer</span>
              </button>
            </div>

            {leadershipOfficers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {leadershipOfficers.map((officer) => {
                  const isPresident = officer.role === 'president';
                  return (
                    <div
                      key={officer.id || officer.user_id}
                      className="p-5 rounded-2xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl flex flex-col justify-between space-y-4 shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="h-11 w-11 rounded-full bg-violet-600/15 border border-violet-500/30 text-violet-300 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {officer.username?.charAt(0) || 'O'}
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="text-xs font-bold text-white truncate">{officer.full_name || officer.username}</h4>
                            <p className="text-[11px] text-zinc-400 font-mono truncate">@{officer.username}</p>
                            <p className="text-[10px] text-zinc-500 truncate">{officer.department || 'General Student'}</p>
                          </div>
                        </div>

                        {/* Officer Actions Dropdown / Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          {(!isPresident || isAdmin) && (
                            <button
                              onClick={() => {
                                setTargetMemberForOfficer(officer);
                                setSelectedOfficerRole(officer.role);
                                setOfficerModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
                              title="Change Position"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {!isPresident && (
                            <button
                              onClick={() => handleDemoteOfficer(officer)}
                              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950 border border-zinc-800 text-zinc-400 hover:text-rose-400 transition-colors"
                              title="Demote to Member"
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {isPresident && !isAdmin && (
                            <span title="President position is institution-controlled" className="p-1.5 text-zinc-500">
                              <Lock className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-zinc-900/80 flex items-center justify-between">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          isPresident
                            ? 'bg-accent/20 border border-accent/30 text-accent'
                            : 'bg-violet-500/10 border border-violet-500/20 text-violet-300'
                        }`}>
                          {CLUB_POSITION_LABELS[officer.role] || officer.role}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          Joined {new Date(officer.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center border border-dashed border-zinc-800 rounded-3xl space-y-2">
                <UserCheck className="h-10 w-10 text-zinc-600 mx-auto" />
                <h4 className="text-xs font-bold text-zinc-300">No Leadership Officers Registered</h4>
                <p className="text-[11px] text-zinc-500">Click "Appoint / Assign Officer" to assign leadership positions.</p>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: MEMBERS ROSTER ─────────────────────────────────────── */}
        {activeTab === 'members' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Header & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Active Campus Members Roster</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Verified student members holding active participation status.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="h-3.5 w-3.5 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search member roster..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 pl-9 pr-3.5 py-2 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-accent"
                />
              </div>
            </div>

            {filteredGeneralMembers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredGeneralMembers.map((m) => (
                  <div
                    key={m.id || m.user_id}
                    className="p-4 rounded-2xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl flex items-center justify-between gap-3 shadow-md"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="h-10 w-10 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {m.username?.charAt(0) || 'M'}
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-xs font-bold text-zinc-200 truncate">{m.full_name || m.username}</h4>
                        <p className="text-[11px] text-zinc-400 font-mono truncate">@{m.username}</p>
                        <p className="text-[10px] text-zinc-500 truncate">{m.department || 'Active Member'}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setTargetMemberForOfficer(m);
                        setSelectedOfficerRole('vice_president');
                        setOfficerModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-violet-600/20 border border-zinc-800 hover:border-violet-500/30 text-[10px] font-bold text-zinc-300 hover:text-violet-300 transition-colors shrink-0"
                    >
                      Promote
                    </button>
                  </div>
                ))}
              </div>
            ) : generalMembers.length > 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                No members match the search query "{memberSearch}".
              </div>
            ) : (
              <div className="py-16 text-center border border-dashed border-zinc-800 rounded-3xl space-y-2">
                <Users className="h-10 w-10 text-zinc-600 mx-auto" />
                <h4 className="text-xs font-bold text-zinc-300">No General Members Yet</h4>
                <p className="text-[11px] text-zinc-500">Applications and invitations will populate this roster.</p>
              </div>
            )}

          </div>
        )}

        {/* ── TAB 5: RECRUITMENT & APPLICATIONS ─────────────────────────── */}
        {activeTab === 'recruitment' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Header & Window Control Card */}
            <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-violet-400" />
                  <h3 className="text-base font-bold text-white">Membership Recruitment & Intake</h3>
                </div>
                <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
                  Manage student membership applications and toggle public recruitment intake. Approved applicants are automatically onboarded as verified society members.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <span className="block text-[10px] uppercase tracking-wider font-bold text-zinc-500">Recruitment Status</span>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold mt-0.5 ${
                    club.recruitment_open ? 'text-emerald-400' : 'text-zinc-400'
                  }`}>
                    <span className={`h-2 w-2 rounded-full ${club.recruitment_open ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                    {club.recruitment_open ? 'Open for Applications' : 'Intake Closed'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleToggleRecruitment}
                  disabled={submittingAction}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                    club.recruitment_open
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                  }`}
                >
                  {club.recruitment_open ? 'Pause Recruitment' : 'Open Recruitment'}
                </button>
              </div>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-xl">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Pending Applications</span>
                <p className="text-2xl font-extrabold text-white mt-1">{pendingApplications.length}</p>
                <p className="text-[10px] text-zinc-500 mt-1">Awaiting President decision</p>
              </div>

              <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-xl">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Active Society Members</span>
                <p className="text-2xl font-extrabold text-white mt-1">{generalMembers.length + leadershipOfficers.length}</p>
                <p className="text-[10px] text-zinc-500 mt-1">Current total roster count</p>
              </div>

              <div className="p-5 rounded-2xl border border-violet-500/20 bg-violet-500/5 backdrop-blur-xl">
                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Total Applications</span>
                <p className="text-2xl font-extrabold text-white mt-1">{applications.length}</p>
                <p className="text-[10px] text-zinc-500 mt-1">{reviewedApplications.length} previously decided</p>
              </div>
            </div>

            {/* ── SECTION 1: PENDING APPLICATIONS ────────────────────────── */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-400" />
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    Pending Applications ({pendingApplications.length})
                  </h4>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="h-3.5 w-3.5 text-zinc-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search applicants..."
                    value={applicationSearch}
                    onChange={(e) => setApplicationSearch(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 pl-9 pr-3.5 py-2 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-accent"
                  />
                </div>
              </div>

              {filteredPendingApplications.length > 0 ? (
                <div className="space-y-4">
                  {filteredPendingApplications.map((app) => (
                    <div
                      key={app.id}
                      className="p-6 rounded-3xl border border-zinc-800 bg-zinc-900/30 backdrop-blur-xl space-y-4 shadow-xl hover:border-zinc-700 transition"
                    >
                      {/* Top Row: Applicant Profile & Applied Date */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
                        <div className="flex items-center gap-3.5">
                          <div className="h-11 w-11 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-sm uppercase shrink-0">
                            {app.username?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-sm font-bold text-white">{app.full_name || app.username}</h5>
                              <span className="text-xs text-zinc-400 font-mono">@{app.username}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-zinc-400">
                              {app.department && (
                                <span className="px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 font-medium">
                                  {app.department}
                                </span>
                              )}
                              {app.year && (
                                <span className="px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 font-medium">
                                  Year {app.year}
                                </span>
                              )}
                              {app.roll_number && (
                                <span className="text-zinc-500 font-mono">{app.roll_number}</span>
                              )}
                              <span className="text-zinc-600">•</span>
                              <span className="text-zinc-500">{app.email}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 shrink-0">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Applied {new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </div>

                      {/* Motivation Statement */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          Motivation & Statement
                        </span>
                        <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-900 text-xs text-zinc-200 leading-relaxed font-sans">
                          "{app.motivation}"
                        </div>
                      </div>

                      {/* Domain Interests & Experience */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        {Array.isArray(app.interests) && app.interests.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              Domain Interests
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {app.interests.map((interest, idx) => (
                                <span
                                  key={idx}
                                  className="px-2.5 py-0.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[10px] font-bold"
                                >
                                  {interest}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {app.experience && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              Prior Experience
                            </span>
                            <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                              {app.experience}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons Row */}
                      <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-900">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAppForReject(app);
                            setRejectionReasonInput('');
                            setRejectModalOpen(true);
                          }}
                          disabled={submittingAction}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-rose-950/30 border border-zinc-800 hover:border-rose-500/30 text-zinc-400 hover:text-rose-300 text-xs font-bold transition cursor-pointer"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Reject Application</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApproveApplication(app.id)}
                          disabled={submittingAction}
                          className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20 cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Approve & Onboard</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : pendingApplications.length > 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500">
                  No pending applications match your search query "{applicationSearch}".
                </div>
              ) : (
                <div className="py-16 text-center border border-dashed border-zinc-800 rounded-3xl space-y-2">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500/60 mx-auto" />
                  <h4 className="text-xs font-bold text-zinc-300">All Applications Reviewed</h4>
                  <p className="text-[11px] text-zinc-500">There are no pending membership applications awaiting review.</p>
                </div>
              )}
            </div>

            {/* ── SECTION 2: REVIEWED APPLICATIONS HISTORY ───────────────── */}
            {reviewedApplications.length > 0 && (
              <div className="space-y-4 pt-6 border-t border-zinc-900">
                <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
                  Decided Applications History ({reviewedApplications.length})
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {reviewedApplications.map((app) => (
                    <div
                      key={app.id}
                      className="p-4 rounded-2xl border border-zinc-900 bg-zinc-950/40 space-y-3 shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-300 uppercase">
                            {app.username?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-zinc-200">{app.full_name || app.username}</h5>
                            <span className="text-[10px] text-zinc-500 font-mono">@{app.username}</span>
                          </div>
                        </div>

                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          app.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {app.status === 'approved' ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          {app.status}
                        </span>
                      </div>

                      <div className="text-[11px] text-zinc-400">
                        {app.reviewed_at && (
                          <p>
                            Decided on {new Date(app.reviewed_at).toLocaleDateString()}
                            {app.reviewer_username && ` by @${app.reviewer_username}`}
                          </p>
                        )}
                        {app.rejection_reason && (
                          <p className="text-rose-300 mt-1 text-[10px] italic">
                            Reason: "{app.rejection_reason}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* ── APPOINT / ASSIGN OFFICER MODAL ──────────────────────────────── */}
      {officerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-accent" />
                <h3 className="text-base font-bold text-white">
                  {targetMemberForOfficer ? `Assign Position: ${targetMemberForOfficer.full_name || targetMemberForOfficer.username}` : 'Appoint / Assign Officer'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setOfficerModalOpen(false);
                  setTargetMemberForOfficer(null);
                }}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAssignOfficer} className="space-y-4">
              {!targetMemberForOfficer && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Student Username</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., student123"
                    value={officerUsernameInput}
                    onChange={(e) => setOfficerUsernameInput(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs text-zinc-200 focus:border-accent outline-none"
                  />
                  <p className="text-[10px] text-zinc-500">Enter the campus username of the student to assign.</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Collegiate Leadership Position</label>
                <select
                  value={selectedOfficerRole}
                  onChange={(e) => setSelectedOfficerRole(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs text-zinc-200 focus:border-accent outline-none"
                >
                  {isAdmin && <option value="president">President (Institutional)</option>}
                  <option value="vice_president">Vice President</option>
                  <option value="secretary">Secretary</option>
                  <option value="vice_secretary">Vice Secretary</option>
                  <option value="treasurer">Treasurer</option>
                  <option value="technical_lead">Technical Lead</option>
                  <option value="outreach_lead">PR & Outreach Lead</option>
                  <option value="member">Member (Demote to General Roster)</option>
                </select>
                {!isAdmin && (
                  <p className="text-[10px] text-zinc-500">
                    President appointment requires University Platform Administrator authorization.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => {
                    setOfficerModalOpen(false);
                    setTargetMemberForOfficer(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-xs font-bold text-white shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {submittingAction ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span>Save Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ASSIGN FACULTY ADVISOR MODAL (ADMIN ONLY) ───────────────────── */}
      {facultyModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Assign Faculty Advisor</h3>
              </div>
              <button onClick={() => setFacultyModalOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAssignFaculty} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Select Faculty Member</label>
                <select
                  required
                  value={selectedFacultyId}
                  onChange={(e) => setSelectedFacultyId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs text-zinc-200 focus:border-amber-400 outline-none"
                >
                  <option value="">-- Choose Academic Faculty --</option>
                  {facultyList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.full_name ? `${f.full_name} (@${f.username})` : `@${f.username} (${f.email})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_hod"
                  checked={isHodFaculty}
                  onChange={(e) => setIsHodFaculty(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-amber-500 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="is_hod" className="text-xs font-bold text-zinc-300 cursor-pointer">
                  Assign as Head of Department (HOD)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setFacultyModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction || !selectedFacultyId}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {submittingAction ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span>Assign Faculty</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ARCHIVE CONFIRMATION MODAL ───────────────────────────────────── */}
      {archiveModalOpen && club && (
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
                Are you sure you want to archive <strong className="text-white">"{club.name}"</strong>?
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
                onClick={() => setArchiveModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchiveClub}
                disabled={submittingAction}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-500 transition flex items-center gap-1.5 shadow-lg"
              >
                <Archive className="h-4 w-4" /> Confirm Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PERMANENT DELETE CONFIRMATION MODAL ───────────────────────────── */}
      {deleteModalOpen && club && (
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
                This will permanently delete "{club.name}" from the database.
              </p>
              <p className="text-[11px] text-zinc-400">
                Club memberships and advisor associations will be cleanly removed. Any historical campus events hosted by this club will remain preserved in student transcripts with verified certificates intact.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400">
                Type <span className="text-white font-mono select-all">"{club.name}"</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmDeleteInput}
                onChange={(e) => setConfirmDeleteInput(e.target.value)}
                placeholder={club.name}
                className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setConfirmDeleteInput('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePermanentDeleteClub}
                disabled={submittingAction || confirmDeleteInput.trim() !== club.name.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5 shadow-lg shadow-rose-600/20"
              >
                <Trash2 className="h-4 w-4" /> Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RECRUITMENT APPLICATION REJECTION MODAL ─────────────────────── */}
      {rejectModalOpen && selectedAppForReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-950 border border-rose-500/30 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Reject Application</h3>
                  <p className="text-xs text-zinc-400">
                    Applicant: {selectedAppForReject.full_name || selectedAppForReject.username}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRejectModalOpen(false);
                  setSelectedAppForReject(null);
                  setRejectionReasonInput('');
                }}
                className="text-zinc-500 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-zinc-300">
                Are you sure you want to reject the membership application from{' '}
                <strong className="text-white">@{selectedAppForReject.username}</strong>?
              </p>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400">
                  Rejection Reason <span className="text-zinc-500">(Optional — sent to applicant)</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder="e.g. Current intake capacity reached, please apply next semester..."
                  className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-900">
              <button
                type="button"
                onClick={() => {
                  setRejectModalOpen(false);
                  setSelectedAppForReject(null);
                  setRejectionReasonInput('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectApplication}
                disabled={submittingAction}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-600/20"
              >
                {submittingAction ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
