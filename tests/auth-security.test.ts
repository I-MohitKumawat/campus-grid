/**
 * tests/auth-security.test.ts
 *
 * Automated Authorization & Object-Level Security Test Suite.
 *
 * Tests:
 * A. Student attempting to complete another user's event → 403 Forbidden
 * B. Student attempting to archive another user's event → 403 Forbidden
 * C. Student attempting to issue certificates for another user's event → 403 Forbidden
 * D. Student attempting to decide applications for another user's event → 403 Forbidden
 * E. Student attempting to broadcast announcement for another user's event → 403 Forbidden
 * F. Authorized event manager (creator / club lead) performing actions → succeeds
 * G. Admin performing globally authorized operations → succeeds
 * H. Non-admin attempting admin API → 403 Forbidden
 * I. Unauthenticated request → 401 Unauthorized
 * J. User-supplied organizerId cannot bypass authorization
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

import { query, db } from '../lib/db/client';
import { signToken } from '../lib/jwt';
import {
  completeEvent,
  archiveEvent,
  issueCertificatesForEvent,
  decideApplications,
  broadcastAnnouncement,
  getEventCertificates,
  getEventRegistrations,
  withdrawEventSubmission
} from '../lib/services/event.service';
import { ForbiddenError, UnauthorizedError } from '../lib/errors';

// Route Handlers
import { POST as CompleteRoute } from '../app/api/v1/organizer/events/[id]/complete/route';
import { POST as ArchiveRoute } from '../app/api/v1/organizer/events/[id]/archive/route';
import { POST as CertsRoute, GET as CertsGetRoute } from '../app/api/v1/organizer/events/[id]/certificates/route';
import { POST as DecideRoute } from '../app/api/v1/organizer/events/[id]/applications/decide/route';
import { POST as AnnounceRoute } from '../app/api/v1/organizer/events/[id]/announcements/route';
import { GET as AdminStatsRoute } from '../app/api/v1/admin/stats/route';
import { GET as AdminUsersRoute } from '../app/api/v1/admin/users/route';
import { GET as AdminClubsRoute } from '../app/api/v1/admin/clubs/route';
import { GET as AdminEventsRoute } from '../app/api/v1/admin/events/route';
import { NextRequest } from 'next/server';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

async function runTests() {
  console.log('─────────────────────────────────────────────────────────────');
  console.log('🔒 Starting Authorization & Security Layer Automated Tests');
  console.log('─────────────────────────────────────────────────────────────\n');

  // Setup Test Fixtures in Database
  const testSuffix = Date.now().toString().slice(-6);

  // 1. Create 3 test users: Creator (Student), Attacker (Student), ClubLead (Club Lead), Admin (Admin)
  const creatorRes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'student')
     RETURNING id, username, role`,
    [`creator_${testSuffix}@test.ac.in`, `creator_${testSuffix}`, `creator_${testSuffix}`, `fb_creator_${testSuffix}`]
  );
  const creator = creatorRes.rows[0];

  const attackerRes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'student')
     RETURNING id, username, role`,
    [`attacker_${testSuffix}@test.ac.in`, `attacker_${testSuffix}`, `attacker_${testSuffix}`, `fb_attacker_${testSuffix}`]
  );
  const attacker = attackerRes.rows[0];

  const leadUserRes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'student')
     RETURNING id, username, role`,
    [`lead_${testSuffix}@test.ac.in`, `lead_${testSuffix}`, `lead_${testSuffix}`, `fb_lead_${testSuffix}`]
  );
  const leadUser = leadUserRes.rows[0];

  const adminUserRes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $3, $4, 'admin')
     RETURNING id, username, role`,
    [`admin_${testSuffix}@test.ac.in`, `admin_${testSuffix}`, `admin_${testSuffix}`, `fb_admin_${testSuffix}`]
  );
  const adminUser = adminUserRes.rows[0];

  // 2. Create a test club with leadUser as president
  const clubRes = await query(
    `INSERT INTO clubs (name, slug, lead_user_id, type, verification_status)
     VALUES ($1, $2, $3, 'technical', 'approved')
     RETURNING id, name, slug`,
    [`Club ${testSuffix}`, `club-${testSuffix}`, leadUser.id]
  );
  const club = clubRes.rows[0];

  await query(
    `INSERT INTO club_memberships (club_id, user_id, role, status, posting_access)
     VALUES ($1, $2, 'president', 'active', TRUE)`,
    [club.id, leadUser.id]
  );

  // 3. Create test event owned by creator under club
  const eventRes = await query(
    `INSERT INTO events (title, organiser_id, organiser_type, club_id, event_type, status, visibility, event_date)
     VALUES ($1, $2, 'club', $3, 'workshop', 'published', 'public', now() + interval '1 day')
     RETURNING id, title, status, organiser_id, club_id`,
    [`Secure Workshop ${testSuffix}`, creator.id, club.id]
  );
  const event = eventRes.rows[0];

  // 4. Create an attendee registration for application/attendance tests
  const regRes = await query(
    `INSERT INTO event_registrations (event_id, user_id, status)
     VALUES ($1, $2, 'pending')
     RETURNING id, event_id, user_id, status`,
    [event.id, attacker.id]
  );
  const registration = regRes.rows[0];

  // Generate Session JWTs
  const attackerToken = signToken({ sub: attacker.id, role: attacker.role, firebase_uid: attacker.firebase_uid || `fb_att_${testSuffix}` });
  const creatorToken = signToken({ sub: creator.id, role: creator.role, firebase_uid: creator.firebase_uid || `fb_cr_${testSuffix}` });
  const leadToken = signToken({ sub: leadUser.id, role: leadUser.role, firebase_uid: leadUser.firebase_uid || `fb_ld_${testSuffix}` });
  const adminToken = signToken({ sub: adminUser.id, role: adminUser.role, firebase_uid: adminUser.firebase_uid || `fb_ad_${testSuffix}` });

  // ───────────────────────────────────────────────────────────────────────────
  // TEST A: Student attempting to complete another user's event → 403
  // ───────────────────────────────────────────────────────────────────────────
  try {
    const req = new NextRequest(`http://localhost:3000/api/v1/organizer/events/${event.id}/complete`, {
      method: 'POST',
      headers: { cookie: `cg_token=${attackerToken}` }
    });
    const res = await CompleteRoute(req, { params: Promise.resolve({ id: event.id }) });
    const json = await res.json();
    assert(res.status === 403, `Expected status 403, got ${res.status}`);
    assert(json.success === false, `Expected json.success === false`);
    results.push({ name: "A. Student completing another user's event → 403 Forbidden", passed: true });
  } catch (err: any) {
    results.push({ name: "A. Student completing another user's event → 403 Forbidden", passed: false, error: err.message });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST B: Student attempting to archive another user's event → 403
  // ───────────────────────────────────────────────────────────────────────────
  try {
    const req = new NextRequest(`http://localhost:3000/api/v1/organizer/events/${event.id}/archive`, {
      method: 'POST',
      headers: { cookie: `cg_token=${attackerToken}` }
    });
    const res = await ArchiveRoute(req, { params: Promise.resolve({ id: event.id }) });
    const json = await res.json();
    assert(res.status === 403, `Expected status 403, got ${res.status}`);
    assert(json.success === false, `Expected json.success === false`);
    results.push({ name: "B. Student archiving another user's event → 403 Forbidden", passed: true });
  } catch (err: any) {
    results.push({ name: "B. Student archiving another user's event → 403 Forbidden", passed: false, error: err.message });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST C: Student attempting to issue certificates → 403
  // ───────────────────────────────────────────────────────────────────────────
  try {
    const req = new NextRequest(`http://localhost:3000/api/v1/organizer/events/${event.id}/certificates`, {
      method: 'POST',
      headers: { cookie: `cg_token=${attackerToken}` }
    });
    const res = await CertsRoute(req, { params: Promise.resolve({ id: event.id }) });
    const json = await res.json();
    assert(res.status === 403, `Expected status 403, got ${res.status}`);
    assert(json.success === false, `Expected json.success === false`);
    results.push({ name: "C. Student issuing certificates for another user's event → 403 Forbidden", passed: true });
  } catch (err: any) {
    results.push({ name: "C. Student issuing certificates for another user's event → 403 Forbidden", passed: false, error: err.message });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST D: Student attempting to decide applications → 403
  // ───────────────────────────────────────────────────────────────────────────
  try {
    const req = new NextRequest(`http://localhost:3000/api/v1/organizer/events/${event.id}/applications/decide`, {
      method: 'POST',
      headers: {
        cookie: `cg_token=${attackerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        registration_ids: [registration.id],
        action: 'approve'
      })
    });
    const res = await DecideRoute(req, { params: Promise.resolve({ id: event.id }) });
    const json = await res.json();
    assert(res.status === 403, `Expected status 403, got ${res.status}`);
    assert(json.success === false, `Expected json.success === false`);
    results.push({ name: "D. Student deciding applications for another user's event → 403 Forbidden", passed: true });
  } catch (err: any) {
    results.push({ name: "D. Student deciding applications for another user's event → 403 Forbidden", passed: false, error: err.message });
  }

  // TEST D2: Student attempting to decide applications with empty/missing body → 403 Forbidden
  try {
    const req = new NextRequest(`http://localhost:3000/api/v1/organizer/events/${event.id}/applications/decide`, {
      method: 'POST',
      headers: {
        cookie: `cg_token=${attackerToken}`,
      }
    });
    const res = await DecideRoute(req, { params: Promise.resolve({ id: event.id }) });
    const json = await res.json();
    assert(res.status === 403, `Expected status 403, got ${res.status}`);
    assert(json.success === false, `Expected json.success === false`);
    results.push({ name: "D2. Student deciding applications with empty body → 403 Forbidden", passed: true });
  } catch (err: any) {
    results.push({ name: "D2. Student deciding applications with empty body → 403 Forbidden", passed: false, error: err.message });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST E: Student attempting to broadcast announcement → 403
  // ───────────────────────────────────────────────────────────────────────────
  try {
    const req = new NextRequest(`http://localhost:3000/api/v1/organizer/events/${event.id}/announcements`, {
      method: 'POST',
      headers: {
        cookie: `cg_token=${attackerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Hacked Announcement',
        message: 'This should be blocked.'
      })
    });
    const res = await AnnounceRoute(req, { params: Promise.resolve({ id: event.id }) });
    const json = await res.json();
    assert(res.status === 403, `Expected status 403, got ${res.status}`);
    assert(json.success === false, `Expected json.success === false`);
    results.push({ name: "E. Student broadcasting announcements for another user's event → 403 Forbidden", passed: true });
  } catch (err: any) {
    results.push({ name: "E. Student broadcasting announcements for another user's event → 403 Forbidden", passed: false, error: err.message });
  }

  // TEST E2: Student attempting to broadcast announcement with empty/missing body → 403 Forbidden
  try {
    const req = new NextRequest(`http://localhost:3000/api/v1/organizer/events/${event.id}/announcements`, {
      method: 'POST',
      headers: {
        cookie: `cg_token=${attackerToken}`,
      }
    });
    const res = await AnnounceRoute(req, { params: Promise.resolve({ id: event.id }) });
    const json = await res.json();
    assert(res.status === 403, `Expected status 403, got ${res.status}`);
    assert(json.success === false, `Expected json.success === false`);
    results.push({ name: "E2. Student broadcasting announcements with empty body → 403 Forbidden", passed: true });
  } catch (err: any) {
    results.push({ name: "E2. Student broadcasting announcements with empty body → 403 Forbidden", passed: false, error: err.message });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST F: Authorized event manager (Creator) performing action → SIK / 200
  // ───────────────────────────────────────────────────────────────────────────
  try {
    const req = new NextRequest(`http://localhost:3000/api/v1/organizer/events/${event.id}/announcements`, {
      method: 'POST',
      headers: {
        cookie: `cg_token=${creatorToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Welcome to the workshop',
        message: 'All confirmed attendees please join on time.'
      })
    });
    const res = await AnnounceRoute(req, { params: Promise.resolve({ id: event.id }) });
    const json = await res.json();
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    assert(json.success === true, `Expected json.success === true`);
    results.push({ name: "F1. Creator broadcasting announcement to owned event → 200 OK", passed: true });
  } catch (err: any) {
    results.push({ name: "F1. Creator broadcasting announcement to owned event → 200 OK", passed: false, error: err.message });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST F2: Authorized Club Lead (of the host club) deciding application → 200
  // ───────────────────────────────────────────────────────────────────────────
  try {
    const req = new NextRequest(`http://localhost:3000/api/v1/organizer/events/${event.id}/applications/decide`, {
      method: 'POST',
      headers: {
        cookie: `cg_token=${leadToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        registration_ids: [registration.id],
        action: 'approve'
      })
    });
    const res = await DecideRoute(req, { params: Promise.resolve({ id: event.id }) });
    const json = await res.json();
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    assert(json.success === true, `Expected json.success === true`);
    results.push({ name: "F2. Club Lead deciding applications for hosted club event → 200 OK", passed: true });
  } catch (err: any) {
    results.push({ name: "F2. Club Lead deciding applications for hosted club event → 200 OK", passed: false, error: err.message });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST G: Admin performing globally authorized operation → 200
  // ───────────────────────────────────────────────────────────────────────────
  try {
    const req = new NextRequest(`http://localhost:3000/api/v1/organizer/events/${event.id}/complete`, {
      method: 'POST',
      headers: { cookie: `cg_token=${adminToken}` }
    });
    const res = await CompleteRoute(req, { params: Promise.resolve({ id: event.id }) });
    const json = await res.json();
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    assert(json.success === true, `Expected json.success === true`);
    results.push({ name: "G. Admin globally completing any campus event → 200 OK", passed: true });
  } catch (err: any) {
    results.push({ name: "G. Admin globally completing any campus event → 200 OK", passed: false, error: err.message });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST H: Non-admin attempting Admin APIs → 403
  // ───────────────────────────────────────────────────────────────────────────
  try {
    // 1. /api/v1/admin/stats
    const statsReq = new NextRequest('http://localhost:3000/api/v1/admin/stats', {
      headers: { cookie: `cg_token=${attackerToken}` }
    });
    const statsRes = await AdminStatsRoute(statsReq, {} as any);
    assert(statsRes.status === 403, `Admin stats: Expected 403, got ${statsRes.status}`);

    // 2. /api/v1/admin/users
    const usersReq = new NextRequest('http://localhost:3000/api/v1/admin/users', {
      headers: { cookie: `cg_token=${attackerToken}` }
    });
    const usersRes = await AdminUsersRoute(usersReq, {} as any);
    assert(usersRes.status === 403, `Admin users: Expected 403, got ${usersRes.status}`);

    // 3. /api/v1/admin/clubs
    const clubsReq = new NextRequest('http://localhost:3000/api/v1/admin/clubs', {
      headers: { cookie: `cg_token=${attackerToken}` }
    });
    const clubsRes = await AdminClubsRoute(clubsReq, {} as any);
    assert(clubsRes.status === 403, `Admin clubs: Expected 403, got ${clubsRes.status}`);

    // 4. /api/v1/admin/events
    const eventsReq = new NextRequest('http://localhost:3000/api/v1/admin/events', {
      headers: { cookie: `cg_token=${attackerToken}` }
    });
    const eventsRes = await AdminEventsRoute(eventsReq, {} as any);
    assert(eventsRes.status === 403, `Admin events: Expected 403, got ${eventsRes.status}`);

    results.push({ name: "H. Student attempting /api/v1/admin/* endpoints → 403 Forbidden", passed: true });
  } catch (err: any) {
    results.push({ name: "H. Student attempting /api/v1/admin/* endpoints → 403 Forbidden", passed: false, error: err.message });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST I: Unauthenticated request → 401
  // ───────────────────────────────────────────────────────────────────────────
  try {
    const req = new NextRequest(`http://localhost:3000/api/v1/organizer/events/${event.id}/complete`, {
      method: 'POST'
    });
    const res = await CompleteRoute(req, { params: Promise.resolve({ id: event.id }) });
    assert(res.status === 401, `Expected status 401, got ${res.status}`);
    results.push({ name: "I. Unauthenticated request without session → 401 Unauthorized", passed: true });
  } catch (err: any) {
    results.push({ name: "I. Unauthenticated request without session → 401 Unauthorized", passed: false, error: err.message });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST J: Body Spoofing - Passing fake organizerId in request body cannot bypass auth
  // ───────────────────────────────────────────────────────────────────────────
  try {
    const req = new NextRequest(`http://localhost:3000/api/v1/organizer/events/${event.id}/announcements`, {
      method: 'POST',
      headers: {
        cookie: `cg_token=${attackerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        organizerId: creator.id, // spoofing creator ID
        callerId: creator.id,
        title: 'Spoofed Announcement',
        message: 'This should still be rejected.'
      })
    });
    const res = await AnnounceRoute(req, { params: Promise.resolve({ id: event.id }) });
    const json = await res.json();
    assert(res.status === 403, `Expected status 403 despite spoofed organizerId, got ${res.status}`);
    assert(json.success === false, `Expected json.success === false`);
    results.push({ name: "J. Body spoofing of organizerId/callerId cannot bypass authorization", passed: true });
  } catch (err: any) {
    results.push({ name: "J. Body spoofing of organizerId/callerId cannot bypass authorization", passed: false, error: err.message });
  }

  // Cleanup Test Data
  try {
    await query(`DELETE FROM event_registrations WHERE event_id = $1`, [event.id]);
    await query(`DELETE FROM events WHERE id = $1`, [event.id]);
    await query(`DELETE FROM club_memberships WHERE club_id = $1`, [club.id]);
    await query(`DELETE FROM clubs WHERE id = $1`, [club.id]);
    await query(`DELETE FROM users WHERE id IN ($1, $2, $3, $4)`, [creator.id, attacker.id, leadUser.id, adminUser.id]);
  } catch (cleanErr) {
    console.error('Cleanup warning:', cleanErr);
  }

  // Print Summary
  console.log('\n─────────────────────────────────────────────────────────────');
  console.log('📊 Test Execution Summary:');
  console.log('─────────────────────────────────────────────────────────────');
  let passedCount = 0;
  for (const r of results) {
    if (r.passed) {
      console.log(`  ✅ [PASS] ${r.name}`);
      passedCount++;
    } else {
      console.log(`  ❌ [FAIL] ${r.name} — Error: ${r.error}`);
    }
  }
  console.log(`\nResults: ${passedCount}/${results.length} tests passed.\n`);

  await db.end();

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
