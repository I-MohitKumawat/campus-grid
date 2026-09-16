/**
 * app/api/v1/events/[id]/submit/route.ts
 *
 * POST /api/v1/events/:id/submit
 *   Submit a draft event for approval (organiser or admin).
 *   State machine logic lives entirely in the service.
 */

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { submitEventForApproval } from '@/lib/services/event.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

type Params = { id: string };

export const POST = withAuth(
  async (_req: NextRequest, ctx: { params: Promise<Params> }, user) => {
    const { id } = await ctx.params;
    try {
      const result = await submitEventForApproval(id, user.sub, user.role);
      return successResponse(result);
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      return errorResponse('Failed to submit event.', 500);
    }
  }
);
