/**
 * app/api/v1/clubs/[slug]/faculty/route.ts
 *
 * POST /api/v1/clubs/:id/faculty
 *   Assign a faculty advisor to a club (Admin or ClubLead).
 */

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { ClubFacultyAssignSchema } from '@/lib/schemas/club.schemas';
import { assignFacultyAdvisor, getClubBySlug, getClubFacultyAdvisors } from '@/lib/services/club.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

type Params = { slug: string };

// GET /api/v1/clubs/:slug/faculty — Return assigned faculty advisors
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { slug } = await params;
  try {
    const club = await getClubBySlug(slug);
    const advisors = await getClubFacultyAdvisors(club.id as string);
    return successResponse(advisors);
  } catch (err) {
    if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
    console.error('[GET /clubs/:slug/faculty]', err);
    return errorResponse('Failed to load faculty advisors.', 500);
  }
}

export const POST = withAuth(
  async (req: NextRequest, ctx: { params: Promise<Params> }, user) => {
    const { slug } = await ctx.params;

    let body: unknown;
    try { body = await req.json(); }
    catch { return errorResponse('Request body must be valid JSON.', 422, 'INVALID_JSON'); }

    const parsed = ClubFacultyAssignSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: 'Validation failed.', code: 'VALIDATION_ERROR' },
        { status: 422 }
      );
    }

    try {
      const club = await getClubBySlug(slug);
      await assignFacultyAdvisor(club.id as string, user.sub, user.role, parsed.data);
      return successResponse({ message: 'Faculty advisor assigned.' }, 201);
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      return errorResponse('Failed to assign faculty advisor.', 500);
    }
  }
);

// DELETE /api/v1/clubs/:slug/faculty?faculty_id=... — Admin only
export const DELETE = withAuth(
  async (req: NextRequest, ctx: { params: Promise<Params> }, user) => {
    if (user.role !== 'admin') {
      return errorResponse('Only platform administrators can remove faculty advisors.', 403, 'FORBIDDEN');
    }
    const { slug } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const facultyId = searchParams.get('faculty_id');
    if (!facultyId) {
      return errorResponse('faculty_id query parameter is required.', 422, 'VALIDATION_ERROR');
    }

    try {
      const club = await getClubBySlug(slug);
      const { removeFacultyAdvisor } = await import('@/lib/services/club.service');
      await removeFacultyAdvisor(club.id as string, facultyId);
      return successResponse({ message: 'Faculty advisor removed.' });
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      return errorResponse('Failed to remove faculty advisor.', 500);
    }
  },
  ['admin']
);
