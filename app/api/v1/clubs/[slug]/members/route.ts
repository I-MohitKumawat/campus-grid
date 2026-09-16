/**
 * app/api/v1/clubs/[slug]/members/route.ts
 *
 * GET  /api/v1/clubs/:id/members         — Member roster (ClubLead or Faculty)
 * POST /api/v1/clubs/:id/members/invite  — Invite member by username (ClubLead)
 */

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { ClubMemberInviteSchema } from '@/lib/schemas/club.schemas';
import {
  getClubMembers,
  inviteClubMember,
  getClubBySlug,
} from '@/lib/services/club.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

type Params = { slug: string };

// GET — Public member roster for club
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { slug } = await params;
  try {
    const club = await getClubBySlug(slug);
    const members = await getClubMembers(club.id as string);
    return successResponse(members);
  } catch (err) {
    if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
    console.error('[GET /clubs/:slug/members]', err);
    return errorResponse('Failed to load members.', 500);
  }
}
