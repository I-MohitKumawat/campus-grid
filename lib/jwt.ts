/**
 * lib/jwt.ts
 *
 * Backend JWT utilities for signing and verifying the platform session token.
 *
 * The platform issues its own HS256 JWT (stored in an HTTP-only cookie named
 * `cg_token`) after validating a Firebase ID token on POST /api/v1/auth/session.
 * This decouples the frontend auth provider from the backend API — any future
 * auth provider swap only requires changing the /auth/session handler.
 *
 * JWT Payload:
 *   sub:          user.id          — platform UUID (not Firebase UID)
 *   role:         user.role        — user_role enum value
 *   firebase_uid: string           — Firebase User ID for reference
 *   iat / exp                      — issued-at / expiry (7 days)
 *
 * No tier field — access is role-based only.
 */

import jwt from 'jsonwebtoken';
import { UnauthorizedError } from './errors';

const SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = 'cg_token';
const EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

if (!SECRET) {
  throw new Error('[JWT] JWT_SECRET is not set. Check your .env.local file.');
}

export interface JwtPayload {
  sub: string;          // platform user UUID
  role: string;         // user_role
  firebase_uid: string; // Firebase User ID
  iat: number;
  exp: number;
}

/**
 * Sign a new session JWT for a platform user.
 */
export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, SECRET!, { expiresIn: EXPIRY_SECONDS, algorithm: 'HS256' });
}

/**
 * Verify and decode a JWT. Throws UnauthorizedError on any failure.
 */
export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, SECRET!, { algorithms: ['HS256'] }) as JwtPayload;
  } catch {
    throw new UnauthorizedError('Session token is invalid or expired.');
  }
}

/**
 * Extract the cg_token from a Request's cookie header or Bearer Authorization header.
 * Returns null if no token is present (caller decides whether to throw).
 */
export function extractToken(request: Request): string | null {
  // 1. HTTP-only cookie (preferred — sent automatically by browser)
  const cookieHeader = request.headers.get('cookie') ?? '';
  const cookieMatch = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));

  if (cookieMatch) {
    return cookieMatch.split('=').slice(1).join('=');
  }

  // 2. Bearer token in Authorization header (mobile clients / API consumers)
  const authHeader = request.headers.get('authorization') ?? '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}

/**
 * Build the Set-Cookie header value for setting the cg_token cookie.
 */
export function buildSessionCookie(token: string): string {
  const isProd = process.env.NODE_ENV === 'production';
  return [
    `${COOKIE_NAME}=${token}`,
    `Max-Age=${EXPIRY_SECONDS}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    ...(isProd ? ['Secure'] : []),
  ].join('; ');
}

/**
 * Build the Set-Cookie header value that clears the cg_token cookie.
 */
export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`;
}
