/**
 * lib/db/seed.ts
 *
 * Deterministic Development Seeder for CampusGrid.
 * Seeds a realistic miniature campus environment with platform admin, club leads,
 * students, clubs, events in various lifecycle states, memberships, registrations,
 * attendance check-ins, and digital certificates.
 *
 * Usage:
 *   npx tsx lib/db/seed.ts
 *   # or npm run db:seed
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load env from .env.development, fallback to .env.local or .env
if (fs.existsSync(path.resolve(process.cwd(), '.env.development'))) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.development') });
} else if (fs.existsSync(path.resolve(process.cwd(), '.env.local'))) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
} else {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

if (!process.env.DATABASE_URL) {
  console.error('[seed] DATABASE_URL is not set.');
  process.exit(1);
}

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.DATABASE_URL!.includes('neon.tech') ||
      process.env.DATABASE_URL!.includes('render.com') ||
      process.env.DATABASE_URL!.includes('oregon-postgres')
        ? { rejectUnauthorized: false }
        : false,
  });

  const client = await pool.connect();

  try {
    console.log('Starting deterministic database seeding...');

    await client.query('BEGIN');

    // 1. Clean existing seed data deterministically
    await client.query(`TRUNCATE users, profiles, clubs, club_memberships, events, event_registrations, certificates, notifications, skills CASCADE;`);

    // 2. Seed Users & Profiles
    console.log('Seeding campus users and profiles...');

    // Platform Admin
    const adminRes = await client.query(`
      INSERT INTO users (email, username, profile_slug, role, firebase_uid, is_onboarded)
      VALUES ('admin@college.ac.in', 'admin', 'admin', 'admin', 'dev-admin', TRUE)
      RETURNING id;
    `);
    const adminId = adminRes.rows[0].id;
    await client.query(`
      INSERT INTO profiles (user_id, full_name, department, roll_number, bio)
      VALUES ($1, 'System Administrator', 'Information Technology', '1MS20AD001', 'CampusGrid Platform Operations Administrator.');
    `, [adminId]);

    // Club Leads
    const ieeeLeadRes = await client.query(`
      INSERT INTO users (email, username, profile_slug, role, firebase_uid, is_onboarded)
      VALUES ('ieee_lead@college.ac.in', 'ieee_lead', 'ieee_lead', 'club_lead', 'dev-ieee-lead', TRUE)
      RETURNING id;
    `);
    const ieeeLeadId = ieeeLeadRes.rows[0].id;
    await client.query(`
      INSERT INTO profiles (user_id, full_name, department, roll_number, year, bio)
      VALUES ($1, 'Rahul Verma', 'Electrical Engineering', '1MS21EE012', 4, 'IEEE Student Branch Chair.');
    `, [ieeeLeadId]);

    const robLeadRes = await client.query(`
      INSERT INTO users (email, username, profile_slug, role, firebase_uid, is_onboarded)
      VALUES ('robotics_lead@college.ac.in', 'robotics_lead', 'robotics_lead', 'club_lead', 'dev-rob-lead', TRUE)
      RETURNING id;
    `);
    const robLeadId = robLeadRes.rows[0].id;
    await client.query(`
      INSERT INTO profiles (user_id, full_name, department, roll_number, year, bio)
      VALUES ($1, 'Neha Kulkarni', 'Mechanical Engineering', '1MS21ME045', 4, 'Robotics Club Lead & Automation Enthusiast.');
    `, [robLeadId]);

    // Students (8 Realistic Accounts)
    const studentsData = [
      { email: 'arjun@college.ac.in', username: 'arjun', name: 'Arjun Dev', dept: 'Computer Science & Engineering', roll: '1MS21CS042', year: 3, bio: 'Full Stack Developer & Open Source Contributor.' },
      { email: 'riya@college.ac.in', username: 'riya', name: 'Riya Sharma', dept: 'Electronics & Communication', roll: '1MS22EC088', year: 2, bio: 'Embedded Systems & Signal Processing Enthusiast.' },
      { email: 'vikram@college.ac.in', username: 'vikram', name: 'Vikram Patel', dept: 'Mechanical Engineering', roll: '1MS20ME015', year: 4, bio: 'Automotive Design & CAD Enthusiast.' },
      { email: 'ananya@college.ac.in', username: 'ananya', name: 'Ananya Rao', dept: 'Information Science', roll: '1MS21IS024', year: 3, bio: 'Cybersecurity researcher & CTF participant.' },
      { email: 'karan@college.ac.in', username: 'karan', name: 'Karan Singh', dept: 'Artificial Intelligence & ML', roll: '1MS22AI019', year: 2, bio: 'Deep Learning & Computer Vision practitioner.' },
      { email: 'meera@college.ac.in', username: 'meera', name: 'Meera Nair', dept: 'Computer Science & Engineering', roll: '1MS23CS102', year: 1, bio: 'Competitive Programmer & Algorithmic Problem Solver.' },
      { email: 'siddharth@college.ac.in', username: 'siddharth', name: 'Siddharth Joshi', dept: 'Electronics & Communication', roll: '1MS21EC056', year: 3, bio: 'IoT & Smart Hardware builder.' },
      { email: 'tanvi@college.ac.in', username: 'tanvi', name: 'Tanvi Verma', dept: 'Computer Science & Engineering', roll: '1MS20CS145', year: 4, bio: 'Cloud Architect & DevOps Learner.' }
    ];

    const studentIds: string[] = [];
    for (const s of studentsData) {
      const uRes = await client.query(`
        INSERT INTO users (email, username, profile_slug, role, firebase_uid, is_onboarded)
        VALUES ($1, $2, $2, 'student', $3, TRUE)
        RETURNING id;
      `, [s.email, s.username, `dev-${s.username}`]);
      const uid = uRes.rows[0].id;
      studentIds.push(uid);

      await client.query(`
        INSERT INTO profiles (user_id, full_name, department, roll_number, year, bio, github_url, linkedin_url, website_url, interests)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
      `, [
        uid,
        s.name,
        s.dept,
        s.roll,
        s.year,
        s.bio,
        `https://github.com/${s.username}`,
        `https://linkedin.com/in/${s.username}`,
        `https://${s.username}.dev`,
        ['Web Development', 'AI/ML', 'Robotics', 'Open Source']
      ]);
    }

    // 3. Seed Clubs
    console.log('Seeding campus clubs & organizations...');
    const clubs = [
      { name: 'IEEE Student Branch', slug: 'ieee', category: 'Technical', desc: 'Official IEEE Student Chapter organizing workshops and technical summits.', leadId: ieeeLeadId },
      { name: 'Robotics & Automation Club', slug: 'robotics-club', category: 'Technical', desc: 'Hardware design, autonomous rovers, and mechatronics builds.', leadId: robLeadId },
      { name: 'Photography & Visual Arts', slug: 'photography-club', category: 'Cultural', desc: 'Campus photo walks, media coverage, and visual design workshops.', leadId: adminId },
      { name: 'Coding & Open Source Society', slug: 'coding-club', category: 'Technical', desc: 'Algorithms, open source contributions, and hackathons.', leadId: adminId }
    ];

    const clubIds: Record<string, string> = {};
    for (const c of clubs) {
      const cRes = await client.query(`
        INSERT INTO clubs (name, slug, category, type, description, is_active)
        VALUES ($1, $2, $3, $3, $4, TRUE)
        RETURNING id;
      `, [c.name, c.slug, c.category, c.desc]);
      const cid = cRes.rows[0].id;
      clubIds[c.slug] = cid;

      // Assign Lead
      await client.query(`
        INSERT INTO club_memberships (club_id, user_id, role, status)
        VALUES ($1, $2, 'lead', 'active');
      `, [cid, c.leadId]);
    }

    // Add Student Memberships
    for (let i = 0; i < studentIds.length; i++) {
      const targetClubId = Object.values(clubIds)[i % Object.values(clubIds).length];
      await client.query(`
        INSERT INTO club_memberships (club_id, user_id, role, status)
        VALUES ($1, $2, 'member', 'active')
        ON CONFLICT (club_id, user_id) DO NOTHING;
      `, [targetClubId, studentIds[i]]);
    }

    // 4. Seed Events in various lifecycle states
    console.log('Seeding events across lifecycle states...');
    const now = new Date();
    const future1 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const future2 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const past1 = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    const past2 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Published Event 1
    const evtPublishedRes = await client.query(`
      INSERT INTO events (club_id, title, description, event_type, status, venue, capacity, start_time, end_time, published_at, created_by)
      VALUES ($1, 'Annual Campus Hackathon 2026', '24-Hour hackathon building AI & Web solutions for campus challenges.', 'hackathon', 'published', 'Main Auditorium & CS Labs', 200, $2, $3, now(), $4)
      RETURNING id;
    `, [clubIds['coding-club'], future1, new Date(future1.getTime() + 24 * 60 * 60 * 1000), adminId]);
    const evtPublishedId = evtPublishedRes.rows[0].id;

    // Published Event 2
    const evtRoboticsRes = await client.query(`
      INSERT INTO events (club_id, title, description, event_type, status, venue, capacity, start_time, end_time, published_at, created_by)
      VALUES ($1, 'Autonomous Rover Challenge', 'Build and race obstacle-navigating wheeled robots.', 'workshop', 'published', 'Mechanical Lawn & Robotics Lab', 50, $2, $3, now(), $4)
      RETURNING id;
    `, [clubIds['robotics-club'], future2, new Date(future2.getTime() + 6 * 60 * 60 * 1000), robLeadId]);
    const evtRoboticsId = evtRoboticsRes.rows[0].id;

    // Draft Event
    await client.query(`
      INSERT INTO events (club_id, title, description, event_type, status, venue, capacity, start_time, end_time, created_by)
      VALUES ($1, 'AI & ML Hands-on Bootcamp', 'Introduction to Neural Networks and PyTorch fundamentals.', 'workshop', 'draft', 'Seminar Hall B', 100, $2, $3, $4);
    `, [clubIds['ieee'], future1, new Date(future1.getTime() + 4 * 60 * 60 * 1000), ieeeLeadId]);

    // Completed Event
    const evtCompletedRes = await client.query(`
      INSERT INTO events (club_id, title, description, event_type, status, venue, capacity, start_time, end_time, published_at, created_by)
      VALUES ($1, 'Web3 & Decentralized Systems Summit', 'Expert talks on smart contracts, zero-knowledge proofs, and Web3 infrastructure.', 'seminar', 'completed', 'Auditorium Hall 1', 150, $2, $3, $4, $5)
      RETURNING id;
    `, [clubIds['ieee'], past1, new Date(past1.getTime() + 6 * 60 * 60 * 1000), past1, ieeeLeadId]);
    const evtCompletedId = evtCompletedRes.rows[0].id;

    // Archived Event
    await client.query(`
      INSERT INTO events (club_id, title, description, event_type, status, venue, capacity, start_time, end_time, created_by, deleted_at)
      VALUES ($1, 'Legacy Tech Expo 2025', 'Hardware and vintage computing exhibition.', 'other', 'archived', 'Exhibition Hall', 300, $2, $3, $4, now());
    `, [clubIds['photography-club'], past2, new Date(past2.getTime() + 8 * 60 * 60 * 1000), adminId]);

    // 5. Seed Event Registrations & Attendance
    console.log('Seeding registrations, attendance check-ins & certificates...');
    for (let i = 0; i < studentIds.length; i++) {
      const sId = studentIds[i];

      // Register for Published Hackathon
      await client.query(`
        INSERT INTO event_registrations (event_id, user_id, status, qr_code_token, pass_code)
        VALUES ($1, $2, 'registered', $3, $4);
      `, [evtPublishedId, sId, `qr_token_pub_${i}`, `PASS-${1000 + i}`]);

      // Register & Mark Attended for Completed Event
      await client.query(`
        INSERT INTO event_registrations (event_id, user_id, status, qr_code_token, pass_code, attended_at)
        VALUES ($1, $2, 'attended', $3, $4, $5);
      `, [evtCompletedId, sId, `qr_token_comp_${i}`, `PASS-COMP-${1000 + i}`, past1]);

      // Issue Certificate for Completed Event
      await client.query(`
        INSERT INTO certificates (user_id, event_id, title, verification_token, issued_at)
        VALUES ($1, $2, 'Web3 Summit Participation Certificate', $3, $4);
      `, [sId, evtCompletedId, `TOKEN-CERT-${10000 + i}`, past1]);
    }

    // 6. Seed System Notifications
    for (const sId of studentIds) {
      await client.query(`
        INSERT INTO notifications (user_id, title, message, is_read)
        VALUES ($1, 'Welcome to CampusGrid', 'Your official student identity has been activated.', TRUE);
      `, [sId]);
    }

    await client.query('COMMIT');
    console.log('\nDeterministic Database Seeding Completed Successfully!');
    console.log('Accounts Seeded:');
    console.log('  - Admin: admin@college.ac.in (Role: admin)');
    console.log('  - Club Lead: ieee_lead@college.ac.in (Role: club_lead)');
    console.log('  - Club Lead: robotics_lead@college.ac.in (Role: club_lead)');
    console.log('  - Student: arjun@college.ac.in (Role: student)');
    console.log('  - Student: riya@college.ac.in (Role: student)');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[seed] Seeding failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error('[seed] Unexpected error:', err);
  process.exit(1);
});
