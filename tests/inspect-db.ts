import 'dotenv/config';
import { query } from '../lib/db/client';

async function inspectDB() {
  const users = await query(`SELECT id, username, email, role, is_banned, created_at FROM users ORDER BY created_at ASC`);
  console.log('--- ALL USERS (' + users.rows.length + ') ---');
  for (const u of users.rows) {
    console.log(`  - ${u.username.padEnd(16)} | ${u.role.padEnd(10)} | ${u.email.padEnd(32)} | ${u.id}`);
  }

  const clubs = await query(`SELECT id, name, slug, verification_status, is_active, lead_user_id, deleted_at, created_at FROM clubs ORDER BY created_at ASC`);
  console.log('\n--- ALL CLUBS (' + clubs.rows.length + ') ---');
  for (const c of clubs.rows) {
    console.log(`  - ${c.name.padEnd(45)} | status: ${c.verification_status.padEnd(10)} | active: ${c.is_active} | lead: ${c.lead_user_id} | del: ${c.deleted_at ? 'YES' : 'NO'}`);
  }
}

inspectDB().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
