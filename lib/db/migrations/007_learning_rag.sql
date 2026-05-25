-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 007_learning_rag.sql
-- Description: Learning paths, milestones, enrollments, progress tracking,
--              quiz attempts, pgvector RAG resources, and platform config.
-- Depends on: 002_core_tables.sql, 001_enums.sql
-- NOTE: Requires pgvector extension to be enabled on your Neon DB instance.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable pgvector if available, otherwise fallback to real[]
-- CREATE EXTENSION IF NOT EXISTS vector;

-- ── learning_paths ────────────────────────────────────────────────────────────
CREATE TABLE learning_paths (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  domain          TEXT NOT NULL,
  difficulty      TEXT CHECK (difficulty IN ('beginner','intermediate','advanced')),
  duration        TEXT,
  estimated_hours INT,
  banner_url      TEXT,
  tags            TEXT[],
  status          path_status NOT NULL DEFAULT 'draft',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_paths_domain ON learning_paths(domain);
CREATE INDEX idx_paths_status ON learning_paths(status);
CREATE INDEX idx_paths_tags   ON learning_paths USING GIN(tags);

-- ── path_milestones ───────────────────────────────────────────────────────────
CREATE TABLE path_milestones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id     UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  week_number SMALLINT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  tech_stacks TEXT[],
  resources   JSONB NOT NULL DEFAULT '[]',
  -- [{ title, url, type: 'free_course'|'video'|'documentation'|'article'|'other' }]
  checkpoint  JSONB,
  xp_reward   INT NOT NULL DEFAULT 0,
  is_optional BOOLEAN DEFAULT FALSE,
  sort_order  SMALLINT DEFAULT 0
);

CREATE INDEX idx_milestones_path_id ON path_milestones(path_id, sort_order);

-- ── path_enrollments ──────────────────────────────────────────────────────────
CREATE TABLE path_enrollments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  path_id      UUID NOT NULL REFERENCES learning_paths(id),
  started_at   TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, path_id)
);

CREATE INDEX idx_enrollments_user_id ON path_enrollments(user_id);
CREATE INDEX idx_enrollments_path_id ON path_enrollments(path_id);

-- ── path_progress ─────────────────────────────────────────────────────────────
-- Per-milestone completion tracking (queryable rows, not a JSON blob).
CREATE TABLE path_progress (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  milestone_id   UUID NOT NULL REFERENCES path_milestones(id),
  completed      BOOLEAN DEFAULT FALSE,
  score          INT,
  notes          TEXT,
  submission_url TEXT,
  completed_at   TIMESTAMPTZ,
  UNIQUE(user_id, milestone_id)
);

CREATE INDEX idx_progress_user_id      ON path_progress(user_id);
CREATE INDEX idx_progress_milestone_id ON path_progress(milestone_id);

-- ── quiz_attempts ─────────────────────────────────────────────────────────────
CREATE TABLE quiz_attempts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic      TEXT NOT NULL,
  score_pct  NUMERIC(5,2) NOT NULL,
  passed     BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_quiz_attempts_user_topic ON quiz_attempts(user_id, topic, created_at DESC);

-- ── rag_resources ─────────────────────────────────────────────────────────────
CREATE TABLE rag_resources (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  url        TEXT NOT NULL,
  domain     TEXT NOT NULL,
  content    TEXT,
  embedding  real[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CREATE INDEX idx_rag_embedding
--   ON rag_resources USING ivfflat (embedding vector_cosine_ops)
--   WITH (lists = 100);

-- ── platform_config ───────────────────────────────────────────────────────────
-- Admin-managed key-value config. No code deploy needed for config changes.
CREATE TABLE platform_config (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default configuration values
INSERT INTO platform_config (key, value) VALUES
  ('allowed_email_domains',       '["college.ac.in"]'),
  ('marketplace_xp_threshold',    '100'),
  ('roadmap_daily_limit',         '3'),
  ('board_post_daily_limit',      '1'),
  ('new_user_post_queue_days',    '30'),
  ('new_user_post_queue_count',   '3'),
  ('report_auto_hide_threshold',  '3'),
  ('boost_board_post_cost',       '20'),
  ('boost_profile_cost',          '15'),
  ('feature_project_cost',        '10'),
  ('listing_expiry_days',         '60');
