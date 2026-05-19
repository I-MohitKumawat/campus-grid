/**
 * app/api/v1/events/[id]/admin-reject/route.ts
 *
 * POST /api/v1/events/:id/admin-reject
 *   Admin rejects event → back to draft with rejection note.
 */

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { AdminRejectSchema } from '@/lib/schemas/event.schemas';
import { adminRejectEvent } from '@/lib/services/event.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

type Params = { id: string };

export const POST = withAuth(
  async (req: NextRequest, ctx: { params: Promise<Params> }, user) => {
    const { id } = await ctx.params;

    let body: unknown;
    try { body = await req.json(); }
    catch { return errorResponse('Request body must be valid JSON.', 422, 'INVALID_JSON'); }

    const parsed = AdminRejectSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: 'Rejection note is required (min 10 chars).', code: 'VALIDATION_ERROR' },
        { status: 422 }
      );
    }

    try {
      const result = await adminRejectEvent(id, user.sub, parsed.data.note);
      return successResponse(result);
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      return errorResponse('Failed to reject event.', 500);
    }
  },
  ['admin']
);
