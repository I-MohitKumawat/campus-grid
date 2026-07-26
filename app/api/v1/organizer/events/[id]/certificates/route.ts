import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { issueCertificatesForEvent, getEventCertificates } from '@/lib/services/event.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

type Params = { id: string };

// GET /api/v1/organizer/events/:id/certificates — List issued certificates
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
  return withAuth(async (_r, _ctx, _user) => {
    try {
      const certs = await getEventCertificates(id);
      return successResponse(certs);
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      console.error('[GET /organizer/events/:id/certificates]', err);
      return errorResponse('Failed to fetch certificates.', 500);
    }
  })(req, { params: Promise.resolve({ id }) });
}

// POST /api/v1/organizer/events/:id/certificates — Issue certificates for all attended students
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
  return withAuth(async (_r, _ctx, user) => {
    try {
      const result = await issueCertificatesForEvent(id, user.sub);
      return successResponse(result);
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      console.error('[POST /organizer/events/:id/certificates]', err);
      return errorResponse('Failed to issue certificates.', 500);
    }
  })(req, { params: Promise.resolve({ id }) });
}
