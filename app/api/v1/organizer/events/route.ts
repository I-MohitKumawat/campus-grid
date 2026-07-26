import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { getOrganizerEvents } from '@/lib/services/event.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

// GET /api/v1/organizer/events — Returns organizer dashboard events list
export const GET = withAuth(async (_req, _ctx, user) => {
  try {
    const events = await getOrganizerEvents(user.sub);
    return successResponse(events);
  } catch (err) {
    if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
    console.error('[GET /api/v1/organizer/events]', err);
    return errorResponse('Failed to fetch organizer events.', 500);
  }
});
