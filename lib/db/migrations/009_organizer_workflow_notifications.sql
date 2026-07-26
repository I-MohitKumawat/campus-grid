-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 009_organizer_workflow_notifications.sql
-- Description: Add notifications table, decision notes on registrations, and completed/archived flags.
-- Depends on: 005_clubs_events.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. In-App Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'event_update', 'registration_status'
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 2. Application Decision Metadata on event_registrations
ALTER TABLE event_registrations
ADD COLUMN IF NOT EXISTS decision_notes TEXT,
ADD COLUMN IF NOT EXISTS decision_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;

-- 3. Event Completion & Archival Timestamps on events
ALTER TABLE events
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
