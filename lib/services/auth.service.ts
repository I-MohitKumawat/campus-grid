/**
 * lib/services/auth.service.ts
 *
 * Authentication service layer.
 *
 * Responsibilities:
 *   - Verify Firebase ID tokens
 *   - Look up or create a user row in PostgreSQL on first sign-in
 *   - Complete the onboarding wizard step
 *   - All DB interactions for the auth domain live here — route handlers
 *     remain thin and only call service functions
 *
 * Design:
 *   - Firebase is the authority for identity; our DB is the authority for
 *     profile data, XP, score, and role.
 *   - On the first sign-in, a new row is inserted into `users` and `profiles`.
 *   - The service returns a plain object (never a DB row) so callers are
 *     decoupled from schema changes.
 */

import { verifyFirebaseIdToken } from '@/lib/firebase';
import { query, withTransaction } from '@/lib/db/client';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '@/lib/errors';
import type { OnboardingInput } from '@/lib/schemas/auth.schemas';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlatformUser {
  id: string;
  email: string;
  username: string;
  profile_slug: string;
  role: string;
  firebase_uid: string;
  avatar_url: string | null;
  is_onboarded: boolean;
  onboarding_step: number;
  xp: number;
  campus_score: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Generate a URL-safe slug from an email or name.
 * Used as the initial value for profile_slug and username.
 */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/@.*/, '')               // strip domain from email
    .replace(/[^a-z0-9]+/g, '-')     // non-alphanumeric → dash
    .replace(/^-|-$/g, '')           // trim leading/trailing dashes
    .slice(0, 30);
}

/**
 * Make a username/slug unique by appending a random suffix if needed.
 */
async function ensureUniqueUsername(base: string): Promise<string> {
  let candidate = base;
  let attempt = 0;
  while (attempt < 10) {
    const existing = await query(
      'SELECT 1 FROM users WHERE username = $1 OR profile_slug = $1 LIMIT 1',
      [candidate]
    );
    if (existing.rowCount === 0) return candidate;
    candidate = `${base}-${Math.floor(Math.random() * 9000) + 1000}`;
    attempt++;
  }
  // Fallback: timestamp-based suffix
  return `${base}-${Date.now()}`;
}

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * Verify a Firebase ID token, then look up or create the platform user.
 *
 * Flow:
 *   1. Verify token with Firebase → get firebaseUid
 *   2. Check email domain against allowed list (from DB config)
 *   3. SELECT user by firebase_uid
 *   4. If not found, INSERT users + profiles in one transaction
 *   5. Update last_login_at
 *   6. Return PlatformUser
 */
export async function verifyFirebaseTokenAndUpsertUser(
  firebaseIdToken: string
): Promise<PlatformUser> {
  // 1. Verify the token with Firebase
  let firebaseUid: string;
  let firebaseEmail: string;
  let firebaseAvatar: string | null;

  try {
    const decoded = await verifyFirebaseIdToken(firebaseIdToken);
    firebaseUid = decoded.uid;
    firebaseEmail = decoded.email ?? '';
    firebaseAvatar = decoded.picture ?? null;
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      throw err;
    }
    throw new UnauthorizedError('Firebase token verification failed.');
  }

  if (!firebaseEmail) {
    throw new UnauthorizedError('Could not retrieve email from Firebase session.');
  }

  // 2. Domain check — load allowed domains from platform_config
  const { getConfig } = await import('@/lib/redis');
  const allowedDomainsRaw = await getConfig('allowed_email_domains');
  const allowedDomains: string[] = Array.isArray(allowedDomainsRaw)
    ? allowedDomainsRaw
    : JSON.parse(String(allowedDomainsRaw ?? '[]'));

  if (allowedDomains.length > 0) {
    const emailDomain = firebaseEmail.split('@')[1];
    if (!allowedDomains.includes(emailDomain)) {
      throw new ForbiddenError(
        `Sign-ups are restricted to: ${allowedDomains.join(', ')}.`
      );
    }
  }

  // 3. Look up existing user
  const existingResult = await query<PlatformUser>(
    `SELECT id, email, username, profile_slug, role, firebase_uid,
            avatar_url, is_onboarded, onboarding_step, xp, campus_score
     FROM users
     WHERE firebase_uid = $1 AND deleted_at IS NULL`,
    [firebaseUid]
  );

  if (existingResult.rowCount && existingResult.rowCount > 0) {
    // Update last_login_at asynchronously (no await — non-critical)
    query('UPDATE users SET last_login_at = now() WHERE id = $1', [
      existingResult.rows[0].id,
    ]).catch(() => {});

    return existingResult.rows[0];
  }

  // 4. First sign-in — create user + profile atomically
  const baseSlug = slugify(firebaseEmail);
  const username = await ensureUniqueUsername(baseSlug);

  const newUser = await withTransaction(async (client) => {
    const userRow = await client.query<PlatformUser>(
      `INSERT INTO users
         (email, username, profile_slug, role, firebase_uid, avatar_url,
          email_verified, last_login_at)
       VALUES ($1, $2, $2, 'student', $3, $4, TRUE, now())
       RETURNING id, email, username, profile_slug, role, firebase_uid,
                 avatar_url, is_onboarded, onboarding_step, xp, campus_score`,
      [firebaseEmail, username, firebaseUid, firebaseAvatar]
    );

    const user = userRow.rows[0];

    // Create an empty profile row linked to the new user
    await client.query(
      `INSERT INTO profiles (user_id, full_name)
       VALUES ($1, $2)`,
      [user.id, firebaseEmail.split('@')[0]] // temp name until onboarding
    );

    return user;
  });

  return newUser;
}

/**
 * Complete the onboarding wizard for a user.
 * Only allowed if is_onboarded = FALSE.
 * Sets username (if not already edited), profile fields, and marks user onboarded.
 */
export async function completeOnboarding(
  userId: string,
  data: OnboardingInput
): Promise<void> {
  // Check current onboarding state
  const userResult = await query(
    'SELECT is_onboarded, username_edited FROM users WHERE id = $1',
    [userId]
  );

  if (!userResult.rowCount || userResult.rowCount === 0) {
    throw new NotFoundError('User');
  }

  const { is_onboarded, username_edited } = userResult.rows[0] as {
    is_onboarded: boolean;
    username_edited: boolean;
  };

  if (is_onboarded) {
    throw new ConflictError('Onboarding has already been completed.');
  }

  // Validate username uniqueness (only if the user wants to change it)
  if (data.username) {
    const existing = await query(
      'SELECT 1 FROM users WHERE username = $1 AND id != $2 LIMIT 1',
      [data.username, userId]
    );
    if (existing.rowCount && existing.rowCount > 0) {
      throw new ValidationError('Username is already taken.', { username: ['Username is already taken.'] });
    }
  }

  await withTransaction(async (client) => {
    // Update users table
    if (data.username && !username_edited) {
      await client.query(
        `UPDATE users
         SET username = $1, profile_slug = $1, username_edited = TRUE,
             is_onboarded = TRUE, onboarding_step = 5
         WHERE id = $2`,
        [data.username, userId]
      );
    } else {
      await client.query(
        `UPDATE users SET is_onboarded = TRUE, onboarding_step = 5 WHERE id = $1`,
        [userId]
      );
    }

    // Update profiles table
    await client.query(
      `UPDATE profiles
       SET full_name = $1,
           year = $2,
           department = $3,
           roll_number = $4,
           interests = $5,
           bio = $6,
           completeness_pct = 20
       WHERE user_id = $7`,
      [
        data.full_name,
        data.year ?? null,
        data.department ?? null,
        data.roll_number ?? null,
        data.interests ?? null,
        data.bio ?? null,
        userId,
      ]
    );
  });
}
