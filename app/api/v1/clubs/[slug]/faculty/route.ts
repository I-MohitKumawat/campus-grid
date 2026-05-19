/**
 * app/api/v1/clubs/[slug]/faculty/route.ts
 *
 * POST /api/v1/clubs/:id/faculty
 *   Assign a faculty advisor to a club (Admin or ClubLead).
 */

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { ClubFacultyAssignSchema } from '@/lib/schemas/club.schemas';
import { assignFacultyAdvisor, getClubBySlug } from '@/lib/services/club.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

type Params = { slug: string };

export const POST = withAuth(
  async (req: NextRequest, ctx: { params: Promise<Params> }, user) => {
    const { slug } = await ctx.params;

    let body: unknown;
    try { body = await req.json(); }
    catch { return errorResponse('Request body must be valid JSON.', 422, 'INVALID_JSON'); }

    const parsed = ClubFacultyAssignSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: 'Validation failed.', code: 'VALIDATION_ERROR' },
        { status: 422 }
      );
    }

    try {
      const club = await getClubBySlug(slug);
      await assignFacultyAdvisor(club.id as string, user.sub, user.role, parsed.data);
      return successResponse({ message: 'Faculty advisor assigned.' }, 201);
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      return errorResponse('Failed to assign faculty advisor.', 500);
    }
  },
  ['admin', 'club_lead']
);
