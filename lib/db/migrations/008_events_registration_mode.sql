-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 008_events_registration_mode.sql
-- Description: Add registration_mode column to events table ('instant' vs 'approval').
-- Depends on: 005_clubs_events.sql
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE events
ADD COLUMN IF NOT EXISTS registration_mode TEXT NOT NULL DEFAULT 'instant'
  CHECK (registration_mode IN ('instant', 'approval'));

CREATE INDEX IF NOT EXISTS idx_events_registration_mode ON events(registration_mode);
