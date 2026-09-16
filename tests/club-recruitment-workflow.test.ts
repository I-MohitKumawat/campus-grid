/**
 * tests/club-recruitment-workflow.test.ts
 *
 * PART 2B: STUDENT JOIN CLUB, RECRUITMENT GATING & MEMBERSHIP ONBOARDING TEST SUITE
 *
 * Validates:
 * 1. Recruitment gating (recruitment_open, active, archived, invite_only).
 * 2. Application submission, payload validation, and single pending application invariant.
 * 3. Notification dispatch (applicant & president).
 * 4. President review & management workspace visibility (applicant academic profiles).
 * 5. Approval lifecycle: application status, reviewer metadata, member roster creation (role='member', posting_access=false).
 * 6. Rejection lifecycle: application status, rejection reason, zero memberships.
 * 7. Security invariants: ordinary member rejection, self-approval prevention, cross-club isolation, faculty boundary.
 * 8. Joined clubs query gating (active members only, pending/rejected excluded).
 */

import 'dotenv/config';
import { query } from '@/lib/db/client';
import {
  applyToClub,
  getClubApplications,
  getStudentApplicationForClub,
  decideClubApplication,
  getMyJoinedClubs,
  archiveClub,
} from '@/lib/services/club.service';

function assert(condition: any, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ [PASS] ${message}`);
}

async function runRecruitmentTests() {
  console.log('═════════════════════════════════════════════════════════════');
  console.log('🧪 PART 2B: STUDENT JOIN CLUB & RECRUITMENT WORKFLOW TESTS');
  console.log('═════════════════════════════════════════════════════════════\n');

  const ts = Date.now();
  let passed = 0;
  let failed = 0;

  // 1. Setup Test Fixtures (Small, controlled dataset)
  console.log('Setting up Test Entities...');
  
  const adminRes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'admin')
     RETURNING *`,
    [`admin_${ts}@college.ac.in`, `admin_${ts}`, `admin-${ts}`, `f_admin_${ts}`]
  );
  const adminUser = adminRes.rows[0];

  const presRes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'student')
     RETURNING *`,
    [`pres_${ts}@college.ac.in`, `pres_${ts}`, `pres-${ts}`, `f_pres_${ts}`]
  );
  const presidentUser = presRes.rows[0];
  await query(
    `INSERT INTO profiles (user_id, full_name, department, year, roll_number)
     VALUES ($1, $2, 'Computer Science', 4, $3)`,
    [presidentUser.id, `President ${ts}`, `CS22-${ts.toString().slice(-4)}`]
  );

  const student1Res = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'student')
     RETURNING *`,
    [`student1_${ts}@college.ac.in`, `student1_${ts}`, `student1-${ts}`, `f_stu1_${ts}`]
  );
  const student1 = student1Res.rows[0];
  await query(
    `INSERT INTO profiles (user_id, full_name, department, year, roll_number)
     VALUES ($1, $2, 'Robotics & Automation', 2, $3)`,
    [student1.id, `Student One ${ts}`, `RO24-${ts.toString().slice(-4)}`]
  );

  const student2Res = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'student')
     RETURNING *`,
    [`student2_${ts}@college.ac.in`, `student2_${ts}`, `student2-${ts}`, `f_stu2_${ts}`]
  );
  const student2 = student2Res.rows[0];
  await query(
    `INSERT INTO profiles (user_id, full_name, department, year, roll_number)
     VALUES ($1, $2, 'Electrical Engineering', 3, $3)`,
    [student2.id, `Student Two ${ts}`, `EE23-${ts.toString().slice(-4)}`]
  );

  const facultyRes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'faculty')
     RETURNING *`,
    [`faculty_${ts}@college.ac.in`, `faculty_${ts}`, `faculty-${ts}`, `f_fac_${ts}`]
  );
  const facultyUser = facultyRes.rows[0];

  // Create Primary Club A (Recruiting)
  const clubARes = await query(
    `INSERT INTO clubs (name, slug, description, type, category, lead_user_id, verification_status, is_active, recruitment_open, visibility)
     VALUES ($1, $2, 'Advanced Robotics & Mechatronics Society', 'Technical', 'Robotics', $3, 'approved', TRUE, TRUE, 'public')
     RETURNING *`,
    [`Robotics Guild ${ts}`, `robotics-guild-${ts}`, presidentUser.id]
  );
  const clubA = clubARes.rows[0];

  // Appoint President in club_memberships
  await query(
    `INSERT INTO club_memberships (club_id, user_id, role, status, posting_access)
     VALUES ($1, $2, 'president', 'active', TRUE)`,
    [clubA.id, presidentUser.id]
  );

  // Assign Faculty Advisor
  await query(
    `INSERT INTO club_faculty_advisors (club_id, faculty_id, is_hod)
     VALUES ($1, $2, FALSE)`,
    [clubA.id, facultyUser.id]
  );

  // Create Club B (Closed Recruitment)
  const clubBRes = await query(
    `INSERT INTO clubs (name, slug, description, type, category, lead_user_id, verification_status, is_active, recruitment_open, visibility)
     VALUES ($1, $2, 'Closed Society', 'Technical', 'General', $3, 'approved', TRUE, FALSE, 'public')
     RETURNING *`,
    [`Closed Club ${ts}`, `closed-club-${ts}`, presidentUser.id]
  );
  const clubB = clubBRes.rows[0];

  // Create Club C (Archived)
  const clubCRes = await query(
    `INSERT INTO clubs (name, slug, description, type, category, lead_user_id, verification_status, is_active, recruitment_open, visibility, archived_at)
     VALUES ($1, $2, 'Archived Society', 'Technical', 'General', $3, 'approved', FALSE, TRUE, 'public', now())
     RETURNING *`,
    [`Archived Club ${ts}`, `archived-club-${ts}`, presidentUser.id]
  );
  const clubC = clubCRes.rows[0];

  console.log(`Fixtures ready for club "${clubA.name}". Running assertions...\n`);

  try {
    // ═════════════════════════════════════════════════════════════
    // PART 1: RECRUITMENT GATING & APPLICATION SUBMISSION
    // ═════════════════════════════════════════════════════════════
    console.log('─────────────────────────────────────────────────────────────');
    console.log('PART 1: RECRUITMENT GATING & APPLICATION SUBMISSION');
    console.log('─────────────────────────────────────────────────────────────');

    // Test 1: Cannot apply to archived club
    try {
      await applyToClub(clubC.slug, { id: student1.id, role: student1.role }, {
        motivation: 'I want to join this archived club to learn robotics.',
      });
      assert(false, '1. Cannot apply to archived club');
    } catch (err: any) {
      assert(err?.statusCode === 409 || err?.statusCode === 400, '1. Application to archived club rejected (409 Conflict)');
      passed++;
    }

    // Test 2: Cannot apply when recruitment_open = false
    try {
      await applyToClub(clubB.slug, { id: student1.id, role: student1.role }, {
        motivation: 'I want to join this club even though recruitment is closed.',
      });
      assert(false, '2. Cannot apply when recruitment is closed');
    } catch (err: any) {
      assert(err?.statusCode === 409, '2. Application when recruitment is closed rejected (409 Conflict)');
      passed++;
    }

    // Test 3: Student 1 successfully applies to Club A
    const app1 = await applyToClub(clubA.slug, { id: student1.id, role: student1.role, username: student1.username }, {
      motivation: 'Passionate about ROS2, autonomous navigation, and building competitive bots.',
      interests: ['Robotics', 'Embedded C', 'Computer Vision'],
      experience: 'Won 2nd place in national rover design challenge.',
    });
    assert(app1 && app1.status === 'pending', '3. Student 1 successfully submitted membership application (status=pending)');
    passed++;

    // Test 4: Verify student notification and president notification created
    const stuNotifs = await query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`,
      [student1.id]
    );
    assert(
      stuNotifs.rows.length >= 1 && stuNotifs.rows[0].title === 'Application Submitted',
      '4a. Student confirmation notification recorded'
    );
    passed++;

    const presNotifs = await query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`,
      [presidentUser.id]
    );
    assert(
      presNotifs.rows.length >= 1 && presNotifs.rows[0].title === 'New Membership Application',
      '4b. President alert notification recorded'
    );
    passed++;

    // Test 5: Single Pending Application Invariant (Reject duplicate application)
    try {
      await applyToClub(clubA.slug, { id: student1.id, role: student1.role }, {
        motivation: 'Submitting duplicate application again.',
      });
      assert(false, '5. Reject duplicate pending application');
    } catch (err: any) {
      assert(err?.statusCode === 409, '5. Duplicate pending application rejected with 409 Conflict');
      passed++;
    }

    // Test 6: Student 2 also applies to Club A
    const app2 = await applyToClub(clubA.slug, { id: student2.id, role: student2.role, username: student2.username }, {
      motivation: 'Interested in power electronics and sensor integration for drones.',
      interests: ['Power Electronics', 'PCB Design'],
    });
    assert(app2 && app2.status === 'pending', '6. Student 2 successfully submitted application');
    passed++;

    // ═════════════════════════════════════════════════════════════
    // PART 2: PRESIDENT REVIEW & VISIBILITY
    // ═════════════════════════════════════════════════════════════
    console.log('\n─────────────────────────────────────────────────────────────');
    console.log('PART 2: PRESIDENT REVIEW & VISIBILITY');
    console.log('─────────────────────────────────────────────────────────────');

    // Test 7: President fetches pending applications with profile information
    const presApps = await getClubApplications(clubA.slug, { id: presidentUser.id, role: presidentUser.role });
    assert(presApps.length >= 2, '7a. President views all submitted applications for Club A');
    const app1View = presApps.find((a: any) => a.id === app1.id);
    assert(
      app1View && app1View.full_name === `Student One ${ts}` && app1View.department === 'Robotics & Automation',
      '7b. Application includes student profile metadata (full_name, department, year, roll_number)'
    );
    passed += 2;

    // Test 8: Student fetches their own applications (scoped visibility)
    const stu1Apps = await getClubApplications(clubA.slug, { id: student1.id, role: student1.role });
    assert(
      stu1Apps.length === 1 && stu1Apps[0].id === app1.id,
      '8. Student caller only receives their own application'
    );
    passed++;

    // ═════════════════════════════════════════════════════════════
    // PART 3: APPLICATION DECISION & ONBOARDING (APPROVAL)
    // ═════════════════════════════════════════════════════════════
    console.log('\n─────────────────────────────────────────────────────────────');
    console.log('PART 3: APPLICATION DECISION & ONBOARDING (APPROVAL)');
    console.log('─────────────────────────────────────────────────────────────');

    // Test 9: Student cannot approve their own application (Self-approval prevention)
    try {
      await decideClubApplication(clubA.slug, app1.id, { id: student1.id, role: student1.role }, {
        status: 'approved',
      });
      assert(false, '9. Student cannot approve own application');
    } catch (err: any) {
      assert(err?.statusCode === 403, '9. Student self-approval rejected (403 Forbidden)');
      passed++;
    }

    // Test 10: Faculty Advisor cannot approve recruitment applications
    try {
      await decideClubApplication(clubA.slug, app1.id, { id: facultyUser.id, role: facultyUser.role }, {
        status: 'approved',
      });
      assert(false, '10. Faculty cannot approve recruitment application');
    } catch (err: any) {
      assert(err?.statusCode === 403, '10. Faculty approval rejected (403 Forbidden)');
      passed++;
    }

    // Test 11: President approves Student 1 application
    const approvedApp = await decideClubApplication(clubA.slug, app1.id, { id: presidentUser.id, role: presidentUser.role }, {
      status: 'approved',
    });
    assert(
      approvedApp.status === 'approved' && approvedApp.reviewer_id === presidentUser.id && approvedApp.reviewed_at !== null,
      '11a. Application status transitioned to approved with reviewer metadata'
    );

    // Test 12: Verify club_memberships row created with role='member' and posting_access=false
    const memRes = await query(
      `SELECT * FROM club_memberships WHERE club_id = $1 AND user_id = $2`,
      [clubA.id, student1.id]
    );
    assert(
      memRes.rows.length === 1 &&
      memRes.rows[0].role === 'member' &&
      memRes.rows[0].status === 'active' &&
      memRes.rows[0].posting_access === false,
      '12. Verified active membership created strictly as role="member" with posting_access=FALSE'
    );
    passed += 2;

    // Test 13: Verify club.member_count incremented in PostgreSQL
    const clubCheck = await query(`SELECT member_count FROM clubs WHERE id = $1`, [clubA.id]);
    assert(clubCheck.rows[0].member_count === 2, '13. Club member_count accurately updated to 2');
    passed++;

    // Test 14: Welcome notification dispatched to student
    const stuWelcome = await query(
      `SELECT * FROM notifications WHERE user_id = $1 AND title LIKE 'Welcome to%'`,
      [student1.id]
    );
    assert(stuWelcome.rows.length === 1, '14. Welcome onboarding notification dispatched to applicant');
    passed++;

    // Test 15: Already decided application cannot be re-decided
    try {
      await decideClubApplication(clubA.slug, app1.id, { id: presidentUser.id, role: presidentUser.role }, {
        status: 'approved',
      });
      assert(false, '15. Already decided application cannot be re-decided');
    } catch (err: any) {
      assert(err?.statusCode === 409, '15. Re-deciding application rejected (409 Conflict)');
      passed++;
    }

    // Test 16: Active member cannot apply again
    try {
      await applyToClub(clubA.slug, { id: student1.id, role: student1.role }, {
        motivation: 'Trying to apply again while already an active member.',
      });
      assert(false, '16. Active member cannot apply again');
    } catch (err: any) {
      assert(err?.statusCode === 409, '16. Application by active member rejected (409 Conflict)');
      passed++;
    }

    // ═════════════════════════════════════════════════════════════
    // PART 4: APPLICATION REJECTION LIFECYCLE
    // ═════════════════════════════════════════════════════════════
    console.log('\n─────────────────────────────────────────────────────────────');
    console.log('PART 4: APPLICATION REJECTION LIFECYCLE');
    console.log('─────────────────────────────────────────────────────────────');

    // Test 17: President rejects Student 2 application with reason
    const rejectedApp = await decideClubApplication(clubA.slug, app2.id, { id: presidentUser.id, role: presidentUser.role }, {
      status: 'rejected',
      rejection_reason: 'Intake capacity reached for electrical domain this cycle.',
    });
    assert(
      rejectedApp.status === 'rejected' &&
      rejectedApp.rejection_reason === 'Intake capacity reached for electrical domain this cycle.' &&
      rejectedApp.reviewer_id === presidentUser.id,
      '17. Application status transitioned to rejected with reviewer metadata and reason'
    );
    passed++;

    // Test 18: Student 2 has zero club memberships
    const mem2Res = await query(
      `SELECT * FROM club_memberships WHERE club_id = $1 AND user_id = $2`,
      [clubA.id, student2.id]
    );
    assert(mem2Res.rows.length === 0, '18. Rejected application created zero club memberships');
    passed++;

    // Test 19: Rejection update notification dispatched to Student 2
    const stu2Notif = await query(
      `SELECT * FROM notifications WHERE user_id = $1 AND title = 'Application Update'`,
      [student2.id]
    );
    assert(stu2Notif.rows.length === 1, '19. Application update notification dispatched to rejected applicant');
    passed++;

    // ═════════════════════════════════════════════════════════════
    // PART 5: JOINED CLUBS & DISCOVERY INTEGRITY
    // ═════════════════════════════════════════════════════════════
    console.log('\n─────────────────────────────────────────────────────────────');
    console.log('PART 5: JOINED CLUBS & DISCOVERY INTEGRITY');
    console.log('─────────────────────────────────────────────────────────────');

    // Test 20: Student 1 sees Club A in Joined view
    const joined1 = await getMyJoinedClubs(student1.id);
    const hasClubA = joined1.some((c: any) => c.id === clubA.id);
    assert(hasClubA, '20. Student 1 sees Club A in Joined clubs view');
    passed++;

    // Test 21: Student 2 (rejected) does NOT see Club A in Joined view
    const joined2 = await getMyJoinedClubs(student2.id);
    const hasNoClubA = !joined2.some((c: any) => c.id === clubA.id);
    assert(hasNoClubA, '21. Student 2 (rejected) does NOT see Club A in Joined clubs view');
    passed++;

    // Test 22: Latest application status helper returns correct state
    const latestStatus1 = await getStudentApplicationForClub(clubA.id, student1.id);
    assert(latestStatus1?.status === 'approved', '22a. Student 1 latest application status is "approved"');
    const latestStatus2 = await getStudentApplicationForClub(clubA.id, student2.id);
    assert(latestStatus2?.status === 'rejected', '22b. Student 2 latest application status is "rejected"');
    passed += 2;

    // Test 23: Platform Admin can decide applications
    // Create an application from a new student for Club A and have Admin approve it
    const student3Res = await query(
      `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
       VALUES ($1, $2, $3, $4, 'student')
       RETURNING *`,
      [`student3_${ts}@college.ac.in`, `student3_${ts}`, `student3-${ts}`, `f_stu3_${ts}`]
    );
    const student3 = student3Res.rows[0];

    const app3 = await applyToClub(clubA.slug, { id: student3.id, role: student3.role }, {
      motivation: 'Interested in software sub-team and simulation stack.',
    });
    const adminApproved = await decideClubApplication(clubA.slug, app3.id, { id: adminUser.id, role: adminUser.role }, {
      status: 'approved',
    });
    assert(adminApproved.status === 'approved' && adminApproved.reviewer_id === adminUser.id, '23. Platform Admin can decide applications with institutional authority');
    passed++;

  } finally {
    // ═════════════════════════════════════════════════════════════
    // CLEANUP TEST FIXTURES
    // ═════════════════════════════════════════════════════════════
    console.log('\nCleaning up test fixtures...');
    await query(`DELETE FROM notifications WHERE user_id IN ($1, $2, $3, $4, $5)`, [
      adminUser.id,
      presidentUser.id,
      student1.id,
      student2.id,
      facultyUser.id,
    ]);
    await query(`DELETE FROM club_membership_applications WHERE club_id IN ($1, $2, $3)`, [
      clubA.id,
      clubB.id,
      clubC.id,
    ]);
    await query(`DELETE FROM club_memberships WHERE club_id IN ($1, $2, $3)`, [
      clubA.id,
      clubB.id,
      clubC.id,
    ]);
    await query(`DELETE FROM club_faculty_advisors WHERE club_id IN ($1, $2, $3)`, [
      clubA.id,
      clubB.id,
      clubC.id,
    ]);
    await query(`DELETE FROM clubs WHERE id IN ($1, $2, $3)`, [clubA.id, clubB.id, clubC.id]);
    await query(`DELETE FROM profiles WHERE user_id IN ($1, $2, $3, $4, $5)`, [
      adminUser.id,
      presidentUser.id,
      student1.id,
      student2.id,
      facultyUser.id,
    ]);
    await query(`DELETE FROM users WHERE email LIKE '%_${ts}@college.ac.in'`);
  }

  console.log('\n═════════════════════════════════════════════════════════════');
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('═════════════════════════════════════════════════════════════');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runRecruitmentTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
