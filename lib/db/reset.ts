/**
 * lib/db/reset.ts
 *
 * Database reset utility.
 * Drops public schema and re-runs all migrations to provide a clean state.
 *
 * Usage:
 *   npx tsx lib/db/reset.ts
 *   # or npm run db:reset
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

if (fs.existsSync(path.resolve(process.cwd(), '.env.local'))) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
} else {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

if (!process.env.DATABASE_URL) {
  console.error('[reset] DATABASE_URL is not set.');
  process.exit(1);
}

async function reset() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL!.includes('neon.tech')
      ? { rejectUnauthorized: false }
      : false,
  });

  const client = await pool.connect();

  try {
    console.log('Resetting database schema...');
    await client.query('DROP SCHEMA public CASCADE;');
    await client.query('CREATE SCHEMA public;');
    await client.query('GRANT ALL ON SCHEMA public TO public;');
    console.log('Database wiped clean.');
  } finally {
    client.release();
    await pool.end();
  }

  console.log('\nRe-running migrations...');
  execSync('npx tsx lib/db/migrate.ts', { stdio: 'inherit' });
  console.log('Database successfully reset and migrations re-applied!');
}

reset().catch((err) => {
  console.error('[reset] Error clearing database:', err);
  process.exit(1);
});
