# CampusGrid Database Schema & Entity Relationships

This document details the PostgreSQL relational database schema, tables, constraints, indexes, foreign keys, and ER-style relationship hierarchy for CampusGrid.

---

## 1. Entity-Relationship (ER) Diagram & Hierarchy

```
                      ┌───────────────────┐
                      │       users       │
                      └─────────┬─────────┘
                                │ 1:1
                      ┌─────────┴─────────┐
                      │     profiles      │
                      └───────────────────┘
                                │ 1:N
                      ┌─────────┴─────────┐
                      │      skills       │
                      └───────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │ 1:N                   │ 1:N                   │ 1:N
┌───────┴──────────┐   ┌────────┴──────────┐   ┌────────┴──────────┐
│ club_memberships │   │event_registrations│   │   certificates    │
└───────┬──────────┘   └────────┬──────────┘   └────────┬──────────┘
        │ N:1                   │ N:1                   │ N:1
┌───────┴──────────┐   ┌────────┴──────────┐            │
│      clubs       │───│      events       │────────────┘
└──────────────────┘1:N└───────────────────┘
```

---

## 2. Table Definitions

### 1. `users`
Core authentication and platform identity table.
- **Primary Key:** `id` (UUID, `gen_random_uuid()`)
- **Columns:**
  - `email` (TEXT, UNIQUE, NOT NULL)
  - `username` (VARCHAR(30), UNIQUE, NOT NULL)
  - `profile_slug` (VARCHAR(30), UNIQUE, NOT NULL)
  - `role` (user_role ENUM: `'student'`, `'club_lead'`, `'faculty'`, `'admin'`)
  - `firebase_uid` (TEXT, UNIQUE, NOT NULL)
  - `avatar_url` (TEXT)
  - `is_onboarded` (BOOLEAN, DEFAULT FALSE)
  - `onboarding_step` (SMALLINT, DEFAULT 1)
  - `xp` (INT, DEFAULT 0)
  - `campus_score` (INT, DEFAULT 0)
  - `created_at` (TIMESTAMPTZ, DEFAULT now())
  - `updated_at` (TIMESTAMPTZ, DEFAULT now())
  - `deleted_at` (TIMESTAMPTZ, NULLABLE)
- **Indexes:** `idx_users_email`, `idx_users_firebase_uid`, `idx_users_role`.

### 2. `profiles`
Institutional details and editable student identity attributes.
- **Primary Key:** `id` (UUID, `gen_random_uuid()`)
- **Foreign Keys:** `user_id` $\rightarrow$ `users(id)` ON DELETE CASCADE (UNIQUE, NOT NULL)
- **Columns:**
  - `full_name` (TEXT, NOT NULL)
  - `roll_number` (TEXT — USN / College Roll Number)
  - `department` (TEXT — Engineering / Academic Dept)
  - `year` (SMALLINT, CHECK `year BETWEEN 1 AND 4`)
  - `bio` (VARCHAR(300))
  - `github_url` (TEXT)
  - `linkedin_url` (TEXT)
  - `website_url` (TEXT)
  - `leetcode_url` (TEXT)
  - `interests` (TEXT[])
  - `pinned_highlights` (TEXT[])
  - `created_at` (TIMESTAMPTZ, DEFAULT now())
  - `updated_at` (TIMESTAMPTZ, DEFAULT now())
- **Indexes:** `idx_profiles_user_id`, `idx_profiles_department`.

### 3. `clubs`
Official student organizations and campus societies.
- **Primary Key:** `id` (UUID, `gen_random_uuid()`)
- **Columns:**
  - `name` (TEXT, NOT NULL)
  - `slug` (VARCHAR(50), UNIQUE, NOT NULL)
  - `category` (TEXT, DEFAULT 'General')
  - `description` (TEXT)
  - `logo_url` (TEXT)
  - `is_active` (BOOLEAN, DEFAULT TRUE)
  - `created_at` (TIMESTAMPTZ, DEFAULT now())
  - `updated_at` (TIMESTAMPTZ, DEFAULT now())
  - `deleted_at` (TIMESTAMPTZ, NULLABLE)
- **Indexes:** `idx_clubs_slug`, `idx_clubs_category`.

### 4. `club_memberships`
Junction table linking students to clubs.
- **Primary Key:** `id` (UUID, `gen_random_uuid()`)
- **Foreign Keys:**
  - `club_id` $\rightarrow$ `clubs(id)` ON DELETE CASCADE
  - `user_id` $\rightarrow$ `users(id)` ON DELETE CASCADE
- **Columns:**
  - `role` (VARCHAR(30), DEFAULT 'member') — `'member'`, `'lead'`, `'core'`
  - `status` (VARCHAR(30), DEFAULT 'active') — `'active'`, `'pending'`, `'inactive'`
  - `created_at` (TIMESTAMPTZ, DEFAULT now())
- **Constraints:** `UNIQUE(club_id, user_id)`

### 5. `events`
Campus events, workshops, hackathons, and seminars.
- **Primary Key:** `id` (UUID, `gen_random_uuid()`)
- **Foreign Keys:**
  - `club_id` $\rightarrow$ `clubs(id)` ON DELETE SET NULL
  - `created_by` $\rightarrow$ `users(id)` ON DELETE SET NULL
- **Columns:**
  - `title` (TEXT, NOT NULL)
  - `description` (TEXT)
  - `event_type` (VARCHAR(50), DEFAULT 'workshop')
  - `status` (event_status ENUM: `'draft'`, `'submitted'`, `'pending_approval'`, `'published'`, `'cancelled'`, `'completed'`, `'archived'`)
  - `venue` (TEXT)
  - `capacity` (INT, DEFAULT 100)
  - `start_time` (TIMESTAMPTZ, NOT NULL)
  - `end_time` (TIMESTAMPTZ, NOT NULL)
  - `published_at` (TIMESTAMPTZ)
  - `created_at` (TIMESTAMPTZ, DEFAULT now())
  - `updated_at` (TIMESTAMPTZ, DEFAULT now())
  - `deleted_at` (TIMESTAMPTZ, NULLABLE)
- **Indexes:** `idx_events_status`, `idx_events_club_id`, `idx_events_start_time`.

### 6. `event_registrations`
Student event seat reservations & QR attendance passes.
- **Primary Key:** `id` (UUID, `gen_random_uuid()`)
- **Foreign Keys:**
  - `event_id` $\rightarrow$ `events(id)` ON DELETE CASCADE
  - `user_id` $\rightarrow$ `users(id)` ON DELETE CASCADE
- **Columns:**
  - `status` (registration_status ENUM: `'registered'`, `'attended'`, `'cancelled'`, `'pending'`)
  - `pass_code` (VARCHAR(50), UNIQUE, NOT NULL)
  - `qr_code_token` (TEXT, UNIQUE, NOT NULL)
  - `attended_at` (TIMESTAMPTZ)
  - `created_at` (TIMESTAMPTZ, DEFAULT now())
- **Constraints:** `UNIQUE(event_id, user_id)`

### 7. `certificates`
System-issued digital certificates of participation/achievement.
- **Primary Key:** `id` (UUID, `gen_random_uuid()`)
- **Foreign Keys:**
  - `user_id` $\rightarrow$ `users(id)` ON DELETE CASCADE
  - `event_id` $\rightarrow$ `events(id)` ON DELETE CASCADE
- **Columns:**
  - `title` (TEXT, NOT NULL)
  - `verification_token` (TEXT, UNIQUE, NOT NULL)
  - `issued_at` (TIMESTAMPTZ, DEFAULT now())
- **Indexes:** `idx_certificates_verification_token`.

### 8. `notifications`
In-app notifications for event updates and status changes.
- **Primary Key:** `id` (UUID, `gen_random_uuid()`)
- **Foreign Keys:** `user_id` $\rightarrow$ `users(id)` ON DELETE CASCADE
- **Columns:**
  - `title` (TEXT, NOT NULL)
  - `message` (TEXT, NOT NULL)
  - `is_read` (BOOLEAN, DEFAULT FALSE)
  - `created_at` (TIMESTAMPTZ, DEFAULT now())
