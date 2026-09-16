/**
 * lib/permissions.ts
 *
 * Centralized Capability & Permission Evaluation for CampusGrid.
 * Used across the frontend and client components to conditionally render
 * privileged actions, controls, and navigation items based on user capabilities.
 *
 * Backend authorization remains the ultimate enforcer.
 */

export type UserRole = 'student' | 'faculty' | 'admin' | string;

export interface PermissionUser {
  id?: string;
  sub?: string;
  role?: UserRole;
  email?: string;
  username?: string;
  club_position?: string;
}

export type PermissionAction =
  | 'club:create'
  | 'club:edit'
  | 'club:manage'
  | 'club:archive'
  | 'club:restore'
  | 'club:delete'
  | 'event:create'
  | 'event:edit'
  | 'event:manage'
  | 'event:publish'
  | 'event:archive'
  | 'admin:access'
  | 'users:manage'
  | 'roles:assign'
  | 'certificates:manage';

/**
 * Evaluates whether a user has permission to perform a specific action,
 * optionally within the context of a specific resource (event, club, etc.).
 */
export function can(
  action: PermissionAction,
  user: PermissionUser | null | undefined,
  context?: {
    club?: { lead_user_id?: string | null; id?: string };
    event?: { organiser_id?: string | null; club_id?: string | null; club_lead_id?: string | null };
    club_position?: string | null;
  }
): boolean {
  if (!user) return false;

  const role = user.role;
  const userId = user.id || user.sub;

  // 1. Admin possesses global operational authority
  if (role === 'admin') return true;

  switch (action) {
    // ── Clubs ─────────────────────────────────────────────────────────────────
    case 'club:create':
      return role === 'admin';

    case 'club:edit':
    case 'club:manage':
      if (role === 'admin') return true;
      if (context?.club?.lead_user_id && userId) {
        return context.club.lead_user_id === userId;
      }
      if (context?.club_position === 'president') {
        return true;
      }
      return false;

    case 'club:archive':
    case 'club:restore':
      return role === 'admin' || role === 'faculty';

    case 'club:delete':
      return role === 'admin';

    // ── Events ────────────────────────────────────────────────────────────────
    case 'event:create':
      if (role === 'admin' || role === 'faculty') return true;
      if (context?.club_position && ['president', 'vice_president', 'secretary', 'vice_secretary', 'technical_lead'].includes(context.club_position)) {
        return true;
      }
      if (user.club_position && ['president', 'vice_president', 'secretary', 'vice_secretary', 'technical_lead'].includes(user.club_position)) {
        return true;
      }
      return false;

    case 'event:edit':
    case 'event:manage':
    case 'event:publish':
    case 'event:archive':
      if (role === 'admin') return true;
      if (context?.event && userId) {
        if (context.event.organiser_id === userId) return true;
        if (context.event.club_lead_id === userId) return true;
      }
      if (context?.club_position && ['president', 'vice_president', 'secretary', 'vice_secretary', 'technical_lead'].includes(context.club_position)) {
        return true;
      }
      return role === 'faculty';

    // ── Platform / System Admin Console ───────────────────────────────────────
    case 'admin:access':
    case 'users:manage':
    case 'roles:assign':
    case 'certificates:manage':
      return role === 'admin';

    default:
      return false;
  }
}
