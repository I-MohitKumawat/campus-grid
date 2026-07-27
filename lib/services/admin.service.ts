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
    query(`SELECT COUNT(*) FROM events WHERE status IN ('draft', 'submitted', 'pending_approval') AND deleted_at IS NULL`),
    query(`SELECT COUNT(*) FROM events WHERE start_time::date = CURRENT_DATE AND deleted_at IS NULL`),
    query(`SELECT COUNT(*) FROM users WHERE deleted_at IS NULL`),
    query(`SELECT COUNT(*) FROM certificates`),
    query(`SELECT id, title, status, created_at, start_time FROM events WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 5`)
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

export async function getAllClubsAdmin(search?: string, category?: string) {
  let sql = `
    SELECT c.id, c.name, c.slug, c.description, c.category, c.logo_url, c.is_active, c.created_at,
           (SELECT COUNT(*) FROM club_memberships cm WHERE cm.club_id = c.id AND cm.status = 'active') as member_count,
           (SELECT u.username FROM club_memberships cm JOIN users u ON u.id = cm.user_id WHERE cm.club_id = c.id AND cm.role = 'lead' LIMIT 1) as lead_username,
           (SELECT u.id FROM club_memberships cm JOIN users u ON u.id = cm.user_id WHERE cm.club_id = c.id AND cm.role = 'lead' LIMIT 1) as lead_user_id
    FROM clubs c
    WHERE c.deleted_at IS NULL
  `;
  const params: any[] = [];

  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (c.name ILIKE $${params.length} OR c.slug ILIKE $${params.length})`;
  }

  if (category) {
    params.push(category);
    sql += ` AND c.category = $${params.length}`;
  }

  sql += ` ORDER BY c.created_at DESC`;

  const res = await query(sql, params);
  return res.rows;
}

export async function createClubAdmin(input: {
  name: string;
  slug?: string;
  description?: string;
  category?: string;
  logo_url?: string;
  lead_user_id?: string;
}) {
  const slug = input.slug || input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const res = await query(
    `INSERT INTO clubs (name, slug, description, category, logo_url, is_active)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     RETURNING *`,
    [input.name, slug, input.description || null, input.category || 'General', input.logo_url || null]
  );

  const club = res.rows[0];

  // Assign Club Lead if provided
  if (input.lead_user_id) {
    await query(
      `INSERT INTO club_memberships (club_id, user_id, role, status)
       VALUES ($1, $2, 'lead', 'active')
       ON CONFLICT (club_id, user_id) DO UPDATE SET role = 'lead', status = 'active'`,
      [club.id, input.lead_user_id]
    );

    // Promote user role to club_lead if currently student
    await query(
      `UPDATE users SET role = 'club_lead' WHERE id = $1 AND role = 'student'`,
      [input.lead_user_id]
    );
  }

  return club;
}

export async function updateClubAdmin(clubId: string, input: {
  name?: string;
  description?: string;
  category?: string;
  logo_url?: string;
  is_active?: boolean;
  lead_user_id?: string;
}) {
  const existing = await query(`SELECT id FROM clubs WHERE id = $1 AND deleted_at IS NULL`, [clubId]);
  if (!existing.rowCount) throw new NotFoundError('Club not found.');

  await query(
    `UPDATE clubs
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         category = COALESCE($3, category),
         logo_url = COALESCE($4, logo_url),
         is_active = COALESCE($5, is_active),
         updated_at = now()
     WHERE id = $6`,
    [input.name || null, input.description || null, input.category || null, input.logo_url || null, input.is_active !== undefined ? input.is_active : null, clubId]
  );

  if (input.lead_user_id) {
    // Reset existing leads for this club
    await query(`UPDATE club_memberships SET role = 'member' WHERE club_id = $1 AND role = 'lead'`, [clubId]);
    await query(
      `INSERT INTO club_memberships (club_id, user_id, role, status)
       VALUES ($1, $2, 'lead', 'active')
       ON CONFLICT (club_id, user_id) DO UPDATE SET role = 'lead', status = 'active'`,
      [clubId, input.lead_user_id]
    );
    await query(`UPDATE users SET role = 'club_lead' WHERE id = $1 AND role = 'student'`, [input.lead_user_id]);
  }

  const updated = await query(`SELECT * FROM clubs WHERE id = $1`, [clubId]);
  return updated.rows[0];
}

export async function archiveClubAdmin(clubId: string) {
  await query(`UPDATE clubs SET deleted_at = now(), is_active = FALSE WHERE id = $1`, [clubId]);
  return { success: true };
}

// ── 3. Event Operations ──────────────────────────────────────────────────────

export async function getAllEventsAdmin(status?: string, search?: string) {
  let sql = `
    SELECT e.id, e.title, e.description, e.event_type, e.status, e.start_time, e.end_time,
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

export async function updateUserRoleAdmin(userId: string, newRole: 'student' | 'club_lead' | 'faculty' | 'admin') {
  const res = await query(`UPDATE users SET role = $1, updated_at = now() WHERE id = $2 RETURNING id, username, role`, [newRole, userId]);
  if (!res.rowCount) throw new NotFoundError('User not found.');
  return res.rows[0];
}

// ── 5. Certificate Management ───────────────────────────────────────────────

export async function getAllCertificatesAdmin() {
  const res = await query(
    `SELECT c.id, c.title, c.verification_token, c.issued_at, u.username, p.full_name, e.title as event_title
     FROM certificates c
     JOIN users u ON u.id = c.user_id
     LEFT JOIN profiles p ON p.user_id = u.id
     LEFT JOIN events e ON e.id = c.event_id
     ORDER BY c.issued_at DESC`
  );
  return res.rows;
}
