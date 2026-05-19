/**
 * app/api/v1/clubs/[slug]/members/invite/route.ts
 *
 * POST /api/v1/clubs/:id/members/invite
 *   Club lead invites a user by username.
 */

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { ClubMemberInviteSchema } from '@/lib/schemas/club.schemas';
import { inviteClubMember, getClubBySlug } from '@/lib/services/club.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

type Params = { slug: string };

export const POST = withAuth(
  async (req: NextRequest, ctx: { params: Promise<Params> }, user) => {
    const { slug } = await ctx.params;

    let body: unknown;
    try { body = await req.json(); }
    catch { return errorResponse('Request body must be valid JSON.', 422, 'INVALID_JSON'); }

    const parsed = ClubMemberInviteSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: 'Validation failed.', code: 'VALIDATION_ERROR' },
        { status: 422 }
      );
    }

    try {
      const club = await getClubBySlug(slug);
      await inviteClubMember(club.id as string, user.sub, parsed.data);
      return successResponse({ message: 'Member invited successfully.' }, 201);
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      console.error('[POST /clubs/:slug/members/invite]', err);
      return errorResponse('Failed to invite member.', 500);
    }
  },
  ['club_lead']
);
