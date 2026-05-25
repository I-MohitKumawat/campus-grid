/**
 * lib/firebase.ts
 *
 * Lightweight Firebase ID Token verification utility.
 * Verifies standard RS256 Firebase ID Tokens on the server without installing
 * the full firebase-admin SDK.
 */

import jwt from 'jsonwebtoken';
import { UnauthorizedError } from './errors';

let cachedKeys: Record<string, string> | null = null;
let keysExpiry = 0;

/**
 * Fetches Google's public x509 certificates used to sign Firebase ID tokens.
 * Caches the certificates in memory according to the Cache-Control max-age header.
 */
async function getFirebasePublicKeys(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedKeys && now < keysExpiry) {
    return cachedKeys;
  }

  try {
    const res = await fetch(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
    );
    if (!res.ok) {
      throw new Error(`Failed to fetch Firebase public keys: ${res.statusText}`);
    }

    const cacheControl = res.headers.get('cache-control') ?? '';
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
    const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 3600;

    cachedKeys = await res.json() as Record<string, string>;
    keysExpiry = now + maxAge * 1000;

    return cachedKeys;
  } catch (err) {
    console.error('[Firebase] Failed to retrieve public keys:', err);
    throw new UnauthorizedError('Could not verify authentication token signature.');
  }
}

export interface DecodedFirebaseToken {
  uid: string;
  email?: string;
  picture?: string;
  email_verified?: boolean;
}

/**
 * Verify and decode a Firebase ID Token.
 * Throws UnauthorizedError on any validation/verification failure.
 */
export async function verifyFirebaseIdToken(token: string): Promise<DecodedFirebaseToken> {
  if (process.env.NODE_ENV === 'development' && token.startsWith('dev-')) {
    const username = token.replace('dev-', '');
    return {
      uid: token,
      email: `${username}@college.ac.in`,
      email_verified: true,
    };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('[Firebase] FIREBASE_PROJECT_ID environment variable is not configured.');
  }

  // 1. Decode the token to inspect the header
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
    throw new UnauthorizedError('Malformed authentication token structure.');
  }

  const kid = decoded.header.kid;
  const keys = await getFirebasePublicKeys();
  const cert = keys[kid];

  if (!cert) {
    throw new UnauthorizedError('Authentication token signed by an unknown key.');
  }

  try {
    // 2. Verify token signature, audience, issuer, and expiration
    const payload = jwt.verify(token, cert, {
      algorithms: ['RS256'],
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
    }) as {
      sub: string;
      email?: string;
      picture?: string;
      email_verified?: boolean;
    };

    return {
      uid: payload.sub,
      email: payload.email,
      picture: payload.picture,
      email_verified: payload.email_verified,
    };
  } catch (err) {
    console.error('[Firebase] Token verification failed:', err);
    throw new UnauthorizedError('Authentication token is invalid or expired.');
  }
}
