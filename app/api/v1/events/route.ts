/**
 * app/api/v1/events/route.ts
 *
 * GET  /api/v1/events  — List upcoming published events (public)
 * POST /api/v1/events  — Create event (ClubLead, Faculty, Admin)
 */

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { EventCreateSchema } from '@/lib/schemas/event.schemas';
import { listUpcomingEvents, createEvent } from '@/lib/services/event.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

// GET — public
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(params.get('limit') ?? '20', 10), 100);
    const cursor = params.get('cursor') ?? undefined;

    const result = await listUpcomingEvents(limit, cursor);
    return successResponse(result.events, 200, {
      hasMore: result.hasMore,
      cursor: result.cursor,
    });
  } catch (err) {
    console.error('[GET /events]', err);
    return errorResponse('Failed to load events.', 500);
  }
}

// POST — club_lead, faculty, or admin
export const POST = withAuth(
  async (req: NextRequest, _ctx, user) => {
    let body: unknown;
    try { body = await req.json(); }
    catch { return errorResponse('Request body must be valid JSON.', 422, 'INVALID_JSON'); }

    const parsed = EventCreateSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.') || '_root';
        if (!fieldErrors[key]) fieldErrors[key] = [];
        fieldErrors[key].push(issue.message);
      }
      return Response.json(
        { success: false, error: 'Validation failed.', code: 'VALIDATION_ERROR', details: fieldErrors },
        { status: 422 }
      );
    }

    try {
      const event = await createEvent(user.sub, user.role, parsed.data);
      return successResponse(event, 201);
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      console.error('[POST /events]', err);
      return errorResponse('Failed to create event.', 500);
    }
  },
  ['club_lead', 'faculty', 'admin']
);
