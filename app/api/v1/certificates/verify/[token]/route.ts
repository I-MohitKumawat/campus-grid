/**
 * app/api/v1/certificates/verify/[token]/route.ts
 *
 * GET /api/v1/certificates/verify/:token
 *   Public certificate verification page data.
 */

import type { NextRequest } from 'next/server';
import { verifyCertificate } from '@/lib/services/event.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

type Params = { token: string };

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { token } = await params;
  try {
    const certificate = await verifyCertificate(token);
    return successResponse(certificate);
  } catch (err) {
    if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
    console.error('[GET /certificates/verify/:token]', err);
    return errorResponse('Certificate verification failed.', 500);
  }
}
