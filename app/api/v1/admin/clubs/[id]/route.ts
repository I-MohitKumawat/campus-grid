/**
 * app/api/v1/admin/clubs/[id]/route.ts
 * PATCH /api/v1/admin/clubs/[id] — Update club & lead assignment
 * DELETE /api/v1/admin/clubs/[id] — Archive club
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { updateClubAdmin, archiveClubAdmin } from '@/lib/services/admin.service';

export const PATCH = withAuth(async (req: NextRequest, ctx: any, user: any) => {
  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, error: { message: 'Admin privileges required.' } }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await req.json();

  const data = await updateClubAdmin(id, body);
  return NextResponse.json({ success: true, data, message: 'Club updated successfully.' });
});

export const DELETE = withAuth(async (req: NextRequest, ctx: any, user: any) => {
  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, error: { message: 'Admin privileges required.' } }, { status: 403 });
  }

  const { id } = await ctx.params;
  await archiveClubAdmin(id);
  return NextResponse.json({ success: true, message: 'Club archived successfully.' });
});
