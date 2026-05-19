/**
 * lib/schemas/auth.schemas.ts
 *
 * Zod schemas for authentication and onboarding endpoints.
 * All request bodies are validated against these before reaching handlers.
 */

import { z } from 'zod';

// ── POST /api/v1/auth/session ─────────────────────────────────────────────────
export const SessionCreateSchema = z.object({
  /** Clerk session token from the frontend's getToken() call */
  clerk_token: z.string().min(1, 'Clerk session token is required.'),
});
export type SessionCreateInput = z.infer<typeof SessionCreateSchema>;

// ── POST /api/v1/auth/onboarding ─────────────────────────────────────────────
export const OnboardingSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters.').max(100),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters.')
    .max(30)
    .regex(
      /^[a-z0-9_-]+$/,
      'Username may only contain lowercase letters, numbers, underscores, or hyphens.'
    ),
  year: z.number().int().min(1).max(4).optional(),
  department: z.string().min(1).max(100).optional(),
  roll_number: z.string().max(20).optional(),
  interests: z.array(z.string().max(50)).max(10).optional(),
  bio: z.string().max(300).optional(),
});
export type OnboardingInput = z.infer<typeof OnboardingSchema>;
