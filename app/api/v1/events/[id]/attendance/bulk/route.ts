/**
 * app/api/v1/events/[id]/attendance/bulk/route.ts
 *
 * POST /api/v1/events/:id/attendance/bulk
 *   Bulk mark attendance for multiple user IDs at once.
 */

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { BulkAttendanceSchema } from '@/lib/schemas/event.schemas';
import { markBulkAttendance } from '@/lib/services/event.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

type Params = { id: string };

export const POST = withAuth(
  async (req: NextRequest, ctx: { params: Promise<Params> }, user) => {
    const { id } = await ctx.params;

    let body: unknown;
    try { body = await req.json(); }
    catch { return errorResponse('Request body must be valid JSON.', 422, 'INVALID_JSON'); }

    const parsed = BulkAttendanceSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: 'user_ids must be a non-empty array of UUIDs (max 500).', code: 'VALIDATION_ERROR' },
        { status: 422 }
      );
    }

    try {
      const result = await markBulkAttendance(id, user.sub, user.role, parsed.data);
      return successResponse(result);
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      return errorResponse('Failed to mark bulk attendance.', 500);
    }
  },
  ['club_lead', 'faculty', 'admin']
);
