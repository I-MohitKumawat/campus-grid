/**
 * tests/certificate-workflow.test.ts
 *
 * PART 2E: Comprehensive Student Certificates & Verification Workflow Test Suite.
 *
 * Covers:
 * 1. Controlled Fixture Setup (Admin, Clubs, Officers, Attendees, Non-Attendees, Events)
 * 2. Strict Authorization & Cross-Club Isolation (Student -> 403, Member -> 403, Cross-Club -> 403, Faculty -> 403, President -> 200, Admin -> 200)
 * 3. Event State Lifecycle Gating (Draft -> 400, Published -> 400, Cancelled -> 400, Completed -> 200)
 * 4. Eligibility Enforcement (Attended -> Certificate, Non-Attended -> No Certificate, Unregistered -> No Certificate)
 * 5. Idempotency & Duplicate Prevention (Repeated issuance -> 0 new certs, 1 row in DB, 1 notification)
 * 6. Direct PostgreSQL Row & Foreign Key Verification
 * 7. Student Profile Integration & Timeline Credential Verification
 * 8. Public Verification API (Valid Token -> 200, Invalid Token -> 404, Privacy Preserved)
 * 9. Event Studio Organizer Certificate Roster API
 */

import 'dotenv/config';
import { query } from '@/lib/db/client';
import {
  createEvent,
  submitEventForApproval,
  facultyApproveEvent,
  adminApproveEvent,
  completeEvent,
  cancelEvent,
  registerForEvent,
  markAttendance,
  issueCertificatesForEvent,
  getEventCertificates,
  verifyCertificate,
} from '@/lib/services/event.service';
import { getStudentProfile } from '@/lib/services/user.service';
import { getAllCertificatesAdmin } from '@/lib/services/admin.service';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ [PASS] ${message}`);
}

async function runCertificateWorkflowTests() {
  console.log('═════════════════════════════════════════════════════════════');
  console.log('🧪 PART 2E: STUDENT CERTIFICATES & VERIFICATION TEST SUITE');
  console.log('═════════════════════════════════════════════════════════════\n');

  let passed = 0;
  const ts = Date.now();

  // ── 1. Setup Test Fixtures ───────────────────────────────────────────────────
  console.log('1. Setting up Test Entities (Users, Clubs, Events, Registrations)...');

  // Users
  const adminUserRes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'admin') RETURNING *`,
    [`admin_${ts}@campusgrid.test`, `admin_${ts}`, `admin-${ts}`, `fb_admin_${ts}`]
  );
  const adminUser = adminUserRes.rows[0];

  const presARes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'student') RETURNING *`,
    [`pres_a_${ts}@campusgrid.test`, `pres_a_${ts}`, `pres-a-${ts}`, `fb_pres_a_${ts}`]
  );
  const presA = presARes.rows[0];

  const presBRes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'student') RETURNING *`,
    [`pres_b_${ts}@campusgrid.test`, `pres_b_${ts}`, `pres-b-${ts}`, `fb_pres_b_${ts}`]
  );
  const presB = presBRes.rows[0];

  const memberARes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'student') RETURNING *`,
    [`member_a_${ts}@campusgrid.test`, `member_a_${ts}`, `member-a-${ts}`, `fb_member_a_${ts}`]
  );
  const memberA = memberARes.rows[0];

  const studentAttendedRes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'student') RETURNING *`,
    [`student_att_${ts}@campusgrid.test`, `student_att_${ts}`, `student-att-${ts}`, `fb_student_att_${ts}`]
  );
  const studentAttended = studentAttendedRes.rows[0];

  await query(
    `INSERT INTO profiles (user_id, full_name, roll_number, department)
     VALUES ($1, 'Alice Attended', '1MS21CS001', 'Computer Science')`,
    [studentAttended.id]
  );

  const studentAbsentRes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'student') RETURNING *`,
    [`student_abs_${ts}@campusgrid.test`, `student_abs_${ts}`, `student-abs-${ts}`, `fb_student_abs_${ts}`]
  );
  const studentAbsent = studentAbsentRes.rows[0];

  await query(
    `INSERT INTO profiles (user_id, full_name, roll_number, department)
     VALUES ($1, 'Bob Absent', '1MS21CS002', 'Information Science')`,
    [studentAbsent.id]
  );

  const studentUnregRes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'student') RETURNING *`,
    [`student_unreg_${ts}@campusgrid.test`, `student_unreg_${ts}`, `student-unreg-${ts}`, `fb_student_unreg_${ts}`]
  );
  const studentUnreg = studentUnregRes.rows[0];

  const facultyRes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'faculty') RETURNING *`,
    [`faculty_${ts}@campusgrid.test`, `faculty_${ts}`, `faculty-${ts}`, `fb_faculty_${ts}`]
  );
  const facultyUser = facultyRes.rows[0];

  const unaffiliatedFacRes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'faculty') RETURNING *`,
    [`unaffiliated_fac_${ts}@campusgrid.test`, `unaffiliated_fac_${ts}`, `unaffiliated-fac-${ts}`, `fb_unaff_fac_${ts}`]
  );
  const unaffiliatedFaculty = unaffiliatedFacRes.rows[0];

  // Clubs
  const clubARes = await query(
    `INSERT INTO clubs (name, slug, description, type, category, lead_user_id, verification_status, is_active, recruitment_open, visibility)
     VALUES ($1, $2, 'Club Alpha', 'Technical', 'Coding', $3, 'approved', TRUE, TRUE, 'public') RETURNING *`,
    [`Club Alpha ${ts}`, `club-alpha-${ts}`, presA.id]
  );
  const clubA = clubARes.rows[0];

  await query(
    `INSERT INTO club_memberships (club_id, user_id, role, posting_access)
     VALUES ($1, $2, 'president', true)`,
    [clubA.id, presA.id]
  );
  await query(
    `INSERT INTO club_memberships (club_id, user_id, role, posting_access)
     VALUES ($1, $2, 'member', false)`,
    [clubA.id, memberA.id]
  );
  await query(
    `INSERT INTO club_faculty_advisors (club_id, faculty_id)
     VALUES ($1, $2)`,
    [clubA.id, facultyUser.id]
  );

  const clubBRes = await query(
    `INSERT INTO clubs (name, slug, description, type, category, lead_user_id, verification_status, is_active, recruitment_open, visibility)
     VALUES ($1, $2, 'Club Beta', 'Cultural', 'Music', $3, 'approved', TRUE, TRUE, 'public') RETURNING *`,
    [`Club Beta ${ts}`, `club-beta-${ts}`, presB.id]
  );
  const clubB = clubBRes.rows[0];

  await query(
    `INSERT INTO club_memberships (club_id, user_id, role, posting_access)
     VALUES ($1, $2, 'president', true)`,
    [clubB.id, presB.id]
  );

  // Events:
  const eventDateFuture = new Date(Date.now() + 86400000).toISOString();
  const deadlineFuture = new Date(Date.now() + 43200000).toISOString();

  // 1. Completed Event (Club A)
  const completedEvent = await createEvent(presA.id, presA.role, {
    title: `Completed Hackathon ${ts}`,
    description: 'A completed flagship hackathon',
    event_type: 'hackathon',
    visibility: 'public',
    club_id: clubA.id,
    event_date: eventDateFuture,
    duration_minutes: 180,
    venue: 'CS Seminar Hall',
    capacity: 100,
    registration_deadline: deadlineFuture,
    registration_mode: 'instant',
    certificates_enabled: true,
    check_in_enabled: true,
  });

  // Approve and Complete Event
  await submitEventForApproval(completedEvent.id, presA.id, presA.role);
  await facultyApproveEvent(completedEvent.id, facultyUser.id, facultyUser.role);
  await adminApproveEvent(completedEvent.id, adminUser.id, adminUser.role);

  // Register Student A and Student B
  const regAttended = await registerForEvent(completedEvent.id, studentAttended.id, { attendance_mode: 'offline' });
  const regAbsent = await registerForEvent(completedEvent.id, studentAbsent.id, { attendance_mode: 'offline' });

  // Check in Student A (Attended), but NOT Student B
  await markAttendance(completedEvent.id, presA.id, presA.role, {
    qr_token: regAttended.qr_token,
  });

  // Transition event to completed state
  await completeEvent(completedEvent.id, presA.id, presA.role);

  // 2. Draft Event
  const draftEvent = await createEvent(presA.id, presA.role, {
    title: `Draft Workshop ${ts}`,
    description: 'Draft workshop',
    event_type: 'workshop',
    visibility: 'public',
    club_id: clubA.id,
    event_date: eventDateFuture,
    duration_minutes: 120,
    certificates_enabled: true,
    check_in_enabled: true,
  });

  // 3. Published Event (Not completed)
  const publishedEvent = await createEvent(presA.id, presA.role, {
    title: `Active Seminar ${ts}`,
    description: 'Published active seminar',
    event_type: 'seminar',
    visibility: 'public',
    club_id: clubA.id,
    event_date: eventDateFuture,
    duration_minutes: 120,
    certificates_enabled: true,
    check_in_enabled: true,
  });
  await submitEventForApproval(publishedEvent.id, presA.id, presA.role);
  await facultyApproveEvent(publishedEvent.id, facultyUser.id, facultyUser.role);
  await adminApproveEvent(publishedEvent.id, adminUser.id, adminUser.role);

  // 4. Cancelled Event
  const cancelledEvent = await createEvent(presA.id, presA.role, {
    title: `Cancelled Meetup ${ts}`,
    description: 'Cancelled meetup',
    event_type: 'meetup',
    visibility: 'public',
    club_id: clubA.id,
    event_date: eventDateFuture,
    duration_minutes: 60,
    certificates_enabled: true,
    check_in_enabled: true,
  });
  await cancelEvent(cancelledEvent.id, presA.id, presA.role, 'Weather conditions');

  console.log('✅ Fixtures created and state machines initialized.\n');

  // ── 2. Test Authorization & Cross-Club Isolation ─────────────────────────────
  console.log('2. Testing Certificate Issuance Authorization & Cross-Club Boundaries...');

  // Test 2.1: Ordinary Student cannot issue certificates
  try {
    await issueCertificatesForEvent(completedEvent.id, studentAttended.id, studentAttended.role);
    assert(false, 'Ordinary student should NOT be able to issue certificates');
  } catch (err: any) {
    assert(err.statusCode === 403, 'Ordinary student rejected with 403 Forbidden');
    passed++;
  }

  // Test 2.2: Ordinary Club Member cannot issue certificates
  try {
    await issueCertificatesForEvent(completedEvent.id, memberA.id, memberA.role);
    assert(false, 'Ordinary club member should NOT be able to issue certificates');
  } catch (err: any) {
    assert(err.statusCode === 403, 'Ordinary club member rejected with 403 Forbidden');
    passed++;
  }

  // Test 2.3: President of Club B cannot issue certificates for Club A event
  try {
    await issueCertificatesForEvent(completedEvent.id, presB.id, presB.role);
    assert(false, 'Cross-club president should NOT be able to issue certificates for Club A');
  } catch (err: any) {
    assert(err.statusCode === 403, 'Cross-club president rejected with 403 Forbidden');
    passed++;
  }

  // Test 2.4: Unaffiliated Faculty cannot issue certificates
  try {
    await issueCertificatesForEvent(completedEvent.id, unaffiliatedFaculty.id, unaffiliatedFaculty.role);
    assert(false, 'Unaffiliated faculty should NOT be able to issue certificates');
  } catch (err: any) {
    assert(err.statusCode === 403, 'Unaffiliated faculty rejected with 403 Forbidden');
    passed++;
  }

  // ── 3. Test Event Lifecycle State Restrictions ───────────────────────────────
  console.log('\n3. Testing Event Lifecycle State Gating...');

  // Test 3.1: Certificate issuance rejected on Draft event
  try {
    await issueCertificatesForEvent(draftEvent.id, presA.id, presA.role);
    assert(false, 'Draft event should NOT allow certificate issuance');
  } catch (err: any) {
    assert(err.statusCode === 422 || err.statusCode === 400, 'Draft event issuance rejected with ValidationError');
    passed++;
  }

  // Test 3.2: Certificate issuance rejected on Published (uncompleted) event
  try {
    await issueCertificatesForEvent(publishedEvent.id, presA.id, presA.role);
    assert(false, 'Published active event should NOT allow certificate issuance before completion');
  } catch (err: any) {
    assert(err.statusCode === 422 || err.statusCode === 400, 'Published active event issuance rejected with ValidationError');
    passed++;
  }

  // Test 3.3: Certificate issuance rejected on Cancelled event
  try {
    await issueCertificatesForEvent(cancelledEvent.id, presA.id, presA.role);
    assert(false, 'Cancelled event should NOT allow certificate issuance');
  } catch (err: any) {
    assert(err.statusCode === 422 || err.statusCode === 400, 'Cancelled event issuance rejected with ValidationError');
    passed++;
  }

  // ── 4. Test Certificate Issuance & Eligibility Enforcement ───────────────────
  console.log('\n4. Testing Certificate Issuance & Eligibility Enforcement...');

  // Authorized President A issues certificates for completed event
  const issueResult = await issueCertificatesForEvent(completedEvent.id, presA.id, presA.role);

  assert(issueResult.issued_count === 1, 'Exactly 1 certificate issued for attended attendee (Student A)');
  assert(issueResult.total_eligible === 1, 'Total eligible attendee count is exactly 1');
  passed += 2;

  // ── 5. Database Row & Foreign Key Verification ──────────────────────────────
  console.log('\n5. Verifying Direct PostgreSQL Row Invariants...');

  // Test 5.1: Student A certificate exists in PostgreSQL
  const certARes = await query(
    `SELECT * FROM certificates WHERE event_id = $1 AND user_id = $2`,
    [completedEvent.id, studentAttended.id]
  );
  assert(certARes.rows.length === 1, 'PostgreSQL: Exactly 1 certificate row for Student A');
  const certA = certARes.rows[0];

  assert(certA.registration_id === regAttended.id, 'Certificate references valid registration_id');
  assert(certA.certificate_type === 'participation', 'Certificate type is participation');
  assert(typeof certA.verification_token === 'string' && certA.verification_token.startsWith('CERT-'), 'Certificate has unique verification token');
  assert(certA.issued_at !== null, 'Certificate issued_at timestamp is populated');
  passed += 5;

  // Test 5.2: Student B (Absent) has NO certificate
  const certBRes = await query(
    `SELECT * FROM certificates WHERE event_id = $1 AND user_id = $2`,
    [completedEvent.id, studentAbsent.id]
  );
  assert(certBRes.rows.length === 0, 'PostgreSQL: Zero certificate rows for Student B (Absent)');
  passed++;

  // Test 5.3: Student C (Unregistered) has NO certificate
  const certCRes = await query(
    `SELECT * FROM certificates WHERE event_id = $1 AND user_id = $2`,
    [completedEvent.id, studentUnreg.id]
  );
  assert(certCRes.rows.length === 0, 'PostgreSQL: Zero certificate rows for Student C (Unregistered)');
  passed++;

  // Test 5.4: Registration certificate_issued flag updated
  const regCheckRes = await query(
    `SELECT certificate_issued FROM event_registrations WHERE id = $1`,
    [regAttended.id]
  );
  assert(regCheckRes.rows[0]?.certificate_issued === true, 'event_registrations.certificate_issued is set to TRUE');
  passed++;

  // ── 6. Test Idempotency & Duplicate Prevention ──────────────────────────────
  console.log('\n6. Testing Issuance Idempotency & Duplicate Prevention...');

  // Test 6.1: Repeated issuance call produces 0 new certificates
  const repeatIssue = await issueCertificatesForEvent(completedEvent.id, presA.id, presA.role);
  assert(repeatIssue.issued_count === 0, 'Repeated certificate issuance returned issued_count = 0');
  passed++;

  // Test 6.2: Database still contains exactly 1 row
  const dbCertCountRes = await query(
    `SELECT COUNT(*) FROM certificates WHERE event_id = $1`,
    [completedEvent.id]
  );
  assert(parseInt(dbCertCountRes.rows[0].count, 10) === 1, 'PostgreSQL Invariant: Total certificates for event remains 1');
  passed++;

  // Test 6.3: In-app notification sent exactly once
  const notifRes = await query(
    `SELECT * FROM notifications WHERE user_id = $1 AND type = 'certificate'`,
    [studentAttended.id]
  );
  assert(notifRes.rows.length === 1, 'In-app certificate notification dispatched exactly once');
  assert(notifRes.rows[0].link_url.includes(certA.verification_token), 'Notification link contains verification token');
  passed += 2;

  // ── 7. Test Student Profile Integration ──────────────────────────────────────
  console.log('\n7. Testing Student Profile Integration...');

  // Test 7.1: Student A profile returns real certificate
  const profileA = await getStudentProfile(studentAttended.id);
  assert(Array.isArray(profileA.certificates) && profileA.certificates.length === 1, 'Student A profile returns 1 earned certificate');
  assert(profileA.certificates[0].verification_token === certA.verification_token, 'Profile certificate matches DB verification_token');
  assert(profileA.certificates[0].event_title === completedEvent.title, 'Profile certificate includes accurate event title');

  // Test 7.2: Timeline includes certificate milestone
  const certMilestone = profileA.timeline.find((t) => t.category === 'certificate');
  assert(!!certMilestone, 'Student A campus timeline contains certificate milestone');
  assert(certMilestone?.title.includes('Certificate'), 'Timeline milestone has appropriate certificate title');
  passed += 5;

  // Test 7.3: Student B profile has empty certificates array
  const profileB = await getStudentProfile(studentAbsent.id);
  assert(Array.isArray(profileB.certificates) && profileB.certificates.length === 0, 'Student B profile returns empty certificates array');
  passed++;

  // ── 8. Test Public Certificate Verification API ──────────────────────────────
  console.log('\n8. Testing Public Certificate Verification API & Privacy Invariants...');

  // Test 8.1: Valid token returns complete public-safe verification metadata
  const verifiedCert = await verifyCertificate(certA.verification_token);
  assert(verifiedCert && verifiedCert.verification_token === certA.verification_token, 'Public verification successfully validates valid token');
  assert(verifiedCert.event_title === completedEvent.title, 'Verification exposes event_title');
  assert(verifiedCert.recipient_name === 'Alice Attended', 'Verification exposes recipient full_name');
  assert(verifiedCert.recipient_username === studentAttended.username, 'Verification exposes recipient username');
  assert(verifiedCert.club_name === clubA.name, 'Verification exposes host club name');
  assert(verifiedCert.certificate_type === 'participation', 'Verification exposes certificate_type');
  assert(verifiedCert.issued_at !== null, 'Verification exposes issued_at timestamp');

  // Test 8.2: Privacy invariant (No email or private auth fields returned)
  assert((verifiedCert as any).email === undefined, 'Privacy Invariant: Student email is NOT exposed in public verification');
  assert((verifiedCert as any).password === undefined, 'Privacy Invariant: Passwords/hashes are NOT exposed');
  assert((verifiedCert as any).firebase_uid === undefined, 'Privacy Invariant: Firebase UID is NOT exposed');
  passed += 10;

  // Test 8.3: Invalid token throws NotFoundError (404)
  try {
    await verifyCertificate('INVALID-NONEXISTENT-TOKEN-999');
    assert(false, 'Invalid verification token should throw NotFoundError');
  } catch (err: any) {
    assert(err.statusCode === 404, 'Invalid verification token returns 404 NotFound');
    passed++;
  }

  // ── 9. Test Event Studio & Admin Certificate Roster ──────────────────────────
  console.log('\n9. Testing Organizer & Admin Certificate Roster APIs...');

  // Test 9.1: Organizer can fetch issued certificates for event
  const eventCerts = await getEventCertificates(completedEvent.id, presA.id, presA.role);
  assert(Array.isArray(eventCerts) && eventCerts.length === 1, 'getEventCertificates returns array with 1 certificate');
  assert(eventCerts[0].verification_token === certA.verification_token, 'Roster certificate matches Student A token');
  assert(eventCerts[0].full_name === 'Alice Attended', 'Roster certificate includes recipient full name');
  passed += 3;

  // Test 9.2: Admin can fetch all system certificates
  const adminCerts = await getAllCertificatesAdmin();
  assert(Array.isArray(adminCerts) && adminCerts.some((c: any) => c.verification_token === certA.verification_token), 'Admin certificates registry contains Student A certificate');
  passed++;

  // Test 9.3: Platform Admin can issue certificates for institutional event
  const adminEvent = await createEvent(adminUser.id, adminUser.role, {
    title: `Institutional Summit ${ts}`,
    description: 'Admin summit',
    event_type: 'seminar',
    visibility: 'public',
    event_date: eventDateFuture,
    duration_minutes: 240,
    certificates_enabled: true,
    check_in_enabled: true,
  });
  await submitEventForApproval(adminEvent.id, adminUser.id, adminUser.role);
  await adminApproveEvent(adminEvent.id, adminUser.id, adminUser.role);

  const regAdminStudent = await registerForEvent(adminEvent.id, studentAttended.id, { attendance_mode: 'offline' });
  await markAttendance(adminEvent.id, adminUser.id, adminUser.role, {
    qr_token: regAdminStudent.qr_token,
  });

  await completeEvent(adminEvent.id, adminUser.id, adminUser.role);

  const adminIssueRes = await issueCertificatesForEvent(adminEvent.id, adminUser.id, adminUser.role);
  assert(adminIssueRes.issued_count === 1, 'Platform Admin successfully issues certificates for institutional event');
  passed++;

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log('\n═════════════════════════════════════════════════════════════');
  console.log(`🎉 ALL ${passed} PART 2E CERTIFICATE WORKFLOW TESTS PASSED!`);
  console.log('═════════════════════════════════════════════════════════════\n');
}

runCertificateWorkflowTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test suite failed:', err);
    process.exit(1);
  });
