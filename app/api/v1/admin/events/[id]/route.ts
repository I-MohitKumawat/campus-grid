/**
 * app/api/v1/admin/events/[id]/route.ts
 * PATCH /api/v1/admin/events/[id] — Change event status (publish, unpublish, cancel, complete, archive)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { updateEventStatusAdmin } from '@/lib/services/admin.service';

export const PATCH = withAuth(async (req: NextRequest, ctx: any, user: any) => {
  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, error: { message: 'Admin privileges required.' } }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await req.json();

  if (!body.status) {
    return NextResponse.json({ success: false, error: { message: 'Status is required.' } }, { status: 400 });
  }

  const data = await updateEventStatusAdmin(id, body.status);
  return NextResponse.json({ success: true, data, message: `Event status updated to ${body.status}.` });
});
