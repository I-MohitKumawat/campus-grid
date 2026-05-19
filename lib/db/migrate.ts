/**
 * lib/db/migrate.ts
 *
 * Database migration runner.
 *
 * Reads SQL migration files from lib/db/migrations/ in filename order
 * and applies any that haven't been applied yet.
 *
 * Usage:
 *   npx tsx lib/db/migrate.ts
 *   # or as npm script: npm run db:migrate
 *
 * Strategy:
 *   - Maintains a `schema_migrations` table that tracks applied migration filenames.
 *   - Each migration file is applied in a single transaction.
 *   - If any migration fails, it rolls back and exits with code 1.
 *   - Files must have an .sql extension and be numbered (e.g. 001_enums.sql).
 *
 * RULE: Never edit or delete applied migration files.
 *       All schema changes must go into a new migration file.
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load env from .env.local in development
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (!process.env.DATABASE_URL) {
  console.error('[migrate] DATABASE_URL is not set.');
  process.exit(1);
}

const MIGRATIONS_DIR = path.resolve(__dirname, 'migrations');

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL!.includes('neon.tech')
      ? { rejectUnauthorized: false }
      : false,
  });

  const client = await pool.connect();

  try {
    // Ensure the tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    // Get already-applied migrations
    const { rows } = await client.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations ORDER BY filename ASC'
    );
    const applied = new Set(rows.map((r) => r.filename));

    // Discover and sort migration files
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let count = 0;

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`  [skip]  ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

      console.log(`  [apply] ${file}...`);
      await client.query('BEGIN');

      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        count++;
        console.log(`  [done]  ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  [fail]  ${file}:`, (err as Error).message);
        process.exit(1);
      }
    }

    console.log(`\nMigration complete. ${count} migration(s) applied.`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('[migrate] Unexpected error:', err);
  process.exit(1);
});
