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
import type {
  ClubRegisterInput,
  ClubRegistrationDecisionInput,
  ClubUpdateInput,
  ClubMemberInviteInput,
  ClubMemberUpdateInput,
  ClubFacultyAssignInput,
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

/** Return all approved clubs, ordered by featured first then name. */
export async function listApprovedClubs() {
  const result = await query(
    `SELECT id, name, slug, type, description, logo_url, banner_url,
            domain_tags, visibility, featured, recruitment_open, member_count,
            created_at
     FROM clubs
     WHERE verification_status = 'approved'
       AND deleted_at IS NULL
     ORDER BY featured DESC, name ASC`
  );
  return result.rows;
}

/** Return a single approved club by slug, including its lead user info. */
export async function getClubBySlug(slug: string) {
  const result = await query(
    `SELECT c.*, u.username as lead_username,
            p.full_name as lead_full_name, u.avatar_url as lead_avatar_url
     FROM clubs c
     JOIN users u ON u.id = c.lead_user_id
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE c.slug = $1
       AND c.verification_status = 'approved'
       AND c.deleted_at IS NULL`,
    [slug]
  );
  if (!result.rowCount || result.rowCount === 0) throw new NotFoundError('Club');
  return result.rows[0];
}

/** Return the club led by a specific user (used for /clubs/me). */
export async function getClubByLeadUser(leadUserId: string) {
  const result = await query(
    `SELECT * FROM clubs
     WHERE lead_user_id = $1 AND deleted_at IS NULL
     LIMIT 1`,
    [leadUserId]
  );
  if (!result.rowCount || result.rowCount === 0) throw new NotFoundError('Club');
  return result.rows[0];
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
  const nameCheck = await query(
    'SELECT 1 FROM clubs WHERE name ILIKE $1 AND deleted_at IS NULL LIMIT 1',
    [data.name]
  );
  if (nameCheck.rowCount && nameCheck.rowCount > 0) {
    throw new ConflictError('A club with this name already exists.');
  }

  const slug = await ensureUniqueSlug(slugify(data.name));

  const result = await withTransaction(async (client) => {
    const club = await client.query(
      `INSERT INTO clubs
         (name, slug, lead_user_id, type, description, domain_tags, social_links)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.name,
        slug,
        leadUserId,
        data.type,
        data.description ?? null,
        data.domain_tags ?? null,
        data.social_links ? JSON.stringify(data.social_links) : '{}',
      ]
    );

    // Auto-add the lead as a 'lead' member with posting_access = TRUE
    await client.query(
      `INSERT INTO club_memberships (club_id, user_id, role, posting_access)
       VALUES ($1, $2, 'lead', TRUE)`,
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

/** Update a club's public-facing fields. Only club lead or admin may call this. */
export async function updateClub(
  clubId: string,
  callerId: string,
  callerRole: string,
  data: ClubUpdateInput
) {
  const clubResult = await query(
    'SELECT lead_user_id FROM clubs WHERE id = $1 AND deleted_at IS NULL',
    [clubId]
  );
  if (!clubResult.rowCount || clubResult.rowCount === 0) throw new NotFoundError('Club');

  const { lead_user_id } = clubResult.rows[0] as { lead_user_id: string };
  if (callerRole !== 'admin' && lead_user_id !== callerId) {
    throw new ForbiddenError('Only the club lead or an admin can update this club.');
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const fields: Record<string, unknown> = data;
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      updates.push(`${key} = $${idx}`);
      values.push(typeof value === 'object' ? JSON.stringify(value) : value);
      idx++;
    }
  }

  if (updates.length === 0) {
    throw new ValidationError('No fields provided to update.');
  }

  values.push(clubId);
  const result = await query(
    `UPDATE clubs SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0];
}

// ── Membership ────────────────────────────────────────────────────────────────

/** Return all active members of a club with their user + profile info. */
export async function getClubMembers(clubId: string) {
  const result = await query(
    `SELECT cm.id, cm.role, cm.posting_access, cm.status, cm.joined_at,
            u.id as user_id, u.username, u.avatar_url,
            p.full_name, p.department, p.year
     FROM club_memberships cm
     JOIN users u ON u.id = cm.user_id
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE cm.club_id = $1 AND cm.status = 'active'
     ORDER BY cm.role DESC, cm.joined_at ASC`,
    [clubId]
  );
  return result.rows;
}

/**
 * Invite a user to a club by username.
 * Only the club lead may call this. User must exist and not already be a member.
 */
export async function inviteClubMember(
  clubId: string,
  leadUserId: string,
  data: ClubMemberInviteInput
) {
  // Verify caller is the lead
  const clubResult = await query(
    'SELECT lead_user_id FROM clubs WHERE id = $1 AND deleted_at IS NULL',
    [clubId]
  );
  if (!clubResult.rowCount || clubResult.rowCount === 0) throw new NotFoundError('Club');

  const { lead_user_id } = clubResult.rows[0] as { lead_user_id: string };
  if (lead_user_id !== leadUserId) {
    throw new ForbiddenError('Only the club lead can invite members.');
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

  // Check for existing membership
  const existing = await query(
    'SELECT 1 FROM club_memberships WHERE club_id = $1 AND user_id = $2 LIMIT 1',
    [clubId, inviteeId]
  );
  if (existing.rowCount && existing.rowCount > 0) {
    throw new ConflictError('User is already a member of this club.');
  }

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO club_memberships (club_id, user_id, role, posting_access)
       VALUES ($1, $2, $3, $4)`,
      [clubId, inviteeId, data.role, data.posting_access]
    );
    // Increment member_count
    await client.query(
      'UPDATE clubs SET member_count = member_count + 1 WHERE id = $1',
      [clubId]
    );
  });
}

/**
 * Update a club member's role, posting access, or status.
 */
export async function updateClubMember(
  clubId: string,
  targetUserId: string,
  leadUserId: string,
  data: ClubMemberUpdateInput
) {
  const clubResult = await query(
    'SELECT lead_user_id FROM clubs WHERE id = $1 AND deleted_at IS NULL',
    [clubId]
  );
  if (!clubResult.rowCount || clubResult.rowCount === 0) throw new NotFoundError('Club');

  const { lead_user_id } = clubResult.rows[0] as { lead_user_id: string };
  if (lead_user_id !== leadUserId) {
    throw new ForbiddenError('Only the club lead can update member roles.');
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.role !== undefined) { updates.push(`role = $${idx++}`); values.push(data.role); }
  if (data.posting_access !== undefined) { updates.push(`posting_access = $${idx++}`); values.push(data.posting_access); }
  if (data.status !== undefined) { updates.push(`status = $${idx++}`); values.push(data.status); }

  if (updates.length === 0) throw new ValidationError('No fields provided to update.');

  values.push(clubId, targetUserId);
  await query(
    `UPDATE club_memberships SET ${updates.join(', ')}
     WHERE club_id = $${idx} AND user_id = $${idx + 1}`,
    values
  );
}

/** Remove a member from a club. */
export async function removeClubMember(
  clubId: string,
  targetUserId: string,
  leadUserId: string
) {
  const clubResult = await query(
    'SELECT lead_user_id FROM clubs WHERE id = $1 AND deleted_at IS NULL',
    [clubId]
  );
  if (!clubResult.rowCount || clubResult.rowCount === 0) throw new NotFoundError('Club');

  const { lead_user_id } = clubResult.rows[0] as { lead_user_id: string };
  if (lead_user_id !== leadUserId) {
    throw new ForbiddenError('Only the club lead can remove members.');
  }

  if (targetUserId === leadUserId) {
    throw new ValidationError('The club lead cannot remove themselves.');
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

/** Assign a faculty advisor to a club. Admin or Club Lead may call this. */
export async function assignFacultyAdvisor(
  clubId: string,
  callerId: string,
  callerRole: string,
  data: ClubFacultyAssignInput
) {
  if (callerRole !== 'admin') {
    const clubResult = await query(
      'SELECT lead_user_id FROM clubs WHERE id = $1 AND deleted_at IS NULL',
      [clubId]
    );
    if (!clubResult.rowCount || clubResult.rowCount === 0) throw new NotFoundError('Club');
    const { lead_user_id } = clubResult.rows[0] as { lead_user_id: string };
    if (lead_user_id !== callerId) {
      throw new ForbiddenError('Only the club lead or an admin can assign faculty advisors.');
    }
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
