/**
 * tests/create-club-workflow.test.ts
 *
 * Automated verification for dedicated Create Club Workflow & Domain Persistence.
 */

import 'dotenv/config';
import assert from 'node:assert';
import { NextRequest } from 'next/server';
import { query } from '@/lib/db/client';
import { signToken } from '@/lib/jwt';
import { POST as AdminClubCreateRoute } from '@/app/api/v1/admin/clubs/route';
import { GET as ClubBySlugRoute, PATCH as ClubUpdateRoute } from '@/app/api/v1/clubs/[slug]/route';
import { GET as PublicClubsRoute } from '@/app/api/v1/clubs/route';
import { PATCH as AdminClubUpdateRoute } from '@/app/api/v1/admin/clubs/[id]/route';

async function runCreateClubWorkflowTest() {
  console.log('═════════════════════════════════════════════════════════════');
  console.log('🏛️ DEDICATED CREATE CLUB WORKFLOW & DOMAIN TEST');
  console.log('═════════════════════════════════════════════════════════════\n');

  // Fetch real users from DB
  const adminRes = await query(`SELECT id, email, role FROM users WHERE email = 'admin@college.ac.in'`);
  const leadRes = await query(`SELECT id, email, role FROM users WHERE email = 'robotics_lead@college.ac.in'`);
  const studentRes = await query(`SELECT id, email, role FROM users WHERE email = 'arjun@college.ac.in'`);

  const adminUser = adminRes.rows[0];
  const leadUser = leadRes.rows[0];
  const studentUser = studentRes.rows[0];

  const adminToken = signToken({ sub: adminUser.id, role: 'admin', firebase_uid: 'dev-admin' });
  const studentToken = signToken({ sub: studentUser.id, role: 'student', firebase_uid: 'dev-arjun' });

  const timestamp = Date.now();
  const testClubName = `Cyber Security & Privacy Guild ${timestamp}`;
  const testClubSlug = `cyber-security-privacy-guild-${timestamp}`;

  const payload = {
    name: testClubName,
    slug: testClubSlug,
    category: 'Technical',
    type: 'Technical',
    description: 'Empowering campus students with ethical hacking, penetration testing, CTF tournaments, and cryptography.',
    logo_url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjOGI1Y2Y2Ii8+PC9zdmc+',
    banner_url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgwIiBoZWlnaHQ9IjcyMCI+PHJlY3Qgd2lkdGg9IjEyODAiIGhlaWdodD0iNzIwIiBmaWxsPSIjMGQwZDEyIi8+PC9zdmc+',
    domain_tags: ['Cybersecurity', 'Ethical Hacking', 'CTF', 'Cryptography', 'Network Security'],
    social_links: {
      website: 'https://cybersec.campusgrid.edu',
      instagram: 'https://instagram.com/campus_cybersec',
      linkedin: 'https://linkedin.com/company/campus-cybersec',
      github: 'https://github.com/campus-cybersec',
      discord: 'https://discord.gg/campus-cybersec'
    },
    visibility: 'public',
    recruitment_open: true,
    lead_user_id: leadUser.id
  };

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 1: Unauthorized Student trying to create a club → 403
  // ───────────────────────────────────────────────────────────────────────────
  console.log('👉 STEP 1: Student account attempting POST /api/v1/admin/clubs...');
  const studentReq = new NextRequest('http://localhost:3000/api/v1/admin/clubs', {
    method: 'POST',
    headers: { cookie: `cg_token=${studentToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const studentResp = await AdminClubCreateRoute(studentReq, {}, { sub: studentUser.id, role: 'student' });
  assert(studentResp.status === 403, `Expected 403 Forbidden, got ${studentResp.status}`);
  console.log('   ✅ Unauthorized student request rejected with 403 Forbidden.');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 2: Admin creating a club with complete domain attributes → 201
  // ───────────────────────────────────────────────────────────────────────────
  console.log(`\n👉 STEP 2: Admin establishing club ("${testClubName}")...`);
  const adminReq = new NextRequest('http://localhost:3000/api/v1/admin/clubs', {
    method: 'POST',
    headers: { cookie: `cg_token=${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const adminResp = await AdminClubCreateRoute(adminReq, {}, { sub: adminUser.id, role: 'admin' });
  assert(adminResp.status === 201 || adminResp.status === 200, `Expected 201/200, got ${adminResp.status}`);
  const createdJson = await adminResp.json();
  assert(createdJson.success === true, 'Response must indicate success');
  const clubData = createdJson.data;
  assert(clubData.name === testClubName, 'Name must match');
  assert(clubData.slug === testClubSlug, 'Slug must match');
  assert(Array.isArray(clubData.domain_tags) && clubData.domain_tags.length === 5, 'Domain tags must have 5 items');
  assert(clubData.recruitment_open === true, 'Recruitment must be open');
  console.log(`   ✅ Club created successfully with ID: ${clubData.id}`);

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 3: Direct PostgreSQL Persistence Verification
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n👉 STEP 3: Verifying PostgreSQL persistence & memberships...');
  const dbClubRes = await query(`SELECT * FROM clubs WHERE id = $1`, [clubData.id]);
  assert(dbClubRes.rowCount === 1, 'Club must exist in database');
  const dbClub = dbClubRes.rows[0];
  assert(dbClub.name === testClubName, 'DB club name must match');
  assert(dbClub.verification_status === 'approved', 'DB verification_status must be approved');
  assert(dbClub.recruitment_open === true, 'DB recruitment_open must be true');
  assert(dbClub.visibility === 'public', 'DB visibility must be public');
  assert(Array.isArray(dbClub.domain_tags) && dbClub.domain_tags.includes('Ethical Hacking'), 'DB domain_tags must match');
  assert(dbClub.social_links?.discord === 'https://discord.gg/campus-cybersec', 'DB social_links must match');

  // Verify membership record
  const dbMemberRes = await query(
    `SELECT * FROM club_memberships WHERE club_id = $1 AND user_id = $2`,
    [clubData.id, leadUser.id]
  );
  assert(dbMemberRes.rowCount === 1, 'Club membership must exist for designated lead');
  assert(dbMemberRes.rows[0].role === 'president', 'Membership role must be president');
  assert(dbMemberRes.rows[0].status === 'active', 'Membership status must be active');
  assert(dbMemberRes.rows[0].posting_access === true, 'Posting access must be true');
  console.log('   ✅ Club record, leadership assignment, and memberships verified in database.');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 4: GET /api/v1/clubs/:slug (Public / Detail View)
  // ───────────────────────────────────────────────────────────────────────────
  console.log(`\n👉 STEP 4: Fetching club details via GET /api/v1/clubs/${testClubSlug}...`);
  const getReq = new NextRequest(`http://localhost:3000/api/v1/clubs/${testClubSlug}`);
  const getResp = await ClubBySlugRoute(getReq, { params: Promise.resolve({ slug: testClubSlug }) });
  assert(getResp.status === 200, `Expected 200 OK, got ${getResp.status}`);
  const getJson = await getResp.json();
  assert(getJson.success === true, 'Detail response must succeed');
  assert(getJson.data.lead_username === 'robotics_lead', 'Lead username must match');
  assert(getJson.data.member_count >= 1, 'Member count must be at least 1');
  console.log(`   ✅ Club details returned successfully with ${getJson.data.member_count} member(s).`);

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 5: Public Discovery in GET /api/v1/clubs
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n👉 STEP 5: Verifying club appears in student directory (GET /api/v1/clubs)...');
  const dirReq = new NextRequest('http://localhost:3000/api/v1/clubs');
  const dirResp = await PublicClubsRoute(dirReq);
  assert(dirResp.status === 200, `Expected 200, got ${dirResp.status}`);
  const dirJson = await dirResp.json();
  const found = dirJson.data.find((c: any) => c.slug === testClubSlug);
  assert(found !== undefined, 'New club must be discoverable in public directory');
  console.log(`   ✅ Club confirmed discoverable in public student directory.`);

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 6: Updating domain attributes via PATCH /api/v1/admin/clubs/:id
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n👉 STEP 6: Updating club properties via PATCH /api/v1/admin/clubs/[id]...');
  const patchReq = new NextRequest(`http://localhost:3000/api/v1/admin/clubs/${clubData.id}`, {
    method: 'PATCH',
    headers: { cookie: `cg_token=${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recruitment_open: false,
      description: 'Updated cybersecurity society mission description.'
    })
  });
  const patchResp = await AdminClubUpdateRoute(patchReq, { params: Promise.resolve({ id: clubData.id }) }, { sub: adminUser.id, role: 'admin' });
  assert(patchResp.status === 200, `Expected 200, got ${patchResp.status}`);
  const patchJson = await patchResp.json();
  assert(patchJson.data.recruitment_open === false, 'Recruitment must now be closed');
  assert(patchJson.data.description === 'Updated cybersecurity society mission description.', 'Description must be updated');
  console.log('   ✅ Club updated successfully in PostgreSQL.');

  console.log('\n═════════════════════════════════════════════════════════════');
  console.log('🎉 ALL DEDICATED CREATE CLUB WORKFLOW TESTS PASSED (6/6)');
  console.log('═════════════════════════════════════════════════════════════\n');
}

runCreateClubWorkflowTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
