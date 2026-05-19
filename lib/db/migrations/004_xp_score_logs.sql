-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 004_xp_score_logs.sql
-- Description: Append-only XP and Campus Score audit log tables.
--              These tables are NEVER updated or deleted.
-- Depends on: 002_core_tables.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── xp_log ────────────────────────────────────────────────────────────────────
-- XP is permanent — only CREDIT entries exist.
CREATE TABLE xp_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type    TEXT NOT NULL,
  category       xp_category NOT NULL,
  points         INT NOT NULL CHECK (points > 0),
  balance_before INT NOT NULL,
  balance_after  INT NOT NULL,
  reason         TEXT,
  admin_adjusted BOOLEAN DEFAULT FALSE,
  adjusted_by    UUID REFERENCES users(id),
  source_ref     TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_xp_log_user_id     ON xp_log(user_id, created_at DESC);
CREATE INDEX idx_xp_log_action_type ON xp_log(action_type);
CREATE INDEX idx_xp_log_source_ref  ON xp_log(source_ref);

-- ── score_log ─────────────────────────────────────────────────────────────────
-- Campus Score can be credited or debited.
CREATE TABLE score_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type    TEXT NOT NULL,
  -- CREDIT: 'profile_completion','skill_verified','quiz_passed','event_attendance',
  --         'learning_milestone','learning_path','club_join','club_leadership','board_post'
  -- DEBIT:  'boost_board_post','boost_profile','feature_project','penalty'
  category       score_category NOT NULL,
  points         INT NOT NULL,   -- positive = credit, negative = debit
  balance_before INT NOT NULL,
  balance_after  INT NOT NULL,
  reason         TEXT,
  admin_adjusted BOOLEAN DEFAULT FALSE,
  adjusted_by    UUID REFERENCES users(id),
  source_ref     TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_score_log_user_id     ON score_log(user_id, created_at DESC);
CREATE INDEX idx_score_log_action_type ON score_log(action_type);
CREATE INDEX idx_score_log_category    ON score_log(category);
