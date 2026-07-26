/**
 * lib/schemas/event.schemas.ts
 *
 * Zod schemas for event-related endpoints.
 */

import { z } from 'zod';

// ── POST /api/v1/events ───────────────────────────────────────────────────────
export const EventCreateSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.').max(200),
  description: z.string().max(5000).optional(),
  banner_url: z.string().url().optional(),
  club_id: z.string().uuid().optional(),
  event_type: z.enum([
    'hackathon', 'fest', 'national_holiday', 'seminar',
    'workshop', 'meetup', 'internal_meeting', 'other',
  ]).default('other'),
  visibility: z.enum(['public', 'internal']).default('public'),
  target_years: z.array(z.number().int().min(1).max(4)).max(4).optional(),
  target_departments: z.array(z.string().max(100)).max(20).optional(),
  event_date: z.string().datetime({ message: 'event_date must be a valid ISO 8601 datetime.' }),
  duration_minutes: z.number().int().min(1).optional(),
  venue: z.string().max(300).optional(),
  online_link: z.string().url().optional(),
  capacity: z.number().int().min(1).optional(),
  registration_deadline: z.string().datetime().optional(),
  domain_tags: z.array(z.string().max(40)).max(8).optional(),
  certificates_enabled: z.boolean().default(false),
  check_in_enabled: z.boolean().default(false),
  registration_mode: z.enum(['instant', 'approval']).default('instant'),
  speaker_info: z
    .object({
      name: z.string(),
      designation: z.string().optional(),
      organisation: z.string().optional(),
      linkedin_url: z.string().url().optional(),
      bio: z.string().max(500).optional(),
    })
    .optional(),
});
export type EventCreateInput = z.infer<typeof EventCreateSchema>;

// ── PATCH /api/v1/events/:id ──────────────────────────────────────────────────
export const EventUpdateSchema = EventCreateSchema.partial();
export type EventUpdateInput = z.infer<typeof EventUpdateSchema>;

// ── POST /api/v1/events/:id/faculty-reject ────────────────────────────────────
export const FacultyRejectSchema = z.object({
  note: z.string().min(10, 'Rejection note must be at least 10 characters.').max(500),
});
export type FacultyRejectInput = z.infer<typeof FacultyRejectSchema>;

// ── POST /api/v1/events/:id/admin-reject ─────────────────────────────────────
export const AdminRejectSchema = z.object({
  note: z.string().min(10, 'Rejection note must be at least 10 characters.').max(500),
});
export type AdminRejectInput = z.infer<typeof AdminRejectSchema>;

// ── POST /api/v1/events/:id/register ─────────────────────────────────────────
export const EventRegisterSchema = z.object({
  attendance_mode: z.enum(['offline', 'online', 'hybrid']).default('offline'),
});
export type EventRegisterInput = z.infer<typeof EventRegisterSchema>;

// ── POST /api/v1/events/:id/attendance ───────────────────────────────────────
export const MarkAttendanceSchema = z.union([
  z.object({ user_id: z.string().uuid() }),
  z.object({ qr_token: z.string().min(1) }),
]);
export type MarkAttendanceInput = z.infer<typeof MarkAttendanceSchema>;

// ── POST /api/v1/events/:id/attendance/bulk ──────────────────────────────────
export const BulkAttendanceSchema = z.object({
  user_ids: z.array(z.string().uuid()).min(1).max(500),
});
export type BulkAttendanceInput = z.infer<typeof BulkAttendanceSchema>;
