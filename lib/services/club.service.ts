/**
 * lib/services/club.service.ts
 *
 * Club service layer.
 *
 * Handles all database interactions for clubs, memberships, and faculty advisors.
 * Route handlers call these functions; no SQL should appear in route files.
 */

import { query, withTransaction } from '@/lib/db/client';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@/lib/errors';
import { assertClubAction } from '@/lib/auth/club-permissions';
import type {
  ClubRegisterInput,
  ClubRegistrationDecisionInput,
  ClubUpdateInput,
  ClubMemberInviteInput,
  ClubMemberUpdateInput,
  ClubFacultyAssignInput,
  ClubMembershipApplyInput,
  ClubApplicationDecisionInput,
} from '@/lib/schemas/club.schemas';

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let candidate = base;
  let attempt = 0;
  while (attempt < 10) {
    const existing = await query(
      'SELECT 1 FROM clubs WHERE slug = $1 LIMIT 1',
      [candidate]
    );
    if (existing.rowCount === 0) return candidate;
    candidate = `${base}-${Math.floor(Math.random() * 9000) + 1000}`;
    attempt++;
  }
  return `${base}-${Date.now()}`;
}

// ── List / Get ────────────────────────────────────────────────────────────────

/** Return all approved active clubs, ordered by featured first then name. Supports joinedUserId filtering. Archived clubs are strictly excluded. */
export async function listApprovedClubs(options?: { joinedUserId?: string }) {
  if (options?.joinedUserId) {
    const result = await query(
      `SELECT c.id, c.name, c.slug, c.type, c.category, c.description, c.logo_url, c.banner_url,
              c.domain_tags, c.visibility, c.featured, c.recruitment_open,
              (SELECT COUNT(*) FROM club_memberships cm2 WHERE cm2.club_id = c.id AND cm2.status = 'active') as member_count,
              c.created_at, c.is_active, cm.role as user_club_role
       FROM clubs c
       JOIN club_memberships cm ON cm.club_id = c.id
       WHERE cm.user_id = $1
         AND cm.status = 'active'
         AND c.verification_status = 'approved'
         AND c.deleted_at IS NULL
         AND c.is_active = TRUE
         AND c.archived_at IS NULL
       ORDER BY c.name ASC`,
      [options.joinedUserId]
    );
    return result.rows;
  }

  const result = await query(
    `SELECT id, name, slug, type, category, description, logo_url, banner_url,
            domain_tags, visibility, featured, recruitment_open, member_count,
            created_at, is_active
     FROM clubs
     WHERE verification_status = 'approved'
       AND deleted_at IS NULL
       AND is_active = TRUE
       AND archived_at IS NULL
     ORDER BY featured DESC, name ASC`
  );
  return result.rows;
}

/** Return a single approved club by slug or id, including its lead user info, faculty advisor, and archival metadata. */
export async function getClubBySlug(slugOrId: string) {
  const result = await query(
    `SELECT c.*,
            (SELECT COUNT(*) FROM club_memberships cm WHERE cm.club_id = c.id AND cm.status = 'active') as member_count,
            u.username as lead_username,
            p.full_name as lead_full_name,
            u.avatar_url as lead_avatar_url,
            (SELECT u2.username FROM club_faculty_advisors cfa JOIN users u2 ON u2.id = cfa.faculty_id WHERE cfa.club_id = c.id ORDER BY cfa.is_hod DESC LIMIT 1) as faculty_advisor_username,
            (SELECT p2.full_name FROM club_faculty_advisors cfa JOIN users u2 ON u2.id = cfa.faculty_id LEFT JOIN profiles p2 ON p2.user_id = u2.id WHERE cfa.club_id = c.id ORDER BY cfa.is_hod DESC LIMIT 1) as faculty_advisor_name,
            (SELECT p2.department FROM club_faculty_advisors cfa JOIN users u2 ON u2.id = cfa.faculty_id LEFT JOIN profiles p2 ON p2.user_id = u2.id WHERE cfa.club_id = c.id ORDER BY cfa.is_hod DESC LIMIT 1) as faculty_advisor_department,
            (SELECT u3.username FROM users u3 WHERE u3.id = c.archived_by) as archived_by_username
     FROM clubs c
     LEFT JOIN users u ON u.id = c.lead_user_id
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE (c.slug = $1 OR c.id::text = $1)
       AND c.deleted_at IS NULL`,
    [slugOrId]
  );
  if (!result.rowCount || result.rowCount === 0) throw new NotFoundError('Club');
  return result.rows[0];
}

/** Return the club led by a specific user (used for /clubs/me). */
export async function getClubByLeadUser(leadUserId: string) {
  const result = await query(
    `SELECT c.* FROM clubs c
     LEFT JOIN club_memberships cm ON cm.club_id = c.id AND cm.user_id = $1 AND cm.role = 'president' AND cm.status = 'active'
     WHERE (c.lead_user_id = $1 OR cm.id IS NOT NULL) AND c.deleted_at IS NULL
     LIMIT 1`,
    [leadUserId]
  );
  if (!result.rowCount || result.rowCount === 0) throw new NotFoundError('Club');
  return result.rows[0];
}

// ── Lifecycle: Archive, Restore & Permanent Delete ────────────────────────────

/**
 * Archive a club.
 * Authorized via archive_club capability (Platform Admin or assigned Faculty Advisor).
 * Non-destructive: sets archived_at = now(), archived_by = callerId, is_active = FALSE.
 * All memberships, events, certificates, and historical records remain intact.
 */
export async function archiveClub(
  clubIdOrSlug: string,
  caller: { id: string; role: string }
) {
  const club = await getClubBySlug(clubIdOrSlug);
  if (club.archived_at) {
    throw new ConflictError('Club is already archived.');
  }

  await assertClubAction(caller, club.id as string, 'archive_club');

  const res = await query(
    `UPDATE clubs
     SET archived_at = now(),
         archived_by = $1,
         is_active = FALSE,
         updated_at = now()
     WHERE id = $2
     RETURNING *`,
    [caller.id, club.id]
  );

  return res.rows[0];
}

/**
 * Restore an archived club to active state.
 * Authorized via restore_club capability (Platform Admin or assigned Faculty Advisor).
 * Returns club to is_active = TRUE and clears archived_at/archived_by.
 */
export async function restoreClub(
  clubIdOrSlug: string,
  caller: { id: string; role: string }
) {
  const club = await getClubBySlug(clubIdOrSlug);
  if (!club.archived_at) {
    throw new ConflictError('Club is not currently archived.');
  }

  await assertClubAction(caller, club.id as string, 'restore_club');

  const res = await query(
    `UPDATE clubs
     SET archived_at = NULL,
         archived_by = NULL,
         is_active = TRUE,
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [club.id]
  );

  return res.rows[0];
}

/**
 * Permanently delete a club.
 * ADMIN ONLY.
 * Strong Safety Invariant: Target club MUST already be in ARCHIVED state.
 * Deleting active clubs directly is blocked to prevent catastrophic accidental deletion.
 * If confirmedName is provided, it must match club.name exactly.
 */
export async function permanentlyDeleteClub(
  clubIdOrSlug: string,
  caller: { id: string; role: string },
  confirmedName?: string
) {
  if (caller.role !== 'admin') {
    throw new ForbiddenError('Only platform administrators can permanently delete a club.');
  }

  const club = await getClubBySlug(clubIdOrSlug);

  // Safety Invariant: Club must be ARCHIVED before permanent deletion
  if (!club.archived_at) {
    throw new ConflictError('Club must be archived before it can be permanently deleted.');
  }

  if (confirmedName !== undefined && confirmedName.trim() !== club.name.trim()) {
    throw new ValidationError(`Confirmation name mismatch. Expected "${club.name}".`);
  }

  await withTransaction(async (client) => {
    // Delete club: club_memberships and club_faculty_advisors cascade automatically
    // events.club_id is SET TO NULL automatically by foreign key constraint,
    // preserving historical events, attendance, registrations, and certificates.
    await client.query('DELETE FROM clubs WHERE id = $1', [club.id]);
  });

  return { success: true, message: `Club "${club.name}" was permanently deleted.` };
}

// ── Registration ──────────────────────────────────────────────────────────────

/**
 * Submit a new club registration request.
 * Sets verification_status = 'pending' (requires admin approval).
 */
export async function registerClub(
  leadUserId: string,
  data: ClubRegisterInput
) {
  // Prevent duplicate names
  const existing = await query(
    'SELECT 1 FROM clubs WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL LIMIT 1',
    [data.name.trim()]
  );
  if (existing.rowCount && existing.rowCount > 0) {
    throw new ConflictError('A club with this name already exists.');
  }

  const slug = slugify(data.name);

  const result = await withTransaction(async (client) => {
    const club = await client.query(
      `INSERT INTO clubs
         (name, slug, lead_user_id, type, description, domain_tags, social_links, verification_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [
        data.name.trim(),
        slug,
        leadUserId,
        data.type,
        data.description ?? null,
        data.domain_tags ?? null,
        data.social_links ? JSON.stringify(data.social_links) : '{}',
      ]
    );

    // Auto-add the president as a 'president' member with posting_access = TRUE
    await client.query(
      `INSERT INTO club_memberships (club_id, user_id, role, posting_access)
       VALUES ($1, $2, 'president', TRUE)`,
      [club.rows[0].id, leadUserId]
    );

    return club.rows[0];
  });

  return result;
}

/**
 * Admin approves or rejects a pending club registration.
 */
export async function processClubRegistration(
  clubId: string,
  data: ClubRegistrationDecisionInput
) {
  const clubResult = await query(
    `SELECT id, verification_status FROM clubs WHERE id = $1 AND deleted_at IS NULL`,
    [clubId]
  );
  if (!clubResult.rowCount || clubResult.rowCount === 0) {
    throw new NotFoundError('Club registration');
  }

  const club = clubResult.rows[0] as { verification_status: string };
  if (club.verification_status !== 'pending') {
    throw new ValidationError('Only pending registrations can be approved or rejected.');
  }

  const newStatus = data.action === 'approve' ? 'approved' : 'rejected';

  await query(
    `UPDATE clubs
     SET verification_status = $1,
         rejection_reason = $2
     WHERE id = $3`,
    [newStatus, data.rejection_reason ?? null, clubId]
  );

  return { status: newStatus };
}

// ── Update ────────────────────────────────────────────────────────────────────

/** Update a club's profile. Platform Admin can modify both club and institutional fields. President can modify only club-managed fields. */
export async function updateClub(
  clubId: string,
  callerId: string,
  callerRole: string,
  data: ClubUpdateInput
) {
  await assertClubAction({ id: callerId, role: callerRole }, clubId, 'edit_club_profile');

  // Strict Field Governance: Check if non-admin is trying to modify institutional fields
  const institutionalFields = ['name', 'category', 'type', 'verification_status', 'is_active', 'lead_user_id'];
  const hasInstitutionalField = institutionalFields.some((f) => (data as any)[f] !== undefined);
  if (hasInstitutionalField && callerRole !== 'admin') {
    throw new ForbiddenError('Only platform administrators can modify institutional club metadata.');
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  // Club-Managed Fields
  if (data.description !== undefined) {
    updates.push(`description = $${idx++}`);
    values.push(data.description);
  }
  if (data.logo_url !== undefined) {
    updates.push(`logo_url = $${idx++}`);
    values.push(data.logo_url);
  }
  if (data.banner_url !== undefined) {
    updates.push(`banner_url = $${idx++}`);
    values.push(data.banner_url);
  }
  if (data.domain_tags !== undefined) {
    updates.push(`domain_tags = $${idx++}`);
    values.push(data.domain_tags);
  }
  if (data.social_links !== undefined) {
    updates.push(`social_links = $${idx++}::jsonb`);
    values.push(data.social_links ? JSON.stringify(data.social_links) : null);
  }
  if (data.visibility !== undefined) {
    updates.push(`visibility = $${idx++}`);
    values.push(data.visibility);
  }
  if (data.recruitment_open !== undefined) {
    updates.push(`recruitment_open = $${idx++}`);
    values.push(data.recruitment_open);
  }

  // Institutional Fields (Platform Admin Only)
  if (callerRole === 'admin') {
    if (data.name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(data.name.trim());
    }
    if (data.category !== undefined) {
      updates.push(`category = $${idx++}`);
      values.push(data.category);
    }
    if (data.type !== undefined) {
      updates.push(`type = $${idx++}`);
      values.push(data.type);
    }
    if (data.verification_status !== undefined) {
      updates.push(`verification_status = $${idx++}`);
      values.push(data.verification_status);
    }
    if (data.is_active !== undefined) {
      updates.push(`is_active = $${idx++}`);
      values.push(data.is_active);
    }
    if (data.lead_user_id !== undefined) {
      const leadUserId = data.lead_user_id === '' ? null : data.lead_user_id;
      updates.push(`lead_user_id = $${idx++}`);
      values.push(leadUserId);

      if (leadUserId) {
        // Demote existing president to member and appoint new user as president
        await query(
          `UPDATE club_memberships SET role = 'member' WHERE club_id = $1 AND role = 'president'`,
          [clubId]
        );
        await query(
          `INSERT INTO club_memberships (club_id, user_id, role, status, posting_access)
           VALUES ($1, $2, 'president', 'active', TRUE)
           ON CONFLICT (club_id, user_id) DO UPDATE SET role = 'president', status = 'active', posting_access = TRUE`,
          [clubId, leadUserId]
        );
      }
    }
  }

  if (updates.length === 0) {
    throw new ValidationError('No fields provided to update.');
  }

  updates.push(`updated_at = now()`);
  values.push(clubId);

  const result = await query(
    `UPDATE clubs SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  if (!result.rowCount || result.rowCount === 0) throw new NotFoundError('Club');
  return result.rows[0];
}

// ── Membership ────────────────────────────────────────────────────────────────

/** Return all active members of a club with their user + profile info, sorted by fixed position hierarchy. */
export async function getClubMembers(clubId: string) {
  const result = await query(
    `SELECT cm.id, cm.role, cm.posting_access, cm.status, cm.joined_at,
            u.id as user_id, u.username, u.avatar_url,
            p.full_name, p.department, p.year
     FROM club_memberships cm
     JOIN users u ON u.id = cm.user_id
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE cm.club_id = $1 AND cm.status = 'active'
     ORDER BY 
       CASE cm.role
         WHEN 'president' THEN 1
         WHEN 'vice_president' THEN 2
         WHEN 'secretary' THEN 3
         WHEN 'vice_secretary' THEN 4
         WHEN 'treasurer' THEN 5
         WHEN 'technical_lead' THEN 6
         WHEN 'outreach_lead' THEN 7
         ELSE 8
       END ASC,
       cm.joined_at ASC`,
    [clubId]
  );
  return result.rows;
}

/**
 * Invite / assign a student to a club position.
 * Authorized via manage_members capability.
 */
export async function inviteClubMember(
  clubId: string,
  callerId: string,
  callerRole: string,
  data: ClubMemberInviteInput
) {
  await assertClubAction({ id: callerId, role: callerRole }, clubId, 'manage_members');

  // Only Platform Admin can assign the President position
  if (data.role === 'president' && callerRole !== 'admin') {
    throw new ForbiddenError('Only platform administrators can appoint the Club President.');
  }

  // Find the user to invite
  const userResult = await query(
    'SELECT id FROM users WHERE username = $1 AND deleted_at IS NULL AND is_banned = FALSE',
    [data.username]
  );
  if (!userResult.rowCount || userResult.rowCount === 0) {
    throw new NotFoundError('User');
  }
  const inviteeId = (userResult.rows[0] as { id: string }).id;

  const postingAccess = data.posting_access !== undefined
    ? data.posting_access
    : ['president', 'vice_president', 'secretary', 'vice_secretary', 'technical_lead'].includes(data.role);

  await withTransaction(async (client) => {
    const existing = await client.query(
      'SELECT id FROM club_memberships WHERE club_id = $1 AND user_id = $2',
      [clubId, inviteeId]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      await client.query(
        `UPDATE club_memberships
         SET role = $1, posting_access = $2, status = 'active'
         WHERE club_id = $3 AND user_id = $4`,
        [data.role, postingAccess, clubId, inviteeId]
      );
    } else {
      await client.query(
        `INSERT INTO club_memberships (club_id, user_id, role, posting_access, status)
         VALUES ($1, $2, $3, $4, 'active')`,
        [clubId, inviteeId, data.role, postingAccess]
      );
      // Increment member_count
      await client.query(
        'UPDATE clubs SET member_count = member_count + 1 WHERE id = $1',
        [clubId]
      );
    }

    if (callerRole === 'admin' && data.role === 'president') {
      await client.query(
        `UPDATE club_memberships SET role = 'member' WHERE club_id = $1 AND role = 'president' AND user_id != $2`,
        [clubId, inviteeId]
      );
      await client.query('UPDATE clubs SET lead_user_id = $1, updated_at = now() WHERE id = $2', [inviteeId, clubId]);
    }
  });
}

/**
 * Update a club member's position or status.
 * Authorized via assign_positions capability.
 */
export async function updateClubMember(
  clubId: string,
  targetUserId: string,
  callerId: string,
  callerRole: string,
  data: ClubMemberUpdateInput
) {
  await assertClubAction({ id: callerId, role: callerRole }, clubId, 'assign_positions');

  // Check if assigning President position
  if (data.role === 'president' && callerRole !== 'admin') {
    throw new ForbiddenError('Only platform administrators can appoint the Club President.');
  }

  // Check if target is currently the President
  const clubRes = await query(`SELECT lead_user_id FROM clubs WHERE id = $1`, [clubId]);
  const currentLeadId = clubRes.rows[0]?.lead_user_id;
  if (currentLeadId === targetUserId && callerRole !== 'admin' && data.role && data.role !== 'president') {
    throw new ForbiddenError('Only platform administrators can demote or change the Club President.');
  }

  if (callerRole === 'admin' && data.role === 'president') {
    await query(
      `UPDATE club_memberships SET role = 'member' WHERE club_id = $1 AND role = 'president'`,
      [clubId]
    );
    await query(`UPDATE clubs SET lead_user_id = $1, updated_at = now() WHERE id = $2`, [targetUserId, clubId]);
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.role !== undefined) {
    updates.push(`role = $${idx++}`);
    values.push(data.role);

    // Automatically assign posting access for officer roles capable of creating events
    if (['president', 'vice_president', 'secretary', 'vice_secretary', 'technical_lead'].includes(data.role)) {
      if (data.posting_access === undefined) {
        updates.push(`posting_access = TRUE`);
      }
    } else if (data.role === 'member' && data.posting_access === undefined) {
      updates.push(`posting_access = FALSE`);
    }
  }
  if (data.posting_access !== undefined) {
    updates.push(`posting_access = $${idx++}`);
    values.push(data.posting_access);
  }
  if (data.status !== undefined) {
    updates.push(`status = $${idx++}`);
    values.push(data.status);
  }

  if (updates.length === 0) throw new ValidationError('No fields provided to update.');

  values.push(clubId, targetUserId);
  const res = await query(
    `UPDATE club_memberships SET ${updates.join(', ')}
     WHERE club_id = $${idx} AND user_id = $${idx + 1}
     RETURNING *`,
    values
  );
  if (!res.rowCount || res.rowCount === 0) {
    throw new NotFoundError('Club member');
  }
  return res.rows[0];
}

/** Remove a member from a club. Authorized via manage_members capability. */
export async function removeClubMember(
  clubId: string,
  targetUserId: string,
  callerId: string,
  callerRole: string
) {
  await assertClubAction({ id: callerId, role: callerRole }, clubId, 'manage_members');

  // Verify target is not the lead
  const clubRes = await query(`SELECT lead_user_id FROM clubs WHERE id = $1`, [clubId]);
  if (clubRes.rows[0]?.lead_user_id === targetUserId) {
    throw new ValidationError('The designated club President cannot be removed through member roster. Reassign President first.');
  }

  await withTransaction(async (client) => {
    const deleted = await client.query(
      'DELETE FROM club_memberships WHERE club_id = $1 AND user_id = $2',
      [clubId, targetUserId]
    );
    if (deleted.rowCount && deleted.rowCount > 0) {
      await client.query(
        'UPDATE clubs SET member_count = GREATEST(0, member_count - 1) WHERE id = $1',
        [clubId]
      );
    }
  });
}

// ── Faculty Advisors ──────────────────────────────────────────────────────────

/** Assign a faculty advisor to a club. (Admin only). */
export async function assignFacultyAdvisor(
  clubId: string,
  callerId: string,
  callerRole: string,
  data: ClubFacultyAssignInput
) {
  if (callerRole !== 'admin') {
    throw new ForbiddenError('Only platform administrators can assign faculty advisors.');
  }

  // Verify the faculty user exists and has the correct role
  const facultyResult = await query(
    `SELECT id FROM users WHERE id = $1 AND role = 'faculty' AND deleted_at IS NULL`,
    [data.faculty_id]
  );
  if (!facultyResult.rowCount || facultyResult.rowCount === 0) {
    throw new NotFoundError('Faculty user');
  }

  await query(
    `INSERT INTO club_faculty_advisors (club_id, faculty_id, is_hod)
     VALUES ($1, $2, $3)
     ON CONFLICT (club_id, faculty_id) DO UPDATE SET is_hod = EXCLUDED.is_hod`,
    [clubId, data.faculty_id, data.is_hod]
  );
}

/** Remove a faculty advisor from a club (admin only). */
export async function removeFacultyAdvisor(clubId: string, facultyId: string) {
  const result = await query(
    'DELETE FROM club_faculty_advisors WHERE club_id = $1 AND faculty_id = $2',
    [clubId, facultyId]
  );
  if (!result.rowCount || result.rowCount === 0) {
    throw new NotFoundError('Faculty advisor assignment');
  }
}

/** Return all assigned faculty advisors for a club with user profile metadata. */
export async function getClubFacultyAdvisors(clubId: string) {
  const result = await query(
    `SELECT cfa.id, cfa.club_id, cfa.faculty_id, cfa.is_hod, cfa.assigned_at,
            u.username, u.email, u.avatar_url,
            p.full_name, p.department
     FROM club_faculty_advisors cfa
     JOIN users u ON u.id = cfa.faculty_id
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE cfa.club_id = $1
     ORDER BY cfa.is_hod DESC, cfa.assigned_at ASC`,
    [clubId]
  );
  return result.rows;
}

// ── Notification Helper ────────────────────────────────────────────────────────

async function createClubNotification(opts: {
  userId: string;
  title: string;
  message: string;
  type?: string;
  linkUrl?: string;
}) {
  await query(
    `INSERT INTO notifications (user_id, title, message, type, link_url)
     VALUES ($1, $2, $3, $4, $5)`,
    [opts.userId, opts.title, opts.message, opts.type || 'club_application', opts.linkUrl || null]
  );
}

// ── Recruitment & Membership Applications ─────────────────────────────────────

/** Return all active approved clubs where the user is an active member. */
export async function getMyJoinedClubs(userId: string) {
  return listApprovedClubs({ joinedUserId: userId });
}

/**
 * Submit a student membership application for an eligible active club.
 * Gated by: club active & approved, not archived, visibility != invite_only, recruitment_open = true,
 * user not already active member, user has no existing pending application.
 */
export async function applyToClub(
  clubSlugOrId: string,
  applicant: { id: string; role: string; username?: string },
  input: ClubMembershipApplyInput
) {
  if (!applicant || !applicant.id) {
    throw new ForbiddenError('Authentication required to submit membership application.');
  }

  const club = await getClubBySlug(clubSlugOrId);

  // Gating 1: Club lifecycle & approval
  if (club.deleted_at || club.archived_at || !club.is_active || club.verification_status !== 'approved') {
    throw new ConflictError('Cannot apply to an archived, inactive, or unapproved club.');
  }

  // Gating 2: Visibility / Access policy
  if (club.visibility === 'invite_only') {
    throw new ForbiddenError('This club is invite-only and does not accept public membership applications.');
  }

  // Gating 3: Recruitment window
  if (!club.recruitment_open) {
    throw new ConflictError('Recruitment is currently closed for this club.');
  }

  // Gating 4: Already active member
  const memberCheck = await query(
    `SELECT 1 FROM club_memberships
     WHERE club_id = $1 AND user_id = $2 AND status = 'active'
     LIMIT 1`,
    [club.id, applicant.id]
  );
  if ((memberCheck.rowCount ?? 0) > 0) {
    throw new ConflictError('You are already an active member of this club.');
  }

  // Gating 5: Existing pending application
  const pendingCheck = await query(
    `SELECT 1 FROM club_membership_applications
     WHERE club_id = $1 AND user_id = $2 AND status = 'pending'
     LIMIT 1`,
    [club.id, applicant.id]
  );
  if ((pendingCheck.rowCount ?? 0) > 0) {
    throw new ConflictError('You already have a pending membership application for this club.');
  }

  // Insert application
  const appResult = await query(
    `INSERT INTO club_membership_applications
       (club_id, user_id, motivation, interests, experience, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING *`,
    [
      club.id,
      applicant.id,
      input.motivation.trim(),
      input.interests || [],
      input.experience ? input.experience.trim() : null,
    ]
  );
  const application = appResult.rows[0];

  // Send idempotent confirmation notification to applicant
  await createClubNotification({
    userId: applicant.id,
    title: 'Application Submitted',
    message: `Your membership application for "${club.name}" has been received and is pending leadership review.`,
    type: 'club_application',
    linkUrl: `/dashboard/clubs/${club.slug || club.id}`,
  });

  // Notify Club President / Lead user if assigned
  if (club.lead_user_id && club.lead_user_id !== applicant.id) {
    await createClubNotification({
      userId: club.lead_user_id,
      title: 'New Membership Application',
      message: `${applicant.username ? `@${applicant.username}` : 'A student'} submitted an application to join ${club.name}.`,
      type: 'club_application',
      linkUrl: `/dashboard/clubs/${club.slug || club.id}/manage`,
    });
  }

  return application;
}

/**
 * Fetch club membership applications.
 * - Platform Admin or President: can view all applications for this club (with applicant academic profiles).
 * - Regular student/member: can view ONLY their own applications for this club.
 */
export async function getClubApplications(
  clubSlugOrId: string,
  caller: { id: string; role: string },
  statusFilter?: string
) {
  const club = await getClubBySlug(clubSlugOrId);

  // Check if caller is Platform Admin or President of this club
  let isPresident = false;
  if (caller.role === 'admin') {
    isPresident = true;
  } else {
    if (club.lead_user_id === caller.id) {
      isPresident = true;
    } else {
      const presCheck = await query(
        `SELECT 1 FROM club_memberships
         WHERE club_id = $1 AND user_id = $2 AND role = 'president' AND status = 'active'
         LIMIT 1`,
        [club.id, caller.id]
      );
      if ((presCheck.rowCount ?? 0) > 0) isPresident = true;
    }
  }

  if (isPresident) {
    // Return all club applications with applicant profile info
    const params: any[] = [club.id];
    let sql = `
      SELECT cma.*,
             u.username, u.email, u.avatar_url,
             p.full_name, p.year, p.department, p.roll_number,
             r.username as reviewer_username,
             rp.full_name as reviewer_name
      FROM club_membership_applications cma
      JOIN users u ON u.id = cma.user_id
      LEFT JOIN profiles p ON p.user_id = u.id
      LEFT JOIN users r ON r.id = cma.reviewer_id
      LEFT JOIN profiles rp ON rp.user_id = r.id
      WHERE cma.club_id = $1
    `;
    if (statusFilter && ['pending', 'approved', 'rejected'].includes(statusFilter)) {
      params.push(statusFilter);
      sql += ` AND cma.status = $${params.length}`;
    }
    sql += ` ORDER BY cma.created_at DESC`;

    const res = await query(sql, params);
    return res.rows;
  }

  // Regular caller: return ONLY their own applications for this club
  const res = await query(
    `SELECT cma.*,
            u.username, u.email, u.avatar_url,
            p.full_name, p.year, p.department,
            r.username as reviewer_username,
            rp.full_name as reviewer_name
     FROM club_membership_applications cma
     JOIN users u ON u.id = cma.user_id
     LEFT JOIN profiles p ON p.user_id = u.id
     LEFT JOIN users r ON r.id = cma.reviewer_id
     LEFT JOIN profiles rp ON rp.user_id = r.id
     WHERE cma.club_id = $1 AND cma.user_id = $2
     ORDER BY cma.created_at DESC`,
    [club.id, caller.id]
  );
  return res.rows;
}

/**
 * Return a student's latest application status for a specific club.
 */
export async function getStudentApplicationForClub(clubId: string, userId: string) {
  const res = await query(
    `SELECT cma.*, r.username as reviewer_username
     FROM club_membership_applications cma
     LEFT JOIN users r ON r.id = cma.reviewer_id
     WHERE cma.club_id = $1 AND cma.user_id = $2
     ORDER BY cma.created_at DESC
     LIMIT 1`,
    [clubId, userId]
  );
  return res.rows[0] || null;
}

/**
 * Review and decide a club membership application (Approve / Reject).
 * AUTHORIZATION: Platform Admin or Club President only.
 * - On 'approved': transitions application status to approved, inserts/reactivates active membership as 'member',
 *   posting_access = FALSE, increments member_count, sends welcome notification.
 * - On 'rejected': transitions application status to rejected, records rejection reason, sends update notification.
 */
export async function decideClubApplication(
  clubSlugOrId: string,
  applicationId: string,
  caller: { id: string; role: string },
  decision: ClubApplicationDecisionInput
) {
  const club = await getClubBySlug(clubSlugOrId);

  // Verify President or Platform Admin authority
  let isAuthorized = false;
  if (caller.role === 'admin') {
    isAuthorized = true;
  } else {
    if (club.lead_user_id === caller.id) {
      isAuthorized = true;
    } else {
      const presCheck = await query(
        `SELECT 1 FROM club_memberships
         WHERE club_id = $1 AND user_id = $2 AND role = 'president' AND status = 'active'
         LIMIT 1`,
        [club.id, caller.id]
      );
      if ((presCheck.rowCount ?? 0) > 0) isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    throw new ForbiddenError('Only the Club President or platform administrator can review recruitment applications.');
  }

  // Fetch the application
  const appRes = await query(
    `SELECT * FROM club_membership_applications
     WHERE id = $1 AND club_id = $2`,
    [applicationId, club.id]
  );
  if (!appRes.rowCount || appRes.rowCount === 0) {
    throw new NotFoundError('Membership application');
  }
  const application = appRes.rows[0];

  if (application.status !== 'pending') {
    throw new ConflictError('This application has already been decided.');
  }

  if (application.user_id === caller.id) {
    throw new ForbiddenError('You cannot review or decide your own membership application.');
  }

  return withTransaction(async (client) => {
    if (decision.status === 'approved') {
      // 1. Update application status
      const updatedApp = await client.query(
        `UPDATE club_membership_applications
         SET status = 'approved',
             reviewer_id = $1,
             reviewed_at = now(),
             updated_at = now()
         WHERE id = $2
         RETURNING *`,
        [caller.id, applicationId]
      );

      // 2. Insert or reactivate membership: Always onboard as 'member' with posting_access = FALSE
      await client.query(
        `INSERT INTO club_memberships (club_id, user_id, role, status, posting_access, joined_at)
         VALUES ($1, $2, 'member', 'active', FALSE, now())
         ON CONFLICT (club_id, user_id)
         DO UPDATE SET role = 'member', status = 'active', posting_access = FALSE, joined_at = now()`,
        [club.id, application.user_id]
      );

      // 3. Update club member count
      await client.query(
        `UPDATE clubs
         SET member_count = (SELECT COUNT(*) FROM club_memberships WHERE club_id = $1 AND status = 'active'),
             updated_at = now()
         WHERE id = $1`,
        [club.id]
      );

      // 4. Send approval notification to applicant
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, link_url)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          application.user_id,
          `Welcome to ${club.name}! 🎉`,
          `Your membership application has been approved! You are now an active member of ${club.name}.`,
          'club_application',
          `/dashboard/clubs/${club.slug || club.id}`,
        ]
      );

      return updatedApp.rows[0];
    } else {
      // Rejection
      const updatedApp = await client.query(
        `UPDATE club_membership_applications
         SET status = 'rejected',
             reviewer_id = $1,
             reviewed_at = now(),
             rejection_reason = $2,
             updated_at = now()
         WHERE id = $3
         RETURNING *`,
        [caller.id, decision.rejection_reason ? decision.rejection_reason.trim() : null, applicationId]
      );

      // Send rejection notification to applicant
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, link_url)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          application.user_id,
          'Application Update',
          `Your application to join ${club.name} was not approved.${decision.rejection_reason ? ` Reason: ${decision.rejection_reason}` : ''}`,
          'club_application',
          `/dashboard/clubs/${club.slug || club.id}`,
        ]
      );

      return updatedApp.rows[0];
    }
  });
}


