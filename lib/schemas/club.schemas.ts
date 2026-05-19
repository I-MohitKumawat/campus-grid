/**
 * lib/schemas/club.schemas.ts
 *
 * Zod schemas for club-related endpoints.
 */

import { z } from 'zod';

// ── POST /api/v1/clubs/register ───────────────────────────────────────────────
export const ClubRegisterSchema = z.object({
  name: z.string().min(3, 'Club name must be at least 3 characters.').max(100),
  type: z.string().min(2).max(50),
  description: z.string().max(1000).optional(),
  domain_tags: z.array(z.string().max(40)).max(8).optional(),
  social_links: z
    .object({
      instagram: z.string().url().optional(),
      linkedin: z.string().url().optional(),
      website: z.string().url().optional(),
    })
    .optional(),
});
export type ClubRegisterInput = z.infer<typeof ClubRegisterSchema>;

// ── PATCH /api/v1/clubs/register/:id (Admin approve/reject) ──────────────────
export const ClubRegistrationDecisionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejection_reason: z.string().max(500).optional(),
});
export type ClubRegistrationDecisionInput = z.infer<typeof ClubRegistrationDecisionSchema>;

// ── PATCH /api/v1/clubs/:id ───────────────────────────────────────────────────
export const ClubUpdateSchema = z.object({
  description: z.string().max(1000).optional(),
  logo_url: z.string().url().optional(),
  banner_url: z.string().url().optional(),
  domain_tags: z.array(z.string().max(40)).max(8).optional(),
  social_links: z
    .object({
      instagram: z.string().url().optional(),
      linkedin: z.string().url().optional(),
      website: z.string().url().optional(),
    })
    .optional(),
  visibility: z.enum(['public', 'campus_only', 'invite_only']).optional(),
  recruitment_open: z.boolean().optional(),
});
export type ClubUpdateInput = z.infer<typeof ClubUpdateSchema>;

// ── POST /api/v1/clubs/:id/members/invite ────────────────────────────────────
export const ClubMemberInviteSchema = z.object({
  username: z.string().min(3).max(30),
  role: z.enum(['member', 'core']).default('member'),
  posting_access: z.boolean().default(false),
});
export type ClubMemberInviteInput = z.infer<typeof ClubMemberInviteSchema>;

// ── PATCH /api/v1/clubs/:id/members/:uid ─────────────────────────────────────
export const ClubMemberUpdateSchema = z.object({
  role: z.enum(['member', 'core', 'lead']).optional(),
  posting_access: z.boolean().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});
export type ClubMemberUpdateInput = z.infer<typeof ClubMemberUpdateSchema>;

// ── POST /api/v1/clubs/:id/faculty ───────────────────────────────────────────
export const ClubFacultyAssignSchema = z.object({
  faculty_id: z.string().uuid('Must be a valid user UUID.'),
  is_hod: z.boolean().default(false),
});
export type ClubFacultyAssignInput = z.infer<typeof ClubFacultyAssignSchema>;
