/**
 * lib/auth/club-permissions.ts
 *
 * Scoped Club Position Authorization & Capability Evaluation.
 *
 * Implements rigid position-based access control for club operations.
 * Platform role remains independent from club positions.
 */

import { query } from '@/lib/db/client';
import { ForbiddenError, UnauthorizedError } from '@/lib/errors';
import { ClubPosition, CLUB_POSITION_LABELS } from '@/lib/constants/club-positions';

export type { ClubPosition };
export { CLUB_POSITION_LABELS };

export type ClubCapability =
  | 'view_club'
  | 'edit_club_profile'
  | 'manage_branding'
  | 'manage_members'
  | 'assign_positions'
  | 'manage_recruitment'
  | 'create_club_event'
  | 'manage_club_event'
  | 'publish_announcement'
  | 'manage_announcements';

export type PlatformDangerousClubAction =
  | 'archive_club'
  | 'restore_club'
  | 'permanently_delete_club';

/**
 * Rigid Capability Matrix for the 8 Fixed Collegiate Club Positions.
 */
export const CLUB_POSITION_CAPABILITIES: Record<ClubPosition, readonly ClubCapability[]> = {
  president: [
    'view_club',
    'edit_club_profile',
    'manage_branding',
    'manage_members',
    'assign_positions',
    'manage_recruitment',
    'create_club_event',
    'manage_club_event',
    'publish_announcement',
    'manage_announcements',
  ],
  vice_president: [
    'view_club',
    'manage_members',
    'manage_recruitment',
    'create_club_event',
    'manage_club_event',
    'publish_announcement',
    'manage_announcements',
  ],
  secretary: [
    'view_club',
    'create_club_event',
    'manage_club_event',
    'publish_announcement',
    'manage_announcements',
  ],
  vice_secretary: [
    'view_club',
    'create_club_event',
    'manage_club_event',
    'publish_announcement',
  ],
  treasurer: [
    'view_club',
  ],
  technical_lead: [
    'view_club',
    'create_club_event',
    'manage_club_event',
  ],
  outreach_lead: [
    'view_club',
    'manage_recruitment',
  ],
  member: [
    'view_club',
  ],
};

export interface CallerContext {
  id: string;
  role: 'student' | 'faculty' | 'admin' | string;
  email?: string;
  username?: string;
}

/**
 * Fetch the active club position for a specific user in a specific club.
 */
export async function getClubPosition(
  userId: string,
  clubId: string
): Promise<ClubPosition | null> {
  const res = await query(
    `SELECT role FROM club_memberships
     WHERE club_id = $1 AND user_id = $2 AND status = 'active'
     LIMIT 1`,
    [clubId, userId]
  );
  if (!res.rowCount || res.rowCount === 0) return null;
  return res.rows[0].role as ClubPosition;
}

/**
 * Check whether a user is an authorized faculty advisor for a club.
 */
export async function isClubFacultyAdvisor(
  facultyId: string,
  clubId: string
): Promise<boolean> {
  const res = await query(
    `SELECT 1 FROM club_faculty_advisors
     WHERE club_id = $1 AND faculty_id = $2
     LIMIT 1`,
    [clubId, facultyId]
  );
  return (res.rowCount ?? 0) > 0;
}

/**
 * Evaluates whether a caller can perform a scoped club action or platform-level club action.
 */
export async function canClubAction(
  caller: CallerContext,
  clubId: string,
  action: ClubCapability | PlatformDangerousClubAction
): Promise<boolean> {
  if (!caller || !caller.id) return false;

  // 1. Platform Admin has universal system authorization
  if (caller.role === 'admin') {
    return true;
  }

  // 2. Dangerous Platform Operations:
  if (action === 'permanently_delete_club') {
    // Only Admin can permanently delete a club
    return false;
  }

  if (action === 'archive_club' || action === 'restore_club') {
    // Admin or authorized Faculty Advisor
    if (caller.role === 'faculty') {
      return isClubFacultyAdvisor(caller.id, clubId);
    }
    return false; // Club President / students cannot archive or restore the club
  }

  // 3. Faculty Advisor capabilities
  if (caller.role === 'faculty') {
    const isAdvisor = await isClubFacultyAdvisor(caller.id, clubId);
    if (isAdvisor) {
      // Faculty advisors have oversight viewing & event monitoring
      if (['view_club', 'manage_club_event'].includes(action)) return true;
    }
    return false;
  }

  // 4. Student with Scoped Club Position
  const position = await getClubPosition(caller.id, clubId);
  if (!position) return false;

  const allowedCapabilities = CLUB_POSITION_CAPABILITIES[position] || [];
  return (allowedCapabilities as readonly string[]).includes(action);
}

/**
 * Assert that a caller has permission to perform a club action. Throws ForbiddenError otherwise.
 */
export async function assertClubAction(
  caller: CallerContext,
  clubId: string,
  action: ClubCapability | PlatformDangerousClubAction,
  customErrorMessage?: string
): Promise<void> {
  if (!caller || !caller.id) {
    throw new UnauthorizedError('Authentication required.');
  }

  const allowed = await canClubAction(caller, clubId, action);
  if (!allowed) {
    throw new ForbiddenError(
      customErrorMessage ||
        `You do not have the required club position permissions to perform "${action}" for this club.`
    );
  }
}
