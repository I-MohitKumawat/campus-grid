/**
 * app/api/v1/auth/onboarding/route.ts
 *
 * POST /api/v1/auth/onboarding
 *   Complete the onboarding wizard for the currently authenticated user.
 *   Only callable once per user — throws 409 if onboarding is already complete.
 */

import { withAuth } from '@/lib/middleware/with-auth';
import { withValidation } from '@/lib/middleware/with-validation';
import { OnboardingSchema } from '@/lib/schemas/auth.schemas';
import { completeOnboarding } from '@/lib/services/auth.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

// withAuth wraps withValidation — the outer HOF (withAuth) runs first,
// injects user into the inner handler.
export const POST = withAuth(async (req, _ctx, user) => {
  // Re-parse and validate the body inside the authed handler
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Request body must be valid JSON.', 422, 'INVALID_JSON');
  }

  const parsed = OnboardingSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || '_root';
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return Response.json(
      { success: false, error: 'Validation failed.', code: 'VALIDATION_ERROR', details: fieldErrors },
      { status: 422 }
    );
  }

  try {
    await completeOnboarding(user.sub, parsed.data);
    return successResponse({ message: 'Onboarding complete.' }, 200);
  } catch (err) {
    if (err instanceof AppError) {
      return errorResponse(err.message, err.statusCode, err.code);
    }
    console.error('[POST /auth/onboarding]', err);
    return errorResponse('Onboarding failed.', 500, 'INTERNAL_ERROR');
  }
});
