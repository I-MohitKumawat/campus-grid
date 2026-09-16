import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { broadcastAnnouncement } from '@/lib/services/event.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

type Params = { id: string };

// POST /api/v1/organizer/events/:id/announcements — Broadcast announcement to attendees
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
  return withAuth(async (r, _ctx, user) => {
    try {
      let body: any = {};
      try {
        body = await r.json();
      } catch {
        body = {};
      }
      const { title, message } = body || {};

      const result = await broadcastAnnouncement(id, user.sub, user.role, title, message);
      return successResponse(result);
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      console.error('[POST /organizer/events/:id/announcements]', err);
      return errorResponse('Failed to broadcast announcement.', 500);
    }
  })(req, { params: Promise.resolve({ id }) });
}
