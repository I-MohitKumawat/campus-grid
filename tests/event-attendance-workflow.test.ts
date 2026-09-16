/**
 * tests/event-attendance-workflow.test.ts
 *
 * Comprehensive Test Suite for Part 2D: Event Attendance & Check-In Workflow.
 * Verifies Authorization, QR Validation, Event & Club Isolation, Duplicate Scan Idempotency,
 * Registration Requirements, Event Status Gating, and Database State Invariants.
 */

import 'dotenv/config';
import { query } from '@/lib/db/client';
import {
  createEvent,
  getEventById,
  registerForEvent,
  getEventRegistrations,
  markAttendance,
  markBulkAttendance,
  cancelEvent,
  completeEvent,
} from '@/lib/services/event.service';
import { assertClubAction } from '@/lib/auth/club-permissions';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ [PASS] ${message}`);
}

async function runAttendanceWorkflowTests() {
  console.log('\n═════════════════════════════════════════════════════════════');
  console.log('🧪 PART 2D: EVENT ATTENDANCE & CHECK-IN WORKFLOW TESTS');
  console.log('═════════════════════════════════════════════════════════════\n');

  const testId = Date.now();

  // Test Entity IDs
  let adminId: string;
  let facultyId: string;
  let presidentAId: string;
  let presidentBId: string;
  let student1Id: string;
  let student2Id: string;
  let studentUnregisteredId: string;

  let clubAId: string;
  let clubBId: string;

  let eventAId: string;
  let eventBId: string;
  let draftEventId: string;
  let cancelledEventId: string;

  try {
    // ── 1. SETUP TEST FIXTURES ──────────────────────────────────────────────
    console.log('1. Setting up Test Entities (Users, Clubs, Events)...');

    // Create Platform Admin
    const adminRes = await query(
      `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
       VALUES ($1, $2, $3, $4, 'admin') RETURNING id`,
      [`admin_${testId}@college.ac.in`, `admin_${testId}`, `admin-${testId}`, `fb_admin_${testId}`]
    );
    adminId = adminRes.rows[0].id;

    // Create Faculty
    const facultyRes = await query(
      `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
       VALUES ($1, $2, $3, $4, 'faculty') RETURNING id`,
      [`faculty_${testId}@college.ac.in`, `faculty_${testId}`, `faculty-${testId}`, `fb_faculty_${testId}`]
    );
    facultyId = facultyRes.rows[0].id;

    // Create President A
    const presARes = await query(
      `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
       VALUES ($1, $2, $3, $4, 'student') RETURNING id`,
      [`pres_a_${testId}@college.ac.in`, `pres_a_${testId}`, `pres-a-${testId}`, `fb_pres_a_${testId}`]
    );
    presidentAId = presARes.rows[0].id;

    // Create President B
    const presBRes = await query(
      `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
       VALUES ($1, $2, $3, $4, 'student') RETURNING id`,
      [`pres_b_${testId}@college.ac.in`, `pres_b_${testId}`, `pres-b-${testId}`, `fb_pres_b_${testId}`]
    );
    presidentBId = presBRes.rows[0].id;

    // Create Students
    const s1Res = await query(
      `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
       VALUES ($1, $2, $3, $4, 'student') RETURNING id`,
      [`student1_${testId}@college.ac.in`, `student1_${testId}`, `student1-${testId}`, `fb_s1_${testId}`]
    );
    student1Id = s1Res.rows[0].id;

    const s2Res = await query(
      `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
       VALUES ($1, $2, $3, $4, 'student') RETURNING id`,
      [`student2_${testId}@college.ac.in`, `student2_${testId}`, `student2-${testId}`, `fb_s2_${testId}`]
    );
    student2Id = s2Res.rows[0].id;

    const sUnregRes = await query(
      `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
       VALUES ($1, $2, $3, $4, 'student') RETURNING id`,
      [`unreg_${testId}@college.ac.in`, `unreg_${testId}`, `unreg-${testId}`, `fb_unreg_${testId}`]
    );
    studentUnregisteredId = sUnregRes.rows[0].id;

    // Profiles
    for (const [uid, name, roll, dept] of [
      [student1Id, 'Aarav Sharma', `CS-${testId}-01`, 'Computer Science'],
      [student2Id, 'Diya Patel', `EC-${testId}-02`, 'Electronics'],
      [studentUnregisteredId, 'Rohan Mehta', `ME-${testId}-03`, 'Mechanical'],
    ]) {
      await query(
        `INSERT INTO profiles (user_id, full_name, roll_number, department, year)
         VALUES ($1, $2, $3, $4, 3)`,
        [uid, name, roll, dept]
      );
    }

    // Create Clubs
    const clubARes = await query(
      `INSERT INTO clubs (name, slug, lead_user_id, type, verification_status, is_active)
       VALUES ($1, $2, $3, 'technical', 'approved', true) RETURNING id`,
      [`AI Club ${testId}`, `ai-club-${testId}`, presidentAId]
    );
    clubAId = clubARes.rows[0].id;

    await query(
      `INSERT INTO club_memberships (club_id, user_id, role, posting_access)
       VALUES ($1, $2, 'president', true)`,
      [clubAId, presidentAId]
    );

    const clubBRes = await query(
      `INSERT INTO clubs (name, slug, lead_user_id, type, verification_status, is_active)
       VALUES ($1, $2, $3, 'cultural', 'approved', true) RETURNING id`,
      [`Music Club ${testId}`, `music-club-${testId}`, presidentBId]
    );
    clubBId = clubBRes.rows[0].id;

    await query(
      `INSERT INTO club_memberships (club_id, user_id, role, posting_access)
       VALUES ($1, $2, 'president', true)`,
      [clubBId, presidentBId]
    );

    // Create Published Event for Club A
    const evARes = await query(
      `INSERT INTO events (title, description, organiser_id, organiser_type, club_id, status, event_date, capacity, check_in_enabled)
       VALUES ($1, $2, $3, 'club', $4, 'published', now() + interval '2 hours', 50, true) RETURNING id`,
      [`AI Summit ${testId}`, 'Deep Learning & LLMs', presidentAId, clubAId]
    );
    eventAId = evARes.rows[0].id;

    // Create Published Event for Club B
    const evBRes = await query(
      `INSERT INTO events (title, description, organiser_id, organiser_type, club_id, status, event_date, capacity, check_in_enabled)
       VALUES ($1, $2, $3, 'club', $4, 'published', now() + interval '4 hours', 50, true) RETURNING id`,
      [`Acoustic Night ${testId}`, 'Unplugged Session', presidentBId, clubBId]
    );
    eventBId = evBRes.rows[0].id;

    // Create Draft Event for Club A
    const draftRes = await query(
      `INSERT INTO events (title, description, organiser_id, organiser_type, club_id, status, event_date, capacity)
       VALUES ($1, $2, $3, 'club', $4, 'draft', now() + interval '1 day', 50) RETURNING id`,
      [`Draft Workshop ${testId}`, 'Work in progress', presidentAId, clubAId]
    );
    draftEventId = draftRes.rows[0].id;

    // Register Student 1 and Student 2 for Event A
    const reg1Res = await registerForEvent(eventAId, student1Id, { attendance_mode: 'offline' });
    const reg2Res = await registerForEvent(eventAId, student2Id, { attendance_mode: 'offline' });

    // Register Student 1 for Event B
    const regBRes = await registerForEvent(eventBId, student1Id, { attendance_mode: 'offline' });

    assert(Boolean(reg1Res?.qr_token), 'Student 1 registered for Event A with valid qr_token');
    assert(Boolean(reg2Res?.qr_token), 'Student 2 registered for Event A with valid qr_token');
    assert(Boolean(regBRes?.qr_token), 'Student 1 registered for Event B with valid qr_token');

    const tokenStudent1EventA = reg1Res.qr_token;
    const tokenStudent2EventA = reg2Res.qr_token;
    const tokenStudent1EventB = regBRes.qr_token;

    // ── 2. AUTHORIZATION & CROSS-CLUB ISOLATION ────────────────────────────
    console.log('\n2. Testing Attendance Authorization & Cross-Club Isolation...');

    // 2.1 Unauthenticated / Ordinary student check-in attempt
    try {
      await markAttendance(eventAId, student1Id, 'student', { qr_token: tokenStudent1EventA });
      assert(false, 'Ordinary student should NOT be allowed to check in attendees');
    } catch (err: any) {
      assert(err instanceof ForbiddenError, 'Ordinary student check-in rejected with 403 Forbidden');
    }

    // 2.2 President of Club B attempting to check in attendees for Event A (Club A)
    try {
      await markAttendance(eventAId, presidentBId, 'student', { qr_token: tokenStudent1EventA });
      assert(false, 'President of Club B should NOT be allowed to check in Event A attendees');
    } catch (err: any) {
      assert(err instanceof ForbiddenError, 'Cross-club president check-in rejected with 403 Forbidden');
    }

    // 2.3 Unaffiliated Faculty attempting to check in attendees for Event A
    try {
      await markAttendance(eventAId, facultyId, 'faculty', { qr_token: tokenStudent1EventA });
      assert(false, 'Unaffiliated faculty should NOT be allowed to check in club event attendees');
    } catch (err: any) {
      assert(err instanceof ForbiddenError, 'Unaffiliated faculty check-in rejected with 403 Forbidden');
    }

    // ── 3. TOKEN VALIDATION & REGISTRATION INVARIANTS ──────────────────────
    console.log('\n3. Testing Token Validation & Registration Invariants...');

    // 3.1 Completely invalid / non-existent QR token
    try {
      await markAttendance(eventAId, presidentAId, 'student', { qr_token: 'invalid-fake-token-999' });
      assert(false, 'Non-existent QR token should be rejected');
    } catch (err: any) {
      assert(err instanceof NotFoundError, 'Non-existent QR token rejected with 404 NotFound');
    }

    // 3.2 Token belonging to a DIFFERENT event (Event B token on Event A)
    try {
      await markAttendance(eventAId, presidentAId, 'student', { qr_token: tokenStudent1EventB });
      assert(false, 'QR token belonging to another event should be rejected');
    } catch (err: any) {
      assert(err instanceof ValidationError, 'Cross-event token mismatch rejected with 400 ValidationError');
    }

    // 3.3 Unregistered student user_id check-in attempt
    try {
      await markAttendance(eventAId, presidentAId, 'student', { user_id: studentUnregisteredId });
      assert(false, 'Unregistered student check-in should be rejected');
    } catch (err: any) {
      assert(err instanceof NotFoundError, 'Unregistered student check-in rejected with 404 NotFound');
    }

    // ── 4. SUCCESSFUL CHECK-IN & DATABASE VERIFICATION ─────────────────────
    console.log('\n4. Testing Successful Check-In & Database Verification...');

    // 4.1 President A checks in Student 1 using QR token
    const checkinResult1 = await markAttendance(eventAId, presidentAId, 'student', { qr_token: tokenStudent1EventA });
    assert(checkinResult1.status === 'attended', 'Check-in returned status=attended');
    assert(checkinResult1.already_checked_in === false, 'Check-in marked already_checked_in=false');
    assert(Boolean(checkinResult1.checked_in_at), 'checked_in_at timestamp is present');
    assert(checkinResult1.checked_in_by === presidentAId, 'checked_in_by accurately records President A ID');

    // 4.2 Verify database state in PostgreSQL
    const dbReg1 = await query(
      `SELECT status, checked_in_at, checked_in_by FROM event_registrations WHERE event_id = $1 AND user_id = $2`,
      [eventAId, student1Id]
    );
    assert(dbReg1.rows[0].status === 'attended', 'PostgreSQL verified registration status is attended');
    assert(dbReg1.rows[0].checked_in_by === presidentAId, 'PostgreSQL verified checked_in_by matches President A ID');
    assert(Boolean(dbReg1.rows[0].checked_in_at), 'PostgreSQL verified checked_in_at is recorded');

    // 4.3 Verify in-app notification dispatched to Student 1
    const notifRes = await query(
      `SELECT * FROM notifications WHERE user_id = $1 AND type = 'event_attendance' ORDER BY created_at DESC LIMIT 1`,
      [student1Id]
    );
    assert(notifRes.rows.length > 0, 'In-app check-in confirmation notification recorded for Student 1');

    // ── 5. DUPLICATE SCAN IDEMPOTENCY ──────────────────────────────────────
    console.log('\n5. Testing Duplicate Scan Handling & Idempotency...');

    // Repeated scan of Student 1
    const repeatResult = await markAttendance(eventAId, presidentAId, 'student', { qr_token: tokenStudent1EventA });
    assert(repeatResult.already_checked_in === true, 'Repeated QR scan returns already_checked_in=true');
    assert(repeatResult.status === 'attended', 'Repeated QR scan preserves status=attended');

    // Verify DB still contains exactly ONE attendance row for Student 1
    const countRes = await query(
      `SELECT COUNT(*) FROM event_registrations WHERE event_id = $1 AND user_id = $2`,
      [eventAId, student1Id]
    );
    assert(Number(countRes.rows[0].count) === 1, 'Database invariant: Exactly 1 row in event_registrations (no duplicate rows)');

    // ── 6. ADMIN AUTHORITY & MANUAL USER_ID CHECK-IN ───────────────────────
    console.log('\n6. Testing Platform Admin Authority & Manual Check-In...');

    // Admin manually checks in Student 2 via user_id
    const adminCheckinResult = await markAttendance(eventAId, adminId, 'admin', { user_id: student2Id });
    assert(adminCheckinResult.status === 'attended', 'Admin check-in returned status=attended');
    assert(adminCheckinResult.checked_in_by === adminId, 'checked_in_by records Admin user ID');

    const dbReg2 = await query(
      `SELECT status, checked_in_by FROM event_registrations WHERE event_id = $1 AND user_id = $2`,
      [eventAId, student2Id]
    );
    assert(dbReg2.rows[0].status === 'attended', 'PostgreSQL verified Student 2 status=attended');
    assert(dbReg2.rows[0].checked_in_by === adminId, 'PostgreSQL verified checked_in_by=adminId');

    // ── 7. EVENT STATUS RESTRICTIONS (DRAFT & CANCELLED) ───────────────────
    console.log('\n7. Testing Event Status Restrictions (Draft & Cancelled)...');

    // 7.1 Check-in on Draft event rejected
    try {
      await markAttendance(draftEventId, presidentAId, 'student', { user_id: student1Id });
      assert(false, 'Draft event check-in should be rejected');
    } catch (err: any) {
      assert(err instanceof ValidationError, 'Draft event check-in rejected with 400 ValidationError');
    }

    // 7.2 Cancel Event A and verify check-in is rejected
    await cancelEvent(eventAId, presidentAId, 'student', 'Inclement weather cancellation test');

    try {
      await markAttendance(eventAId, presidentAId, 'student', { qr_token: tokenStudent1EventA });
      assert(false, 'Cancelled event check-in should be rejected');
    } catch (err: any) {
      assert(err instanceof ValidationError, 'Cancelled event check-in rejected with 400 ValidationError');
    }

    // ── 8. ATTENDEE ROSTER API INTEGRITY ───────────────────────────────────
    console.log('\n8. Testing Attendee Roster API Integrity...');

    const roster = await getEventRegistrations(eventAId, presidentAId, 'student');
    assert(Array.isArray(roster), 'getEventRegistrations returns array of attendees');
    assert(roster.length === 2, 'Roster contains exactly 2 registered/attended students');

    const r1 = roster.find((r: any) => r.user_id === student1Id);
    assert(r1.status === 'attended', 'Roster correctly displays Student 1 status=attended');
    assert(r1.full_name === 'Aarav Sharma', 'Roster includes student profile full_name');
    assert(r1.roll_number === `CS-${testId}-01`, 'Roster includes student roll_number');
    assert(r1.department === 'Computer Science', 'Roster includes student department');

    // ── 9. BULK ATTENDANCE PROCESSING ──────────────────────────────────────
    console.log('\n9. Testing Bulk Attendance Processing...');

    const bulkRes = await markBulkAttendance(eventBId, presidentBId, 'student', { user_ids: [student1Id] });
    assert(bulkRes.marked === 1, 'markBulkAttendance marked 1 attendee on Event B');

    const dbRegB = await query(
      `SELECT status, checked_in_by FROM event_registrations WHERE event_id = $1 AND user_id = $2`,
      [eventBId, student1Id]
    );
    assert(dbRegB.rows[0].status === 'attended', 'PostgreSQL verified Event B registration status=attended');
    assert(dbRegB.rows[0].checked_in_by === presidentBId, 'PostgreSQL verified checked_in_by=presidentBId');

    console.log('\n═════════════════════════════════════════════════════════════');
    console.log('🎉 ALL 26 PART 2D ATTENDANCE WORKFLOW TESTS PASSED!');
    console.log('═════════════════════════════════════════════════════════════\n');
  } finally {
    // ── 10. CLEANUP TEST DATA ──────────────────────────────────────────────
    console.log('10. Cleaning up test data...');
    const allEventIds = [eventAId, eventBId, draftEventId, cancelledEventId].filter(Boolean);
    const allUserIds = [adminId, facultyId, presidentAId, presidentBId, student1Id, student2Id, studentUnregisteredId].filter(Boolean);
    const allClubIds = [clubAId, clubBId].filter(Boolean);

    if (allEventIds.length > 0) {
      await query(`DELETE FROM event_registrations WHERE event_id = ANY($1::uuid[])`, [allEventIds]);
      await query(`DELETE FROM events WHERE id = ANY($1::uuid[])`, [allEventIds]);
    }
    if (allClubIds.length > 0) {
      await query(`DELETE FROM club_memberships WHERE club_id = ANY($1::uuid[])`, [allClubIds]);
      await query(`DELETE FROM clubs WHERE id = ANY($1::uuid[])`, [allClubIds]);
    }
    if (allUserIds.length > 0) {
      await query(`DELETE FROM notifications WHERE user_id = ANY($1::uuid[])`, [allUserIds]);
      await query(`DELETE FROM profiles WHERE user_id = ANY($1::uuid[])`, [allUserIds]);
      await query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [allUserIds]);
    }
    console.log('✅ Cleanup completed.');
  }
}

runAttendanceWorkflowTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Test suite failed:', err);
    process.exit(1);
  });
