/**
 * app/api/v1/clubs/register/route.ts
 *
 * POST /api/v1/clubs/register
 *   Submit a club registration request. Sets verification_status = 'pending'.
 *   Any authenticated user may submit. A user can only have one lead club at a time.
 */

import { withAuth } from '@/lib/middleware/with-auth';
import { ClubRegisterSchema } from '@/lib/schemas/club.schemas';
import { registerClub } from '@/lib/services/club.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

export const POST = withAuth(async (req, _ctx, user) => {
  let body: unknown;
  try { body = await req.json(); }
  catch { return errorResponse('Request body must be valid JSON.', 422, 'INVALID_JSON'); }

  const parsed = ClubRegisterSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || '_root';
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return Response.json(
      { success: false, error: 'Validation failed.', code: 'VALIDATION_ERROR', details: fieldErrors },
      { status: 422 }
    );
  }

  try {
    const club = await registerClub(user.sub, parsed.data);
    return successResponse(club, 201);
  } catch (err) {
    if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
    console.error('[POST /clubs/register]', err);
    return errorResponse('Failed to register club.', 500);
  }
});
