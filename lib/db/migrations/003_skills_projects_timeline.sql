-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 003_skills_projects_timeline.sql
-- Description: Skills, peer endorsements, projects, project members,
--              and timeline entries.
-- Depends on: 002_core_tables.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── skills ────────────────────────────────────────────────────────────────────
CREATE TABLE skills (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  verification_type skill_verification_type NOT NULL DEFAULT 'self_declared',
  source            TEXT CHECK (source IN
                      ('github','leetcode','codeforces','codechef','hackerrank','quiz','peer')),
  source_detail     JSONB DEFAULT '{}',
  endorsement_count INT NOT NULL DEFAULT 0,
  confidence_score  NUMERIC(4,2) DEFAULT 0,
  verified_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, name)
);

CREATE INDEX idx_skills_profile_id        ON skills(profile_id);
CREATE INDEX idx_skills_name              ON skills(name);
CREATE INDEX idx_skills_verification_type ON skills(verification_type);

CREATE TRIGGER trg_skills_updated_at
  BEFORE UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── peer_endorsements ─────────────────────────────────────────────────────────
CREATE TABLE peer_endorsements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id     UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  endorser_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight       SMALLINT DEFAULT 1,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(skill_id, endorser_id)
);

CREATE INDEX idx_endorsements_skill_id    ON peer_endorsements(skill_id);
CREATE INDEX idx_endorsements_endorser_id ON peer_endorsements(endorser_id);

-- ── projects ──────────────────────────────────────────────────────────────────
CREATE TABLE projects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title               VARCHAR(80) NOT NULL,
  description         VARCHAR(200),
  tech_tags           TEXT[],
  cover_url           TEXT,
  visibility          TEXT NOT NULL DEFAULT 'public'
                        CHECK (visibility IN ('public','private')),
  featured            BOOLEAN DEFAULT FALSE,
  status              project_status DEFAULT 'building',
  verification_status project_verification_status DEFAULT 'unverified',
  links               JSONB DEFAULT '[]',
  repo_stats          JSONB,
  sort_order          SMALLINT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_projects_created_by          ON projects(created_by);
CREATE INDEX idx_projects_tech_tags           ON projects USING GIN(tech_tags);
CREATE INDEX idx_projects_verification_status ON projects(verification_status);
CREATE INDEX idx_projects_featured            ON projects(featured);

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── project_members ───────────────────────────────────────────────────────────
CREATE TABLE project_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       project_member_role NOT NULL DEFAULT 'member',
  joined_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id    ON project_members(user_id);

-- ── timeline_entries ──────────────────────────────────────────────────────────
CREATE TABLE timeline_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            timeline_entry_type NOT NULL,
  title           TEXT NOT NULL,
  organisation    TEXT,
  description     VARCHAR(200),
  tags            TEXT[],
  featured        BOOLEAN DEFAULT FALSE,
  certificate_url TEXT,
  media_urls      TEXT[],
  entry_date      DATE NOT NULL,
  end_date        DATE,
  auto_generated  BOOLEAN DEFAULT FALSE,
  source_ref      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_timeline_profile_date ON timeline_entries(profile_id, entry_date DESC);
CREATE INDEX idx_timeline_type         ON timeline_entries(type);
CREATE INDEX idx_timeline_featured     ON timeline_entries(featured);
CREATE INDEX idx_timeline_tags         ON timeline_entries USING GIN(tags);
