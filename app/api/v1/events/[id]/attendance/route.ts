/**
 * app/api/v1/events/[id]/attendance/route.ts
 *
 * POST /api/v1/events/:id/attendance
 *   Mark a single attendee as attended.
 *   Accepts either { user_id } or { qr_token }.
 */

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { MarkAttendanceSchema } from '@/lib/schemas/event.schemas';
import { markAttendance } from '@/lib/services/event.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

type Params = { id: string };

export const POST = withAuth(
  async (req: NextRequest, ctx: { params: Promise<Params> }, user) => {
    const { id } = await ctx.params;

    let body: unknown;
    try { body = await req.json(); }
    catch { return errorResponse('Request body must be valid JSON.', 422, 'INVALID_JSON'); }

    const parsed = MarkAttendanceSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: 'Provide either user_id or qr_token.', code: 'VALIDATION_ERROR' },
        { status: 422 }
      );
    }

    try {
      const result = await markAttendance(id, user.sub, user.role, parsed.data);
      return successResponse(result);
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      return errorResponse('Failed to mark attendance.', 500);
    }
  }
);
