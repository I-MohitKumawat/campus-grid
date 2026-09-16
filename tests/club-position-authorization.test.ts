/**
 * tests/club-position-authorization.test.ts
 *
 * Backend Test Suite: Collegiate Club Positions & Authorization.
 *
 * Verifies all requirements for collegiate position model:
 *  1. Student without club membership cannot manage club.
 *  2. Member cannot assign roles.
 *  3. Member cannot edit club profile.
 *  4. Technical Lead cannot perform President-only operations.
 *  5. President can perform full operational capabilities.
 *  6. President cannot archive the club.
 *  7. President cannot permanently delete the club.
 *  8. Faculty with advisor authority can perform authorized institutional actions.
 *  9. Admin can perform admin-level and operational actions.
 * 10. A President remains a platform-level student in users.role.
 * 11. Scoped Isolation: A student who is President of Club A but only a member of Club B cannot manage Club B.
 * 12. Tamper Isolation: Changing club ID cannot grant access.
 */

import 'dotenv/config';
import { query, withTransaction } from '../lib/db/client';
import {
  canClubAction,
  assertClubAction,
  getClubPosition,
  CLUB_POSITION_CAPABILITIES,
  CLUB_POSITION_LABELS,
  ClubPosition,
} from '../lib/auth/club-permissions';
import { ForbiddenError } from '../lib/errors';

async function runTests() {
  console.log('🧪 Starting Collegiate Club Position Authorization Test Suite...\n');
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedCount++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failedCount++;
    }
  }

  // ── Setup Test Fixtures in DB ────────────────────────────────────────────────
  const testRunId = Date.now();
  console.log(`Setting up test fixtures (testRunId: ${testRunId})...`);

  // 1. Create Test Users
  const studentUserRes = await query(
    `INSERT INTO users (email, username, profile_slug, role, firebase_uid, is_onboarded)
     VALUES ($1, $2, $2, 'student', $3, TRUE) RETURNING *`,
    [`student_${testRunId}@college.ac.in`, `stud_${testRunId}`, `fuid_stud_${testRunId}`]
  );
  const studentUser = studentUserRes.rows[0];

  const presidentUserRes = await query(
    `INSERT INTO users (email, username, profile_slug, role, firebase_uid, is_onboarded)
     VALUES ($1, $2, $2, 'student', $3, TRUE) RETURNING *`,
    [`pres_${testRunId}@college.ac.in`, `pres_${testRunId}`, `fuid_pres_${testRunId}`]
  );
  const presidentUser = presidentUserRes.rows[0];

  const facultyAdvisorRes = await query(
    `INSERT INTO users (email, username, profile_slug, role, firebase_uid, is_onboarded)
     VALUES ($1, $2, $2, 'faculty', $3, TRUE) RETURNING *`,
    [`faculty_adv_${testRunId}@college.ac.in`, `fac_adv_${testRunId}`, `fuid_fac_${testRunId}`]
  );
  const facultyAdvisorUser = facultyAdvisorRes.rows[0];

  const unaffiliatedFacultyRes = await query(
    `INSERT INTO users (email, username, profile_slug, role, firebase_uid, is_onboarded)
     VALUES ($1, $2, $2, 'faculty', $3, TRUE) RETURNING *`,
    [`faculty_other_${testRunId}@college.ac.in`, `fac_other_${testRunId}`, `fuid_other_${testRunId}`]
  );
  const unaffiliatedFacultyUser = unaffiliatedFacultyRes.rows[0];

  const adminUserRes = await query(
    `INSERT INTO users (email, username, profile_slug, role, firebase_uid, is_onboarded)
     VALUES ($1, $2, $2, 'admin', $3, TRUE) RETURNING *`,
    [`admin_${testRunId}@college.ac.in`, `adm_${testRunId}`, `fuid_adm_${testRunId}`]
  );
  const adminUser = adminUserRes.rows[0];

  // 2. Create Test Clubs
  const clubARes = await query(
    `INSERT INTO clubs (name, slug, verification_status, is_active, lead_user_id)
     VALUES ($1, $2, 'approved', TRUE, $3) RETURNING *`,
    [`Club Alpha ${testRunId}`, `club-alpha-${testRunId}`, presidentUser.id]
  );
  const clubA = clubARes.rows[0];

  const clubBRes = await query(
    `INSERT INTO clubs (name, slug, verification_status, is_active, lead_user_id)
     VALUES ($1, $2, 'approved', TRUE, $3) RETURNING *`,
    [`Club Beta ${testRunId}`, `club-beta-${testRunId}`, null]
  );
  const clubB = clubBRes.rows[0];

  // 3. Assign Memberships & Roles
  // presidentUser is 'president' in Club A
  await query(
    `INSERT INTO club_memberships (club_id, user_id, role, status) VALUES ($1, $2, 'president', 'active')`,
    [clubA.id, presidentUser.id]
  );
  // presidentUser is ordinary 'member' in Club B
  await query(
    `INSERT INTO club_memberships (club_id, user_id, role, status) VALUES ($1, $2, 'member', 'active')`,
    [clubB.id, presidentUser.id]
  );
  // studentUser is 'member' in Club A
  await query(
    `INSERT INTO club_memberships (club_id, user_id, role, status) VALUES ($1, $2, 'member', 'active')`,
    [clubA.id, studentUser.id]
  );
  // facultyAdvisorUser is assigned to Club A
  await query(
    `INSERT INTO club_faculty_advisors (club_id, faculty_id, is_hod) VALUES ($1, $2, FALSE)`,
    [clubA.id, facultyAdvisorUser.id]
  );

  console.log('Fixtures initialized. Running assertions...\n');

  try {
    // ── Test 1: Student without club membership cannot manage club
    const canUnassignedManage = await canClubAction(
      { id: studentUser.id, role: studentUser.role },
      clubB.id,
      'edit_club_profile'
    );
    assert(canUnassignedManage === false, '1. Student without membership in Club B cannot edit club profile');

    let threwExpectedForbidden = false;
    try {
      await assertClubAction(
        { id: studentUser.id, role: studentUser.role },
        clubB.id,
        'edit_club_profile'
      );
    } catch (e) {
      if (e instanceof ForbiddenError) threwExpectedForbidden = true;
    }
    assert(threwExpectedForbidden, '1b. assertClubAction throws ForbiddenError for unassigned student');

    // ── Test 2: Member cannot assign roles
    const canMemberAssign = await canClubAction(
      { id: studentUser.id, role: studentUser.role },
      clubA.id,
      'assign_positions'
    );
    assert(canMemberAssign === false, '2. Member in Club A cannot assign positions');

    // ── Test 3: Member cannot edit club profile
    const canMemberEdit = await canClubAction(
      { id: studentUser.id, role: studentUser.role },
      clubA.id,
      'edit_club_profile'
    );
    assert(canMemberEdit === false, '3. Member in Club A cannot edit club profile');

    // ── Test 4: Technical Lead cannot perform President-only operations
    await query(
      `UPDATE club_memberships SET role = 'technical_lead' WHERE club_id = $1 AND user_id = $2`,
      [clubA.id, studentUser.id]
    );

    const canTechLeadEditProfile = await canClubAction(
      { id: studentUser.id, role: studentUser.role },
      clubA.id,
      'edit_club_profile'
    );
    const canTechLeadAssignPos = await canClubAction(
      { id: studentUser.id, role: studentUser.role },
      clubA.id,
      'assign_positions'
    );
    const canTechLeadCreateEvent = await canClubAction(
      { id: studentUser.id, role: studentUser.role },
      clubA.id,
      'create_club_event'
    );
    assert(
      canTechLeadEditProfile === false && canTechLeadAssignPos === false && canTechLeadCreateEvent === true,
      '4. Technical Lead cannot edit profile or assign roles, but can create events'
    );

    // ── Test 5: President can perform full operational capabilities
    const canPresEditProfile = await canClubAction(
      { id: presidentUser.id, role: presidentUser.role },
      clubA.id,
      'edit_club_profile'
    );
    const canPresManageMembers = await canClubAction(
      { id: presidentUser.id, role: presidentUser.role },
      clubA.id,
      'manage_members'
    );
    const canPresAssignPositions = await canClubAction(
      { id: presidentUser.id, role: presidentUser.role },
      clubA.id,
      'assign_positions'
    );
    const canPresCreateEvent = await canClubAction(
      { id: presidentUser.id, role: presidentUser.role },
      clubA.id,
      'create_club_event'
    );
    const canPresPublishAnnouncements = await canClubAction(
      { id: presidentUser.id, role: presidentUser.role },
      clubA.id,
      'publish_announcement'
    );
    assert(
      canPresEditProfile && canPresManageMembers && canPresAssignPositions && canPresCreateEvent && canPresPublishAnnouncements,
      '5. President has full operational capabilities for their club'
    );

    // ── Test 6: President cannot archive the club
    const canPresArchive = await canClubAction(
      { id: presidentUser.id, role: presidentUser.role },
      clubA.id,
      'archive_club'
    );
    assert(canPresArchive === false, '6. President cannot archive the club');

    // ── Test 7: President cannot permanently delete the club
    const canPresDelete = await canClubAction(
      { id: presidentUser.id, role: presidentUser.role },
      clubA.id,
      'permanently_delete_club'
    );
    assert(canPresDelete === false, '7. President cannot permanently delete the club');

    // ── Test 8: Faculty with advisor authority can perform authorized actions
    const canAdvisorArchive = await canClubAction(
      { id: facultyAdvisorUser.id, role: facultyAdvisorUser.role },
      clubA.id,
      'archive_club'
    );
    const canUnaffiliatedFacultyArchive = await canClubAction(
      { id: unaffiliatedFacultyUser.id, role: unaffiliatedFacultyUser.role },
      clubA.id,
      'archive_club'
    );
    assert(
      canAdvisorArchive === true && canUnaffiliatedFacultyArchive === false,
      '8. Assigned Faculty Advisor can archive club, but unaffiliated Faculty cannot'
    );

    // ── Test 9: Admin can perform admin-level actions
    const canAdminArchive = await canClubAction(
      { id: adminUser.id, role: adminUser.role },
      clubA.id,
      'archive_club'
    );
    const canAdminPermDelete = await canClubAction(
      { id: adminUser.id, role: adminUser.role },
      clubA.id,
      'permanently_delete_club'
    );
    const canAdminEditProfile = await canClubAction(
      { id: adminUser.id, role: adminUser.role },
      clubA.id,
      'edit_club_profile'
    );
    assert(
      canAdminArchive && canAdminPermDelete && canAdminEditProfile,
      '9. Admin possesses full system authority for all operations'
    );

    // ── Test 10: A President remains a platform-level student
    const dbPresCheck = await query(`SELECT role FROM users WHERE id = $1`, [presidentUser.id]);
    assert(
      dbPresCheck.rows[0].role === 'student',
      '10. President remains platform-level student in database (users.role = "student")'
    );

    // ── Test 11: Scoped Isolation (President of Club A cannot manage Club B)
    const canPresManageClubB = await canClubAction(
      { id: presidentUser.id, role: presidentUser.role },
      clubB.id,
      'edit_club_profile'
    );
    const canPresAssignPosInClubB = await canClubAction(
      { id: presidentUser.id, role: presidentUser.role },
      clubB.id,
      'assign_positions'
    );
    assert(
      canPresManageClubB === false && canPresAssignPosInClubB === false,
      '11. Scoped Isolation: User who is President of Club A cannot manage Club B where they are just a member'
    );

    // ── Test 12: Request Tamper Isolation
    const fakeClubId = '00000000-0000-0000-0000-000000000000';
    const canTamperManage = await canClubAction(
      { id: presidentUser.id, role: presidentUser.role },
      fakeClubId,
      'edit_club_profile'
    );
    assert(
      canTamperManage === false,
      '12. Request Tamper Isolation: Changing clubId parameter to non-managed club is rejected'
    );

  } finally {
    // ── Cleanup Test Fixtures ─────────────────────────────────────────────────
    console.log('\nCleaning up test fixtures...');
    await query(`DELETE FROM club_memberships WHERE club_id IN ($1, $2)`, [clubA.id, clubB.id]);
    await query(`DELETE FROM club_faculty_advisors WHERE club_id IN ($1, $2)`, [clubA.id, clubB.id]);
    await query(`DELETE FROM clubs WHERE id IN ($1, $2)`, [clubA.id, clubB.id]);
    await query(`DELETE FROM users WHERE id IN ($1, $2, $3, $4, $5)`, [
      studentUser.id,
      presidentUser.id,
      facultyAdvisorUser.id,
      unaffiliatedFacultyUser.id,
      adminUser.id,
    ]);
  }

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log(`========================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Unhandled error during tests:', err);
    process.exit(1);
  });
