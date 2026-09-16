/**
 * app/api/v1/events/[id]/registrations/route.ts
 *
 * GET /api/v1/events/:id/registrations
 *   Full attendee roster for an event (ClubLead or Admin).
 */

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { getEventRegistrations } from '@/lib/services/event.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

type Params = { id: string };

export const GET = withAuth(
  async (_req: NextRequest, ctx: { params: Promise<Params> }, user) => {
    const { id } = await ctx.params;
    try {
      const registrations = await getEventRegistrations(id, user.sub, user.role);
      return successResponse(registrations);
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      return errorResponse('Failed to load registrations.', 500);
    }
  }
);
