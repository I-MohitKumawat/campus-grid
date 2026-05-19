/**
 * app/api/v1/events/[id]/register/route.ts
 *
 * POST   /api/v1/events/:id/register  — Register for event (any auth'd user)
 * DELETE /api/v1/events/:id/register  — Cancel registration
 */

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { EventRegisterSchema } from '@/lib/schemas/event.schemas';
import {
  registerForEvent,
  cancelEventRegistration,
} from '@/lib/services/event.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

type Params = { id: string };

export const POST = withAuth(
  async (req: NextRequest, ctx: { params: Promise<Params> }, user) => {
    const { id } = await ctx.params;

    let body: unknown = {};
    try { body = await req.json(); } catch { /* empty body ok */ }

    const parsed = EventRegisterSchema.safeParse(body);
    const data = parsed.success ? parsed.data : { attendance_mode: 'offline' as const };

    try {
      const registration = await registerForEvent(id, user.sub, data);
      return successResponse(registration, 201);
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      return errorResponse('Failed to register for event.', 500);
    }
  }
);

export const DELETE = withAuth(
  async (_req: NextRequest, ctx: { params: Promise<Params> }, user) => {
    const { id } = await ctx.params;
    try {
      await cancelEventRegistration(id, user.sub);
      return successResponse({ message: 'Registration cancelled.' });
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      return errorResponse('Failed to cancel registration.', 500);
    }
  }
);
