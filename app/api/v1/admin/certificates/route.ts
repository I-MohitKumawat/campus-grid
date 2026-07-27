/**
 * app/api/v1/admin/certificates/route.ts
 * GET /api/v1/admin/certificates — View all platform digital certificates
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { getAllCertificatesAdmin } from '@/lib/services/admin.service';

export const GET = withAuth(async (req: NextRequest, ctx: any, user: any) => {
  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, error: { message: 'Admin privileges required.' } }, { status: 403 });
  }

  const data = await getAllCertificatesAdmin();
  return NextResponse.json({ success: true, data });
});
