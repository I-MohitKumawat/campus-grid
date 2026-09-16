/**
 * tests/club-lifecycle-archive-delete.test.ts
 *
 * Comprehensive Test Suite for CampusGrid Club Lifecycle:
 *  - Active → Archived (Admin & Authorized Faculty Advisor)
 *  - Rejection of President, Unauthorized Faculty, Member, and Unauthenticated callers
 *  - Exclusion of Archived Clubs from Student Catalog & Discovery
 *  - Non-destructive history preservation (memberships, events, certificates intact)
 *  - Restore back to Active status
 *  - Permanent Deletion (Admin ONLY, Active Club Protection, Exact Name Confirmation)
 *  - Foreign Key Safety & Certificate Verifiability
 */

import 'dotenv/config';
import { query } from '@/lib/db/client';
import {
  archiveClub,
  restoreClub,
  permanentlyDeleteClub,
  listApprovedClubs,
  getClubBySlug,
  registerClub,
} from '@/lib/services/club.service';
import { getAllClubsAdmin, createClubAdmin } from '@/lib/services/admin.service';

const ts = Date.now();

let adminUser: any;
let advisorFaculty: any;
let unaffiliatedFaculty: any;
let studentPresident: any;
let studentMember: any;

let testClub: any;
let testEvent: any;
let testCert: any;

async function setup() {
  console.log('─────────────────────────────────────────────────────────────');
  console.log('🧪 Setting up Test Entities for Club Lifecycle & Archive/Delete');
  console.log('─────────────────────────────────────────────────────────────');

  // 1. Create Users
  const adminRes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'admin')
     RETURNING id, username, role`,
    [`admin_${ts}@college.ac.in`, `admin_${ts}`, `admin_${ts}`, `fb_admin_${ts}`]
  );
  adminUser = adminRes.rows[0];

  const advFacRes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'faculty')
     RETURNING id, username, role`,
    [`advisor_${ts}@college.ac.in`, `advisor_${ts}`, `advisor_${ts}`, `fb_adv_${ts}`]
  );
  advisorFaculty = advFacRes.rows[0];

  const unFacRes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'faculty')
     RETURNING id, username, role`,
    [`unaffil_${ts}@college.ac.in`, `unaffil_${ts}`, `unaffil_${ts}`, `fb_un_${ts}`]
  );
  unaffiliatedFaculty = unFacRes.rows[0];

  const presRes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'student')
     RETURNING id, username, role`,
    [`pres_${ts}@college.ac.in`, `pres_${ts}`, `pres_${ts}`, `fb_pres_${ts}`]
  );
  studentPresident = presRes.rows[0];

  const memRes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'student')
     RETURNING id, username, role`,
    [`mem_${ts}@college.ac.in`, `mem_${ts}`, `mem_${ts}`, `fb_mem_${ts}`]
  );
  studentMember = memRes.rows[0];

  // 2. Create Test Club
  const clubRes = await query(
    `INSERT INTO clubs (
       name, slug, description, type, category, lead_user_id, is_active, verification_status
     )
     VALUES ($1, $2, $3, 'Technical', 'Engineering', $4, TRUE, 'approved')
     RETURNING *`,
    [`Quantum Robotics Lab ${ts}`, `quantum-robotics-lab-${ts}`, 'Autonomous system research', studentPresident.id]
  );
  testClub = clubRes.rows[0];

  // 3. Assign President and Member
  await query(
    `INSERT INTO club_memberships (club_id, user_id, role, status, posting_access)
     VALUES ($1, $2, 'president', 'active', TRUE)`,
    [testClub.id, studentPresident.id]
  );

  await query(
    `INSERT INTO club_memberships (club_id, user_id, role, status, posting_access)
     VALUES ($1, $2, 'member', 'active', FALSE)`,
    [testClub.id, studentMember.id]
  );

  // 4. Assign Advisor Faculty
  await query(
    `INSERT INTO club_faculty_advisors (club_id, faculty_id, is_hod)
     VALUES ($1, $2, TRUE)`,
    [testClub.id, advisorFaculty.id]
  );

  // 5. Create a historical campus event hosted by this club
  const eventRes = await query(
    `INSERT INTO events (
       title, description, organiser_id, organiser_type, club_id,
       event_type, status, event_date, attendee_count
     )
     VALUES ($1, 'Hands-on Autonomous Workshop', $2, 'club', $3, 'workshop', 'completed', now() - interval '10 days', 1)
     RETURNING *`,
    [`Autonomous Rover Summit ${ts}`, studentPresident.id, testClub.id]
  );
  testEvent = eventRes.rows[0];

  // 6. Create event registration and student verifiable certificate
  const regRes = await query(
    `INSERT INTO event_registrations (event_id, user_id, status, qr_token)
     VALUES ($1, $2, 'registered', $3)
     RETURNING *`,
    [testEvent.id, studentMember.id, `qr_tok_${ts}`]
  );
  const testReg = regRes.rows[0];

  const certRes = await query(
    `INSERT INTO certificates (event_id, user_id, registration_id, verification_token, certificate_type)
     VALUES ($1, $2, $3, $4, 'winner')
     RETURNING *`,
    [testEvent.id, studentMember.id, testReg.id, `cert_tok_${ts}`]
  );
  testCert = certRes.rows[0];

  console.log(`✅ Test setup complete for club "${testClub.name}"`);
}

async function runTests() {
  await setup();
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${msg}`);
      failed++;
    }
  }

  console.log('\n═════════════════════════════════════════════════════════════');
  console.log('PART 1: ARCHIVE AUTHORIZATION & SAFETY');
  console.log('═════════════════════════════════════════════════════════════');

  // Test 1: Unauthenticated request rejected
  try {
    await archiveClub(testClub.slug, { id: '', role: '' });
    assert(false, '1. Unauthenticated archive request rejected');
  } catch (err: any) {
    assert(err?.statusCode === 401 || err?.message.includes('Authentication'), '1. Unauthenticated archive request rejected (401)');
  }

  // Test 2: Member cannot archive
  try {
    await archiveClub(testClub.slug, { id: studentMember.id, role: studentMember.role });
    assert(false, '2. Ordinary member cannot archive club');
  } catch (err: any) {
    assert(err?.statusCode === 403, '2. Ordinary member cannot archive club (403)');
  }

  // Test 3: President cannot archive their own club
  try {
    await archiveClub(testClub.slug, { id: studentPresident.id, role: studentPresident.role });
    assert(false, '3. President cannot archive their own club');
  } catch (err: any) {
    assert(err?.statusCode === 403, '3. President cannot archive their own club (403)');
  }

  // Test 4: Unaffiliated faculty cannot archive
  try {
    await archiveClub(testClub.slug, { id: unaffiliatedFaculty.id, role: unaffiliatedFaculty.role });
    assert(false, '4. Unaffiliated faculty cannot archive');
  } catch (err: any) {
    assert(err?.statusCode === 403, '4. Unaffiliated faculty cannot archive (403)');
  }

  // Test 5: Authorized assigned Faculty Advisor CAN archive
  try {
    const archived = await archiveClub(testClub.slug, { id: advisorFaculty.id, role: advisorFaculty.role });
    assert(
      Boolean(archived.archived_at) && archived.archived_by === advisorFaculty.id && archived.is_active === false,
      '5. Assigned Faculty Advisor successfully archives club (records archived_at, archived_by, is_active=false)'
    );
  } catch (err: any) {
    console.error('Test 5 error:', err);
    assert(false, '5. Assigned Faculty Advisor successfully archives club');
  }

  // Test 6: Attempting to archive an already-archived club returns 409 Conflict
  try {
    await archiveClub(testClub.slug, { id: adminUser.id, role: adminUser.role });
    assert(false, '6. Archiving already-archived club returns 409 Conflict');
  } catch (err: any) {
    assert(err?.statusCode === 409, '6. Archiving already-archived club returns 409 Conflict');
  }

  console.log('\n═════════════════════════════════════════════════════════════');
  console.log('PART 2: ARCHIVED STATE & DISCOVERY EXCLUSION');
  console.log('═════════════════════════════════════════════════════════════');

  // Test 7: Archived club disappears from student public discovery (listApprovedClubs)
  const activeClubs = await listApprovedClubs();
  const foundInActive = activeClubs.some((c: any) => c.id === testClub.id);
  assert(!foundInActive, '7. Archived club is strictly excluded from public student discovery (listApprovedClubs)');

  // Test 8: Admin can view archived club in admin directory (getAllClubsAdmin with status=archived)
  const archivedAdminClubs = await getAllClubsAdmin(undefined, undefined, 'archived');
  const foundInAdminArchived = archivedAdminClubs.some((c: any) => c.id === testClub.id);
  assert(foundInAdminArchived, '8. Archived club is visible in Admin Console archive view');

  // Test 9: Archived club preserves memberships, events, certificates
  const memCount = await query('SELECT COUNT(*) FROM club_memberships WHERE club_id = $1', [testClub.id]);
  assert(parseInt(memCount.rows[0].count, 10) === 2, '9. Historical club memberships remain 100% preserved');

  const evCheck = await query('SELECT * FROM events WHERE club_id = $1', [testClub.id]);
  assert(evCheck.rows.length === 1, '10. Historical club events remain 100% preserved');

  const certCheck = await query('SELECT * FROM certificates WHERE event_id = $1', [testEvent.id]);
  assert(certCheck.rows.length === 1, '11. Student certificates remain intact and verifiable');

  console.log('\n═════════════════════════════════════════════════════════════');
  console.log('PART 3: RESTORE LIFECYCLE');
  console.log('═════════════════════════════════════════════════════════════');

  // Test 12: Admin restores club
  const restored = await restoreClub(testClub.slug, { id: adminUser.id, role: adminUser.role });
  assert(
    restored.archived_at === null && restored.archived_by === null && restored.is_active === true,
    '12. Admin restores club (archived_at=null, is_active=true)'
  );

  // Test 13: Restored club reappears in student public discovery
  const activeAfterRestore = await listApprovedClubs();
  const foundAfterRestore = activeAfterRestore.some((c: any) => c.id === testClub.id);
  assert(foundAfterRestore, '13. Restored club reappears in public student discovery');

  // Test 14: Restoring an already active club returns 409 Conflict
  try {
    await restoreClub(testClub.slug, { id: adminUser.id, role: adminUser.role });
    assert(false, '14. Restoring an already active club returns 409 Conflict');
  } catch (err: any) {
    assert(err?.statusCode === 409, '14. Restoring active club returns 409 Conflict');
  }

  console.log('\n═════════════════════════════════════════════════════════════');
  console.log('PART 4: PERMANENT DELETION SAFETY INVARIANTS');
  console.log('═════════════════════════════════════════════════════════════');

  // Test 15: Cannot permanently delete an ACTIVE club (Safety Invariant)
  try {
    await permanentlyDeleteClub(testClub.slug, { id: adminUser.id, role: adminUser.role }, testClub.name);
    assert(false, '15. Permanent delete rejected on ACTIVE club (Must be archived first)');
  } catch (err: any) {
    assert(err?.statusCode === 409, '15. Permanent delete rejected on ACTIVE club with 409 Conflict (Must be archived first)');
  }

  // Archive club first to prepare for delete tests
  await archiveClub(testClub.slug, { id: adminUser.id, role: adminUser.role });

  // Test 16: President cannot permanently delete
  try {
    await permanentlyDeleteClub(testClub.slug, { id: studentPresident.id, role: studentPresident.role }, testClub.name);
    assert(false, '16. President cannot permanently delete club');
  } catch (err: any) {
    assert(err?.statusCode === 403, '16. President cannot permanently delete club (403)');
  }

  // Test 17: Faculty cannot permanently delete
  try {
    await permanentlyDeleteClub(testClub.slug, { id: advisorFaculty.id, role: advisorFaculty.role }, testClub.name);
    assert(false, '17. Faculty cannot permanently delete club');
  } catch (err: any) {
    assert(err?.statusCode === 403, '17. Faculty cannot permanently delete club (403)');
  }

  // Test 18: Name confirmation mismatch rejected
  try {
    await permanentlyDeleteClub(testClub.slug, { id: adminUser.id, role: adminUser.role }, 'Wrong Club Name');
    assert(false, '18. Name confirmation mismatch rejected');
  } catch (err: any) {
    assert(err?.statusCode === 400 || err?.statusCode === 422 || err?.name === 'ValidationError', '18. Name confirmation mismatch rejected with validation error');
  }

  // Test 19: Admin permanently deletes the archived club
  const delResult = await permanentlyDeleteClub(testClub.slug, { id: adminUser.id, role: adminUser.role }, testClub.name);
  assert(delResult.success === true, '19. Admin successfully permanently deletes archived club');

  // Test 20: Target club row is deleted
  const clubAfterDel = await query('SELECT * FROM clubs WHERE id = $1', [testClub.id]);
  assert(clubAfterDel.rows.length === 0, '20. Club row permanently removed from PostgreSQL database');

  // Test 21: Club memberships cascaded cleanly
  const memsAfterDel = await query('SELECT * FROM club_memberships WHERE club_id = $1', [testClub.id]);
  assert(memsAfterDel.rows.length === 0, '21. Club memberships cascaded cleanly');

  // Test 22: Historical events preserved with club_id = NULL
  const evAfterDel = await query('SELECT * FROM events WHERE id = $1', [testEvent.id]);
  assert(evAfterDel.rows.length === 1 && evAfterDel.rows[0].club_id === null, '22. Historical event preserved with club_id = NULL (no data loss)');

  // Test 23: Student registrations and certificates remain 100% intact and verifiable
  const certAfterDel = await query('SELECT * FROM certificates WHERE id = $1', [testCert.id]);
  assert(certAfterDel.rows.length === 1, '23. Student certificate remains intact and fully verifiable');

  // Cleanup Users & Event
  await query('DELETE FROM certificates WHERE id = $1', [testCert.id]);
  await query('DELETE FROM event_registrations WHERE event_id = $1', [testEvent.id]);
  await query('DELETE FROM events WHERE id = $1', [testEvent.id]);
  await query('DELETE FROM users WHERE id IN ($1, $2, $3, $4, $5)', [
    adminUser.id,
    advisorFaculty.id,
    unaffiliatedFaculty.id,
    studentPresident.id,
    studentMember.id,
  ]);

  console.log('\n═════════════════════════════════════════════════════════════');
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('═════════════════════════════════════════════════════════════');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
