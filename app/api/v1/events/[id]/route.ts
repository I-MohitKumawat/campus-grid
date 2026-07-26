/**
 * app/api/v1/events/[id]/route.ts
 *
 * GET    /api/v1/events/:id  — Event detail (public)
 * PATCH  /api/v1/events/:id  — Update event (ClubLead or Admin)
 * DELETE /api/v1/events/:id  — Soft delete event (Admin only)
 */

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { EventUpdateSchema } from '@/lib/schemas/event.schemas';
import { extractToken, verifyToken } from '@/lib/jwt';
import {
  getEventById,
  getRelatedEvents,
  updateEvent,
  adminDeleteEvent,
} from '@/lib/services/event.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

type Params = { id: string };

// GET — public or authenticated
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
  try {
    const token = extractToken(req);
    let userId: string | null = null;
    if (token) {
      try {
        const decoded = verifyToken(token);
        userId = decoded.sub;
      } catch {
        // Token optional for GET details
      }
    }

    const event = await getEventById(id, userId);
    const related = await getRelatedEvents(id, event.event_type, event.club_id);

    return successResponse({
      ...event,
      related_events: related,
    });
  } catch (err) {
    if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
    console.error('[GET /events/:id]', err);
    return errorResponse('Failed to load event.', 500);
  }
}

// PATCH — club_lead or admin
export const PATCH = withAuth(
  async (req: NextRequest, ctx: { params: Promise<Params> }, user) => {
    const { id } = await ctx.params;

    let body: unknown;
    try { body = await req.json(); }
    catch { return errorResponse('Request body must be valid JSON.', 422, 'INVALID_JSON'); }

    const parsed = EventUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: 'Validation failed.', code: 'VALIDATION_ERROR' },
        { status: 422 }
      );
    }

    try {
      const event = await updateEvent(id, user.sub, user.role, parsed.data);
      return successResponse(event);
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      return errorResponse('Failed to update event.', 500);
    }
  },
  ['club_lead', 'admin']
);

// DELETE — admin only
export const DELETE = withAuth(
  async (_req: NextRequest, ctx: { params: Promise<Params> }, _user) => {
    const { id } = await ctx.params;
    try {
      await adminDeleteEvent(id);
      return successResponse({ message: 'Event deleted.' });
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      return errorResponse('Failed to delete event.', 500);
    }
  },
  ['admin']
);
