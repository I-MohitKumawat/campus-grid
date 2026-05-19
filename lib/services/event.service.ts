/**
 * lib/services/event.service.ts
 *
 * Event service layer.
 *
 * Implements the full event state machine as defined in TDD section 8.1.
 * All status transitions are enforced here, not in route handlers.
 *
 * Status flow (from TDD):
 *   Public (club):    draft → pending_faculty → pending_admin → published → completed
 *   Public (faculty): draft → pending_admin → published → completed
 *   Internal:         draft → published (no approval steps)
 *   Any → cancelled:  Admin only
 */

import { query, withTransaction } from '@/lib/db/client';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@/lib/errors';
import type {
  EventCreateInput,
  EventUpdateInput,
  EventRegisterInput,
  MarkAttendanceInput,
  BulkAttendanceInput,
} from '@/lib/schemas/event.schemas';

// ── Types ─────────────────────────────────────────────────────────────────────

type EventStatus =
  | 'draft'
  | 'pending_faculty'
  | 'pending_admin'
  | 'published'
  | 'completed'
  | 'cancelled';

// ── Internal guard ────────────────────────────────────────────────────────────

/**
 * Fetch event by ID, throw NotFoundError if missing or deleted.
 */
async function requireEvent(eventId: string) {
  const result = await query(
    'SELECT * FROM events WHERE id = $1 AND deleted_at IS NULL',
    [eventId]
  );
  if (!result.rowCount || result.rowCount === 0) throw new NotFoundError('Event');
  return result.rows[0] as Record<string, unknown> & { status: EventStatus; organiser_id: string; club_id: string | null; visibility: string; organiser_type: string };
}

// ── List / Get ────────────────────────────────────────────────────────────────

/** Upcoming published public events. */
export async function listUpcomingEvents(limit = 20, cursor?: string) {
  const params: unknown[] = [];
  let cursorClause = '';
  if (cursor) {
    params.push(cursor);
    cursorClause = `AND e.event_date > $${params.length}`;
  }
  params.push(limit + 1);

  const result = await query(
    `SELECT e.id, e.title, e.description, e.banner_url, e.event_type,
            e.event_date, e.venue, e.online_link, e.capacity, e.attendee_count,
            e.domain_tags, e.club_id, e.organiser_id, e.created_at,
            c.name as club_name, c.slug as club_slug, c.logo_url as club_logo_url
     FROM events e
     LEFT JOIN clubs c ON c.id = e.club_id
     WHERE e.status = 'published'
       AND e.visibility = 'public'
       AND e.deleted_at IS NULL
       AND e.event_date >= now()
       ${cursorClause}
     ORDER BY e.event_date ASC
     LIMIT $${params.length}`,
    params
  );

  const rows = result.rows;
  const hasMore = rows.length > limit;
  if (hasMore) rows.pop();

  return {
    events: rows,
    hasMore,
    cursor: hasMore ? String(rows[rows.length - 1].event_date) : null,
  };
}

/** Past completed public events. */
export async function listPastEvents(limit = 20, page = 1) {
  const offset = (page - 1) * limit;
  const result = await query(
    `SELECT e.id, e.title, e.banner_url, e.event_type, e.event_date,
            e.attendee_count, e.domain_tags, c.name as club_name
     FROM events e
     LEFT JOIN clubs c ON c.id = e.club_id
     WHERE e.status = 'completed'
       AND e.visibility = 'public'
       AND e.deleted_at IS NULL
     ORDER BY e.event_date DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM events WHERE status = 'completed' AND visibility = 'public' AND deleted_at IS NULL`
  );
  const total = parseInt((countResult.rows[0] as { count: string }).count, 10);

  return { events: result.rows, total, page, limit };
}

/** Single event detail (public). */
export async function getEventById(eventId: string) {
  const result = await query(
    `SELECT e.*, c.name as club_name, c.slug as club_slug, c.logo_url as club_logo_url,
            p.full_name as organiser_full_name, u.username as organiser_username
     FROM events e
     LEFT JOIN clubs c ON c.id = e.club_id
     JOIN users u ON u.id = e.organiser_id
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE e.id = $1 AND e.deleted_at IS NULL`,
    [eventId]
  );
  if (!result.rowCount || result.rowCount === 0) throw new NotFoundError('Event');
  return result.rows[0];
}

// ── Create ────────────────────────────────────────────────────────────────────

/**
 * Create a new event in 'draft' status.
 * Determines organiser_type from the caller's role.
 */
export async function createEvent(
  organiserUserId: string,
  callerRole: string,
  data: EventCreateInput
) {
  // Determine organiser_type
  let organiserType: 'club' | 'faculty' | 'admin';
  if (callerRole === 'admin') {
    organiserType = 'admin';
  } else if (callerRole === 'faculty') {
    organiserType = 'faculty';
  } else {
    // club_lead
    organiserType = 'club';
  }

  // If organiser_type = 'club', club_id must be provided and caller must have posting access
  if (organiserType === 'club') {
    if (!data.club_id) {
      throw new ValidationError('club_id is required when creating an event as a club.');
    }
    const memberCheck = await query(
      `SELECT 1 FROM club_memberships
       WHERE club_id = $1 AND user_id = $2 AND posting_access = TRUE AND status = 'active'`,
      [data.club_id, organiserUserId]
    );
    if (!memberCheck.rowCount || memberCheck.rowCount === 0) {
      throw new ForbiddenError(
        'You do not have posting access in this club. Ask the club lead to grant it.'
      );
    }
  }

  const result = await query(
    `INSERT INTO events
       (title, description, banner_url, organiser_id, organiser_type, club_id,
        event_type, visibility, target_years, target_departments, event_date,
        duration_minutes, venue, online_link, capacity, registration_deadline,
        domain_tags, certificates_enabled, check_in_enabled, speaker_info, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'draft')
     RETURNING *`,
    [
      data.title,
      data.description ?? null,
      data.banner_url ?? null,
      organiserUserId,
      organiserType,
      data.club_id ?? null,
      data.event_type,
      data.visibility,
      data.target_years ?? null,
      data.target_departments ?? null,
      data.event_date,
      data.duration_minutes ?? null,
      data.venue ?? null,
      data.online_link ?? null,
      data.capacity ?? null,
      data.registration_deadline ?? null,
      data.domain_tags ?? null,
      data.certificates_enabled,
      data.check_in_enabled,
      data.speaker_info ? JSON.stringify(data.speaker_info) : null,
    ]
  );

  return result.rows[0];
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateEvent(
  eventId: string,
  callerId: string,
  callerRole: string,
  data: EventUpdateInput
) {
  const event = await requireEvent(eventId);

  // Only organiser or admin may update
  if (callerRole !== 'admin' && event.organiser_id !== callerId) {
    throw new ForbiddenError('Only the organiser or an admin can update this event.');
  }

  // Cannot update a published/completed/cancelled event (unless admin)
  if (
    callerRole !== 'admin' &&
    ['published', 'completed', 'cancelled'].includes(event.status)
  ) {
    throw new ValidationError('Published or completed events cannot be edited.');
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const allowed = [
    'title', 'description', 'banner_url', 'event_type', 'visibility',
    'target_years', 'target_departments', 'event_date', 'duration_minutes',
    'venue', 'online_link', 'capacity', 'registration_deadline', 'domain_tags',
    'certificates_enabled', 'check_in_enabled', 'speaker_info',
  ] as const;

  for (const key of allowed) {
    const val = (data as Record<string, unknown>)[key];
    if (val !== undefined) {
      updates.push(`${key} = $${idx++}`);
      values.push(typeof val === 'object' && val !== null ? JSON.stringify(val) : val);
    }
  }

  if (updates.length === 0) throw new ValidationError('No fields provided to update.');

  values.push(eventId);
  const result = await query(
    `UPDATE events SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0];
}

// ── State Machine ─────────────────────────────────────────────────────────────

/**
 * Submit a draft event for approval.
 * Transition logic:
 *   - Internal events        → published directly
 *   - Club events            → pending_faculty
 *   - Faculty-organised events → pending_admin
 */
export async function submitEventForApproval(
  eventId: string,
  callerId: string,
  callerRole: string
) {
  const event = await requireEvent(eventId);

  if (event.organiser_id !== callerId && callerRole !== 'admin') {
    throw new ForbiddenError('Only the organiser can submit this event.');
  }
  if (event.status !== 'draft') {
    throw new ValidationError(`Event must be in 'draft' status to submit. Current: ${event.status}.`);
  }

  let newStatus: EventStatus;
  if (event.visibility === 'internal') {
    newStatus = 'published';
  } else if (event.organiser_type === 'faculty' || event.organiser_type === 'admin') {
    newStatus = 'pending_admin';
  } else {
    // club event — check if club has a faculty advisor
    const advisorCheck = await query(
      'SELECT 1 FROM club_faculty_advisors WHERE club_id = $1 LIMIT 1',
      [event.club_id]
    );
    newStatus = advisorCheck.rowCount && advisorCheck.rowCount > 0
      ? 'pending_faculty'
      : 'pending_admin'; // no advisor → skip to admin
  }

  await query('UPDATE events SET status = $1 WHERE id = $2', [newStatus, eventId]);
  return { status: newStatus };
}

export async function facultyApproveEvent(
  eventId: string,
  facultyUserId: string
) {
  const event = await requireEvent(eventId);

  if (event.status !== 'pending_faculty') {
    throw new ValidationError(`Event is not awaiting faculty approval. Status: ${event.status}.`);
  }

  // Verify this faculty is an advisor for the club
  const advisorCheck = await query(
    'SELECT 1 FROM club_faculty_advisors WHERE club_id = $1 AND faculty_id = $2',
    [event.club_id, facultyUserId]
  );
  if (!advisorCheck.rowCount || advisorCheck.rowCount === 0) {
    throw new ForbiddenError('You are not a faculty advisor for this club.');
  }

  await query(
    `UPDATE events
     SET status = 'pending_admin',
         faculty_approval_by = $1,
         faculty_approved_at = now()
     WHERE id = $2`,
    [facultyUserId, eventId]
  );

  return { status: 'pending_admin' };
}

export async function facultyRejectEvent(
  eventId: string,
  facultyUserId: string,
  note: string
) {
  const event = await requireEvent(eventId);

  if (event.status !== 'pending_faculty') {
    throw new ValidationError(`Event is not awaiting faculty approval. Status: ${event.status}.`);
  }

  const advisorCheck = await query(
    'SELECT 1 FROM club_faculty_advisors WHERE club_id = $1 AND faculty_id = $2',
    [event.club_id, facultyUserId]
  );
  if (!advisorCheck.rowCount || advisorCheck.rowCount === 0) {
    throw new ForbiddenError('You are not a faculty advisor for this club.');
  }

  await query(
    `UPDATE events
     SET status = 'draft',
         faculty_rejection_note = $1
     WHERE id = $2`,
    [note, eventId]
  );

  return { status: 'draft' };
}

export async function adminApproveEvent(eventId: string, adminUserId: string) {
  const event = await requireEvent(eventId);

  if (event.status !== 'pending_admin') {
    throw new ValidationError(`Event is not awaiting admin approval. Status: ${event.status}.`);
  }

  await query(
    `UPDATE events
     SET status = 'published',
         admin_approval_by = $1,
         admin_approved_at = now()
     WHERE id = $2`,
    [adminUserId, eventId]
  );

  return { status: 'published' };
}

export async function adminRejectEvent(
  eventId: string,
  adminUserId: string,
  note: string
) {
  const event = await requireEvent(eventId);

  if (event.status !== 'pending_admin') {
    throw new ValidationError(`Event is not awaiting admin approval. Status: ${event.status}.`);
  }

  await query(
    `UPDATE events
     SET status = 'draft',
         admin_rejection_note = $1
     WHERE id = $2`,
    [note, eventId]
  );

  return { status: 'draft' };
}

export async function adminDeleteEvent(eventId: string) {
  const event = await requireEvent(eventId);
  await query('UPDATE events SET deleted_at = now() WHERE id = $1', [eventId]);
  return { deleted: true };
}

// ── Registration ──────────────────────────────────────────────────────────────

export async function registerForEvent(
  eventId: string,
  userId: string,
  data: EventRegisterInput
) {
  const event = await requireEvent(eventId);

  if (event.status !== 'published') {
    throw new ValidationError('Registrations are only open for published events.');
  }

  // Check deadline
  if (event.registration_deadline) {
    const deadline = new Date(event.registration_deadline as string);
    if (new Date() > deadline) {
      throw new ValidationError('Registration deadline has passed.');
    }
  }

  // Check capacity
  if (event.capacity) {
    const regCount = await query(
      `SELECT COUNT(*) FROM event_registrations
       WHERE event_id = $1 AND status != 'cancelled'`,
      [eventId]
    );
    const count = parseInt((regCount.rows[0] as { count: string }).count, 10);
    if (count >= (event.capacity as number)) {
      // Register as waitlisted instead
      const result = await query(
        `INSERT INTO event_registrations (event_id, user_id, status, attendance_mode)
         VALUES ($1, $2, 'waitlisted', $3)
         ON CONFLICT (event_id, user_id) DO NOTHING
         RETURNING *`,
        [eventId, userId, data.attendance_mode]
      );
      return result.rows[0] ?? null;
    }
  }

  const result = await query(
    `INSERT INTO event_registrations (event_id, user_id, status, attendance_mode)
     VALUES ($1, $2, 'registered', $3)
     ON CONFLICT (event_id, user_id) DO NOTHING
     RETURNING *`,
    [eventId, userId, data.attendance_mode]
  );

  if (!result.rowCount || result.rowCount === 0) {
    throw new ConflictError('You are already registered for this event.');
  }

  // Increment attendee_count (optimistic, corrected on completion)
  await query(
    'UPDATE events SET attendee_count = attendee_count + 1 WHERE id = $1',
    [eventId]
  );

  return result.rows[0];
}

export async function cancelEventRegistration(eventId: string, userId: string) {
  const result = await query(
    `UPDATE event_registrations
     SET status = 'cancelled'
     WHERE event_id = $1 AND user_id = $2 AND status = 'registered'
     RETURNING id`,
    [eventId, userId]
  );
  if (!result.rowCount || result.rowCount === 0) {
    throw new NotFoundError('Registration');
  }
  await query(
    'UPDATE events SET attendee_count = GREATEST(0, attendee_count - 1) WHERE id = $1',
    [eventId]
  );
}

// ── Attendance ────────────────────────────────────────────────────────────────

export async function getEventRegistrations(
  eventId: string,
  callerId: string,
  callerRole: string
) {
  const event = await requireEvent(eventId);

  // Check permission: club lead of the organising club, or admin
  if (callerRole !== 'admin' && event.organiser_id !== callerId) {
    const memberCheck = await query(
      `SELECT 1 FROM club_memberships
       WHERE club_id = $1 AND user_id = $2 AND role IN ('lead','core') AND status = 'active'`,
      [event.club_id, callerId]
    );
    if (!memberCheck.rowCount || memberCheck.rowCount === 0) {
      throw new ForbiddenError('You do not have permission to view registrations for this event.');
    }
  }

  const result = await query(
    `SELECT er.id, er.status, er.attendance_mode, er.qr_token, er.checked_in_at,
            er.certificate_issued, er.registered_at,
            u.id as user_id, u.username, u.avatar_url,
            p.full_name, p.department, p.year
     FROM event_registrations er
     JOIN users u ON u.id = er.user_id
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE er.event_id = $1
     ORDER BY er.registered_at ASC`,
    [eventId]
  );

  return result.rows;
}

export async function markAttendance(
  eventId: string,
  callerId: string,
  callerRole: string,
  data: MarkAttendanceInput
) {
  const event = await requireEvent(eventId);

  if (callerRole !== 'admin' && event.organiser_id !== callerId) {
    const memberCheck = await query(
      `SELECT 1 FROM club_memberships
       WHERE club_id = $1 AND user_id = $2 AND role IN ('lead','core') AND status = 'active'`,
      [event.club_id, callerId]
    );
    if (!memberCheck.rowCount || memberCheck.rowCount === 0) {
      throw new ForbiddenError('You do not have permission to mark attendance.');
    }
  }

  let whereClause: string;
  let whereValue: string;

  if ('qr_token' in data) {
    whereClause = 'qr_token = $1';
    whereValue = data.qr_token;
  } else {
    whereClause = 'user_id = $1';
    whereValue = data.user_id;
  }

  const result = await query(
    `UPDATE event_registrations
     SET status = 'attended',
         checked_in_at = now(),
         checked_in_by = $2
     WHERE event_id = $3
       AND ${whereClause}
       AND status = 'registered'
     RETURNING *`,
    [whereValue, callerId, eventId]
  );

  if (!result.rowCount || result.rowCount === 0) {
    throw new NotFoundError('Registration (may already be marked attended or cancelled)');
  }

  return result.rows[0];
}

export async function markBulkAttendance(
  eventId: string,
  callerId: string,
  callerRole: string,
  data: BulkAttendanceInput
) {
  const event = await requireEvent(eventId);

  if (callerRole !== 'admin' && event.organiser_id !== callerId) {
    throw new ForbiddenError('You do not have permission to mark bulk attendance.');
  }

  const result = await query(
    `UPDATE event_registrations
     SET status = 'attended', checked_in_at = now(), checked_in_by = $1
     WHERE event_id = $2
       AND user_id = ANY($3::uuid[])
       AND status = 'registered'
     RETURNING user_id`,
    [callerId, eventId, data.user_ids]
  );

  return {
    marked: result.rowCount ?? 0,
    user_ids: result.rows.map((r) => (r as { user_id: string }).user_id),
  };
}

// ── Certificates ──────────────────────────────────────────────────────────────

export async function verifyCertificate(verificationToken: string) {
  const result = await query(
    `SELECT cert.*, e.title as event_title, e.event_date, e.banner_url,
            u.username, p.full_name
     FROM certificates cert
     JOIN events e ON e.id = cert.event_id
     JOIN users u ON u.id = cert.user_id
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE cert.verification_token = $1
       AND cert.revoked_at IS NULL`,
    [verificationToken]
  );
  if (!result.rowCount || result.rowCount === 0) {
    throw new NotFoundError('Certificate');
  }
  return result.rows[0];
}
