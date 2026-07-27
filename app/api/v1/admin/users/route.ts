/**
 * app/api/v1/admin/users/route.ts
 * GET /api/v1/admin/users — List platform users with search/role filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { getAllUsersAdmin } from '@/lib/services/admin.service';

export const GET = withAuth(async (req: NextRequest, ctx: any, user: any) => {
  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, error: { message: 'Admin privileges required.' } }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || undefined;
  const role = searchParams.get('role') || undefined;

  const data = await getAllUsersAdmin(search, role);
  return NextResponse.json({ success: true, data });
});
