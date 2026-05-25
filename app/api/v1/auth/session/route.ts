/**
 * app/api/v1/auth/session/route.ts
 *
 * POST /api/v1/auth/session
 *   Exchange a Firebase ID token for a platform JWT stored in an HTTP-only cookie.
 *   This is called by the frontend immediately after Firebase signs the user in.
 *
 * DELETE /api/v1/auth/session
 *   Invalidate the session by clearing the cg_token cookie.
 */

import type { NextRequest } from 'next/server';
import { withValidation } from '@/lib/middleware/with-validation';
import { withAuth } from '@/lib/middleware/with-auth';
import { SessionCreateSchema } from '@/lib/schemas/auth.schemas';
import { verifyFirebaseTokenAndUpsertUser } from '@/lib/services/auth.service';
import { signToken, buildSessionCookie, clearSessionCookie } from '@/lib/jwt';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError, NotFoundError } from '@/lib/errors';
import { query } from '@/lib/db/client';

// POST — create session
export const POST = withValidation(
  SessionCreateSchema,
  async (_req, _ctx, body) => {
    try {
      const platformUser = await verifyFirebaseTokenAndUpsertUser(body.id_token);

      const token = signToken({
        sub: platformUser.id,
        role: platformUser.role,
        firebase_uid: platformUser.firebase_uid,
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

// GET — fetch active session user details
export const GET = withAuth(async (_req, _ctx, user) => {
  try {
    const result = await query(
      `SELECT id, email, username, role, is_onboarded, onboarding_step, xp, campus_score, avatar_url
       FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [user.sub]
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('User not found.');
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result.rows[0],
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    if (err instanceof AppError) {
      return errorResponse(err.message, err.statusCode, err.code);
    }
    console.error('[GET /auth/session]', err);
    return errorResponse('Failed to retrieve session.', 500, 'INTERNAL_ERROR');
  }
});

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
