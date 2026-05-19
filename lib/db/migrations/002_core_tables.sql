-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 002_core_tables.sql
-- Description: Core identity tables — users, profiles, and the shared
--              updated_at trigger function used by all user-facing tables.
-- Depends on: 001_enums.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Shared trigger: auto-set updated_at on any UPDATE ────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── users ─────────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email              TEXT UNIQUE NOT NULL,
  phone_number       TEXT UNIQUE,
  username           TEXT UNIQUE NOT NULL,
  profile_slug       TEXT UNIQUE NOT NULL,
  username_edited    BOOLEAN DEFAULT FALSE,
  role               user_role NOT NULL DEFAULT 'student',
  xp                 INT NOT NULL DEFAULT 0,
  campus_score       INT NOT NULL DEFAULT 0,
  github_id          TEXT UNIQUE,
  linkedin_id        TEXT UNIQUE,
  clerk_user_id      TEXT UNIQUE NOT NULL,
  avatar_url         TEXT,
  profile_visibility TEXT NOT NULL DEFAULT 'public'
                       CHECK (profile_visibility IN ('public','private')),
  phone_visible      BOOLEAN DEFAULT FALSE,
  email_verified     BOOLEAN DEFAULT FALSE,
  phone_verified     BOOLEAN DEFAULT FALSE,
  is_onboarded       BOOLEAN DEFAULT FALSE,
  onboarding_step    SMALLINT DEFAULT 0,
  is_banned          BOOLEAN DEFAULT FALSE,
  last_login_at      TIMESTAMPTZ,
  deleted_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_campus_score ON users(campus_score DESC);
CREATE INDEX idx_users_xp           ON users(xp DESC);
CREATE INDEX idx_users_role         ON users(role);
CREATE INDEX idx_users_created_at   ON users(created_at DESC);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── profiles ──────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name            TEXT NOT NULL,
  year                 SMALLINT CHECK (year BETWEEN 1 AND 4),
  department           TEXT,
  roll_number          TEXT,
  bio                  VARCHAR(300),
  current_focus        VARCHAR(120),
  public_email         TEXT,
  public_email_visible BOOLEAN DEFAULT FALSE,
  score_hidden         BOOLEAN DEFAULT FALSE,
  collaborate_open     BOOLEAN DEFAULT FALSE,
  github_url           TEXT,
  linkedin_url         TEXT,
  twitter_url          TEXT,
  website_url          TEXT,
  og_image_url         TEXT,
  completeness_pct     SMALLINT DEFAULT 0,
  interests            TEXT[],
  -- Alumni fields (populated on role transition)
  is_alumni            BOOLEAN DEFAULT FALSE,
  graduation_year      SMALLINT,
  company              TEXT,
  job_role             TEXT,
  city                 TEXT,
  external_alumni_url  TEXT,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_user_id      ON profiles(user_id);
CREATE INDEX idx_profiles_department   ON profiles(department);
CREATE INDEX idx_profiles_year         ON profiles(year);
CREATE INDEX idx_profiles_collaborate  ON profiles(collaborate_open);
CREATE INDEX idx_profiles_is_alumni    ON profiles(is_alumni);
CREATE INDEX idx_profiles_fts ON profiles
  USING GIN(to_tsvector('english',
    full_name || ' ' || COALESCE(bio,'') || ' ' || COALESCE(current_focus,'')));

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
