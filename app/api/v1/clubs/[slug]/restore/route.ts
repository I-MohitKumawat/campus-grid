/**
 * app/api/v1/clubs/[slug]/restore/route.ts
 *
 * POST /api/v1/clubs/:slug/restore — Restore archived club
 * Authorized for Platform Admin and assigned Faculty Advisors.
 */

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { restoreClub } from '@/lib/services/club.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

type Params = { slug: string };

export const POST = withAuth(
  async (_req: NextRequest, ctx: { params: Promise<Params> }, user) => {
    const { slug } = await ctx.params;

    try {
      const restored = await restoreClub(slug, { id: user.sub, role: user.role });
      return successResponse(restored);
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      console.error('[POST /clubs/:slug/restore]', err);
      return errorResponse('Failed to restore club.', 500);
    }
  }
);
