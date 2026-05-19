# CampusGrid Backend — Implementation Documentation

> **Version:** 1.0 · **Date:** May 2026  
> **Systems Implemented:** Authentication · Club System · Event System

---

## 1. What Was Implemented

This document describes the backend systems implemented for CampusGrid as specified in the Technical Design Document (TDD). Three core systems are fully implemented:

### 1.1 Authentication System
- **Clerk → Platform JWT flow**: Frontend authenticates via Clerk (Google OAuth), then calls `POST /api/v1/auth/session` with the Clerk session token. The backend verifies the token, upserts the user in PostgreSQL, and returns a platform-native HS256 JWT stored in an HTTP-only cookie (`cg_token`).
- **Email domain enforcement**: On first sign-in, the user's email domain is checked against the `allowed_email_domains` config in the DB (cached in Redis for 5 minutes).
- **Onboarding wizard**: `POST /api/v1/auth/onboarding` completes the user profile on first login (username, year, department, interests, bio). Only callable once — throws 409 on repeat calls.
- **Session invalidation**: `DELETE /api/v1/auth/session` clears the cookie.

### 1.2 Club System
- Full club registration, approval/rejection workflow
- Member management (invite by username, update role/posting_access, remove)
- Faculty advisor assignment (admin or club lead)
- Public club listing and club page data

### 1.3 Event System
- Full TDD-specified state machine: `draft → pending_faculty → pending_admin → published → completed`
- Faculty approve/reject, admin approve/reject
- Internal events publish directly (no approval)
- Faculty-led events skip the faculty step (go to pending_admin)
- Event registration with waitlist support when capacity is reached
- QR token generation on registration
- Attendance marking (single or bulk, by user_id or qr_token)
- Certificate verification by token

---

## 2. Architecture Decisions

### 2.1 Platform-native JWT (not Clerk JWT)
The backend issues its own HS256 JWT rather than relying on Clerk JWTs for every API call. This:
- Decouples the backend from Clerk entirely — only `/auth/session` touches Clerk
- Allows future auth provider swaps without touching any route handler
- Keeps the JWT payload minimal: `{ sub, role, clerk_id, iat, exp }`
- Role is embedded in the JWT (no per-request DB lookup for role checks)

### 2.2 Higher-Order Function Middleware (withAuth / withValidation)
Instead of Express-style middleware, Next.js 16 Route Handlers are wrapped with composable HOFs:
- `withAuth(handler, roles?)` — verifies JWT, enforces role
- `withValidation(schema, handler)` — Zod body validation
- Both return 422/401/403 Response objects with the standardised `{ success, error, code }` shape

### 2.3 Service Layer Isolation
All SQL lives in `lib/services/`. Route handlers are thin — they parse/validate input, call one service function, and return the response. This enforces:
- Single responsibility per file
- Easy unit testing of business logic without HTTP
- Clear audit trail for all DB mutations

### 2.4 Typed Error Classes
`lib/errors.ts` defines `AppError` subclasses for each HTTP status code. Any `throw new ForbiddenError(...)` in a service is caught by the HOF wrapper and converted to the correct HTTP response. No ad-hoc status code strings scattered across the codebase.

### 2.5 Append-Only XP/Score Logs
XP and Campus Score are tracked in separate append-only tables (`xp_log`, `score_log`). The running totals on `users.xp` and `users.campus_score` are denormalised for fast leaderboard queries. Both the log insert and the `users` UPDATE happen in one DB transaction (idempotency key: `user_id + action_type + source_ref`).

### 2.6 State Machine in Service Layer
The event status machine (`submitEventForApproval`, `facultyApproveEvent`, etc.) validates the current status before any transition. No invalid transition can be made by calling a route directly — the service throws `ValidationError` if the precondition is not met. This is enforced in `lib/services/event.service.ts`, not in route handlers.

---

## 3. Folder Structure

```
campus-grid/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── auth/
│   │       │   ├── session/route.ts          POST: exchange Clerk token → JWT cookie
│   │       │   │                             DELETE: clear session cookie
│   │       │   └── onboarding/route.ts       POST: complete onboarding wizard
│   │       ├── clubs/
│   │       │   ├── route.ts                  GET: list approved clubs
│   │       │   ├── me/route.ts               GET: own club (club_lead)
│   │       │   ├── register/
│   │       │   │   ├── route.ts              POST: submit club registration
│   │       │   │   └── [id]/route.ts         PATCH: admin approve/reject
│   │       │   └── [slug]/
│   │       │       ├── route.ts              GET: public club page | PATCH: update club
│   │       │       ├── members/
│   │       │       │   ├── route.ts          GET: member roster
│   │       │       │   ├── invite/route.ts   POST: invite by username
│   │       │       │   └── [uid]/route.ts    PATCH: update role | DELETE: remove
│   │       │       └── faculty/route.ts      POST: assign faculty advisor
│   │       ├── events/
│   │       │   ├── route.ts                  GET: upcoming events | POST: create
│   │       │   ├── past/route.ts             GET: past events (offset pagination)
│   │       │   └── [id]/
│   │       │       ├── route.ts              GET: detail | PATCH: update | DELETE: admin delete
│   │       │       ├── submit/route.ts        POST: submit for approval
│   │       │       ├── faculty-approve/       POST: faculty approves
│   │       │       ├── faculty-reject/        POST: faculty rejects with note
│   │       │       ├── admin-approve/         POST: admin approves → published
│   │       │       ├── admin-reject/          POST: admin rejects with note
│   │       │       ├── register/route.ts      POST: register | DELETE: cancel
│   │       │       ├── registrations/route.ts GET: attendee roster (club_lead/admin)
│   │       │       └── attendance/
│   │       │           ├── route.ts           POST: mark single attendance
│   │       │           └── bulk/route.ts      POST: bulk mark attendance
│   │       └── certificates/
│   │           └── verify/[token]/route.ts   GET: public certificate verification
│   ├── layout.tsx                            Root layout with ClerkProvider
│   ├── page.tsx                              Root redirect (→ /dashboard or /sign-in)
│   └── globals.css                           Global styles with brand tokens
│
├── lib/
│   ├── db/
│   │   ├── client.ts                         PostgreSQL Pool singleton + query helpers
│   │   ├── migrate.ts                        Migration runner (npm run db:migrate)
│   │   └── migrations/
│   │       ├── 001_enums.sql                 All PostgreSQL ENUM types
│   │       ├── 002_core_tables.sql            users + profiles + updated_at trigger
│   │       ├── 003_skills_projects_timeline.sql
│   │       ├── 004_xp_score_logs.sql         Append-only audit tables
│   │       ├── 005_clubs_events.sql           Clubs, events, registrations, certificates
│   │       ├── 006_board_marketplace.sql      Board posts, marketplace, auto-hide trigger
│   │       └── 007_learning_rag.sql           Learning paths, pgvector RAG, platform_config
│   │
│   ├── middleware/
│   │   ├── with-auth.ts                      JWT auth HOF wrapper
│   │   └── with-validation.ts                Zod body validation HOF + parseQuery helper
│   │
│   ├── schemas/
│   │   ├── auth.schemas.ts                   Zod schemas for auth endpoints
│   │   ├── club.schemas.ts                   Zod schemas for club endpoints
│   │   └── event.schemas.ts                  Zod schemas for event endpoints
│   │
│   ├── services/
│   │   ├── auth.service.ts                   Clerk token verification, user upsert, onboarding
│   │   ├── club.service.ts                   Club CRUD, membership, faculty advisors
│   │   └── event.service.ts                  Event state machine, registration, attendance
│   │
│   ├── errors.ts                             Typed AppError subclasses (401/403/404/409/422/429)
│   ├── jwt.ts                                JWT sign/verify + cookie builders
│   ├── redis.ts                              ioredis singleton + getJson/setJson/getConfig
│   └── response.ts                           successResponse / errorResponse factories
│
├── .env.example                              Environment variable template (safe to commit)
├── .gitignore                                Comprehensive ignore list for full stack
├── next.config.ts                            Cloudinary/Clerk image domains + security headers
└── package.json                              + db:migrate script + tsx dev dep
```

---

## 4. Purpose of Each Important File

| File | Purpose |
|------|---------|
| `lib/db/client.ts` | Singleton `pg.Pool` shared across all route handlers. Provides `query()` and `withTransaction()`. Prevents connection exhaustion during hot-reload. |
| `lib/db/migrate.ts` | CLI script that reads `migrations/*.sql` in filename order, tracks applied files in `schema_migrations`, runs each in a transaction. |
| `lib/errors.ts` | All application errors extend `AppError(message, statusCode, code)`. HOFs catch these and return the right HTTP status automatically. |
| `lib/jwt.ts` | HS256 JWT sign/verify with a 7-day expiry. `extractToken()` reads from cookie first, then Bearer header. `buildSessionCookie()` sets HttpOnly/Secure/SameSite. |
| `lib/redis.ts` | ioredis singleton with `getJson/setJson` helpers and `getConfig()` — reads platform_config from DB with a 5-minute Redis cache. |
| `lib/response.ts` | `successResponse(data, status, meta)` and `errorResponse(message, status, code)` enforce the `{ success, data, error, code, meta }` envelope on every response. |
| `lib/middleware/with-auth.ts` | `withAuth(handler, roles?)` verifies the JWT, checks role, calls the handler. No DB call — role comes from the JWT payload. |
| `lib/middleware/with-validation.ts` | `withValidation(schema, handler)` parses the JSON body, runs Zod, returns 422 with field errors on failure. `parseQuery()` for query param validation. |
| `lib/services/auth.service.ts` | Calls Clerk SDK to verify the token and get user details. Enforces email domain. Creates `users` + `profiles` rows on first sign-in (one transaction). |
| `lib/services/club.service.ts` | All club SQL. `registerClub()` creates club + auto-adds lead as a `lead` member. `processClubRegistration()` handles admin approve/reject. |
| `lib/services/event.service.ts` | Full state machine. `submitEventForApproval()` decides the next status based on `visibility`, `organiser_type`, and whether a faculty advisor exists. |

---

## 5. Request Flow

### Authenticated Route (example: POST /api/v1/events)

```
Browser
  → POST /api/v1/events (Authorization: Bearer <cg_token> OR cookie)
    → app/api/v1/events/route.ts
      → withAuth(handler, ['club_lead', 'faculty', 'admin'])
        → lib/jwt.ts: extractToken(req) — reads cg_token cookie or Bearer header
        → lib/jwt.ts: verifyToken(token) — HS256 verify, returns JwtPayload
        → role check: user.role ∈ ['club_lead', 'faculty', 'admin']
        → handler(req, ctx, user) called with verified JwtPayload
          → EventCreateSchema.safeParse(body) — Zod validation
          → lib/services/event.service.ts: createEvent(user.sub, user.role, data)
            → lib/db/client.ts: query() — parametrised INSERT
            → returns event row
          → lib/response.ts: successResponse(event, 201)
    ← 201 { success: true, data: { ...event } }
```

### Public Route (example: GET /api/v1/events)

```
Browser
  → GET /api/v1/events?limit=20
    → app/api/v1/events/route.ts: GET()
      → lib/services/event.service.ts: listUpcomingEvents(limit, cursor)
        → lib/db/client.ts: query() — SELECT published events
        → returns { events, hasMore, cursor }
      → lib/response.ts: successResponse(events, 200, { hasMore, cursor })
    ← 200 { success: true, data: [...], meta: { hasMore, cursor } }
```

### Auth Session Creation

```
Browser (post-Clerk OAuth)
  → POST /api/v1/auth/session { clerk_token: "..." }
    → withValidation(SessionCreateSchema, handler)
      → Zod validates body
      → lib/services/auth.service.ts: verifyClerkTokenAndUpsertUser(clerk_token)
        → clerkClient().verifyToken(clerk_token) — Clerk SDK call
        → clerkClient().users.getUser(clerkId) — fetch email + avatar
        → getConfig('allowed_email_domains') — from Redis (5min cache) or DB
        → domain check against allowed list
        → SELECT user by clerk_user_id
        → if not found: withTransaction → INSERT users + INSERT profiles
        → UPDATE last_login_at
        → return PlatformUser
      → lib/jwt.ts: signToken({ sub, role, clerk_id }) — 7-day HS256 JWT
      → lib/jwt.ts: buildSessionCookie(token) — HttpOnly; SameSite=Lax; Secure (prod)
    ← 200 + Set-Cookie: cg_token=... + { success: true, data: { ...user } }
```

---

## 6. Database Relationships

```
users (1) ──────── (1) profiles
users (1) ──────── (*) skills             via profiles.id
users (1) ──────── (*) projects           (created_by)
users (1) ──────── (*) project_members
users (1) ──────── (*) timeline_entries   via profiles.id
users (1) ──────── (*) xp_log
users (1) ──────── (*) score_log
users (1) ──────── (*) club_memberships
users (1) ──────── (*) clubs              (lead_user_id)
clubs (1) ──────── (*) club_memberships
clubs (1) ──────── (*) club_faculty_advisors
clubs (1) ──────── (*) events             (club_id, nullable)
events (1) ─────── (*) event_registrations
event_registrations (1) ── (1) certificates
board_posts (1) ── (*) post_comments
board_posts (1) ── (*) post_reports
marketplace_listings (1) ── (*) listing_reports
learning_paths (1) ── (*) path_milestones
users (1) ──────── (*) path_enrollments
users (1) ──────── (*) path_progress      via path_milestones.id
users (1) ──────── (*) quiz_attempts
platform_config       — key/value admin config (no FK)
rag_resources         — pgvector embeddings (no FK)
```

All FKs use `ON DELETE CASCADE` unless explicitly noted otherwise.
All user-facing tables have `deleted_at TIMESTAMPTZ` for soft deletes.

---

## 7. How The Systems Work Internally

### Authentication
1. Clerk handles all OAuth flows (Google sign-in, redirect, session)
2. Frontend calls `POST /api/v1/auth/session` with the Clerk token immediately after sign-in
3. Backend verifies with Clerk SDK → gets user email + Clerk ID
4. Email domain is checked against `platform_config.allowed_email_domains` (DB-driven, no redeployment needed to change)
5. User is looked up by `clerk_user_id`. First-time users get `users` + `profiles` rows created in one transaction
6. Backend issues its own HS256 JWT (7-day TTL) — all subsequent API calls use this JWT
7. The JWT payload contains `{ sub (platform UUID), role, clerk_id }` — no tier, no score
8. On next page load, frontend reads the cookie; no extra Clerk call needed

### Club System
1. Any user submits `POST /api/v1/clubs/register` → `verification_status = 'pending'`
2. Lead is auto-added as a `lead` member with `posting_access = TRUE`
3. Admin reviews via `PATCH /api/v1/clubs/register/:id` → approves or rejects
4. Club lead can: update the club page, invite members, change member roles/access, remove members, assign faculty advisors
5. `posting_access = TRUE` on a `club_memberships` row is the gate for creating events under a club
6. `member_count` is kept in sync via transactional increments/decrements (not a COUNT query on read)

### Event System
1. Organiser creates event in `draft` status
2. Organiser calls `POST /events/:id/submit` — service determines next status:
   - `visibility = 'internal'` → `published` (no approval)
   - `organiser_type = 'faculty' | 'admin'` → `pending_admin`
   - `organiser_type = 'club'` with faculty advisor → `pending_faculty`
   - `organiser_type = 'club'` without faculty advisor → `pending_admin`
3. Faculty advisor approves → `pending_admin`; or rejects → `draft`
4. Admin approves → `published`; or rejects → `draft`
5. Students register via `POST /events/:id/register` — get a unique `qr_token`
6. At the event, organiser uses `POST /events/:id/attendance` (by user_id or qr_token)
7. Post-event: a BullMQ job (not yet wired, architecture is ready) awards XP/Score and inserts timeline entries
8. Certificates are verified publicly via `GET /api/v1/certificates/verify/:token`

---

## 8. Environment Setup

### Required Variables (.env.local)

```bash
# PostgreSQL (Neon DB recommended)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Clerk (from Clerk Dashboard → API Keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# JWT (generate: openssl rand -base64 64)
JWT_SECRET=your-secret-min-64-chars

# Redis (local: redis://localhost:6379 | Upstash: rediss://...)
REDIS_URL=redis://localhost:6379

# Optional (for full feature set)
CLOUDINARY_CLOUD_NAME=...
RESEND_API_KEY=re_...
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

### Running Migrations

```bash
# Ensure DATABASE_URL is set in .env.local, then:
npm run db:migrate
```

This runs `lib/db/migrate.ts` which applies all SQL files in `lib/db/migrations/` in order.

### Development Server

```bash
npm run dev
```

---

## 9. API Endpoints Implemented

### Authentication
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/session` | Public | Exchange Clerk token for platform JWT cookie |
| DELETE | `/api/v1/auth/session` | User | Clear session cookie |
| POST | `/api/v1/auth/onboarding` | User | Complete onboarding wizard |

### Clubs
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/clubs` | Public | List approved clubs |
| POST | `/api/v1/clubs/register` | User | Submit club registration |
| PATCH | `/api/v1/clubs/register/:id` | Admin | Approve or reject registration |
| GET | `/api/v1/clubs/me` | ClubLead | Own club details |
| GET | `/api/v1/clubs/:slug` | Public | Club page data |
| PATCH | `/api/v1/clubs/:slug` | ClubLead/Admin | Update club |
| GET | `/api/v1/clubs/:slug/members` | ClubLead/Faculty/Admin | Member roster |
| POST | `/api/v1/clubs/:slug/members/invite` | ClubLead | Invite member by username |
| PATCH | `/api/v1/clubs/:slug/members/:uid` | ClubLead | Update member role/access |
| DELETE | `/api/v1/clubs/:slug/members/:uid` | ClubLead | Remove member |
| POST | `/api/v1/clubs/:slug/faculty` | Admin/ClubLead | Assign faculty advisor |

### Events
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/events` | Public | Upcoming events (cursor pagination) |
| POST | `/api/v1/events` | ClubLead/Faculty/Admin | Create event |
| GET | `/api/v1/events/past` | Public | Past events (offset pagination) |
| GET | `/api/v1/events/:id` | Public | Event detail |
| PATCH | `/api/v1/events/:id` | ClubLead/Admin | Update event |
| DELETE | `/api/v1/events/:id` | Admin | Soft delete event |
| POST | `/api/v1/events/:id/submit` | ClubLead/Faculty/Admin | Submit for approval |
| POST | `/api/v1/events/:id/faculty-approve` | Faculty | Faculty approves |
| POST | `/api/v1/events/:id/faculty-reject` | Faculty | Faculty rejects |
| POST | `/api/v1/events/:id/admin-approve` | Admin | Admin approves → published |
| POST | `/api/v1/events/:id/admin-reject` | Admin | Admin rejects |
| POST | `/api/v1/events/:id/register` | User | Register for event |
| DELETE | `/api/v1/events/:id/register` | User | Cancel registration |
| GET | `/api/v1/events/:id/registrations` | ClubLead/Admin | Attendee roster |
| POST | `/api/v1/events/:id/attendance` | ClubLead/Admin | Mark single attendance |
| POST | `/api/v1/events/:id/attendance/bulk` | ClubLead/Admin | Bulk mark attendance |
| GET | `/api/v1/certificates/verify/:token` | Public | Certificate verification |

---

## 10. What Is Not Yet Implemented

The following systems are defined in the TDD but are intentionally deferred to future milestones. The schema and infrastructure (queues, error types, DB tables) are already in place to support them:

- **BullMQ workers** — Queue definitions and job processors for XP/score awards, email delivery, certificate generation, leaderboard refresh, and event auto-completion
- **Profile routes** — `/api/v1/profiles/*` (CRUD, skills, projects, timeline, endorsements)
- **Leaderboard routes** — `/api/v1/leaderboard/*` (Redis-cached, BullMQ refresh)
- **Board routes** — `/api/v1/board/*` (posts, comments, reports, boost)
- **Marketplace routes** — `/api/v1/marketplace/*`
- **Learning/AI routes** — `/api/v1/learn/*`, quiz system, pgvector roadmap generation
- **Admin routes** — `/api/v1/admin/*` (moderation, config management)
- **Skill verification routes** — `/api/v1/verify/*` (GitHub OAuth, LeetCode, quiz)
- **Scores routes** — `/api/v1/scores/*`
- **Alumni routes** — `/api/v1/alumni/*`
- **OG image generation** — Profile card background jobs
- **Clerk Middleware** — `middleware.ts` for protecting page routes (separate from API middleware)
