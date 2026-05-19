/**
 * app/api/v1/clubs/[slug]/route.ts
 *
 * GET   /api/v1/clubs/:slug  — Public club page data
 * PATCH /api/v1/clubs/:slug  — Update club (ClubLead or Admin)
 */

import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { ClubUpdateSchema } from '@/lib/schemas/club.schemas';
import {
  getClubBySlug,
  updateClub,
} from '@/lib/services/club.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

// ── Note on route naming ──────────────────────────────────────────────────────
// The TDD uses /clubs/:slug for GET and /clubs/:id for PATCH.
// Since Next.js uses a single [slug] segment for both, we use the slug for GET
// and accept either slug or UUID for PATCH (service handles the lookup).

type Params = { slug: string };

// GET — public
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { slug } = await params;
  try {
    const club = await getClubBySlug(slug);
    return successResponse(club);
  } catch (err) {
    if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
    console.error('[GET /clubs/:slug]', err);
    return errorResponse('Failed to load club.', 500);
  }
}

// PATCH — club_lead or admin
export const PATCH = withAuth(
  async (req: NextRequest, ctx: { params: Promise<Params> }, user) => {
    const { slug } = await ctx.params;

    // Look up the club ID from its slug first
    let clubId: string;
    try {
      const club = await getClubBySlug(slug);
      clubId = club.id as string;
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      return errorResponse('Club not found.', 404, 'NOT_FOUND');
    }

    let body: unknown;
    try { body = await req.json(); }
    catch { return errorResponse('Request body must be valid JSON.', 422, 'INVALID_JSON'); }

    const parsed = ClubUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: 'Validation failed.', code: 'VALIDATION_ERROR' },
        { status: 422 }
      );
    }

    try {
      const updated = await updateClub(clubId, user.sub, user.role, parsed.data);
      return successResponse(updated);
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      console.error('[PATCH /clubs/:slug]', err);
      return errorResponse('Failed to update club.', 500);
    }
  },
  ['club_lead', 'admin']
);
