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

/** Single event detail (public / authenticated). */
export async function getEventById(eventId: string, currentUserId?: string | null) {
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

  const event = result.rows[0];

  // 1. Fetch active attendee count directly from registrations
  const regCountResult = await query(
    `SELECT COUNT(*) FROM event_registrations WHERE event_id = $1 AND status != 'cancelled'`,
    [eventId]
  );
  const activeRegistrationsCount = parseInt(regCountResult.rows[0].count, 10);

  const capacity = event.capacity ? Number(event.capacity) : null;
  const remaining_seats = capacity !== null ? Math.max(0, capacity - activeRegistrationsCount) : null;
  const is_full = capacity !== null && activeRegistrationsCount >= capacity;

  const now = new Date();
  const eventDate = new Date(event.event_date);
  const duration = event.duration_minutes ? Number(event.duration_minutes) : 120;
  const eventEndDate = new Date(eventDate.getTime() + duration * 60000);
  const registrationDeadline = event.registration_deadline ? new Date(event.registration_deadline) : eventDate;

  const is_past_deadline = now > registrationDeadline;
  const is_ended = event.status === 'completed' || now > eventEndDate;
  const is_registration_open = event.status === 'published' && !is_past_deadline && !is_ended;

  // 2. Registration mode ('approval' vs 'instant')
  const registration_mode = (event.visibility === 'internal' || event.domain_tags?.includes('approval')) ? 'approval' : 'instant';

  // 3. User specific registration lookup
  let user_registration: Record<string, unknown> | null = null;
  if (currentUserId) {
    const userRegResult = await query(
      `SELECT id, status, attendance_mode, qr_token, checked_in_at, registered_at
       FROM event_registrations
       WHERE event_id = $1 AND user_id = $2 AND status != 'cancelled'`,
      [eventId, currentUserId]
    );
    if (userRegResult.rowCount && userRegResult.rowCount > 0) {
      user_registration = userRegResult.rows[0];
    }
  }

  // 4. Compute button state
  let button_state = 'REGISTER';

  if (event.status === 'cancelled') {
    button_state = 'CANCELLED';
  } else if (is_ended) {
    button_state = 'EVENT_ENDED';
  } else if (user_registration) {
    const regStatus = user_registration.status as string;
    if (regStatus === 'attended') {
      button_state = 'ATTENDED';
    } else if (regStatus === 'registered') {
      button_state = 'REGISTERED';
    } else if (regStatus === 'waitlisted') {
      button_state = 'WAITLISTED';
    } else if (regStatus === 'pending') {
      button_state = 'PENDING_APPROVAL';
    }
  } else if (is_past_deadline) {
    button_state = 'REGISTRATION_CLOSED';
  } else if (is_full) {
    button_state = 'EVENT_FULL';
  } else if (registration_mode === 'approval') {
    button_state = 'APPLY';
  } else {
    button_state = 'REGISTER';
  }

  return {
    ...event,
    attendee_count: activeRegistrationsCount,
    remaining_seats,
    is_full,
    is_registration_open,
    is_past_deadline,
    is_ended,
    registration_mode,
    button_state,
    user_registration,
  };
}

/** Get 3 related/similar events for an event detail view. */
export async function getRelatedEvents(eventId: string, eventType: string, clubId?: string | null, limit = 3) {
  const result = await query(
    `SELECT e.id, e.title, e.description, e.banner_url, e.event_type,
            e.event_date, e.venue, e.online_link, e.capacity, e.attendee_count,
            c.name as club_name, c.slug as club_slug, c.logo_url as club_logo_url
     FROM events e
     LEFT JOIN clubs c ON c.id = e.club_id
     WHERE e.id != $1
       AND e.status = 'published'
       AND e.deleted_at IS NULL
       AND (e.event_type = $2 OR e.club_id = $3)
     ORDER BY e.event_date ASC
     LIMIT $4`,
    [eventId, eventType, clubId ?? null, limit]
  );
  return result.rows;
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
        registration_mode, domain_tags, certificates_enabled, check_in_enabled, speaker_info, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,'draft')
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
      data.registration_mode ?? 'instant',
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

  // Cannot update a completed/cancelled event
  if (['completed', 'cancelled'].includes(event.status)) {
    throw new ValidationError('Completed or cancelled events cannot be edited.');
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

  let isMajorChange = false;
  for (const key of allowed) {
    const val = (data as Record<string, unknown>)[key];
    if (val !== undefined) {
      if (['venue', 'event_date', 'registration_deadline'].includes(key)) {
        isMajorChange = true;
      }
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

  // If published event has major changes (venue, date, deadline), notify registered students
  if (event.status === 'published' && isMajorChange) {
    await broadcastAnnouncement(
      eventId,
      callerId,
      'Important Schedule Update',
      `The event details (venue/date/deadline) for "${event.title}" have been updated by the organizer.`
    );
  }

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
  const deadline = event.registration_deadline 
    ? new Date(event.registration_deadline as string)
    : new Date(event.event_date as string);
  if (new Date() > deadline) {
    throw new ValidationError('Registration deadline has passed.');
  }

  // Determine initial status based on registration_mode ('approval' vs 'instant')
  const isApprovalMode = event.registration_mode === 'approval';

  if (isApprovalMode) {
    const result = await query(
      `INSERT INTO event_registrations (event_id, user_id, status, attendance_mode)
       VALUES ($1, $2, 'pending', $3)
       ON CONFLICT (event_id, user_id) DO NOTHING
       RETURNING *`,
      [eventId, userId, data.attendance_mode]
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new ConflictError('You have already applied or registered for this event.');
    }
    return result.rows[0];
  }

  // Instant Registration Mode: Check capacity
  if (event.capacity) {
    const regCount = await query(
      `SELECT COUNT(*) FROM event_registrations
       WHERE event_id = $1 AND status IN ('registered', 'attended')`,
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
      if (!result.rowCount || result.rowCount === 0) {
        throw new ConflictError('You are already registered or waitlisted for this event.');
      }
      return result.rows[0];
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

  // Increment attendee_count
  await query(
    'UPDATE events SET attendee_count = attendee_count + 1 WHERE id = $1',
    [eventId]
  );

  return result.rows[0];
}

export async function cancelEventRegistration(eventId: string, userId: string) {
  const event = await requireEvent(eventId);

  // Check deadline / cancellation policy
  const deadline = event.registration_deadline 
    ? new Date(event.registration_deadline as string)
    : new Date(event.event_date as string);

  if (new Date() > deadline) {
    throw new ValidationError('Registration can no longer be cancelled.');
  }

  const result = await query(
    `UPDATE event_registrations
     SET status = 'cancelled'
     WHERE event_id = $1 AND user_id = $2 AND status IN ('registered', 'pending', 'waitlisted')
     RETURNING id, status`,
    [eventId, userId]
  );
  if (!result.rowCount || result.rowCount === 0) {
    throw new NotFoundError('Active registration not found.');
  }

  const cancelledStatus = (result.rows[0] as { status: string }).status;

  // If a confirmed ('registered') student cancelled, check for waitlist promotion
  if (cancelledStatus === 'registered') {
    const waitlistResult = await query(
      `SELECT id, user_id FROM event_registrations
       WHERE event_id = $1 AND status = 'waitlisted'
       ORDER BY registered_at ASC LIMIT 1`,
      [eventId]
    );

    if (waitlistResult.rowCount && waitlistResult.rowCount > 0) {
      const promotedReg = waitlistResult.rows[0] as { id: string; user_id: string };
      
      // Promote waitlisted student to 'registered'
      await query(
        `UPDATE event_registrations SET status = 'registered' WHERE id = $1`,
        [promotedReg.id]
      );

      await createNotification({
        userId: promotedReg.user_id,
        title: `Seat Confirmed! 🎉`,
        message: `A seat opened up for "${event.title}". You have been promoted from the waitlist to confirmed registration.`,
        type: 'waitlist_promoted',
        linkUrl: `/dashboard/events/${eventId}`
      });
    } else {
      // Decrement attendee count if no waitlisted user was promoted
      await query(
        'UPDATE events SET attendee_count = GREATEST(0, attendee_count - 1) WHERE id = $1',
        [eventId]
      );
    }
  }
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

// ── Notifications Helper ──────────────────────────────────────────────────────

export async function createNotification(opts: {
  userId: string;
  title: string;
  message: string;
  type?: string;
  linkUrl?: string;
}) {
  await query(
    `INSERT INTO notifications (user_id, title, message, type, link_url)
     VALUES ($1, $2, $3, $4, $5)`,
    [opts.userId, opts.title, opts.message, opts.type || 'info', opts.linkUrl || null]
  );
}

// ── Organizer Workflows ────────────────────────────────────────────────────────

/** Fetch organizer dashboard events with stats and dynamic available actions. */
export async function getOrganizerEvents(organizerId: string) {
  const result = await query(
    `SELECT e.*, c.name as club_name, c.logo_url as club_logo_url
     FROM events e
     LEFT JOIN clubs c ON c.id = e.club_id
     WHERE (e.organiser_id = $1 OR e.club_id IN (
       SELECT club_id FROM club_memberships WHERE user_id = $1 AND role IN ('president','lead','core') AND status = 'active'
     ))
       AND e.deleted_at IS NULL
     ORDER BY e.updated_at DESC`,
    [organizerId]
  );

  return result.rows.map((event) => {
    const status = event.status as string;
    const capacity = event.capacity ? Number(event.capacity) : null;
    const attendeeCount = Number(event.attendee_count || 0);

    // Compute dynamic actions based on event state
    let actions: string[] = [];
    if (status === 'draft') {
      actions = ['edit', 'delete', 'submit'];
    } else if (status === 'pending_faculty' || status === 'pending_admin') {
      actions = ['view', 'withdraw'];
    } else if (status === 'published') {
      actions = ['view_registrations', 'edit', 'announcements', 'checkin', 'export', 'complete'];
    } else if (status === 'completed') {
      actions = ['statistics', 'certificates', 'archive'];
    }

    return {
      ...event,
      attendee_count: attendeeCount,
      remaining_seats: capacity !== null ? Math.max(0, capacity - attendeeCount) : null,
      available_actions: actions,
    };
  });
}

/** Withdraw pending event submission back to draft. */
export async function withdrawEventSubmission(eventId: string, organizerId: string) {
  const event = await requireEvent(eventId);
  if (event.status !== 'pending_faculty' && event.status !== 'pending_admin') {
    throw new ValidationError('Only pending submissions can be withdrawn.');
  }

  await query(
    `UPDATE events SET status = 'draft', updated_at = now() WHERE id = $1`,
    [eventId]
  );

  return { status: 'draft' };
}

/** Single/Bulk Registration Decision (Approve / Reject applications). */
export async function decideApplications(opts: {
  eventId: string;
  organizerId: string;
  registrationIds: string[];
  action: 'approve' | 'reject';
  decisionNotes?: string;
}) {
  const { eventId, organizerId, registrationIds, action, decisionNotes } = opts;
  const event = await requireEvent(eventId);
  if (event.status === 'completed' || event.archived_at) {
    throw new ValidationError('Cannot modify applications for completed or archived events.');
  }

  if (action === 'approve') {
    // Check capacity if set
    if (event.capacity) {
      const regCountResult = await query(
        `SELECT COUNT(*) FROM event_registrations WHERE event_id = $1 AND status IN ('registered', 'attended')`,
        [eventId]
      );
      const activeCount = parseInt(regCountResult.rows[0].count, 10);
      if (activeCount + registrationIds.length > Number(event.capacity)) {
        throw new ValidationError(`Approving ${registrationIds.length} applicants exceeds total capacity of ${event.capacity}.`);
      }
    }

    const result = await query(
      `UPDATE event_registrations
       SET status = 'registered',
           decision_by = $1,
           decision_notes = $2,
           decided_at = now()
       WHERE event_id = $3
         AND id = ANY($4::uuid[])
         AND status = 'pending'
       RETURNING user_id`,
      [organizerId, decisionNotes || null, eventId, registrationIds]
    );

    const count = result.rowCount || 0;

    // Increment attendee count
    if (count > 0) {
      await query(
        `UPDATE events SET attendee_count = attendee_count + $1 WHERE id = $2`,
        [count, eventId]
      );

      // Send in-app notification to approved students
      for (const row of result.rows) {
        await createNotification({
          userId: (row as { user_id: string }).user_id,
          title: 'Application Approved! 🎉',
          message: `Your application for "${event.title}" has been approved. View your details.`,
          type: 'registration_status',
          linkUrl: `/dashboard/events/${eventId}`
        });
      }
    }

    return { approved_count: count };
  } else {
    // Action: Reject
    const result = await query(
      `UPDATE event_registrations
       SET status = 'rejected',
           decision_by = $1,
           decision_notes = $2,
           decided_at = now()
       WHERE event_id = $3
         AND id = ANY($4::uuid[])
         AND status = 'pending'
       RETURNING user_id`,
      [organizerId, decisionNotes || null, eventId, registrationIds]
    );

    const count = result.rowCount || 0;

    // Send in-app notification to rejected students
    for (const row of result.rows) {
      await createNotification({
        userId: (row as { user_id: string }).user_id,
        title: 'Application Update',
        message: `Your application for "${event.title}" was not approved at this time.`,
        type: 'registration_status',
        linkUrl: `/dashboard/events/${eventId}`
      });
    }

    return { rejected_count: count };
  }
}

/** Complete an event: locks registrations, check-ins, and enables certificates. */
export async function completeEvent(eventId: string, organizerId: string) {
  const event = await requireEvent(eventId);
  if (event.status === 'completed') {
    throw new ValidationError('Event is already completed.');
  }

  await query(
    `UPDATE events
     SET status = 'completed',
         completed_at = now(),
         updated_at = now()
     WHERE id = $1`,
    [eventId]
  );

  return { status: 'completed' };
}

/** Archive an event: read-only historical freeze. */
export async function archiveEvent(eventId: string, organizerId: string) {
  const event = await requireEvent(eventId);

  await query(
    `UPDATE events
     SET archived_at = now(),
         updated_at = now()
     WHERE id = $1`,
    [eventId]
  );

  return { archived: true };
}

/** Broadcast announcement notification to all registered attendees. */
export async function broadcastAnnouncement(eventId: string, organizerId: string, title: string, message: string) {
  const event = await requireEvent(eventId);

  const regResult = await query(
    `SELECT user_id FROM event_registrations
     WHERE event_id = $1 AND status IN ('registered', 'attended', 'pending')`,
    [eventId]
  );

  for (const row of regResult.rows) {
    await createNotification({
      userId: (row as { user_id: string }).user_id,
      title: `Announcement: ${event.title}`,
      message: `${title} - ${message}`,
      type: 'event_update',
      linkUrl: `/dashboard/events/${eventId}`
    });
  }

  return { broadcast_count: regResult.rowCount || 0 };
}

/** Issue digital participation certificates for all attended students of a completed event. */
export async function issueCertificatesForEvent(eventId: string, organizerId: string) {
  const event = await requireEvent(eventId);
  
  if (event.status !== 'completed') {
    throw new ValidationError('Certificates can only be issued for completed events.');
  }

  const attendedRes = await query(
    `SELECT er.id as reg_id, er.user_id, u.username
     FROM event_registrations er
     JOIN users u ON u.id = er.user_id
     WHERE er.event_id = $1 AND er.status = 'attended' AND er.certificate_issued = FALSE`,
    [eventId]
  );

  let issuedCount = 0;
  for (const row of attendedRes.rows) {
    const userId = (row as { user_id: string }).user_id;
    const regId = (row as { reg_id: string }).reg_id;
    const token = `CERT-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    await query(
      `INSERT INTO certificates (event_id, user_id, certificate_type, verification_token, issued_at)
       VALUES ($1, $2, 'participation', $3, now())`,
      [eventId, userId, token]
    );

    await query(
      `UPDATE event_registrations SET certificate_issued = TRUE WHERE id = $1`,
      [regId]
    );

    await createNotification({
      userId,
      title: `Certificate Issued! 🎓`,
      message: `Your verified participation certificate for "${event.title}" is now available. Token: ${token}`,
      type: 'certificate',
      linkUrl: `/api/v1/certificates/verify/${token}`
    });

    issuedCount++;
  }

  return { issued_count: issuedCount };
}

/** Get list of issued certificates for an event. */
export async function getEventCertificates(eventId: string) {
  const result = await query(
    `SELECT c.id, c.verification_token, c.issued_at, c.certificate_type,
            u.id as user_id, u.username, p.full_name
     FROM certificates c
     JOIN users u ON u.id = c.user_id
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE c.event_id = $1
     ORDER BY c.issued_at DESC`,
    [eventId]
  );
  return result.rows;
}

