/**
 * lib/services/admin.service.ts
 *
 * Operational Admin Backbone Service for CampusGrid.
 * Supports Club CRUD, Event Operations, User Role Assignment, and Certificate Management.
 */

import { query } from '@/lib/db/client';
import { NotFoundError } from '@/lib/errors';

// ── 1. Operational Dashboard Overview ────────────────────────────────────────

export async function getAdminDashboardOverview() {
  const [
    clubsCountRes,
    eventsCountRes,
    pendingEventsRes,
    eventsTodayRes,
    usersCountRes,
    certificatesCountRes,
    recentEventsRes
  ] = await Promise.all([
    query(`SELECT COUNT(*) FROM clubs WHERE deleted_at IS NULL`),
    query(`SELECT COUNT(*) FROM events WHERE deleted_at IS NULL`),
    query(`SELECT COUNT(*) FROM events WHERE status IN ('draft', 'pending_faculty', 'pending_admin') AND deleted_at IS NULL`),
    query(`SELECT COUNT(*) FROM events WHERE COALESCE(start_time, event_date)::date = CURRENT_DATE AND deleted_at IS NULL`),
    query(`SELECT COUNT(*) FROM users WHERE deleted_at IS NULL`),
    query(`SELECT COUNT(*) FROM certificates`),
    query(`SELECT id, title, status, created_at, COALESCE(start_time, event_date) as start_time FROM events WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 5`)
  ]);

  return {
    total_clubs: parseInt(clubsCountRes.rows[0]?.count || '0', 10),
    total_events: parseInt(eventsCountRes.rows[0]?.count || '0', 10),
    pending_events: parseInt(pendingEventsRes.rows[0]?.count || '0', 10),
    events_today: parseInt(eventsTodayRes.rows[0]?.count || '0', 10),
    total_users: parseInt(usersCountRes.rows[0]?.count || '0', 10),
    total_certificates: parseInt(certificatesCountRes.rows[0]?.count || '0', 10),
    recent_events: recentEventsRes.rows
  };
}

// ── 2. Club Operations ───────────────────────────────────────────────────────

export async function getAllClubsAdmin(search?: string, category?: string, status?: 'active' | 'archived' | 'all') {
  let sql = `
    SELECT c.id, c.name, c.slug, c.description, c.category, c.type, c.logo_url, c.banner_url,
           c.is_active, c.archived_at, c.created_at, c.updated_at,
           (SELECT COUNT(*) FROM club_memberships cm WHERE cm.club_id = c.id AND cm.status = 'active') as member_count,
           (SELECT COUNT(*) FROM events e WHERE e.club_id = c.id) as event_count,
           (SELECT u.username FROM club_memberships cm JOIN users u ON u.id = cm.user_id WHERE cm.club_id = c.id AND cm.role = 'president' LIMIT 1) as lead_username,
           (SELECT p.full_name FROM club_memberships cm JOIN users u ON u.id = cm.user_id LEFT JOIN profiles p ON p.user_id = u.id WHERE cm.club_id = c.id AND cm.role = 'president' LIMIT 1) as lead_full_name,
           COALESCE((SELECT u.id FROM club_memberships cm JOIN users u ON u.id = cm.user_id WHERE cm.club_id = c.id AND cm.role = 'president' LIMIT 1), c.lead_user_id) as lead_user_id,
           (SELECT u_arch.username FROM users u_arch WHERE u_arch.id = c.archived_by) as archived_by_username
    FROM clubs c
    WHERE c.deleted_at IS NULL
  `;
  const params: any[] = [];

  if (status === 'active') {
    sql += ` AND c.archived_at IS NULL AND c.is_active = TRUE`;
  } else if (status === 'archived') {
    sql += ` AND c.archived_at IS NOT NULL`;
  }

  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (c.name ILIKE $${params.length} OR c.slug ILIKE $${params.length})`;
  }

  if (category) {
    params.push(category);
    sql += ` AND c.category = $${params.length}`;
  }

  sql += ` ORDER BY COALESCE(c.archived_at, c.created_at) DESC`;

  const res = await query(sql, params);
  return res.rows;
}

export async function createClubAdmin(input: {
  name: string;
  slug?: string | null;
  description?: string | null;
  type?: string | null;
  category?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  domain_tags?: string[];
  social_links?: Record<string, any>;
  visibility?: 'public' | 'campus_only' | 'invite_only';
  recruitment_open?: boolean;
  lead_user_id?: string | null;
}) {
  const generatedSlug = (input.slug || input.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);

  const categoryValue = input.category || input.type || 'Technical';
  const typeValue = input.type || input.category || 'Technical';
  const domainTags = Array.isArray(input.domain_tags) ? input.domain_tags : [];
  const socialLinks = input.social_links && typeof input.social_links === 'object' ? JSON.stringify(input.social_links) : '{}';
  const visibilityValue = input.visibility || 'public';
  const recruitmentOpen = input.recruitment_open !== undefined ? input.recruitment_open : false;
  const leadUserId = input.lead_user_id && input.lead_user_id.trim() ? input.lead_user_id : null;

  const res = await query(
    `INSERT INTO clubs (
       name, slug, description, type, category, logo_url, banner_url,
       domain_tags, social_links, visibility, recruitment_open, is_active,
       lead_user_id, member_count, verification_status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, TRUE, $12, $13, 'approved')
     RETURNING *`,
    [
      input.name.trim(),
      generatedSlug,
      input.description || null,
      typeValue,
      categoryValue,
      input.logo_url || null,
      input.banner_url || null,
      domainTags,
      socialLinks,
      visibilityValue,
      recruitmentOpen,
      leadUserId,
      leadUserId ? 1 : 0
    ]
  );

  const club = res.rows[0];

  // Assign Club President if provided
  if (leadUserId) {
    await query(
      `INSERT INTO club_memberships (club_id, user_id, role, status, posting_access)
       VALUES ($1, $2, 'president', 'active', TRUE)
       ON CONFLICT (club_id, user_id) DO UPDATE SET role = 'president', status = 'active', posting_access = TRUE`,
      [club.id, leadUserId]
    );
  }

  const details = await query(
    `SELECT c.id, c.name, c.slug, c.description, c.type, c.category, c.logo_url, c.banner_url,
            c.domain_tags, c.social_links, c.visibility, c.recruitment_open, c.is_active,
            c.verification_status, c.created_at, c.updated_at,
            (SELECT COUNT(*) FROM club_memberships cm WHERE cm.club_id = c.id AND cm.status = 'active') as member_count,
            (SELECT u.username FROM club_memberships cm JOIN users u ON u.id = cm.user_id WHERE cm.club_id = c.id AND cm.role = 'president' LIMIT 1) as lead_username,
            (SELECT p.full_name FROM club_memberships cm JOIN users u ON u.id = cm.user_id LEFT JOIN profiles p ON p.user_id = u.id WHERE cm.club_id = c.id AND cm.role = 'president' LIMIT 1) as lead_full_name,
            COALESCE((SELECT u.id FROM club_memberships cm JOIN users u ON u.id = cm.user_id WHERE cm.club_id = c.id AND cm.role = 'president' LIMIT 1), c.lead_user_id) as lead_user_id
     FROM clubs c
     WHERE c.id = $1`,
    [club.id]
  );

  return details.rows[0] || club;
}

export async function updateClubAdmin(clubId: string, input: {
  name?: string;
  slug?: string;
  type?: string;
  category?: string;
  description?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  domain_tags?: string[];
  social_links?: Record<string, any>;
  visibility?: 'public' | 'campus_only' | 'invite_only';
  recruitment_open?: boolean;
  is_active?: boolean;
  lead_user_id?: string | null;
}) {
  const existing = await query(`SELECT id FROM clubs WHERE id = $1 AND deleted_at IS NULL`, [clubId]);
  if (!existing.rowCount || existing.rowCount === 0) {
    throw new NotFoundError('Club');
  }

  const updates: string[] = [];
  const values: any[] = [];
  let paramIdx = 1;

  if (input.name !== undefined) {
    updates.push(`name = $${paramIdx++}`);
    values.push(input.name.trim());
  }
  if (input.slug !== undefined) {
    updates.push(`slug = $${paramIdx++}`);
    values.push(input.slug.trim());
  }
  if (input.type !== undefined) {
    updates.push(`type = $${paramIdx++}`);
    values.push(input.type);
  }
  if (input.category !== undefined) {
    updates.push(`category = $${paramIdx++}`);
    values.push(input.category);
  }
  if (input.description !== undefined) {
    updates.push(`description = $${paramIdx++}`);
    values.push(input.description);
  }
  if (input.logo_url !== undefined) {
    updates.push(`logo_url = $${paramIdx++}`);
    values.push(input.logo_url);
  }
  if (input.banner_url !== undefined) {
    updates.push(`banner_url = $${paramIdx++}`);
    values.push(input.banner_url);
  }
  if (input.domain_tags !== undefined) {
    updates.push(`domain_tags = $${paramIdx++}`);
    values.push(input.domain_tags);
  }
  if (input.social_links !== undefined) {
    updates.push(`social_links = $${paramIdx++}::jsonb`);
    values.push(JSON.stringify(input.social_links));
  }
  if (input.visibility !== undefined) {
    updates.push(`visibility = $${paramIdx++}`);
    values.push(input.visibility);
  }
  if (input.recruitment_open !== undefined) {
    updates.push(`recruitment_open = $${paramIdx++}`);
    values.push(input.recruitment_open);
  }
  if (input.is_active !== undefined) {
    updates.push(`is_active = $${paramIdx++}`);
    values.push(input.is_active);
  }

  const leadUserId = input.lead_user_id ? input.lead_user_id : (input.lead_user_id === '' ? null : undefined);
  if (leadUserId !== undefined) {
    updates.push(`lead_user_id = $${paramIdx++}`);
    values.push(leadUserId);
  }

  updates.push(`updated_at = now()`);

  values.push(clubId);
  await query(
    `UPDATE clubs
     SET ${updates.join(', ')}
     WHERE id = $${paramIdx}`,
    values
  );

  if (leadUserId) {
    // Reset existing presidents for this club
    await query(`UPDATE club_memberships SET role = 'member' WHERE club_id = $1 AND role = 'president'`, [clubId]);
    await query(
      `INSERT INTO club_memberships (club_id, user_id, role, status, posting_access)
       VALUES ($1, $2, 'president', 'active', TRUE)
       ON CONFLICT (club_id, user_id) DO UPDATE SET role = 'president', status = 'active', posting_access = TRUE`,
      [clubId, leadUserId]
    );
  }

  const updated = await query(
    `SELECT c.id, c.name, c.slug, c.description, c.type, c.category, c.logo_url, c.banner_url,
            c.domain_tags, c.social_links, c.visibility, c.recruitment_open, c.is_active,
            c.verification_status, c.created_at, c.updated_at,
            (SELECT COUNT(*) FROM club_memberships cm WHERE cm.club_id = c.id AND cm.status = 'active') as member_count,
            (SELECT u.username FROM club_memberships cm JOIN users u ON u.id = cm.user_id WHERE cm.club_id = c.id AND cm.role = 'president' LIMIT 1) as lead_username,
            (SELECT p.full_name FROM club_memberships cm JOIN users u ON u.id = cm.user_id LEFT JOIN profiles p ON p.user_id = u.id WHERE cm.club_id = c.id AND cm.role = 'president' LIMIT 1) as lead_full_name,
            COALESCE((SELECT u.id FROM club_memberships cm JOIN users u ON u.id = cm.user_id WHERE cm.club_id = c.id AND cm.role = 'president' LIMIT 1), c.lead_user_id) as lead_user_id
     FROM clubs c
     WHERE c.id = $1`,
    [clubId]
  );

  return updated.rows[0];
}

export async function archiveClubAdmin(clubId: string, adminUserId?: string) {
  await query(
    `UPDATE clubs
     SET archived_at = now(),
         archived_by = COALESCE($1, archived_by),
         is_active = FALSE,
         updated_at = now()
     WHERE id = $2`,
    [adminUserId || null, clubId]
  );
  return { success: true };
}

// ── 3. Event Operations ──────────────────────────────────────────────────────

export async function getAllEventsAdmin(status?: string, search?: string) {
  let sql = `
    SELECT e.id, e.title, e.description, e.event_type, e.status, COALESCE(e.start_time, e.event_date) as start_time, e.end_time,
           e.venue, e.capacity, e.created_at, e.published_at, c.name as club_name, c.slug as club_slug,
           (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id AND er.status IN ('registered', 'attended')) as registration_count
    FROM events e
    LEFT JOIN clubs c ON c.id = e.club_id
    WHERE e.deleted_at IS NULL
  `;
  const params: any[] = [];

  if (status) {
    params.push(status);
    sql += ` AND e.status = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    sql += ` AND e.title ILIKE $${params.length}`;
  }

  sql += ` ORDER BY e.created_at DESC`;

  const res = await query(sql, params);
  return res.rows;
}

export async function updateEventStatusAdmin(eventId: string, status: 'draft' | 'published' | 'cancelled' | 'completed' | 'archived') {
  const existing = await query(`SELECT id, title FROM events WHERE id = $1 AND deleted_at IS NULL`, [eventId]);
  if (!existing.rowCount) throw new NotFoundError('Event not found.');

  if (status === 'archived') {
    await query(`UPDATE events SET deleted_at = now(), status = 'archived' WHERE id = $1`, [eventId]);
  } else {
    const publishedAt = status === 'published' ? 'now()' : 'published_at';
    await query(`UPDATE events SET status = $1, published_at = ${publishedAt}, updated_at = now() WHERE id = $2`, [status, eventId]);
  }

  return { success: true, status };
}

// ── 4. User Operations ───────────────────────────────────────────────────────

export async function getAllUsersAdmin(search?: string, role?: string) {
  let sql = `
    SELECT u.id, u.email, u.username, u.role, u.is_onboarded, u.created_at, p.full_name, p.department, p.year, p.roll_number,
           (SELECT COUNT(*) FROM event_registrations er WHERE er.user_id = u.id) as registrations_count
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE u.deleted_at IS NULL
  `;
  const params: any[] = [];

  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (u.username ILIKE $${params.length} OR u.email ILIKE $${params.length} OR p.full_name ILIKE $${params.length})`;
  }

  if (role) {
    params.push(role);
    sql += ` AND u.role = $${params.length}`;
  }

  sql += ` ORDER BY u.created_at DESC`;

  const res = await query(sql, params);
  return res.rows;
}

export async function updateUserRoleAdmin(userId: string, newRole: 'student' | 'faculty' | 'admin' | 'alumni') {
  const res = await query(`UPDATE users SET role = $1, updated_at = now() WHERE id = $2 RETURNING id, username, role`, [newRole, userId]);
  if (!res.rowCount) throw new NotFoundError('User not found.');
  return res.rows[0];
}

// ── 5. Certificate Management ───────────────────────────────────────────────

export async function getAllCertificatesAdmin() {
  const res = await query(
    `SELECT c.id, c.certificate_type, c.verification_token, c.issued_at,
            u.username, p.full_name, e.title as event_title, cl.name as club_name
     FROM certificates c
     JOIN users u ON u.id = c.user_id
     LEFT JOIN profiles p ON p.user_id = u.id
     LEFT JOIN events e ON e.id = c.event_id
     LEFT JOIN clubs cl ON cl.id = e.club_id
     ORDER BY c.issued_at DESC`
  );
  return res.rows.map((c) => ({
    ...c,
    title: c.certificate_type
      ? `Certificate of ${c.certificate_type.charAt(0).toUpperCase() + c.certificate_type.slice(1).replace('_', ' ')}`
      : 'Certificate of Participation',
  }));
}
