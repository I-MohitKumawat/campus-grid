/**
 * app/api/v1/users/me/route.ts
 *
 * Authenticated Student Profile API.
 * - GET: Fetch canonical student profile (institutional read-only info, editable profile, timeline, clubs, certificates).
 * - PATCH: Update allowed student profile fields (photo, bio, interests, GitHub, LinkedIn, Portfolio, LeetCode).
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { getStudentProfile, updateStudentProfile } from '@/lib/services/user.service';
import { z } from 'zod';

const updateProfileSchema = z.object({
  avatar_url: z.string().optional().or(z.literal('')),
  bio: z.string().max(300, 'Bio maximum 300 characters').optional().or(z.literal('')),
  interests: z.array(z.string()).optional(),
  github_url: z.string().url('Invalid GitHub URL').optional().or(z.literal('')),
  linkedin_url: z.string().url('Invalid LinkedIn URL').optional().or(z.literal('')),
  website_url: z.string().url('Invalid website URL').optional().or(z.literal('')),
  leetcode_url: z.string().url('Invalid LeetCode URL').optional().or(z.literal('')),
  pinned_highlights: z.array(z.string()).optional()
});

export const GET = withAuth(async (req: NextRequest, ctx: any, user: any) => {
  try {
    const profileData = await getStudentProfile(user.id);
    return NextResponse.json({
      success: true,
      data: profileData
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch user profile' } },
      { status: error.statusCode || 500 }
    );
  }
});

export const PATCH = withAuth(async (req: NextRequest, ctx: any, user: any) => {
  try {
    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { message: 'Validation failed', details: parsed.error.format() } },
        { status: 400 }
      );
    }

    const updatedData = await updateStudentProfile(user.id, parsed.data as any);
    return NextResponse.json({
      success: true,
      data: updatedData,
      message: 'Profile updated successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to update user profile' } },
      { status: error.statusCode || 500 }
    );
  }
});
