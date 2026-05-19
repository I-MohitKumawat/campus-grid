/**
 * app/api/v1/clubs/me/route.ts
 *
 * GET /api/v1/clubs/me
 *   Return the club led by the currently authenticated club_lead.
 */

import { withAuth } from '@/lib/middleware/with-auth';
import { getClubByLeadUser } from '@/lib/services/club.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

export const GET = withAuth(
  async (_req, _ctx, user) => {
    try {
      const club = await getClubByLeadUser(user.sub);
      return successResponse(club);
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      console.error('[GET /clubs/me]', err);
      return errorResponse('Failed to load your club.', 500);
    }
  },
  ['club_lead', 'admin']
);
