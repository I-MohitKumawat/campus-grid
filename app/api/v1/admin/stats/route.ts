/**
 * app/api/v1/admin/stats/route.ts
 * GET /api/v1/admin/stats — Fetch operational admin dashboard metrics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { getAdminDashboardOverview } from '@/lib/services/admin.service';

export const GET = withAuth(async (req: NextRequest, ctx: any, user: any) => {
  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, error: { message: 'Admin privileges required.' } }, { status: 403 });
  }

  const data = await getAdminDashboardOverview();
  return NextResponse.json({ success: true, data });
});
