-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 010_admin_and_club_columns.sql
-- Description: Add category & is_active columns to clubs, start_time / end_time / published_at / created_by to events, and compatibility columns for registrations & certificates.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TYPE event_status ADD VALUE IF NOT EXISTS 'archived';

ALTER TABLE clubs ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE clubs ALTER COLUMN lead_user_id DROP NOT NULL;
ALTER TABLE clubs ALTER COLUMN type DROP NOT NULL;

-- Events columns alignment
ALTER TABLE events ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ DEFAULT now();
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ DEFAULT (now() + interval '2 hours');
ALTER TABLE events ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE events ALTER COLUMN organiser_id DROP NOT NULL;
ALTER TABLE events ALTER COLUMN organiser_type DROP NOT NULL;
ALTER TABLE events ALTER COLUMN event_date DROP NOT NULL;

-- Registrations & Certificates compatibility
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS qr_code_token TEXT;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS pass_code TEXT;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS attended_at TIMESTAMPTZ;
ALTER TABLE certificates ALTER COLUMN registration_id DROP NOT NULL;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS verification_token TEXT;
