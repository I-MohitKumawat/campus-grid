import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { decideApplications } from '@/lib/services/event.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

type Params = { id: string };

// POST /api/v1/organizer/events/:id/applications/decide — Single & Bulk Approve/Reject Applications
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
  return withAuth(async (r, _ctx, user) => {
    try {
      const body = await r.json();
      const { registration_ids, action, decision_notes } = body;

      if (!registration_ids || !Array.isArray(registration_ids) || registration_ids.length === 0) {
        return errorResponse('Missing registration_ids array.', 400);
      }
      if (action !== 'approve' && action !== 'reject') {
        return errorResponse('Action must be either "approve" or "reject".', 400);
      }

      const result = await decideApplications({
        eventId: id,
        organizerId: user.sub,
        registrationIds: registration_ids,
        action,
        decisionNotes: decision_notes,
      });

      return successResponse(result);
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      console.error('[POST /organizer/events/:id/applications/decide]', err);
      return errorResponse('Failed to process application decisions.', 500);
    }
  })(req, { params: Promise.resolve({ id }) });
}
