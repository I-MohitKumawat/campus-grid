/**
 * app/api/v1/clubs/route.ts
 *
 * GET  /api/v1/clubs         — List all approved active clubs (public)
 * GET  /api/v1/clubs?joined=true — List active clubs joined by the authenticated user
 */

import type { NextRequest } from 'next/server';
import { extractToken, verifyToken } from '@/lib/jwt';
import { listApprovedClubs, getMyJoinedClubs } from '@/lib/services/club.service';
import { successResponse, errorResponse } from '@/lib/response';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const joinedOnly = searchParams.get('joined') === 'true';

    if (joinedOnly) {
      const token = extractToken(req);
      if (!token) {
        return successResponse([]);
      }
      try {
        const user = verifyToken(token);
        const joinedClubs = await getMyJoinedClubs(user.sub);
        return successResponse(joinedClubs);
      } catch {
        return successResponse([]);
      }
    }

    const clubs = await listApprovedClubs();
    return successResponse(clubs);
  } catch (err) {
    console.error('[GET /clubs]', err);
    return errorResponse('Failed to load clubs.', 500);
  }
}
