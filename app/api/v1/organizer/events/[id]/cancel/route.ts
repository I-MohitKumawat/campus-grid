/**
 * app/api/v1/organizer/events/[id]/cancel/route.ts
 *
 * POST /api/v1/organizer/events/:id/cancel
 *   Cancels an event (Organizer or Admin).
 *   Changes status to 'cancelled', stops registrations, and notifies attendees.
 */

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { cancelEvent } from '@/lib/services/event.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

type Params = { id: string };

export const POST = withAuth(
  async (req: NextRequest, ctx: { params: Promise<Params> }, user) => {
    const { id } = await ctx.params;

    let body: { reason?: string } = {};
    try {
      body = await req.json().catch(() => ({}));
    } catch {
      // Empty body is acceptable
    }

    try {
      const result = await cancelEvent(id, user.sub, user.role, body.reason);
      return successResponse(result);
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      console.error('[POST /organizer/events/:id/cancel]', err);
      return errorResponse('Failed to cancel event.', 500);
    }
  }
);
