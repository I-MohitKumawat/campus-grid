/**
 * app/api/v1/admin/clubs/route.ts
 * GET /api/v1/admin/clubs — List clubs with search/filter
 * POST /api/v1/admin/clubs — Create club & assign lead
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { getAllClubsAdmin, createClubAdmin } from '@/lib/services/admin.service';

export const GET = withAuth(async (req: NextRequest, ctx: any, user: any) => {
  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, error: { message: 'Admin privileges required.' } }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || undefined;
  const category = searchParams.get('category') || undefined;

  const data = await getAllClubsAdmin(search, category);
  return NextResponse.json({ success: true, data });
});

export const POST = withAuth(async (req: NextRequest, ctx: any, user: any) => {
  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, error: { message: 'Admin privileges required.' } }, { status: 403 });
  }

  const body = await req.json();
  if (!body.name) {
    return NextResponse.json({ success: false, error: { message: 'Club name is required.' } }, { status: 400 });
  }

  const data = await createClubAdmin(body);
  return NextResponse.json({ success: true, data, message: 'Club created successfully.' });
});
