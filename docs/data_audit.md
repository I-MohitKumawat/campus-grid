# CampusGrid Data & Live Integration Audit

**Date:** August 16, 2026  
**Auditor:** Antigravity AI  
**Scope:** PostgreSQL Database Records, API Endpoints, Frontend Integration, and Visibility State Machine.

---

## 1. Database Records Audit

| Record / Table | ID / Identifier | Source & Classification | Dependent Records | Recommended Action |
| :--- | :--- | :--- | :--- | :--- |
| `clubs` | `e67b5791-94dd-4fae-952e-f42a891a0a0f` (`ieee`) | Old demo seed data | 2 events, memberships | **Delete safely** (cascade events/memberships) |
| `clubs` | `342d524e-0d73-4998-a156-788bb83af779` (`robotics-club`) | Old demo seed data | 1 event, memberships | **Delete safely** (cascade events/memberships) |
| `clubs` | `0f0f84a7-1c17-49fb-b0a7-f0b2cd1357f2` (`photography-club`) | Old demo seed data | 1 event, memberships | **Delete safely** (cascade events/memberships) |
| `clubs` | `9618f5cf-3a8a-4ffd-9119-046ef7d136d1` (`coding-club`) | Old demo seed data | 1 event, memberships | **Delete safely** (cascade events/memberships) |
| `clubs` | `b74e1bde-adf8-4798-a824-2f56a58ce024` (`campusgrid-security-test-club`) | Ephemeral test fixture | 1 event, memberships | **Delete safely** |
| `clubs` | `c74ffb4d-7ee0-4aeb-b3fb-f08b748d7ddf` (`campusgrid-security-test-club-b`) | Ephemeral test fixture | 1 event, memberships | **Delete safely** |
| `events` | `a07662e3-1f87-4124-b6a0-ca13cdbc74a8` (Annual Campus Hackathon 2026) | Old demo seed data | registrations, certs | **Delete safely** |
| `events` | `1a996dee-4174-4411-a576-3b2998a11ef0` (Autonomous Rover Challenge) | Old demo seed data | registrations, certs | **Delete safely** |
| `events` | `bad57fe3-f7eb-485c-b9f9-e49d82d9274e` (AI & ML Hands-on Bootcamp) | Old demo seed data | registrations | **Delete safely** |
| `events` | `94bcb683-3883-437b-b334-b7f7241011d2` (Web3 & Decentralized Systems) | Old demo seed data | registrations, certs | **Delete safely** |
| `events` | `516fe7de-164a-4a1e-8e05-072b76ad8f3d` (Legacy Tech Expo 2025) | Old demo seed data | registrations | **Delete safely** |
| `events` | `85bc9fff-a705-4909-a9ac-1ef2a3e1ae23` (CampusGrid Auth Test Event) | Ephemeral test fixture | registrations | **Delete safely** |
| `events` | `defa474e-7b9d-4b91-b196-067e05854473` (Cross Club Test Event) | Ephemeral test fixture | registrations | **Delete safely** |
| `event_registrations` | 16 stale records | Old test / seed data | certificates | **Delete safely** |
| `certificates` | 8 stale records | Old test / seed data | None | **Delete safely** |
| `club_memberships` | 15 stale records | Old test / seed data | None | **Delete safely** |
| `users` | 11 accounts (`admin`, `robotics_lead`, `ieee_lead`, 8 students) | Core dev authentication accounts | Profiles | **PRESERVE ALL 11 USERS** |

---

## 2. Root Cause of Club Visibility Discrepancy

When an Admin created a club via `POST /api/v1/admin/clubs`, the `verification_status` column in `clubs` defaulted to `'pending'`.
Public student club discovery (`GET /api/v1/clubs` -> `listApprovedClubs`) filters strictly for `verification_status = 'approved'`.
Therefore, newly Admin-created clubs were hidden from student views until explicitly set to `'approved'`.

**Fix:** Updated `createClubAdmin` in [`lib/services/admin.service.ts`](file:///home/mohitkumawat/dev/campus-grid/lib/services/admin.service.ts) to explicitly insert `verification_status = 'approved'`.
