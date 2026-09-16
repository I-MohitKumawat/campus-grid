-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 011_club_positions_and_roles.sql
-- Description: Implement 8 fixed club positions on club_memberships, normalize
--              platform-level roles (students remain students globally), and
--              add compound index for position-based authorization.
-- Depends on: 005_clubs_events.sql, 010_admin_and_club_columns.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Update club_memberships role check constraint to support 8 rigid positions
ALTER TABLE club_memberships DROP CONSTRAINT IF EXISTS club_memberships_role_check;

ALTER TABLE club_memberships ADD CONSTRAINT club_memberships_role_check
  CHECK (role IN (
    'lead',
    'vice_lead',
    'secretary',
    'treasurer',
    'technical_lead',
    'design_lead',
    'outreach_lead',
    'member'
  ));

-- 2. Normalize existing users table: club_lead is a club position, NOT a platform role.
-- Students holding club positions remain platform-level 'student'.
UPDATE users
SET role = 'student'
WHERE role = 'club_lead';

-- 3. Optimization index for fast club-position permission evaluations
CREATE INDEX IF NOT EXISTS idx_club_memberships_lookup
  ON club_memberships(club_id, user_id, role, status);
