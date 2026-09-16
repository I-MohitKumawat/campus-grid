/**
 * app/api/v1/clubs/[slug]/members/[uid]/route.ts
 *
 * PATCH  /api/v1/clubs/:id/members/:uid — Update member role or posting access
 * DELETE /api/v1/clubs/:id/members/:uid — Remove member from club
 */

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { ClubMemberUpdateSchema } from '@/lib/schemas/club.schemas';
import {
  updateClubMember,
  removeClubMember,
  getClubBySlug,
} from '@/lib/services/club.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

type Params = { slug: string; uid: string };

export const PATCH = withAuth(
  async (req: NextRequest, ctx: { params: Promise<Params> }, user) => {
    const { slug, uid } = await ctx.params;

    let body: unknown;
    try { body = await req.json(); }
    catch { return errorResponse('Request body must be valid JSON.', 422, 'INVALID_JSON'); }

    const parsed = ClubMemberUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: 'Validation failed.', code: 'VALIDATION_ERROR' },
        { status: 422 }
      );
    }

    try {
      const club = await getClubBySlug(slug);
      await updateClubMember(club.id as string, uid, user.sub, user.role, parsed.data);
      return successResponse({ message: 'Member updated.' });
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      return errorResponse('Failed to update member.', 500);
    }
  }
);

export const DELETE = withAuth(
  async (_req: NextRequest, ctx: { params: Promise<Params> }, user) => {
    const { slug, uid } = await ctx.params;

    try {
      const club = await getClubBySlug(slug);
      await removeClubMember(club.id as string, uid, user.sub, user.role);
      return successResponse({ message: 'Member removed.' });
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      return errorResponse('Failed to remove member.', 500);
    }
  }
);
