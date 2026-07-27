/**
 * app/api/v1/admin/events/route.ts
 * GET /api/v1/admin/events — List all events for admin operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { getAllEventsAdmin } from '@/lib/services/admin.service';

export const GET = withAuth(async (req: NextRequest, ctx: any, user: any) => {
  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, error: { message: 'Admin privileges required.' } }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || undefined;
  const search = searchParams.get('search') || undefined;

  const data = await getAllEventsAdmin(status, search);
  return NextResponse.json({ success: true, data });
});
