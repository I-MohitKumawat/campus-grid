-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 013_club_lifecycle_archive_delete.sql
-- Description: Adds archived_at and archived_by to clubs for non-destructive
--              lifecycle management, and ensures events.club_id sets to NULL
--              on club deletion so event history and certificates are preserved.
-- Depends on: 010_admin_and_club_columns.sql, 005_clubs_events.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add archival metadata columns to clubs table
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES users(id) DEFAULT NULL;

-- 2. Create index on archived_at for high-performance discovery queries
CREATE INDEX IF NOT EXISTS idx_clubs_archived_at ON clubs(archived_at);

-- 3. Adjust foreign key on events.club_id to ON DELETE SET NULL
-- This guarantees that permanently deleting an archived club preserves historical
-- events, attendance, registrations, and student verifiable certificates.
DO $$
BEGIN
  -- Drop existing constraint if named events_club_id_fkey or similar
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'events_club_id_fkey' AND table_name = 'events'
  ) THEN
    ALTER TABLE events DROP CONSTRAINT events_club_id_fkey;
  END IF;
END $$;

ALTER TABLE events
  ADD CONSTRAINT events_club_id_fkey
  FOREIGN KEY (club_id)
  REFERENCES clubs(id)
  ON DELETE SET NULL;
