/**
 * app/api/v1/clubs/[slug]/applications/[id]/route.ts
 *
 * PATCH /api/v1/clubs/[slug]/applications/[id]
 *   Review & decide a membership application (Approve / Reject).
 *   Authorized for Platform Admin or Club President only.
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { ClubApplicationDecisionSchema } from '@/lib/schemas/club.schemas';
import { decideClubApplication } from '@/lib/services/club.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

export const PATCH = withAuth(
  async (req: NextRequest, ctx: { params: Promise<{ slug: string; id: string }> }, user) => {
    try {
      const { slug, id: applicationId } = await ctx.params;
      const body = await req.json().catch(() => ({}));
      const parsed = ClubApplicationDecisionSchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse(parsed.error.issues[0]?.message || 'Invalid decision payload.', 422);
      }

      const result = await decideClubApplication(
        slug,
        applicationId,
        { id: user.sub, role: user.role },
        parsed.data
      );

      return successResponse(result);
    } catch (err) {
      if (err instanceof AppError) {
        return errorResponse(err.message, err.statusCode, err.code);
      }
      console.error('[PATCH /clubs/[slug]/applications/[id]]', err);
      return errorResponse('Failed to decide membership application.', 500);
    }
  }
);
