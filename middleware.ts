import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

export const runtime = 'nodejs';

const COOKIE_NAME = 'cg_token';
const SECRET = process.env.JWT_SECRET;

// Routes that require an active authenticated session
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/profile',
  '/events',
  '/admin',
];

// Anti-caching headers to prevent browser Back button / bfcache rendering after logout
function addNoCacheHeaders(response: NextResponse): NextResponse {
  response.headers.set(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
  );
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  let isValidSession = false;

  if (token && SECRET) {
    try {
      jwt.verify(token, SECRET, { algorithms: ['HS256'] });
      isValidSession = true;
    } catch {
      isValidSession = false;
    }
  }

  const isProtectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  // 1. If unauthenticated user tries to access protected route -> redirect to /sign-in
  if (isProtectedRoute && !isValidSession) {
    const loginUrl = new URL('/sign-in', request.url);
    const response = NextResponse.redirect(loginUrl);
    return addNoCacheHeaders(response);
  }

  // 2. If authenticated user accesses public entry points (root / or /sign-in) -> redirect to /dashboard
  if (isValidSession && (pathname === '/' || pathname === '/sign-in')) {
    const dashboardUrl = new URL('/dashboard', request.url);
    const response = NextResponse.redirect(dashboardUrl);
    return addNoCacheHeaders(response);
  }

  // 3. For all protected route responses, attach no-cache headers so browser history never stores protected UI
  const response = NextResponse.next();
  if (isProtectedRoute) {
    return addNoCacheHeaders(response);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, svgs, etc.)
     * - api routes (handled by backend API middleware)
     */
    '/((?!_next/static|_next/image|favicon.ico|images|api).*)',
  ],
};
