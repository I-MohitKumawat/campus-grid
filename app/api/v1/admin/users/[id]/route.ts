/**
 * app/api/v1/admin/users/[id]/route.ts
 * PATCH /api/v1/admin/users/[id] — Assign platform user role (student, club_lead, faculty, admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { updateUserRoleAdmin } from '@/lib/services/admin.service';

export const PATCH = withAuth(async (req: NextRequest, ctx: any, user: any) => {
  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, error: { message: 'Admin privileges required.' } }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await req.json();

  if (!body.role) {
    return NextResponse.json({ success: false, error: { message: 'Role is required.' } }, { status: 400 });
  }

  const data = await updateUserRoleAdmin(id, body.role);
  return NextResponse.json({ success: true, data, message: `User role updated to ${body.role}.` });
});
