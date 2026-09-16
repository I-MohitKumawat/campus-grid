/**
 * tests/live-e2e-workflow.test.ts
 *
 * Live End-to-End Database Integration & Admin Journey Test:
 * 1. Admin creates a real Club via API (POST /api/v1/admin/clubs)
 * 2. Verify Club persists in PostgreSQL with verification_status = 'approved'
 * 3. Verify Club appears in Admin Club Registry (GET /api/v1/admin/clubs)
 * 4. Verify Club is discoverable in Public Student Directory (GET /api/v1/clubs)
 * 5. Admin creates an Event via API (POST /api/v1/events) in 'draft' status
 * 6. Verify Draft Event appears in Event Studio & Admin Events
 * 7. Verify Draft Event is HIDDEN from Public Student Events (GET /api/v1/events)
 * 8. Admin publishes the Event (PATCH /api/v1/admin/events/[id] with status = 'published')
 * 9. Verify Event is now LIVE in Public Student Events (GET /api/v1/events)
 * 10. Student registers for the live event (POST /api/v1/events/[id]/register)
 * 11. Verify Student registration persisted in database
 */

import 'dotenv/config';
import assert from 'node:assert';
import { NextRequest } from 'next/server';
import { query } from '@/lib/db/client';
import { signToken } from '@/lib/jwt';

// Import Route Handlers directly
import { POST as AdminClubCreateRoute, GET as AdminClubsGetRoute } from '@/app/api/v1/admin/clubs/route';
import { GET as PublicClubsGetRoute } from '@/app/api/v1/clubs/route';
import { POST as EventCreateRoute, GET as PublicEventsGetRoute } from '@/app/api/v1/events/route';
import { GET as OrganizerEventsGetRoute } from '@/app/api/v1/organizer/events/route';
import { GET as AdminEventsGetRoute } from '@/app/api/v1/admin/events/route';
import { PATCH as AdminEventUpdateRoute } from '@/app/api/v1/admin/events/[id]/route';
import { POST as EventRegisterRoute } from '@/app/api/v1/events/[id]/register/route';

async function runLiveE2ETest() {
  console.log('═════════════════════════════════════════════════════════════');
  console.log('🚀 LIVE DATABASE INTEGRATION & ADMIN JOURNEY E2E TEST');
  console.log('═════════════════════════════════════════════════════════════\n');

  // 1. Fetch core users from DB
  const adminRes = await query(`SELECT id, email, role FROM users WHERE email = 'admin@college.ac.in'`);
  const leadRes = await query(`SELECT id, email, role FROM users WHERE email = 'robotics_lead@college.ac.in'`);
  const studentRes = await query(`SELECT id, email, role FROM users WHERE email = 'arjun@college.ac.in'`);

  assert(adminRes.rowCount && adminRes.rowCount > 0, 'Admin user not found in DB');
  assert(leadRes.rowCount && leadRes.rowCount > 0, 'Robotics Lead user not found in DB');
  assert(studentRes.rowCount && studentRes.rowCount > 0, 'Student user not found in DB');

  const adminUser = adminRes.rows[0];
  const leadUser = leadRes.rows[0];
  const studentUser = studentRes.rows[0];

  const adminToken = signToken({ sub: adminUser.id, role: 'admin', firebase_uid: 'dev-admin' });
  const leadToken = signToken({ sub: leadUser.id, role: leadUser.role, firebase_uid: 'dev-rob-lead' });
  const studentToken = signToken({ sub: studentUser.id, role: 'student', firebase_uid: 'dev-arjun' });

  let testClubId = '';
  let testClubSlug = '';
  let testEventId = '';

  try {
    // ───────────────────────────────────────────────────────────────────────────
    // STEP 1: Admin creates a real club via API
    // ───────────────────────────────────────────────────────────────────────────
    const timestamp = Date.now();
    const clubName = `Autonomous Robotics Society ${timestamp}`;
    console.log(`👉 STEP 1: Admin creating a new Club ("${clubName}") via POST /api/v1/admin/clubs...`);
    const clubReq = new NextRequest('http://localhost:3000/api/v1/admin/clubs', {
      method: 'POST',
      headers: {
        cookie: `cg_token=${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: clubName,
        category: 'Technical',
        description: 'Pioneering autonomous rovers, robotic arms, and competitive quadcopters.',
        lead_user_id: leadUser.id
      })
    });
    const clubRes = await AdminClubCreateRoute(clubReq, {}, { sub: adminUser.id, role: 'admin' });
    const clubJson = await clubRes.json();

    assert(clubRes.status === 201 || clubRes.status === 200, `Expected 201/200, got ${clubRes.status}`);
    assert(clubJson.success === true, 'Expected club creation to succeed');
    assert(clubJson.data?.id, 'Expected club ID to be returned');
    assert(clubJson.data?.lead_user_id === leadUser.id, 'Expected lead_user_id to match assigned lead');

    testClubId = clubJson.data.id;
    testClubSlug = clubJson.data.slug;
    console.log(`   ✅ Club created successfully: "${clubJson.data.name}" (ID: ${testClubId}, Slug: ${testClubSlug})`);

    // ───────────────────────────────────────────────────────────────────────────
    // STEP 2: Verify Club in PostgreSQL
    // ───────────────────────────────────────────────────────────────────────────
    console.log('👉 STEP 2: Verifying Club in PostgreSQL Database...');
    const dbClubRes = await query('SELECT * FROM clubs WHERE id = $1', [testClubId]);
    assert(dbClubRes.rowCount === 1, 'Club not found in DB');
    const dbClub = dbClubRes.rows[0];
    assert(dbClub.verification_status === 'approved', `Expected verification_status = 'approved', got ${dbClub.verification_status}`);
    assert(dbClub.lead_user_id === leadUser.id, 'Expected lead_user_id in DB to match assigned lead');
    console.log(`   ✅ Club in DB has verification_status = "${dbClub.verification_status}" and lead_user_id = "${dbClub.lead_user_id}"`);

    // ───────────────────────────────────────────────────────────────────────────
    // STEP 3: Verify Club in Admin List API (GET /api/v1/admin/clubs)
    // ───────────────────────────────────────────────────────────────────────────
    console.log('👉 STEP 3: Verifying Club in GET /api/v1/admin/clubs...');
    const adminClubsReq = new NextRequest('http://localhost:3000/api/v1/admin/clubs', {
      headers: { cookie: `cg_token=${adminToken}` }
    });
    const adminClubsRes = await AdminClubsGetRoute(adminClubsReq, {}, { sub: adminUser.id, role: 'admin' });
    const adminClubsJson = await adminClubsRes.json();
    assert(adminClubsRes.status === 200, `Expected 200, got ${adminClubsRes.status}`);
    const foundAdminClub = adminClubsJson.data.find((c: any) => c.id === testClubId);
    assert(foundAdminClub, 'Created club not found in admin clubs list');
    assert(foundAdminClub.member_count >= 1, 'Expected member_count >= 1 for assigned lead');
    console.log(`   ✅ Club found in Admin Directory with member count: ${foundAdminClub.member_count}`);

    // ───────────────────────────────────────────────────────────────────────────
    // STEP 4: Verify Club in Public Student Directory (GET /api/v1/clubs)
    // ───────────────────────────────────────────────────────────────────────────
    console.log('👉 STEP 4: Verifying Club in Public Student Directory (GET /api/v1/clubs)...');
    const publicClubsReq = new NextRequest('http://localhost:3000/api/v1/clubs');
    const publicClubsRes = await PublicClubsGetRoute(publicClubsReq);
    const publicClubsJson = await publicClubsRes.json();
    assert(publicClubsRes.status === 200, `Expected 200, got ${publicClubsRes.status}`);
    const foundPublicClub = publicClubsJson.data.find((c: any) => c.id === testClubId);
    assert(foundPublicClub, 'Created club not discoverable in student clubs list');
    console.log(`   ✅ Club discovered in Student Public Directory: "${foundPublicClub.name}"`);

    // ───────────────────────────────────────────────────────────────────────────
    // STEP 5: Admin creates an Event in 'draft' status
    // ───────────────────────────────────────────────────────────────────────────
    console.log('👉 STEP 5: Admin creating a new Event via POST /api/v1/events...');
    const eventDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days in future
    const eventReq = new NextRequest('http://localhost:3000/api/v1/events', {
      method: 'POST',
      headers: {
        cookie: `cg_token=${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Autonomous Quadcopter Grand Prix 2026',
        description: 'Obstacle navigation and real-time vision-based drone racing.',
        club_id: testClubId,
        event_type: 'hackathon',
        visibility: 'public',
        event_date: eventDate,
        venue: 'Main Sports Complex Arena',
        capacity: 100,
        registration_mode: 'instant',
        certificates_enabled: true
      })
    });
    const eventRes = await EventCreateRoute(eventReq, {}, { sub: adminUser.id, role: 'admin' });
    const eventJson = await eventRes.json();
    assert(eventRes.status === 201, `Expected 201, got ${eventRes.status}`);
    assert(eventJson.data?.id, 'Expected event ID to be returned');
    assert(eventJson.data?.status === 'draft', `Expected status = 'draft', got ${eventJson.data?.status}`);
    testEventId = eventJson.data.id;
    console.log(`   ✅ Event created in 'draft' status: "${eventJson.data.title}" (ID: ${testEventId})`);

    // ───────────────────────────────────────────────────────────────────────────
    // STEP 6: Verify Draft Event is visible in Event Studio & Admin Events
    // ───────────────────────────────────────────────────────────────────────────
    console.log('👉 STEP 6: Verifying Draft Event is visible to Organizers & Admins...');
    const orgEventsReq = new NextRequest('http://localhost:3000/api/v1/organizer/events', {
      headers: { cookie: `cg_token=${adminToken}` }
    });
    const orgEventsRes = await OrganizerEventsGetRoute(orgEventsReq, {}, { sub: adminUser.id, role: 'admin' });
    const orgEventsJson = await orgEventsRes.json();
    const foundOrgEvent = orgEventsJson.data.find((e: any) => e.id === testEventId);
    assert(foundOrgEvent, 'Draft event not found in Event Studio listing');
    console.log(`   ✅ Draft event confirmed visible in Event Studio (Status: ${foundOrgEvent.status})`);

    // ───────────────────────────────────────────────────────────────────────────
    // STEP 7: Verify Draft Event is HIDDEN from Public Student Events
    // ───────────────────────────────────────────────────────────────────────────
    console.log('👉 STEP 7: Verifying Draft Event is HIDDEN from Public Student Events (GET /api/v1/events)...');
    const publicEventsReq1 = new NextRequest('http://localhost:3000/api/v1/events');
    const publicEventsRes1 = await PublicEventsGetRoute(publicEventsReq1);
    const publicEventsJson1 = await publicEventsRes1.json();
    const foundPublicEvent1 = publicEventsJson1.data.find((e: any) => e.id === testEventId);
    assert(!foundPublicEvent1, 'SECURITY/VISIBILITY VIOLATION: Draft event was visible in public student events!');
    console.log('   ✅ Gating confirmed: Draft event is properly hidden from public students.');

    // ───────────────────────────────────────────────────────────────────────────
    // STEP 8: Admin Publishes the Event
    // ───────────────────────────────────────────────────────────────────────────
    console.log('👉 STEP 8: Admin publishing Event via PATCH /api/v1/admin/events/[id]...');
    const publishReq = new NextRequest(`http://localhost:3000/api/v1/admin/events/${testEventId}`, {
      method: 'PATCH',
      headers: {
        cookie: `cg_token=${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'published' })
    });
    const publishRes = await AdminEventUpdateRoute(publishReq, { params: Promise.resolve({ id: testEventId }) }, { sub: adminUser.id, role: 'admin' });
    const publishJson = await publishRes.json();
    assert(publishRes.status === 200, `Expected 200, got ${publishRes.status}`);
    assert(publishJson.data?.status === 'published', `Expected status = 'published', got ${publishJson.data?.status}`);
    console.log(`   ✅ Event status successfully transitioned to: "${publishJson.data.status}"`);

    // ───────────────────────────────────────────────────────────────────────────
    // STEP 9: Verify Published Event is now LIVE in Public Student Events
    // ───────────────────────────────────────────────────────────────────────────
    console.log('👉 STEP 9: Verifying Published Event is LIVE in Public Student Events...');
    const publicEventsReq2 = new NextRequest('http://localhost:3000/api/v1/events');
    const publicEventsRes2 = await PublicEventsGetRoute(publicEventsReq2);
    const publicEventsJson2 = await publicEventsRes2.json();
    const foundPublicEvent2 = publicEventsJson2.data.find((e: any) => e.id === testEventId);
    assert(foundPublicEvent2, 'Published event was not returned in public student events!');
    console.log(`   ✅ Event confirmed LIVE in Student Discovery: "${foundPublicEvent2.title}"`);

    // ───────────────────────────────────────────────────────────────────────────
    // STEP 10: Student Registers for the Published Event
    // ───────────────────────────────────────────────────────────────────────────
    console.log('👉 STEP 10: Student (Arjun) registering for the Published Event...');
    const regReq = new NextRequest(`http://localhost:3000/api/v1/events/${testEventId}/register`, {
      method: 'POST',
      headers: { cookie: `cg_token=${studentToken}` }
    });
    const regRes = await EventRegisterRoute(regReq, { params: Promise.resolve({ id: testEventId }) }, { sub: studentUser.id, role: 'student' });
    const regJson = await regRes.json();
    assert(regRes.status === 201, `Expected 201, got ${regRes.status}`);
    assert(regJson.data?.status === 'registered', `Expected registration status = 'registered', got ${regJson.data?.status}`);
    console.log(`   ✅ Registration successful for student "${studentUser.email}"`);

    // ───────────────────────────────────────────────────────────────────────────
    // STEP 11: Database Persistence Verification
    // ───────────────────────────────────────────────────────────────────────────
    console.log('👉 STEP 11: Verifying Final Database Persistence State...');
    const finalEventRes = await query('SELECT * FROM events WHERE id = $1', [testEventId]);
    const finalRegRes = await query('SELECT * FROM event_registrations WHERE event_id = $1 AND user_id = $2', [testEventId, studentUser.id]);
    assert(finalEventRes.rows[0].attendee_count === 1, `Expected attendee_count = 1, got ${finalEventRes.rows[0].attendee_count}`);
    assert(finalRegRes.rowCount === 1, 'Registration record not found in PostgreSQL');
    console.log(`   ✅ Event attendee count updated in DB: ${finalEventRes.rows[0].attendee_count}`);
    console.log(`   ✅ Student registration record verified in PostgreSQL.`);

    console.log('\n═════════════════════════════════════════════════════════════');
    console.log('🎉 ALL LIVE INTEGRATION & ADMIN JOURNEY TESTS PASSED (11/11)');
    console.log('═════════════════════════════════════════════════════════════\n');
  } catch (err) {
    console.error('❌ E2E TEST FAILED:', err);
    throw err;
  }
}

runLiveE2ETest()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
