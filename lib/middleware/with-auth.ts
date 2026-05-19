/**
 * lib/middleware/with-auth.ts
 *
 * `withAuth` — Higher-order function that wraps a Next.js 16 Route Handler
 * to enforce authentication and optional role-based access control.
 *
 * Usage:
 *
 *   // Any authenticated user
 *   export const GET = withAuth(async (req, ctx, user) => { ... });
 *
 *   // Admin only
 *   export const POST = withAuth(async (req, ctx, user) => { ... }, ['admin']);
 *
 *   // Multiple roles
 *   export const PATCH = withAuth(handler, ['club_lead', 'faculty', 'admin']);
 *
 * The `user` argument is the verified JwtPayload: { sub, role, clerk_id }.
 * No database call is made inside this middleware — the role comes from the JWT.
 * Score-threshold checks (e.g. marketplace XP gate) are done inside handlers.
 */

import type { NextRequest } from 'next/server';
import { extractToken, verifyToken, type JwtPayload } from '@/lib/jwt';
import { UnauthorizedError, ForbiddenError, AppError } from '@/lib/errors';
import { errorResponse } from '@/lib/response';

export type AuthedRouteHandler<TParams = Record<string, string>> = (
  req: NextRequest,
  ctx: { params: Promise<TParams> },
  user: JwtPayload
) => Promise<Response>;

/**
 * Wraps a route handler with JWT authentication and optional role checks.
 *
 * @param handler      - The actual route handler to protect
 * @param allowedRoles - If provided, only users with one of these roles may proceed
 */
export function withAuth<TParams = Record<string, string>>(
  handler: AuthedRouteHandler<TParams>,
  allowedRoles?: string[]
) {
  return async (
    req: NextRequest,
    ctx: { params: Promise<TParams> }
  ): Promise<Response> => {
    try {
      // 1. Extract token from cookie or Authorization header
      const token = extractToken(req);
      if (!token) {
        throw new UnauthorizedError('No session token provided.');
      }

      // 2. Verify and decode the JWT
      const user = verifyToken(token);

      // 3. Check that the user's account is not banned
      //    (lightweight check — the ban flag is NOT stored in the JWT to avoid
      //    stale data; we rely on a fast DB lookup only on sensitive mutations.
      //    For a read-only ban enforcement on every request, add a Redis lookup
      //    here: e.g. redis.sismember('banned_users', user.sub))

      // 4. Role-based access check
      if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(user.role)) {
          throw new ForbiddenError(
            `This action requires one of: ${allowedRoles.join(', ')}.`
          );
        }
      }

      // 5. Delegate to the actual handler
      return await handler(req, ctx, user);
    } catch (err) {
      if (err instanceof AppError) {
        return errorResponse(err.message, err.statusCode, err.code);
      }
      console.error('[withAuth] Unexpected error:', err);
      return errorResponse('An unexpected error occurred.', 500, 'INTERNAL_ERROR');
    }
  };
}
