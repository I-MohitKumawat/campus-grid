/**
 * app/api/v1/clubs/route.ts
 *
 * GET  /api/v1/clubs         — List all approved clubs (public)
 * POST /api/v1/clubs/register — Submit a new club registration (any auth'd user)
 */

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { ClubRegisterSchema } from '@/lib/schemas/club.schemas';
import { listApprovedClubs, registerClub } from '@/lib/services/club.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

// GET — public, no auth required
export async function GET(_req: NextRequest) {
  try {
    const clubs = await listApprovedClubs();
    return successResponse(clubs);
  } catch (err) {
    console.error('[GET /clubs]', err);
    return errorResponse('Failed to load clubs.', 500);
  }
}
