import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { query } from '@/lib/db/client';
import { successResponse, errorResponse } from '@/lib/response';

// GET /api/v1/notifications — Student in-app notifications
export const GET = withAuth(async (_req, _ctx, user) => {
  try {
    const result = await query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [user.sub]
    );
    return successResponse(result.rows);
  } catch (err) {
    console.error('[GET /api/v1/notifications]', err);
    return errorResponse('Failed to fetch notifications.', 500);
  }
});
