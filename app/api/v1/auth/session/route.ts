/**
 * app/api/v1/auth/session/route.ts
 *
 * POST /api/v1/auth/session
 *   Exchange a Clerk session token for a platform JWT stored in an HTTP-only cookie.
 *   This is called by the frontend immediately after Clerk signs the user in.
 *
 * DELETE /api/v1/auth/session
 *   Invalidate the session by clearing the cg_token cookie.
 */

import type { NextRequest } from 'next/server';
import { withValidation } from '@/lib/middleware/with-validation';
import { withAuth } from '@/lib/middleware/with-auth';
import { SessionCreateSchema } from '@/lib/schemas/auth.schemas';
import { verifyClerkTokenAndUpsertUser } from '@/lib/services/auth.service';
import { signToken, buildSessionCookie, clearSessionCookie } from '@/lib/jwt';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

// POST — create session
export const POST = withValidation(
  SessionCreateSchema,
  async (_req, _ctx, body) => {
    try {
      const platformUser = await verifyClerkTokenAndUpsertUser(body.clerk_token);

      const token = signToken({
        sub: platformUser.id,
        role: platformUser.role,
        clerk_id: platformUser.clerk_user_id,
      });

      const cookie = buildSessionCookie(token);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: platformUser.id,
            email: platformUser.email,
            username: platformUser.username,
            role: platformUser.role,
            is_onboarded: platformUser.is_onboarded,
            onboarding_step: platformUser.onboarding_step,
            xp: platformUser.xp,
            campus_score: platformUser.campus_score,
            avatar_url: platformUser.avatar_url,
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': cookie,
          },
        }
      );
    } catch (err) {
      if (err instanceof AppError) {
        return errorResponse(err.message, err.statusCode, err.code);
      }
      console.error('[POST /auth/session]', err);
      return errorResponse('Authentication failed.', 500, 'INTERNAL_ERROR');
    }
  }
);

// DELETE — invalidate session
export const DELETE = withAuth(async (_req, _ctx, _user) => {
  return new Response(
    JSON.stringify({ success: true, data: { message: 'Session cleared.' } }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': clearSessionCookie(),
      },
    }
  );
});
