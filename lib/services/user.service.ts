/**
 * lib/services/user.service.ts
 *
 * CampusGrid Canonical Student Identity Service.
 * Manages institutional student details, student editable profile (bio, image, social links),
 * auto-populated club organizations, verified campus timeline, and certificate credentials.
 */

import { query } from '@/lib/db/client';
import { NotFoundError } from '@/lib/errors';

export interface UpdateProfileInput {
  avatar_url?: string;
  bio?: string;
  interests?: string[];
  github_url?: string;
  linkedin_url?: string;
  website_url?: string;
  leetcode_url?: string;
  pinned_highlights?: string[];
}

/**
 * Ensures leetcode_url and pinned_highlights columns exist on profiles table.
 */
async function ensureProfileColumns() {
  try {
    await query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS leetcode_url TEXT`);
    await query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pinned_highlights TEXT[] DEFAULT '{}'`);
  } catch (err) {
    // Column might already exist
  }
}

/**
 * Fetch complete canonical student identity for the authenticated user.
 */
export async function getStudentProfile(userId: string) {
  await ensureProfileColumns();

  // 1. Fetch user core record (Institutional read-only identity baseline)
  const userResult = await query(
    `SELECT id, email, phone_number, username, profile_slug, role,
            avatar_url, profile_visibility, is_onboarded, created_at
     FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );

  if (!userResult.rowCount || userResult.rowCount === 0) {
    throw new NotFoundError('User profile not found.');
  }

  const user = userResult.rows[0];

  // 2. Fetch or initialize profile record (Robust UPSERT to prevent null user_id constraint errors)
  let profileResult = await query(
    `INSERT INTO profiles (user_id, full_name, bio, department, year, roll_number)
     VALUES ($1, COALESCE((SELECT username FROM users WHERE id = $1), 'Student'), 'CampusGrid Student', 'Computer Science & Engineering', 3, '1MS21CS' || SUBSTRING($1::text, 1, 3))
     ON CONFLICT (user_id) DO UPDATE
     SET updated_at = now()
     RETURNING id, full_name, year, department, roll_number, bio, current_focus,
               github_url, linkedin_url, twitter_url, website_url, leetcode_url,
               interests, pinned_highlights`,
    [userId]
  );

  const profile = profileResult.rows[0];

  // 3. Fetch auto-populated club organizations
  const clubsRes = await query(
    `SELECT c.id, c.name, c.slug, c.logo_url, c.category, cm.role, cm.joined_at
     FROM club_memberships cm
     JOIN clubs c ON c.id = cm.club_id
     WHERE cm.user_id = $1 AND cm.status = 'active'
     ORDER BY cm.joined_at DESC`,
    [userId]
  );
  const organizations = clubsRes.rows;

  // 4. Fetch system-issued digital certificates
  const certsRes = await query(
    `SELECT c.id, c.certificate_type, c.issued_at, c.verification_token,
            e.title as event_title, e.id as event_id, e.event_date,
            cl.name as club_name
     FROM certificates c
     JOIN events e ON e.id = c.event_id
     LEFT JOIN clubs cl ON cl.id = e.club_id
     WHERE c.user_id = $1 AND c.revoked_at IS NULL
     ORDER BY c.issued_at DESC`,
    [userId]
  );
  const certificates = certsRes.rows.map((c) => ({
    ...c,
    title: c.certificate_type
      ? `Certificate of ${c.certificate_type.charAt(0).toUpperCase() + c.certificate_type.slice(1).replace('_', ' ')}`
      : 'Certificate of Participation',
  }));

  // 5. Build chronological campus timeline from verified system events
  const timeline: Array<{
    id: string;
    category: 'platform' | 'club' | 'registration' | 'attendance' | 'certificate';
    title: string;
    description: string;
    timestamp: string;
    is_highlightable: boolean;
  }> = [];

  // Milestone: Joined CampusGrid
  timeline.push({
    id: `joined_platform_${user.id}`,
    category: 'platform',
    title: 'Joined CampusGrid Platform',
    description: 'Official student identity established & verified.',
    timestamp: user.created_at,
    is_highlightable: true
  });

  // Milestones: Club joins
  organizations.forEach(c => {
    timeline.push({
      id: `club_${c.id}`,
      category: 'club',
      title: `Joined ${c.name}`,
      description: `Active organization member (${c.role || 'Member'}).`,
      timestamp: c.joined_at,
      is_highlightable: true
    });
  });

  // Milestones: Event registrations & Attendances
  const eventLogsRes = await query(
    `SELECT er.status, er.registered_at as created_at, er.checked_in_at as attended_at, e.title as event_title, e.id as event_id
     FROM event_registrations er
     JOIN events e ON e.id = er.event_id
     WHERE er.user_id = $1
     ORDER BY er.registered_at DESC`,
    [userId]
  );

  eventLogsRes.rows.forEach(er => {
    timeline.push({
      id: `event_reg_${er.event_id}`,
      category: 'registration',
      title: `Registered for ${er.event_title}`,
      description: 'Seat pass generated for campus session.',
      timestamp: er.created_at,
      is_highlightable: false
    });

    if (er.status === 'attended' || er.attended_at) {
      timeline.push({
        id: `event_att_${er.event_id}`,
        category: 'attendance',
        title: `Attended ${er.event_title}`,
        description: 'Verified via live QR check-in on event day.',
        timestamp: er.attended_at || er.created_at,
        is_highlightable: true
      });
    }
  });

  // Milestones: Certificates
  certificates.forEach(crt => {
    timeline.push({
      id: `cert_${crt.id}`,
      category: 'certificate',
      title: `Earned: ${crt.title}`,
      description: `Issued for "${crt.event_title || 'Campus Event'}". Token: ${crt.verification_token}`,
      timestamp: crt.issued_at,
      is_highlightable: true
    });
  });

  // Sort timeline chronologically descending
  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Institutional read-only record summary
  const institutionalInfo = {
    full_name: profile.full_name || user.username,
    usn: profile.roll_number || `1MS21CS${userId.substring(0, 3).toUpperCase()}`,
    department: profile.department || 'Computer Science & Engineering',
    program: 'B.Tech (Undergraduate)',
    academic_year: `Year ${profile.year || 3}`,
    college_email: user.email
  };

  return {
    user,
    profile,
    institutionalInfo,
    organizations,
    timeline,
    certificates
  };
}

/**
 * Update authenticated student's allowed personal profile fields.
 * (Photo, Bio, Interests, GitHub, LinkedIn, Portfolio, LeetCode, Pinned Highlights).
 * Note: Institutional fields (Full Name, USN, Department, Year, Email) are strictly read-only.
 */
export async function updateStudentProfile(userId: string, input: UpdateProfileInput) {
  await ensureProfileColumns();

  // 1. Update avatar in users table if provided
  if (input.avatar_url !== undefined) {
    await query(
      `UPDATE users SET avatar_url = $1, updated_at = now() WHERE id = $2`,
      [input.avatar_url || null, userId]
    );
  }

  // 2. Robust UPSERT into profiles table for editable fields
  await query(
    `INSERT INTO profiles (user_id, full_name, bio, github_url, linkedin_url, website_url, leetcode_url, interests, pinned_highlights)
     VALUES ($1, (SELECT username FROM users WHERE id = $1), $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id) DO UPDATE
     SET bio = COALESCE(EXCLUDED.bio, profiles.bio),
         github_url = COALESCE(EXCLUDED.github_url, profiles.github_url),
         linkedin_url = COALESCE(EXCLUDED.linkedin_url, profiles.linkedin_url),
         website_url = COALESCE(EXCLUDED.website_url, profiles.website_url),
         leetcode_url = COALESCE(EXCLUDED.leetcode_url, profiles.leetcode_url),
         interests = COALESCE(EXCLUDED.interests, profiles.interests),
         pinned_highlights = COALESCE(EXCLUDED.pinned_highlights, profiles.pinned_highlights),
         updated_at = now()`,
    [
      userId,
      input.bio !== undefined ? input.bio : null,
      input.github_url !== undefined ? input.github_url : null,
      input.linkedin_url !== undefined ? input.linkedin_url : null,
      input.website_url !== undefined ? input.website_url : null,
      input.leetcode_url !== undefined ? input.leetcode_url : null,
      input.interests !== undefined ? input.interests : null,
      input.pinned_highlights !== undefined ? input.pinned_highlights : null
    ]
  );

  return getStudentProfile(userId);
}
