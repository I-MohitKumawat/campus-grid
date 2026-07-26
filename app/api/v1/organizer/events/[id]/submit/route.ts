import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { submitEventForApproval } from '@/lib/services/event.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

type Params = { id: string };

// POST /api/v1/organizer/events/:id/submit — Submit draft for approval
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
  return withAuth(async (_r, _ctx, user) => {
    try {
      const result = await submitEventForApproval(id, user.sub, user.role || 'student');
      return successResponse(result);
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      console.error('[POST /organizer/events/:id/submit]', err);
      return errorResponse('Failed to submit event for approval.', 500);
    }
  })(req, { params: Promise.resolve({ id }) });
}
