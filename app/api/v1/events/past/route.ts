/**
 * app/api/v1/events/past/route.ts
 *
 * GET /api/v1/events/past
 *   Past completed public events, paginated (offset-based).
 */

import type { NextRequest } from 'next/server';
import { listPastEvents } from '@/lib/services/event.service';
import { successResponse, errorResponse } from '@/lib/response';

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(params.get('limit') ?? '20', 10), 100);
    const page = Math.max(parseInt(params.get('page') ?? '1', 10), 1);

    const result = await listPastEvents(limit, page);
    return successResponse(result.events, 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
      hasMore: result.page * result.limit < result.total,
    });
  } catch (err) {
    console.error('[GET /events/past]', err);
    return errorResponse('Failed to load past events.', 500);
  }
}
