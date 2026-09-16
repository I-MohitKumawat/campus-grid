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

export const ClubUpdateSchema = z.object({
  // Club-managed fields
  description: z.string().max(1000).optional().nullable(),
  logo_url: z.string().optional().nullable(),
  banner_url: z.string().optional().nullable(),
  domain_tags: z.array(z.string().max(40)).max(10).optional(),
  social_links: z
    .object({
      instagram: z.string().optional().nullable(),
      linkedin: z.string().optional().nullable(),
      website: z.string().optional().nullable(),
      discord: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  visibility: z.enum(['public', 'campus_only', 'invite_only']).optional(),
  recruitment_open: z.boolean().optional(),
  // Institution-controlled fields (Platform Admin only)
  name: z.string().min(2, 'Club name must be at least 2 characters.').max(100).optional(),
  category: z.string().min(2).max(50).optional().nullable(),
  type: z.string().min(2).max(50).optional().nullable(),
  verification_status: z.enum(['pending', 'approved', 'rejected']).optional(),
  is_active: z.boolean().optional(),
  lead_user_id: z.string().uuid('Must be a valid UUID.').optional().nullable().or(z.literal('')),
});
export type ClubUpdateInput = z.infer<typeof ClubUpdateSchema>;

export const ClubPositionEnum = z.enum([
  'president',
  'vice_president',
  'secretary',
  'vice_secretary',
  'treasurer',
  'technical_lead',
  'outreach_lead',
  'member',
]);
export type ClubPositionInput = z.infer<typeof ClubPositionEnum>;

// ── POST /api/v1/clubs/:id/members/invite ────────────────────────────────────
export const ClubMemberInviteSchema = z.object({
  username: z.string().min(3).max(30),
  role: ClubPositionEnum.default('member'),
  posting_access: z.boolean().default(false),
});
export type ClubMemberInviteInput = z.infer<typeof ClubMemberInviteSchema>;

// ── PATCH /api/v1/clubs/:id/members/:uid ─────────────────────────────────────
export const ClubMemberUpdateSchema = z.object({
  role: ClubPositionEnum.optional(),
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

// ── POST /api/v1/admin/clubs (Admin Create Club) ──────────────────────────────
export const AdminClubCreateSchema = z.object({
  name: z.string().min(2, 'Club name must be at least 2 characters.').max(100, 'Club name cannot exceed 100 characters.'),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase alphanumeric characters and hyphens.').optional().nullable(),
  type: z.string().min(2).max(50).optional().nullable(),
  category: z.string().min(2).max(50).optional().nullable(),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters.').optional().nullable(),
  logo_url: z.string().optional().nullable(),
  banner_url: z.string().optional().nullable(),
  domain_tags: z.array(z.string().max(40)).optional().default([]),
  social_links: z.object({
    website: z.string().optional().nullable(),
    instagram: z.string().optional().nullable(),
    linkedin: z.string().optional().nullable(),
    github: z.string().optional().nullable(),
    discord: z.string().optional().nullable(),
  }).optional().default({}),
  visibility: z.enum(['public', 'campus_only', 'invite_only']).default('public'),
  recruitment_open: z.boolean().default(false),
  lead_user_id: z.string().uuid('Must be a valid UUID.').optional().nullable().or(z.literal('')),
});
export type AdminClubCreateInput = z.infer<typeof AdminClubCreateSchema>;

// ── PATCH /api/v1/admin/clubs/:id (Admin Update Club) ─────────────────────────
export const AdminClubUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/).optional(),
  type: z.string().min(2).max(50).optional(),
  category: z.string().min(2).max(50).optional(),
  description: z.string().max(1000).optional().nullable(),
  logo_url: z.string().optional().nullable(),
  banner_url: z.string().optional().nullable(),
  domain_tags: z.array(z.string().max(40)).optional(),
  social_links: z.object({
    website: z.string().optional().nullable(),
    instagram: z.string().optional().nullable(),
    linkedin: z.string().optional().nullable(),
    github: z.string().optional().nullable(),
    discord: z.string().optional().nullable(),
  }).optional(),
  visibility: z.enum(['public', 'campus_only', 'invite_only']).optional(),
  recruitment_open: z.boolean().optional(),
  is_active: z.boolean().optional(),
  lead_user_id: z.string().uuid().optional().nullable().or(z.literal('')),
});
export type AdminClubUpdateInput = z.infer<typeof AdminClubUpdateSchema>;

// ── DELETE /api/v1/clubs/:slug (Admin Permanent Delete Confirmation) ─────────
export const ClubDeleteConfirmSchema = z.object({
  confirmed_name: z.string().min(1, 'Please confirm the exact club name to delete.'),
});
export type ClubDeleteConfirmInput = z.infer<typeof ClubDeleteConfirmSchema>;

// ── POST /api/v1/clubs/:slug/applications (Student Membership Application) ────
export const ClubMembershipApplySchema = z.object({
  motivation: z
    .string()
    .min(10, 'Motivation must be at least 10 characters.')
    .max(1000, 'Motivation cannot exceed 1000 characters.'),
  interests: z.array(z.string().max(50)).max(10).optional().default([]),
  experience: z.string().max(1000, 'Experience cannot exceed 1000 characters.').optional().nullable(),
});
export type ClubMembershipApplyInput = z.infer<typeof ClubMembershipApplySchema>;

// ── PATCH /api/v1/clubs/:slug/applications/:id (President/Admin Decision) ─────
export const ClubApplicationDecisionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejection_reason: z.string().max(500, 'Rejection reason cannot exceed 500 characters.').optional().nullable(),
});
export type ClubApplicationDecisionInput = z.infer<typeof ClubApplicationDecisionSchema>;

