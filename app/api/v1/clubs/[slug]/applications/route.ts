/**
 * app/api/v1/clubs/[slug]/applications/route.ts
 *
 * POST /api/v1/clubs/[slug]/applications — Submit membership application (student)
 * GET  /api/v1/clubs/[slug]/applications — List membership applications
 *   - Admin / Club President: returns all club applications with applicant profile info.
 *   - Student / Member: returns caller's own applications for this club.
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { ClubMembershipApplySchema } from '@/lib/schemas/club.schemas';
import { applyToClub, getClubApplications } from '@/lib/services/club.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

export const POST = withAuth(
  async (req: NextRequest, ctx: { params: Promise<{ slug: string }> }, user) => {
    try {
      const { slug } = await ctx.params;
      const body = await req.json().catch(() => ({}));
      const parsed = ClubMembershipApplySchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse(parsed.error.issues[0]?.message || 'Invalid application payload.', 422);
      }

      const application = await applyToClub(
        slug,
        { id: user.sub, role: user.role },
        parsed.data
      );

      return successResponse(application, 201);
    } catch (err) {
      if (err instanceof AppError) {
        return errorResponse(err.message, err.statusCode, err.code);
      }
      console.error('[POST /clubs/[slug]/applications]', err);
      return errorResponse('Failed to submit membership application.', 500);
    }
  }
);

export const GET = withAuth(
  async (req: NextRequest, ctx: { params: Promise<{ slug: string }> }, user) => {
    try {
      const { slug } = await ctx.params;
      const { searchParams } = new URL(req.url);
      const statusFilter = searchParams.get('status') || undefined;

      const applications = await getClubApplications(
        slug,
        { id: user.sub, role: user.role },
        statusFilter
      );

      return successResponse(applications);
    } catch (err) {
      if (err instanceof AppError) {
        return errorResponse(err.message, err.statusCode, err.code);
      }
      console.error('[GET /clubs/[slug]/applications]', err);
      return errorResponse('Failed to load applications.', 500);
    }
  }
);
