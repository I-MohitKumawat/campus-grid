-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 001_enums.sql
-- Description: Create all PostgreSQL ENUM types used across the schema.
-- Must run BEFORE any table creation migration.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM
  ('student','club_lead','faculty','alumni','admin');

CREATE TYPE skill_verification_type AS ENUM
  ('verified_oauth','quiz_passed','peer_endorsed','self_declared');

CREATE TYPE timeline_entry_type AS ENUM
  ('event_attendance','learning_path','club_join','quiz_pass',
   'skill_verified','certificate','leaderboard_rank',
   'internship','education','certification','volunteer','other');

CREATE TYPE post_category AS ENUM
  ('hackathon','project','internship','event','opportunity');

CREATE TYPE post_status AS ENUM
  ('pending','published','rejected','hidden','expired');

CREATE TYPE event_status AS ENUM
  ('draft','pending_faculty','pending_admin','published','completed','cancelled');

CREATE TYPE event_type AS ENUM
  ('hackathon','fest','national_holiday','seminar','workshop',
   'meetup','internal_meeting','other');

CREATE TYPE event_visibility AS ENUM
  ('public','internal');

CREATE TYPE reg_status AS ENUM
  ('registered','attended','waitlisted','cancelled');

CREATE TYPE certificate_type AS ENUM
  ('participation','winner','runner_up','organiser','speaker','mentor');

CREATE TYPE club_status AS ENUM
  ('pending','approved','rejected','suspended');

CREATE TYPE xp_category AS ENUM
  ('reward','bonus','admin_adjustment');

CREATE TYPE score_category AS ENUM
  ('reward','penalty','refund','admin_adjustment');

CREATE TYPE project_status AS ENUM
  ('building','completed','inactive','archived');

CREATE TYPE project_verification_status AS ENUM
  ('unverified','github_verified','admin_verified','featured');

CREATE TYPE project_member_role AS ENUM
  ('owner','lead','frontend','backend','designer','ml_engineer','member');

CREATE TYPE marketplace_condition AS ENUM
  ('new','good','fair','poor');

CREATE TYPE marketplace_category AS ENUM
  ('equipment','textbook','notes','stationery','electronics','other');

CREATE TYPE path_status AS ENUM
  ('draft','published','archived');
