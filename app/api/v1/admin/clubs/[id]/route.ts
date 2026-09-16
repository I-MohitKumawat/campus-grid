/**
 * app/api/v1/admin/clubs/[id]/route.ts
 * PATCH /api/v1/admin/clubs/[id] — Update club & lead assignment
 * DELETE /api/v1/admin/clubs/[id] — Archive club
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { updateClubAdmin, archiveClubAdmin } from '@/lib/services/admin.service';
import { AdminClubUpdateSchema } from '@/lib/schemas/club.schemas';

export const PATCH = withAuth(async (req: NextRequest, ctx: any, user: any) => {
  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, error: { message: 'Admin privileges required.' } }, { status: 403 });
  }

  const { id } = await ctx.params;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: { message: 'Invalid JSON body.' } }, { status: 400 });
  }

  const parsed = AdminClubUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message || 'Validation failed.';
    return NextResponse.json({ success: false, error: { message: firstIssue, details: parsed.error.issues } }, { status: 422 });
  }

  try {
    const data = await updateClubAdmin(id, parsed.data);
    return NextResponse.json({ success: true, data, message: 'Club updated successfully.' });
  } catch (err: any) {
    console.error('[PATCH /api/v1/admin/clubs/:id] Error:', err);
    return NextResponse.json({ success: false, error: { message: err?.message || 'Failed to update club.' } }, { status: 500 });
  }
});

export const DELETE = withAuth(async (req: NextRequest, ctx: any, user: any) => {
  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, error: { message: 'Admin privileges required.' } }, { status: 403 });
  }

  const { id } = await ctx.params;
  await archiveClubAdmin(id);
  return NextResponse.json({ success: true, message: 'Club archived successfully.' });
});
