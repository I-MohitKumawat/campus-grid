/**
 * app/api/v1/clubs/register/[id]/route.ts
 *
 * PATCH /api/v1/clubs/register/:id
 *   Admin approves or rejects a pending club registration.
 */

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { ClubRegistrationDecisionSchema } from '@/lib/schemas/club.schemas';
import { processClubRegistration } from '@/lib/services/club.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

export const PATCH = withAuth(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }, _user) => {
    const { id } = await ctx.params;

    let body: unknown;
    try { body = await req.json(); }
    catch { return errorResponse('Request body must be valid JSON.', 422, 'INVALID_JSON'); }

    const parsed = ClubRegistrationDecisionSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: 'Validation failed.', code: 'VALIDATION_ERROR' },
        { status: 422 }
      );
    }

    try {
      const result = await processClubRegistration(id, parsed.data);
      return successResponse(result);
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      console.error('[PATCH /clubs/register/:id]', err);
      return errorResponse('Failed to process registration.', 500);
    }
  },
  ['admin']
);
