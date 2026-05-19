-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 005_clubs_events.sql
-- Description: Clubs, club memberships, faculty advisors, events,
--              event registrations, and certificates.
-- Depends on: 002_core_tables.sql, 001_enums.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── clubs ─────────────────────────────────────────────────────────────────────
CREATE TABLE clubs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT UNIQUE NOT NULL,
  slug                TEXT UNIQUE NOT NULL,
  lead_user_id        UUID NOT NULL REFERENCES users(id),
  type                TEXT NOT NULL,
  description         VARCHAR(1000),
  logo_url            TEXT,
  banner_url          TEXT,
  domain_tags         TEXT[],
  social_links        JSONB DEFAULT '{}',
  visibility          TEXT NOT NULL DEFAULT 'public'
                        CHECK (visibility IN ('public','campus_only','invite_only')),
  featured            BOOLEAN DEFAULT FALSE,
  recruitment_open    BOOLEAN DEFAULT FALSE,
  member_count        INT NOT NULL DEFAULT 0,
  verification_status club_status NOT NULL DEFAULT 'pending',
  rejection_reason    TEXT,
  premium             BOOLEAN DEFAULT FALSE,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_clubs_slug                ON clubs(slug);
CREATE INDEX idx_clubs_lead_user_id        ON clubs(lead_user_id);
CREATE INDEX idx_clubs_domain_tags         ON clubs USING GIN(domain_tags);
CREATE INDEX idx_clubs_verification_status ON clubs(verification_status);
CREATE INDEX idx_clubs_recruitment_open    ON clubs(recruitment_open);

CREATE TRIGGER trg_clubs_updated_at
  BEFORE UPDATE ON clubs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── club_memberships ──────────────────────────────────────────────────────────
CREATE TABLE club_memberships (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id        UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role           TEXT NOT NULL DEFAULT 'member'
                   CHECK (role IN ('member','core','lead')),
  posting_access BOOLEAN DEFAULT FALSE,
  status         TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','inactive')),
  joined_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(club_id, user_id)
);

-- posting_access = TRUE means this member can create events under this club.
-- Only Club Lead sets this flag for other members.

CREATE INDEX idx_memberships_club_id ON club_memberships(club_id);
CREATE INDEX idx_memberships_user_id ON club_memberships(user_id);

-- ── club_faculty_advisors ─────────────────────────────────────────────────────
CREATE TABLE club_faculty_advisors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  faculty_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_hod      BOOLEAN DEFAULT FALSE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(club_id, faculty_id)
);

-- A club can have multiple faculty advisors.
-- A faculty member can advise multiple clubs.

CREATE INDEX idx_club_faculty_club_id    ON club_faculty_advisors(club_id);
CREATE INDEX idx_club_faculty_faculty_id ON club_faculty_advisors(faculty_id);

-- ── events ────────────────────────────────────────────────────────────────────
CREATE TABLE events (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                  TEXT NOT NULL,
  description            TEXT,
  banner_url             TEXT,
  media_urls             TEXT[],
  organiser_id           UUID NOT NULL REFERENCES users(id),
  organiser_type         TEXT NOT NULL
                           CHECK (organiser_type IN ('club','faculty','admin')),
  club_id                UUID REFERENCES clubs(id),
  event_type             event_type NOT NULL DEFAULT 'other',
  visibility             event_visibility NOT NULL DEFAULT 'public',
  status                 event_status NOT NULL DEFAULT 'draft',
  -- status flow:
  -- draft → pending_faculty → pending_admin → published → completed
  -- (internal events: draft → published directly, no approval)
  faculty_approval_by    UUID REFERENCES users(id),
  faculty_approved_at    TIMESTAMPTZ,
  faculty_rejection_note TEXT,
  admin_approval_by      UUID REFERENCES users(id),
  admin_approved_at      TIMESTAMPTZ,
  admin_rejection_note   TEXT,
  target_years           SMALLINT[],   -- e.g. {1,2,3,4} or null = all
  target_departments     TEXT[],       -- null = all departments
  event_date             TIMESTAMPTZ NOT NULL,
  duration_minutes       INT,
  venue                  TEXT,
  online_link            TEXT,
  capacity               INT,
  attendee_count         INT NOT NULL DEFAULT 0,
  registration_deadline  TIMESTAMPTZ,
  domain_tags            TEXT[],
  certificates_enabled   BOOLEAN DEFAULT FALSE,
  check_in_enabled       BOOLEAN DEFAULT FALSE,
  featured               BOOLEAN DEFAULT FALSE,
  speaker_info           JSONB,
  -- speaker_info (seminars): { name, designation, organisation, linkedin_url, bio }
  deleted_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_events_status       ON events(status);
CREATE INDEX idx_events_date         ON events(event_date);
CREATE INDEX idx_events_club_id      ON events(club_id);
CREATE INDEX idx_events_organiser_id ON events(organiser_id);
CREATE INDEX idx_events_domain_tags  ON events USING GIN(domain_tags);
CREATE INDEX idx_events_visibility   ON events(visibility);

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── event_registrations ───────────────────────────────────────────────────────
CREATE TABLE event_registrations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id           UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status             reg_status NOT NULL DEFAULT 'registered',
  attendance_mode    TEXT DEFAULT 'offline'
                       CHECK (attendance_mode IN ('offline','online','hybrid')),
  qr_token           TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
  checked_in_at      TIMESTAMPTZ,
  checked_in_by      UUID REFERENCES users(id),
  certificate_issued BOOLEAN DEFAULT FALSE,
  registered_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_regs_event_id ON event_registrations(event_id);
CREATE INDEX idx_regs_user_id  ON event_registrations(user_id);
CREATE INDEX idx_regs_qr_token ON event_registrations(qr_token);
CREATE INDEX idx_regs_status   ON event_registrations(status);

-- ── certificates ──────────────────────────────────────────────────────────────
CREATE TABLE certificates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id           UUID NOT NULL REFERENCES events(id),
  user_id            UUID NOT NULL REFERENCES users(id),
  registration_id    UUID NOT NULL REFERENCES event_registrations(id),
  certificate_type   certificate_type NOT NULL DEFAULT 'participation',
  template_id        TEXT,
  verification_token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
  pdf_url            TEXT,
  preview_image_url  TEXT,
  metadata           JSONB DEFAULT '{}',
  revoked_at         TIMESTAMPTZ,
  issued_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_certs_verification_token ON certificates(verification_token);
CREATE INDEX idx_certs_user_id            ON certificates(user_id);
CREATE INDEX idx_certs_event_id           ON certificates(event_id);
