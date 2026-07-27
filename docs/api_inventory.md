# CampusGrid API Inventory & TDD Comparison

This document serves as the single technical reference for every implemented API endpoint in CampusGrid, along with a TDD (Technical Design Document) compliance comparison.

---

## 1. Complete API Catalog

### Authentication & Session Domain

#### `POST /api/v1/auth/session`
- **Purpose:** Exchanges a Firebase token (or dev token) for a platform JWT stored in HTTP-only `cg_token` cookie.
- **Auth Required:** No (Public).
- **Authorized Roles:** All.
- **Request Body:** `{ "id_token": string }`
- **Query Params:** None.
- **Response:** `{ success: true, data: { id, email, username, role, is_onboarded, avatar_url } }`
- **Errors:** 401 Unauthorized (`UNAUTHORIZED`), 500 Internal Error.
- **Database Tables Used:** `users`, `profiles`.
- **Frontend Pages Using It:** `/sign-in`, `/sign-up`, AuthProvider.
- **Status:** **Implemented & Verified**.

#### `GET /api/v1/auth/session`
- **Purpose:** Fetches active authenticated user details from JWT cookie session.
- **Auth Required:** Yes.
- **Authorized Roles:** All authenticated users.
- **Request Body:** None.
- **Query Params:** None.
- **Response:** `{ success: true, data: { id, email, username, role, is_onboarded, full_name, avatar_url } }`
- **Errors:** 401 Unauthorized.
- **Database Tables Used:** `users`, `profiles`.
- **Frontend Pages Using It:** `DashboardNavbar`, `AuthProvider`.
- **Status:** **Implemented & Verified**.

#### `DELETE /api/v1/auth/session`
- **Purpose:** Clears session cookie and logs user out.
- **Auth Required:** Yes.
- **Authorized Roles:** All.
- **Response:** `{ success: true, message: "Logged out" }`
- **Status:** **Implemented & Verified**.

---

### Student Identity & User Domain

#### `GET /api/v1/users/me`
- **Purpose:** Fetches canonical student digital identity (institutional read-only record, personal bio, social links, joined clubs, verified timeline, system certificates).
- **Auth Required:** Yes.
- **Authorized Roles:** All authenticated users.
- **Response:** `{ success: true, data: { user, profile, institutionalInfo, organizations, timeline, certificates } }`
- **Database Tables Used:** `users`, `profiles`, `club_memberships`, `event_registrations`, `certificates`.
- **Frontend Pages Using It:** `/dashboard/profile`.
- **Status:** **Implemented & Verified**.

#### `PATCH /api/v1/users/me`
- **Purpose:** Updates allowed personal profile fields (avatar image Base64/URL, bio, interests, GitHub, LinkedIn, Portfolio, LeetCode).
- **Auth Required:** Yes.
- **Authorized Roles:** Student, Club Lead, Faculty, Admin.
- **Request Body:** `{ avatar_url?, bio?, interests?, github_url?, linkedin_url?, website_url?, leetcode_url? }`
- **Status:** **Implemented & Verified**.

---

### Club & Organization Domain

#### `GET /api/v1/clubs`
- **Purpose:** Lists active campus clubs with optional search and category filters.
- **Auth Required:** Yes.
- **Response:** `{ success: true, data: Array<Club> }`
- **Database Tables Used:** `clubs`, `club_memberships`.
- **Frontend Pages Using It:** `/dashboard/clubs`.
- **Status:** **Implemented & Verified**.

#### `GET /api/v1/clubs/[slug]`
- **Purpose:** Fetches single club details by URL slug.
- **Auth Required:** Yes.
- **Status:** **Implemented & Verified**.

#### `POST /api/v1/clubs/register`
- **Purpose:** Student requests membership in a campus club.
- **Auth Required:** Yes.
- **Authorized Roles:** Student.
- **Request Body:** `{ "club_id": string }`
- **Status:** **Implemented & Verified**.

---

### Events & Attendance Domain

#### `GET /api/v1/events`
- **Purpose:** Browse published events for students with category and date filtering.
- **Auth Required:** Yes.
- **Response:** `{ success: true, data: Array<Event> }`
- **Database Tables Used:** `events`, `clubs`.
- **Frontend Pages Using It:** `/dashboard/events`.
- **Status:** **Implemented & Verified**.

#### `GET /api/v1/events/[id]`
- **Purpose:** Fetch detailed event page for registration and agenda inspection.
- **Auth Required:** Yes.
- **Status:** **Implemented & Verified**.

#### `POST /api/v1/events/[id]/register`
- **Purpose:** Register student for an event seat pass.
- **Auth Required:** Yes.
- **Authorized Roles:** Student.
- **Response:** `{ success: true, data: { registration_id, pass_code, qr_code_token } }`
- **Database Tables Used:** `event_registrations`, `events`.
- **Status:** **Implemented & Verified**.

#### `POST /api/v1/events/[id]/attendance`
- **Purpose:** QR code attendance check-in on event day.
- **Auth Required:** Yes.
- **Authorized Roles:** Event Organizer, Club Lead, Admin.
- **Request Body:** `{ "qr_code_token": string }`
- **Status:** **Implemented & Verified**.

---

### Certificate & Credential Domain

#### `GET /api/v1/certificates/verify/[token]`
- **Purpose:** Public endpoint verifying certificate validity by token.
- **Auth Required:** No (Public).
- **Response:** `{ success: true, data: { certificate_title, recipient_name, event_title, issued_at } }`
- **Status:** **Implemented & Verified**.

---

### Admin Operations Domain

#### `GET /api/v1/admin/stats`
- **Purpose:** Operational metrics overview for platform administrators.
- **Auth Required:** Yes.
- **Authorized Roles:** Admin.
- **Status:** **Implemented & Verified**.

#### `GET /api/v1/admin/clubs` & `POST /api/v1/admin/clubs`
- **Purpose:** List all clubs or create a new club & assign official Club Lead.
- **Auth Required:** Yes.
- **Authorized Roles:** Admin.
- **Status:** **Implemented & Verified**.

#### `PATCH /api/v1/admin/clubs/[id]` & `DELETE /api/v1/admin/clubs/[id]`
- **Purpose:** Update club details / assign lead or archive a club.
- **Auth Required:** Yes.
- **Authorized Roles:** Admin.
- **Status:** **Implemented & Verified**.

#### `GET /api/v1/admin/events` & `PATCH /api/v1/admin/events/[id]`
- **Purpose:** Audit events, change status (publish, unpublish, cancel, complete, archive).
- **Auth Required:** Yes.
- **Authorized Roles:** Admin.
- **Status:** **Implemented & Verified**.

#### `GET /api/v1/admin/users` & `PATCH /api/v1/admin/users/[id]`
- **Purpose:** Lookup users and assign platform roles (`Student`, `Club Lead`, `Faculty`, `Admin`).
- **Auth Required:** Yes.
- **Authorized Roles:** Admin.
- **Status:** **Implemented & Verified**.

#### `GET /api/v1/admin/certificates`
- **Purpose:** View issued credentials across the platform.
- **Auth Required:** Yes.
- **Authorized Roles:** Admin.
- **Status:** **Implemented & Verified**.

---

## 2. Technical Design Document (TDD) Comparison

| Endpoint | Status | Priority | Notes / Dependent Module |
| :--- | :---: | :---: | :--- |
| `POST /api/v1/auth/session` | **Implemented** | Core | Production ready |
| `GET /api/v1/auth/session` | **Implemented** | Core | Production ready |
| `GET /api/v1/users/me` | **Implemented** | Core | Canonical identity system |
| `PATCH /api/v1/users/me` | **Implemented** | Core | Persists to PostgreSQL |
| `GET /api/v1/clubs` | **Implemented** | Core | Production ready |
| `POST /api/v1/clubs/register` | **Implemented** | Core | Student club join flow |
| `GET /api/v1/events` | **Implemented** | Core | Production ready |
| `POST /api/v1/events/[id]/register` | **Implemented** | Core | Seat pass generation |
| `POST /api/v1/events/[id]/attendance` | **Implemented** | Core | QR code scanner check-in |
| `GET /api/v1/certificates/verify/[token]` | **Implemented** | Core | Public credential verification |
| `GET /api/v1/admin/*` | **Implemented** | Core | Operations console |
| `POST /api/v1/projects` | **Planned** | Phase 7 | Student Projects module |
| `GET /api/v1/leaderboard` | **Planned** | Phase 8 | Institutional Leaderboards |
