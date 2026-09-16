/**
 * app/api/v1/admin/clubs/route.ts
 * GET /api/v1/admin/clubs — List clubs with search/filter
 * POST /api/v1/admin/clubs — Create club & assign lead
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { getAllClubsAdmin, createClubAdmin } from '@/lib/services/admin.service';
import { AdminClubCreateSchema } from '@/lib/schemas/club.schemas';

export const GET = withAuth(async (req: NextRequest, ctx: any, user: any) => {
  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, error: { message: 'Admin privileges required.' } }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || undefined;
  const category = searchParams.get('category') || undefined;
  const status = (searchParams.get('status') as 'active' | 'archived' | 'all') || undefined;

  const data = await getAllClubsAdmin(search, category, status);
  return NextResponse.json({ success: true, data });
});

export const POST = withAuth(async (req: NextRequest, ctx: any, user: any) => {
  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, error: { message: 'Admin privileges required.' } }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: { message: 'Invalid JSON request body.' } }, { status: 400 });
  }

  const parsed = AdminClubCreateSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message || 'Validation failed.';
    return NextResponse.json({ success: false, error: { message: firstIssue, details: parsed.error.issues } }, { status: 422 });
  }

  try {
    const data = await createClubAdmin(parsed.data);
    return NextResponse.json({ success: true, data, message: 'Club created successfully.' }, { status: 201 });
  } catch (err: any) {
    if (err?.code === '23505') {
      return NextResponse.json({ success: false, error: { message: 'A club with this name or slug already exists.' } }, { status: 409 });
    }
    console.error('[POST /api/v1/admin/clubs] Error:', err);
    return NextResponse.json({ success: false, error: { message: err?.message || 'Failed to create club.' } }, { status: 500 });
  }
});

