-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 014_club_membership_applications.sql
-- Description: Create club_membership_applications table with partial unique index
--              for pending applications and notification triggers.
-- Depends on: 005_clubs_events.sql, 013_club_lifecycle_archive_delete.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS club_membership_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  motivation TEXT NOT NULL,
  interests TEXT[] DEFAULT '{}',
  experience TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial unique index: A student can have only ONE active 'pending' application per club
CREATE UNIQUE INDEX IF NOT EXISTS idx_club_membership_app_pending
  ON club_membership_applications (club_id, user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_club_membership_apps_club_status
  ON club_membership_applications (club_id, status);

CREATE INDEX IF NOT EXISTS idx_club_membership_apps_user
  ON club_membership_applications (user_id);

CREATE INDEX IF NOT EXISTS idx_club_membership_apps_created_at
  ON club_membership_applications (created_at DESC);

-- Trigger to auto-set updated_at on UPDATE
DROP TRIGGER IF EXISTS trg_club_membership_apps_updated_at ON club_membership_applications;
CREATE TRIGGER trg_club_membership_apps_updated_at
  BEFORE UPDATE ON club_membership_applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
