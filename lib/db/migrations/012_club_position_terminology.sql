-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 012_club_position_terminology.sql
-- Description: Align club positions with collegiate terminology:
--              president, vice_president, secretary, vice_secretary,
--              treasurer, technical_lead, outreach_lead, member.
-- Depends on: 011_club_positions_and_roles.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Drop existing role constraint to allow data transformation
ALTER TABLE club_memberships DROP CONSTRAINT IF EXISTS club_memberships_role_check;

-- 2. Migrate existing position data
UPDATE club_memberships SET role = 'president' WHERE role = 'lead';
UPDATE club_memberships SET role = 'vice_president' WHERE role = 'vice_lead';
UPDATE club_memberships SET role = 'vice_secretary' WHERE role = 'design_lead';

-- 3. Apply updated check constraint with the 8 college-facing positions
ALTER TABLE club_memberships ADD CONSTRAINT club_memberships_role_check
  CHECK (role IN (
    'president',
    'vice_president',
    'secretary',
    'vice_secretary',
    'treasurer',
    'technical_lead',
    'outreach_lead',
    'member'
  ));
