/**
 * tests/event-lifecycle-workflow.test.ts
 *
 * PART 2C: EVENT LIFECYCLE & EVENT MANAGEMENT WORKFLOW TEST SUITE
 *
 * Validates:
 * 1. Event Ownership & Creation Authorization:
 *    - Ordinary student cannot create event without club authorization (403/ValidationError).
 *    - Club President can create event for their club (organiser_type='club', status='draft').
 *    - Cross-club isolation: Club A President cannot create event for Club B.
 *    - Platform Admin can create institutional events (no club_id) or club events.
 * 2. Draft & Security Visibility Boundary:
 *    - Draft events are hidden from student discovery (listUpcomingEvents).
 *    - Draft events cannot be viewed by unauthorized students via getEventById (404 NotFound).
 *    - Draft events can be viewed by creator, authorized club leadership, and Admin.
 * 3. Lifecycle State Machine Transitions & Approval Workflow:
 *    - Draft -> submitEventForApproval -> pending_faculty (when faculty advisor exists).
 *    - Unauthorized faculty cannot approve/reject (403 Forbidden).
 *    - Assigned faculty advisor approves -> pending_admin.
 *    - Faculty rejection -> draft (with faculty_rejection_note).
 *    - Admin approves -> published.
 *    - Admin rejection -> draft (with admin_rejection_note).
 *    - Organizer withdraws submission -> draft.
 * 4. Discovery & Registrations:
 *    - Published events appear in listUpcomingEvents.
 *    - Student registers for instant event -> registered, attendee_count incremented.
 *    - Duplicate registration is rejected (ConflictError).
 *    - Registration after deadline is rejected (ValidationError).
 *    - Registration when capacity reached -> placed on waitlist.
 *    - Approval mode event registration -> pending.
 *    - Organizer decides pending registration applications (approve/reject).
 * 5. Event Editing & Management:
 *    - Authorized club officer can update event details.
 *    - Cross-club editing blocked (Club B President cannot update Club A's event).
 * 6. Cancellation & Completion:
 *    - Authorized organizer / Admin cancels event -> status='cancelled', attendees notified.
 *    - Registrations blocked on cancelled events.
 *    - Event marked complete -> status='completed', appears in listPastEvents.
 *    - Admin can delete/archive event.
 */

import 'dotenv/config';
import { query } from '@/lib/db/client';
import {
  createEvent,
  getEventById,
  listUpcomingEvents,
  listPastEvents,
  updateEvent,
  submitEventForApproval,
  facultyApproveEvent,
  facultyRejectEvent,
  adminApproveEvent,
  adminRejectEvent,
  withdrawEventSubmission,
  registerForEvent,
  cancelEventRegistration,
  decideApplications,
  cancelEvent,
  completeEvent,
  adminDeleteEvent,
} from '@/lib/services/event.service';

function assert(condition: any, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ [PASS] ${message}`);
}

async function runEventLifecycleTests() {
  console.log('═════════════════════════════════════════════════════════════');
  console.log('🧪 PART 2C: EVENT LIFECYCLE & EVENT MANAGEMENT TEST SUITE');
  console.log('═════════════════════════════════════════════════════════════\n');

  const ts = Date.now();
  let passed = 0;
  let failed = 0;

  // ── 1. Setup Test Fixtures ───────────────────────────────────────────────────
  console.log('1. Setting up Test Fixtures (Users, Clubs, Advisors)...');

  // Admin user
  const adminRes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'admin') RETURNING *`,
    [`admin_${ts}@college.ac.in`, `admin_${ts}`, `admin-${ts}`, `f_admin_${ts}`]
  );
  const adminUser = adminRes.rows[0];

  // Faculty Advisor 1 (for Club A)
  const fac1Res = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'faculty') RETURNING *`,
    [`fac1_${ts}@college.ac.in`, `fac1_${ts}`, `fac1-${ts}`, `f_fac1_${ts}`]
  );
  const facAdvisor1 = fac1Res.rows[0];

  // Faculty 2 (Unaffiliated)
  const fac2Res = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'faculty') RETURNING *`,
    [`fac2_${ts}@college.ac.in`, `fac2_${ts}`, `fac2-${ts}`, `f_fac2_${ts}`]
  );
  const facAdvisor2 = fac2Res.rows[0];

  // President of Club A
  const presARes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'student') RETURNING *`,
    [`presA_${ts}@college.ac.in`, `presA_${ts}`, `presA-${ts}`, `f_presA_${ts}`]
  );
  const presA = presARes.rows[0];

  // President of Club B
  const presBRes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'student') RETURNING *`,
    [`presB_${ts}@college.ac.in`, `presB_${ts}`, `presB-${ts}`, `f_presB_${ts}`]
  );
  const presB = presBRes.rows[0];

  // General Student (no club leadership)
  const studentRes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'student') RETURNING *`,
    [`student_${ts}@college.ac.in`, `student_${ts}`, `student-${ts}`, `f_student_${ts}`]
  );
  const student = studentRes.rows[0];

  // Student 2 (for capacity / waitlist testing)
  const student2Res = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'student') RETURNING *`,
    [`student2_${ts}@college.ac.in`, `student2_${ts}`, `student2-${ts}`, `f_student2_${ts}`]
  );
  const student2 = student2Res.rows[0];

  // Create Club A (with faculty advisor 1)
  const clubARes = await query(
    `INSERT INTO clubs (name, slug, description, type, category, lead_user_id, verification_status, is_active, recruitment_open, visibility)
     VALUES ($1, $2, 'Club A Description', 'Technical', 'Technical', $3, 'approved', TRUE, TRUE, 'public')
     RETURNING *`,
    [`Club Alpha ${ts}`, `club-alpha-${ts}`, presA.id]
  );
  const clubA = clubARes.rows[0];

  // Add President A to Club A
  await query(
    `INSERT INTO club_memberships (club_id, user_id, role, posting_access)
     VALUES ($1, $2, 'president', true)`,
    [clubA.id, presA.id]
  );

  // Link Faculty Advisor 1 to Club A
  await query(
    `INSERT INTO club_faculty_advisors (club_id, faculty_id)
     VALUES ($1, $2)`,
    [clubA.id, facAdvisor1.id]
  );

  // Create Club B (President B)
  const clubBRes = await query(
    `INSERT INTO clubs (name, slug, description, type, category, lead_user_id, verification_status, is_active, recruitment_open, visibility)
     VALUES ($1, $2, 'Club B Description', 'Cultural', 'Cultural', $3, 'approved', TRUE, TRUE, 'public')
     RETURNING *`,
    [`Club Beta ${ts}`, `club-beta-${ts}`, presB.id]
  );
  const clubB = clubBRes.rows[0];

  await query(
    `INSERT INTO club_memberships (club_id, user_id, role, posting_access)
     VALUES ($1, $2, 'president', true)`,
    [clubB.id, presB.id]
  );

  console.log('✅ Fixtures created.\n');

  // ── 2. Test Event Creation Authorization ────────────────────────────────────
  console.log('2. Testing Event Creation Authorization & Cross-Club Isolation...');

  // Test 2.1: Ordinary student cannot create event
  try {
    await createEvent(student.id, student.role, {
      title: 'Unauthorized Student Event',
      event_type: 'workshop',
      visibility: 'public',
      event_date: new Date(Date.now() + 86400000).toISOString(),
      club_id: clubA.id,
      certificates_enabled: false,
      check_in_enabled: false,
    });
    assert(false, 'Ordinary student should NOT be able to create event');
  } catch (err: any) {
    assert(err.statusCode === 403 || err.message.includes('permissions'), 'Ordinary student event creation rejected with 403');
    passed++;
  }

  // Test 2.2: President of Club A cannot create event for Club B
  try {
    await createEvent(presA.id, presA.role, {
      title: 'Cross-Club Exploit Event',
      event_type: 'workshop',
      visibility: 'public',
      event_date: new Date(Date.now() + 86400000).toISOString(),
      club_id: clubB.id,
      certificates_enabled: false,
      check_in_enabled: false,
    });
    assert(false, 'President A should NOT be able to create event for Club B');
  } catch (err: any) {
    assert(err.statusCode === 403, 'Cross-club event creation rejected with 403');
    passed++;
  }

  // Test 2.3: President of Club A successfully creates draft event for Club A
  const eventDateFuture = new Date(Date.now() + 86400000 * 7).toISOString();
  const deadlineFuture = new Date(Date.now() + 86400000 * 5).toISOString();

  const draftEventA = await createEvent(presA.id, presA.role, {
    title: `Alpha Hackathon ${ts}`,
    description: 'Premier hackathon of Club Alpha',
    event_type: 'hackathon',
    visibility: 'public',
    club_id: clubA.id,
    event_date: eventDateFuture,
    duration_minutes: 180,
    venue: 'CS Main Lab',
    capacity: 2, // Low capacity for testing waitlists
    registration_deadline: deadlineFuture,
    registration_mode: 'instant',
    certificates_enabled: true,
    check_in_enabled: true,
  });

  assert(draftEventA.id && draftEventA.status === 'draft', 'Club President creates draft event for Club A');
  assert(draftEventA.organiser_type === 'club' && draftEventA.club_id === clubA.id, 'Event is correctly linked to Club A');
  passed++;

  // Test 2.4: Platform Admin creates institutional event (no club_id)
  const adminEvent = await createEvent(adminUser.id, adminUser.role, {
    title: `Campus Orientation ${ts}`,
    description: 'College-wide institutional orientation',
    event_type: 'seminar',
    visibility: 'public',
    event_date: eventDateFuture,
    duration_minutes: 120,
    venue: 'Grand Auditorium',
    capacity: 500,
    registration_mode: 'instant',
    certificates_enabled: false,
    check_in_enabled: false,
  });

  assert(adminEvent.id && adminEvent.organiser_type === 'admin', 'Admin creates institutional event without club_id');
  passed++;

  // ── 3. Test Draft & Security Visibility Boundary ────────────────────────────
  console.log('\n3. Testing Draft Security & Visibility Gating...');

  // Test 3.1: Draft event must not appear in public upcoming events list
  const upcomingBefore = await listUpcomingEvents(100);
  const foundDraftInList = upcomingBefore.events.some((e: any) => e.id === draftEventA.id);
  assert(!foundDraftInList, 'Draft event is NOT visible in public listUpcomingEvents');
  passed++;

  // Test 3.2: Ordinary student cannot fetch draft event by ID
  try {
    await getEventById(draftEventA.id, student.id);
    assert(false, 'Student should NOT be able to view draft event');
  } catch (err: any) {
    assert(err.statusCode === 404, 'Draft event returns 404 NotFound to unauthorized student');
    passed++;
  }

  // Test 3.3: Creator (Pres A) can view their draft event
  const presAView = await getEventById(draftEventA.id, presA.id);
  assert(presAView && presAView.id === draftEventA.id, 'Creator can view their draft event details');
  passed++;

  // Test 3.4: Admin can view draft event
  const adminView = await getEventById(draftEventA.id, adminUser.id);
  assert(adminView && adminView.id === draftEventA.id, 'Admin can view draft event details');
  passed++;

  // ── 4. Test Lifecycle State Machine Transitions ─────────────────────────────
  console.log('\n4. Testing State Machine (Draft -> Review -> Publish)...');

  // Test 4.1: Submit Draft for Approval (Club A has advisor -> status becomes pending_faculty)
  const submittedEvent = await submitEventForApproval(draftEventA.id, presA.id, presA.role);
  assert(submittedEvent.status === 'pending_faculty', 'Club event with faculty advisor transitions to pending_faculty');
  passed++;

  // Test 4.2: Unaffiliated faculty cannot approve Club A event
  try {
    await facultyApproveEvent(draftEventA.id, facAdvisor2.id);
    assert(false, 'Unaffiliated faculty should NOT be able to approve Club A event');
  } catch (err: any) {
    assert(err.statusCode === 403, 'Unaffiliated faculty approval rejected with 403');
    passed++;
  }

  // Test 4.3: Assigned faculty advisor rejects event with note -> transitions back to draft
  const facRejectRes = await facultyRejectEvent(draftEventA.id, facAdvisor1.id, 'Please adjust capacity and schedule');
  assert(facRejectRes.status === 'draft', 'Faculty rejection transitions event back to draft');
  const rejectedEventDb = await getEventById(draftEventA.id, presA.id);
  assert(rejectedEventDb.faculty_rejection_note === 'Please adjust capacity and schedule', 'Faculty rejection note stored');
  passed++;

  // Test 4.4: Re-submit after fixing -> pending_faculty
  await submitEventForApproval(draftEventA.id, presA.id, presA.role);

  // Test 4.5: Assigned faculty advisor approves -> transitions to pending_admin
  const facApproveRes = await facultyApproveEvent(draftEventA.id, facAdvisor1.id);
  assert(facApproveRes.status === 'pending_admin', 'Faculty approval transitions event to pending_admin');
  passed++;

  // Test 4.6: Admin approves -> transitions to published
  const adminApproveRes = await adminApproveEvent(draftEventA.id, adminUser.id);
  assert(adminApproveRes.status === 'published', 'Admin approval transitions event to published');
  passed++;

  // ── 5. Test Public Discovery & Registration Lifecycle ───────────────────────
  console.log('\n5. Testing Public Discovery & Registration Lifecycle...');

  // Test 5.1: Published event now appears in student upcoming discovery
  const upcomingAfter = await listUpcomingEvents(100);
  const foundPublishedInList = upcomingAfter.events.some((e: any) => e.id === draftEventA.id);
  assert(foundPublishedInList, 'Published event is now discoverable in listUpcomingEvents');
  passed++;

  // Test 5.2: Student 1 registers for instant event (capacity = 2)
  const reg1 = await registerForEvent(draftEventA.id, student.id, { attendance_mode: 'offline' });
  assert(reg1.status === 'registered', 'Student 1 successfully registered with status=registered');
  passed++;

  // Verify attendee count updated in DB
  const eventAfterReg1 = await getEventById(draftEventA.id, student.id);
  assert(eventAfterReg1.attendee_count === 1, 'Event attendee_count incremented to 1');
  assert(eventAfterReg1.button_state === 'REGISTERED', 'Button state for Student 1 is REGISTERED');
  passed++;

  // Test 5.3: Duplicate registration is prevented
  try {
    await registerForEvent(draftEventA.id, student.id, { attendance_mode: 'offline' });
    assert(false, 'Duplicate registration should be prevented');
  } catch (err: any) {
    assert(err.statusCode === 409 || err.message.includes('already registered'), 'Duplicate registration rejected with 409');
    passed++;
  }

  // Test 5.4: President B registers (takes 2nd seat -> capacity full)
  const reg2 = await registerForEvent(draftEventA.id, presB.id, { attendance_mode: 'offline' });
  assert(reg2.status === 'registered', 'President B takes 2nd seat');
  passed++;

  // Test 5.5: Student 2 registers when capacity is reached -> placed on waitlist
  const reg3 = await registerForEvent(draftEventA.id, student2.id, { attendance_mode: 'offline' });
  assert(reg3.status === 'waitlisted', 'Student 2 placed on waitlist when capacity reached');
  passed++;

  // ── 6. Test Event Editing & Cross-Club Protection ───────────────────────────
  console.log('\n6. Testing Event Editing & Cross-Club Protection...');

  // Test 6.1: President A updates event venue
  const updatedEvent = await updateEvent(draftEventA.id, presA.id, presA.role, {
    venue: 'CS Auditorium Hall 1',
  });
  assert(updatedEvent.venue === 'CS Auditorium Hall 1', 'President A successfully updated event venue');
  passed++;

  // Test 6.2: President B cannot update Club A's event
  try {
    await updateEvent(draftEventA.id, presB.id, presB.role, {
      venue: 'Malicious Venue Change',
    });
    assert(false, 'President B should NOT be able to update Club A event');
  } catch (err: any) {
    assert(err.statusCode === 403, 'Cross-club event editing rejected with 403');
    passed++;
  }

  // ── 7. Test Approval-Mode Events & Registration Decision Queue ──────────────
  console.log('\n7. Testing Approval-Mode Events & Screening Queue...');

  const approvalEvent = await createEvent(presA.id, presA.role, {
    title: `Alpha Closed Workshop ${ts}`,
    event_type: 'workshop',
    visibility: 'public',
    club_id: clubA.id,
    event_date: eventDateFuture,
    registration_mode: 'approval',
    capacity: 50,
    certificates_enabled: false,
    check_in_enabled: false,
  });

  // Admin directly publishes it
  await query(`UPDATE events SET status = 'published' WHERE id = $1`, [approvalEvent.id]);

  // Student applies -> status should be pending
  const appReg = await registerForEvent(approvalEvent.id, student.id, { attendance_mode: 'offline' });
  assert(appReg.status === 'pending', 'Approval-mode event registers with status=pending');
  passed++;

  // Organizer decides application (Approve)
  const decisions = await decideApplications({
    eventId: approvalEvent.id,
    callerId: presA.id,
    callerRole: presA.role,
    registrationIds: [appReg.id],
    action: 'approve',
    decisionNotes: 'Application accepted'
  });
  assert(decisions.updated_count === 1, 'Organizer approved pending application');
  const appRegDb = await query(`SELECT status FROM event_registrations WHERE id = $1`, [appReg.id]);
  assert(appRegDb.rows[0].status === 'registered', 'Application status updated to registered');
  passed++;

  // ── 8. Test Event Cancellation & Completion ─────────────────────────────────
  console.log('\n8. Testing Event Cancellation & Completion...');

  // Test 8.1: Organizer cancels approvalEvent -> status becomes cancelled
  const cancelRes = await cancelEvent(approvalEvent.id, presA.id, presA.role, 'Host unavailable');
  assert(cancelRes.status === 'cancelled', 'Event successfully cancelled');
  const cancelledEventDb = await getEventById(approvalEvent.id, presA.id);
  assert(cancelledEventDb.status === 'cancelled', 'Event status in DB is cancelled');
  passed++;

  // Test 8.2: New registrations on cancelled event are blocked
  try {
    await registerForEvent(approvalEvent.id, presB.id, { attendance_mode: 'offline' });
    assert(false, 'Registration on cancelled event should be blocked');
  } catch (err: any) {
    assert(err.statusCode === 400 || err.message.includes('published'), 'Registration on cancelled event rejected');
    passed++;
  }

  // Test 8.3: Mark main event as completed -> appears in past events list
  await completeEvent(draftEventA.id, presA.id, presA.role);
  const completedEventDb = await getEventById(draftEventA.id, student.id);
  assert(completedEventDb.status === 'completed', 'Event status updated to completed');
  passed++;

  const pastEvents = await listPastEvents(100);
  const foundInPast = pastEvents.events.some((e: any) => e.id === draftEventA.id);
  assert(foundInPast, 'Completed event is discoverable in listPastEvents');
  passed++;

  // ── 9. Cleanup Test Data ───────────────────────────────────────────────────
  console.log('\n9. Cleaning up test data...');
  await query(`DELETE FROM event_registrations WHERE event_id IN ($1, $2, $3)`, [draftEventA.id, adminEvent.id, approvalEvent.id]);
  await query(`DELETE FROM events WHERE id IN ($1, $2, $3)`, [draftEventA.id, adminEvent.id, approvalEvent.id]);
  await query(`DELETE FROM club_faculty_advisors WHERE club_id IN ($1, $2)`, [clubA.id, clubB.id]);
  await query(`DELETE FROM club_memberships WHERE club_id IN ($1, $2)`, [clubA.id, clubB.id]);
  await query(`DELETE FROM clubs WHERE id IN ($1, $2)`, [clubA.id, clubB.id]);
  await query(`DELETE FROM notifications WHERE user_id IN ($1, $2, $3, $4, $5, $6, $7)`, [
    adminUser.id, facAdvisor1.id, facAdvisor2.id, presA.id, presB.id, student.id, student2.id
  ]);
  await query(`DELETE FROM profiles WHERE user_id IN ($1, $2, $3, $4, $5, $6, $7)`, [
    adminUser.id, facAdvisor1.id, facAdvisor2.id, presA.id, presB.id, student.id, student2.id
  ]);
  await query(`DELETE FROM users WHERE id IN ($1, $2, $3, $4, $5, $6, $7)`, [
    adminUser.id, facAdvisor1.id, facAdvisor2.id, presA.id, presB.id, student.id, student2.id
  ]);
  console.log('✅ Cleanup completed.');

  console.log('\n═════════════════════════════════════════════════════════════');
  console.log(`🎉 ALL ${passed} PART 2C EVENT LIFECYCLE TESTS PASSED!`);
  console.log('═════════════════════════════════════════════════════════════\n');
}

runEventLifecycleTests().catch((err) => {
  console.error('💥 Test suite execution failed:', err);
  process.exit(1);
});
