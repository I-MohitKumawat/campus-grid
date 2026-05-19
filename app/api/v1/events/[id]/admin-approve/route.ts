/**
 * app/api/v1/events/[id]/admin-approve/route.ts
 *
 * POST /api/v1/events/:id/admin-approve
 *   Admin approves event → status = published.
 */

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { adminApproveEvent } from '@/lib/services/event.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

type Params = { id: string };

export const POST = withAuth(
  async (_req: NextRequest, ctx: { params: Promise<Params> }, user) => {
    const { id } = await ctx.params;
    try {
      const result = await adminApproveEvent(id, user.sub);
      return successResponse(result);
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      return errorResponse('Failed to approve event.', 500);
    }
  },
  ['admin']
);
