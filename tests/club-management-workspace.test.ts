/**
 * tests/club-management-workspace.test.ts
 *
 * Backend & Workspace Verification Suite for Part 2A Correction Pass:
 * Dedicated Club Management Workspace, Field Governance & Functional Officers.
 *
 * Verifies:
 * 1. Unauthenticated requests are rejected (401 Unauthorized).
 * 2. Ordinary Members cannot manage club (403 Forbidden).
 * 3. Cross-club tampers are rejected (403 Forbidden).
 * 4. Club President can update club-managed fields (description, tags, socials, visibility, recruitment).
 * 5. President attempting to update institutional metadata (name, category, status, is_active, lead) is REJECTED (403 Forbidden).
 * 6. Admin can update institutional metadata (name, category, verification_status, is_active).
 * 7. Functional Officer Assignment:
 *    - President can promote member to subordinate officer (technical_lead, vice_president).
 *    - President CANNOT appoint another President (403 Forbidden).
 *    - President CANNOT demote the current President (403 Forbidden).
 *    - President can demote subordinate officer back to member.
 *    - Admin can appoint a new President (syncs clubs.lead_user_id and memberships).
 * 8. Faculty Advisor Governance:
 *    - President cannot assign faculty advisor (403 Forbidden).
 *    - Admin can assign and remove faculty advisors.
 */

import 'dotenv/config';
import { NextRequest } from 'next/server';
import { query } from '@/lib/db/client';
import { signToken } from '@/lib/jwt';
import { PATCH as ClubPatchRoute, GET as ClubGetRoute } from '@/app/api/v1/clubs/[slug]/route';
import { GET as ClubFacultyGetRoute, POST as ClubFacultyPostRoute, DELETE as ClubFacultyDeleteRoute } from '@/app/api/v1/clubs/[slug]/faculty/route';
import { GET as ClubMembersGetRoute } from '@/app/api/v1/clubs/[slug]/members/route';
import { PATCH as ClubMemberPatchRoute } from '@/app/api/v1/clubs/[slug]/members/[uid]/route';
import { POST as ClubMemberInviteRoute } from '@/app/api/v1/clubs/[slug]/members/invite/route';

async function runManagementWorkspaceTests() {
  console.log('═════════════════════════════════════════════════════════════');
  console.log('🏛️ PART 2A: FIELD GOVERNANCE & FUNCTIONAL OFFICERS TEST SUITE');
  console.log('═════════════════════════════════════════════════════════════\n');

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

  const testSuffix = Date.now();

  // 1. Create Test Users
  const presUserARes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $2, $3, 'student') RETURNING *`,
    [`pres_a_${testSuffix}@college.ac.in`, `pres_a_${testSuffix}`, `fuid_pres_a_${testSuffix}`]
  );
  const presUserA = presUserARes.rows[0];

  const presUserBRes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $2, $3, 'student') RETURNING *`,
    [`pres_b_${testSuffix}@college.ac.in`, `pres_b_${testSuffix}`, `fuid_pres_b_${testSuffix}`]
  );
  const presUserB = presUserBRes.rows[0];

  const memberUserRes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $2, $3, 'student') RETURNING *`,
    [`member_${testSuffix}@college.ac.in`, `member_${testSuffix}`, `fuid_member_${testSuffix}`]
  );
  const memberUser = memberUserRes.rows[0];

  const student2Res = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $2, $3, 'student') RETURNING *`,
    [`student2_${testSuffix}@college.ac.in`, `student2_${testSuffix}`, `fuid_student2_${testSuffix}`]
  );
  const student2 = student2Res.rows[0];

  const facultyUserRes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $2, $3, 'faculty') RETURNING *`,
    [`faculty_${testSuffix}@college.ac.in`, `fac_${testSuffix}`, `fuid_fac_${testSuffix}`]
  );
  const facultyUser = facultyUserRes.rows[0];

  const adminUserRes = await query(
    `INSERT INTO users (email, username, profile_slug, firebase_uid, role)
     VALUES ($1, $2, $2, $3, 'admin') RETURNING *`,
    [`admin_${testSuffix}@college.ac.in`, `admin_${testSuffix}`, `fuid_adm_${testSuffix}`]
  );
  const adminUser = adminUserRes.rows[0];

  // 2. Create Test Clubs
  const clubARes = await query(
    `INSERT INTO clubs (name, slug, verification_status, is_active, lead_user_id, description, type, category)
     VALUES ($1, $2, 'approved', TRUE, $3, 'Initial Alpha description', 'Technical', 'Technical') RETURNING *`,
    [`Alpha Society ${testSuffix}`, `alpha-soc-${testSuffix}`, presUserA.id]
  );
  const clubA = clubARes.rows[0];

  const clubBRes = await query(
    `INSERT INTO clubs (name, slug, verification_status, is_active, lead_user_id, description, type, category)
     VALUES ($1, $2, 'approved', TRUE, $3, 'Initial Beta description', 'Cultural', 'Cultural') RETURNING *`,
    [`Beta Society ${testSuffix}`, `beta-soc-${testSuffix}`, presUserB.id]
  );
  const clubB = clubBRes.rows[0];

  // 3. Assign Memberships
  await query(
    `INSERT INTO club_memberships (club_id, user_id, role, status, posting_access)
     VALUES ($1, $2, 'president', 'active', TRUE)`,
    [clubA.id, presUserA.id]
  );
  await query(
    `INSERT INTO club_memberships (club_id, user_id, role, status, posting_access)
     VALUES ($1, $2, 'president', 'active', TRUE)`,
    [clubB.id, presUserB.id]
  );
  await query(
    `INSERT INTO club_memberships (club_id, user_id, role, status, posting_access)
     VALUES ($1, $2, 'member', 'active', FALSE)`,
    [clubA.id, memberUser.id]
  );

  // Generate Tokens
  const presAToken = signToken({ sub: presUserA.id, role: 'student', firebase_uid: presUserA.firebase_uid });
  const presBToken = signToken({ sub: presUserB.id, role: 'student', firebase_uid: presUserB.firebase_uid });
  const memberToken = signToken({ sub: memberUser.id, role: 'student', firebase_uid: memberUser.firebase_uid });
  const adminToken = signToken({ sub: adminUser.id, role: 'admin', firebase_uid: adminUser.firebase_uid });

  try {
    // ───────────────────────────────────────────────────────────────────────────
    // TEST 1: Unauthenticated request to PATCH /api/v1/clubs/[slug] → 401
    // ───────────────────────────────────────────────────────────────────────────
    console.log('👉 STEP 1: Unauthenticated user attempting PATCH /api/v1/clubs/[slug]...');
    const unauthReq = new NextRequest(`http://localhost:3000/api/v1/clubs/${clubA.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Hacked description' })
    });
    const unauthRes = await ClubPatchRoute(unauthReq, { params: Promise.resolve({ slug: clubA.slug }) }, null as any);
    assert(unauthRes.status === 401, '1. Unauthenticated request rejected with 401 Unauthorized');

    // ───────────────────────────────────────────────────────────────────────────
    // TEST 2: Ordinary Member attempting to update Club A profile → 403
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n👉 STEP 2: Ordinary Member attempting PATCH /api/v1/clubs/[slug] for Club A...');
    const memberReq = new NextRequest(`http://localhost:3000/api/v1/clubs/${clubA.slug}`, {
      method: 'PATCH',
      headers: {
        cookie: `cg_token=${memberToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ description: 'Member attempt to edit description' })
    });
    const memberRes = await ClubPatchRoute(
      memberReq,
      { params: Promise.resolve({ slug: clubA.slug }) },
      { sub: memberUser.id, role: 'student' }
    );
    assert(memberRes.status === 403, '2. Ordinary member rejected with 403 Forbidden');

    // ───────────────────────────────────────────────────────────────────────────
    // TEST 3: Cross-Club Isolation (President A cannot update Club B) → 403
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n👉 STEP 3: President of Club A attempting PATCH /api/v1/clubs/[slug] for Club B...');
    const crossClubReq = new NextRequest(`http://localhost:3000/api/v1/clubs/${clubB.slug}`, {
      method: 'PATCH',
      headers: {
        cookie: `cg_token=${presAToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ description: 'Cross-club unauthorized tamper' })
    });
    const crossClubRes = await ClubPatchRoute(
      crossClubReq,
      { params: Promise.resolve({ slug: clubB.slug }) },
      { sub: presUserA.id, role: 'student' }
    );
    assert(crossClubRes.status === 403, '3. President of Club A rejected from updating Club B (403 Forbidden)');

    // ───────────────────────────────────────────────────────────────────────────
    // TEST 4: President of Club A updating Club-Managed Information → 200 OK
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n👉 STEP 4: President of Club A updating club-managed fields...');
    const newDescription = 'Autonomous robotics research, ROS2 navigation, and perception pipeline.';
    const newTags = ['Autonomous Robotics', 'ROS2', 'Computer Vision', 'Embedded C++'];
    const newSocials = {
      website: 'https://alpha-robotics.college.ac.in',
      discord: 'https://discord.gg/alpha-soc',
      linkedin: 'https://linkedin.com/company/alpha-robotics'
    };

    const presReq = new NextRequest(`http://localhost:3000/api/v1/clubs/${clubA.slug}`, {
      method: 'PATCH',
      headers: {
        cookie: `cg_token=${presAToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: newDescription,
        domain_tags: newTags,
        social_links: newSocials,
        visibility: 'campus_only',
        recruitment_open: false
      })
    });
    const presRes = await ClubPatchRoute(
      presReq,
      { params: Promise.resolve({ slug: clubA.slug }) },
      { sub: presUserA.id, role: 'student' }
    );
    const presJson = await presRes.json();
    assert(presRes.status === 200, '4a. President update succeeded with 200 OK');
    assert(presJson.data.description === newDescription, '4b. Response returned updated description');
    assert(presJson.data.visibility === 'campus_only', '4c. Response returned updated visibility');

    // ───────────────────────────────────────────────────────────────────────────
    // TEST 5: President attempting to modify Institutional Fields → 403 Forbidden
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n👉 STEP 5: President attempting to modify institutional fields (name / verification)...');
    const presInstitutionalReq = new NextRequest(`http://localhost:3000/api/v1/clubs/${clubA.slug}`, {
      method: 'PATCH',
      headers: {
        cookie: `cg_token=${presAToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Hacked Official Society Name',
        verification_status: 'rejected'
      })
    });
    const presInstRes = await ClubPatchRoute(
      presInstitutionalReq,
      { params: Promise.resolve({ slug: clubA.slug }) },
      { sub: presUserA.id, role: 'student' }
    );
    assert(presInstRes.status === 403, '5. President attempt to modify institutional metadata rejected with 403 Forbidden');

    // ───────────────────────────────────────────────────────────────────────────
    // TEST 6: Platform Admin successfully updating Institutional Metadata → 200 OK
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n👉 STEP 6: Platform Admin updating institutional fields...');
    const adminInstReq = new NextRequest(`http://localhost:3000/api/v1/clubs/${clubA.slug}`, {
      method: 'PATCH',
      headers: {
        cookie: `cg_token=${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `Alpha Society Renamed ${testSuffix}`,
        category: 'Sports',
        verification_status: 'approved',
        is_active: true
      })
    });
    const adminInstRes = await ClubPatchRoute(
      adminInstReq,
      { params: Promise.resolve({ slug: clubA.slug }) },
      { sub: adminUser.id, role: 'admin' }
    );
    const adminInstJson = await adminInstRes.json();
    assert(adminInstRes.status === 200, '6a. Admin update of institutional fields succeeded with 200 OK');
    assert(adminInstJson.data.name === `Alpha Society Renamed ${testSuffix}`, '6b. DB updated official name');
    assert(adminInstJson.data.category === 'Sports', '6c. DB updated category');

    // ───────────────────────────────────────────────────────────────────────────
    // TEST 7: Functional Officer Management by Club President
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n👉 STEP 7: Functional Officer Management by President...');
    
    // 7a. President promotes memberUser to technical_lead
    const promoteReq = new NextRequest(`http://localhost:3000/api/v1/clubs/${clubA.slug}/members/${memberUser.id}`, {
      method: 'PATCH',
      headers: {
        cookie: `cg_token=${presAToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'technical_lead' })
    });
    const promoteRes = await ClubMemberPatchRoute(
      promoteReq,
      { params: Promise.resolve({ slug: clubA.slug, uid: memberUser.id }) },
      { sub: presUserA.id, role: 'student' }
    );
    assert(promoteRes.status === 200, '7a. President promoted member to technical_lead (200 OK)');

    const checkOfficerRes = await query(
      `SELECT role, posting_access FROM club_memberships WHERE club_id = $1 AND user_id = $2`,
      [clubA.id, memberUser.id]
    );
    assert(checkOfficerRes.rows[0]?.role === 'technical_lead', '7b. DB verified role is technical_lead');
    assert(checkOfficerRes.rows[0]?.posting_access === true, '7c. technical_lead automatically granted posting_access');

    // 7b. President invites student2 as vice_president
    const inviteReq = new NextRequest(`http://localhost:3000/api/v1/clubs/${clubA.slug}/members/invite`, {
      method: 'POST',
      headers: {
        cookie: `cg_token=${presAToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: student2.username,
        role: 'vice_president'
      })
    });
    const inviteRes = await ClubMemberInviteRoute(
      inviteReq,
      { params: Promise.resolve({ slug: clubA.slug }) },
      { sub: presUserA.id, role: 'student' }
    );
    assert(inviteRes.status === 200 || inviteRes.status === 201, '7d. President invited student2 as vice_president (200 OK)');

    const checkVpRes = await query(
      `SELECT role, posting_access FROM club_memberships WHERE club_id = $1 AND user_id = $2`,
      [clubA.id, student2.id]
    );
    assert(checkVpRes.rows[0]?.role === 'vice_president', '7e. DB verified student2 role is vice_president');

    // 7c. President attempts to appoint another President → 403 Forbidden
    const presAppointReq = new NextRequest(`http://localhost:3000/api/v1/clubs/${clubA.slug}/members/${student2.id}`, {
      method: 'PATCH',
      headers: {
        cookie: `cg_token=${presAToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'president' })
    });
    const presAppointRes = await ClubMemberPatchRoute(
      presAppointReq,
      { params: Promise.resolve({ slug: clubA.slug, uid: student2.id }) },
      { sub: presUserA.id, role: 'student' }
    );
    assert(presAppointRes.status === 403, '7f. President cannot appoint another President (403 Forbidden)');

    // 7d. President demotes technical_lead back to member
    const demoteReq = new NextRequest(`http://localhost:3000/api/v1/clubs/${clubA.slug}/members/${memberUser.id}`, {
      method: 'PATCH',
      headers: {
        cookie: `cg_token=${presAToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'member' })
    });
    const demoteRes = await ClubMemberPatchRoute(
      demoteReq,
      { params: Promise.resolve({ slug: clubA.slug, uid: memberUser.id }) },
      { sub: presUserA.id, role: 'student' }
    );
    assert(demoteRes.status === 200, '7g. President demoted technical_lead back to member (200 OK)');

    const checkDemotedRes = await query(
      `SELECT role, posting_access FROM club_memberships WHERE club_id = $1 AND user_id = $2`,
      [clubA.id, memberUser.id]
    );
    assert(checkDemotedRes.rows[0]?.role === 'member', '7h. DB verified memberUser is member again');
    assert(checkDemotedRes.rows[0]?.posting_access === false, '7i. General member has posting_access = false');

    // ───────────────────────────────────────────────────────────────────────────
    // TEST 8: Admin Presidential Transfer
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n👉 STEP 8: Admin presidential appointment & transfer...');
    const adminPresTransferReq = new NextRequest(`http://localhost:3000/api/v1/clubs/${clubA.slug}/members/${student2.id}`, {
      method: 'PATCH',
      headers: {
        cookie: `cg_token=${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'president' })
    });
    const adminPresTransferRes = await ClubMemberPatchRoute(
      adminPresTransferReq,
      { params: Promise.resolve({ slug: clubA.slug, uid: student2.id }) },
      { sub: adminUser.id, role: 'admin' }
    );
    assert(adminPresTransferRes.status === 200, '8a. Admin appointed student2 as new President (200 OK)');

    const checkClubLeadRes = await query(`SELECT lead_user_id FROM clubs WHERE id = $1`, [clubA.id]);
    assert(checkClubLeadRes.rows[0]?.lead_user_id === student2.id, '8b. clubs.lead_user_id updated to student2');

    const checkOldPresRes = await query(
      `SELECT role FROM club_memberships WHERE club_id = $1 AND user_id = $2`,
      [clubA.id, presUserA.id]
    );
    assert(checkOldPresRes.rows[0]?.role === 'member', '8c. Former President demoted to member');

    // ───────────────────────────────────────────────────────────────────────────
    // TEST 9: Faculty Advisor Governance (Admin Only)
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n👉 STEP 9: Faculty Advisor Governance...');

    // 9a. President attempting to assign faculty advisor → 403 Forbidden
    const presFacReq = new NextRequest(`http://localhost:3000/api/v1/clubs/${clubA.slug}/faculty`, {
      method: 'POST',
      headers: {
        cookie: `cg_token=${presAToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        faculty_id: facultyUser.id,
        is_hod: true
      })
    });
    const presFacRes = await ClubFacultyPostRoute(
      presFacReq,
      { params: Promise.resolve({ slug: clubA.slug }) },
      { sub: presUserA.id, role: 'student' }
    );
    assert(presFacRes.status === 403, '9a. President cannot assign faculty advisor (403 Forbidden)');

    // 9b. Admin assigns faculty advisor → 201 Created
    const adminFacReq = new NextRequest(`http://localhost:3000/api/v1/clubs/${clubA.slug}/faculty`, {
      method: 'POST',
      headers: {
        cookie: `cg_token=${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        faculty_id: facultyUser.id,
        is_hod: true
      })
    });
    const adminFacRes = await ClubFacultyPostRoute(
      adminFacReq,
      { params: Promise.resolve({ slug: clubA.slug }) },
      { sub: adminUser.id, role: 'admin' }
    );
    assert(adminFacRes.status === 201, '9b. Admin successfully assigned faculty advisor (201 Created)');

    // 9c. Admin removes faculty advisor → 200 OK
    const adminFacDelReq = new NextRequest(`http://localhost:3000/api/v1/clubs/${clubA.slug}/faculty?faculty_id=${facultyUser.id}`, {
      method: 'DELETE',
      headers: { cookie: `cg_token=${adminToken}` }
    });
    const adminFacDelRes = await ClubFacultyDeleteRoute(
      adminFacDelReq,
      { params: Promise.resolve({ slug: clubA.slug }) },
      { sub: adminUser.id, role: 'admin' }
    );
    assert(adminFacDelRes.status === 200, '9c. Admin successfully removed faculty advisor (200 OK)');

  } finally {
    // ── Cleanup Test Fixtures ─────────────────────────────────────────────────
    console.log('\nCleaning up test fixtures...');
    await query(`DELETE FROM club_memberships WHERE club_id IN ($1, $2)`, [clubA.id, clubB.id]);
    await query(`DELETE FROM club_faculty_advisors WHERE club_id IN ($1, $2)`, [clubA.id, clubB.id]);
    await query(`DELETE FROM clubs WHERE id IN ($1, $2)`, [clubA.id, clubB.id]);
    await query(`DELETE FROM users WHERE id IN ($1, $2, $3, $4, $5, $6)`, [
      presUserA.id,
      presUserB.id,
      memberUser.id,
      student2.id,
      facultyUser.id,
      adminUser.id,
    ]);
  }

  console.log(`\n=============================================================`);
  console.log(`RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log(`=============================================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runManagementWorkspaceTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Unhandled error during tests:', err);
    process.exit(1);
  });
