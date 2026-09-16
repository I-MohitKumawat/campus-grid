# CampusGrid Authorization & Security Layer Audit & Fix Report

**Date:** August 16, 2026  
**Status:** Completed & Verified  
**Scope:** Backend authorization enforcement, object-level access control, authenticated identity propagation, and role boundaries.

---

## 1. Authorization Architecture Before the Fix

Prior to this fix, the platform enforced authentication at the edge/middleware and in API route wrappers (`withAuth`), and checked platform roles (`user.role === 'admin'`) for `/api/v1/admin/*` routes. However, **object-level authorization** across organizer endpoints was missing:

* Handlers relied solely on `withAuth` to confirm the user was logged in, but did not verify whether the authenticated user had permission to mutate or access the specific resource.
* Service functions accepted an `organizerId` string but never verified it against `events.organiser_id` or club leadership tables.
* Anyone with an active student session could pass an arbitrary event UUID to organizer lifecycle endpoints and execute privileged actions.

---

## 2. Vulnerabilities Found

1. **Broken Object-Level Authorization (BOLA / IDOR) in Event Lifecycle Endpoints:**
   * Any authenticated student could mark *any* event as completed.
   * Any authenticated student could archive *any* event.
   * Any authenticated student could trigger certificate generation for *any* event.
   * Any authenticated student could approve or reject attendee registrations for *any* event.
   * Any authenticated student could broadcast push notifications to registered attendees of *any* event.
2. **Missing Role Propagation:**
   * Route handlers passed `user.sub` but omitted `user.role`, preventing services from evaluating whether the caller held administrator override privileges or club leadership context.
3. **Session User Identifier Property Inconsistency:**
   * Some routes accessed `user.id` instead of `user.sub` (the platform UUID stored in JWT payload).

---

## 3. Endpoints Affected & Secured

| Endpoint | Method | Previous State | Fixed State | Status |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/organizer/events/[id]/complete` | `POST` | Authenticated student could complete any event | Enforces `assertCanManageEvent` (Creator, Host Club Lead/Core, or Admin) | 🔒 Secured |
| `/api/v1/organizer/events/[id]/archive` | `POST` | Authenticated student could archive any event | Enforces `assertCanManageEvent` | 🔒 Secured |
| `/api/v1/organizer/events/[id]/certificates` | `POST` | Authenticated student could issue certificates | Enforces `assertCanManageEvent` | 🔒 Secured |
| `/api/v1/organizer/events/[id]/certificates` | `GET` | Authenticated student could view certificates | Enforces `assertCanManageEvent` | 🔒 Secured |
| `/api/v1/organizer/events/[id]/applications/decide` | `POST` | Authenticated student could approve/reject apps | Enforces `assertCanManageEvent` | 🔒 Secured |
| `/api/v1/organizer/events/[id]/announcements` | `POST` | Authenticated student could broadcast updates | Enforces `assertCanManageEvent` | 🔒 Secured |
| `/api/v1/organizer/events/[id]/withdraw` | `POST` | Authenticated student could withdraw submission | Enforces `assertCanManageEvent` | 🔒 Secured |
| `/api/v1/organizer/events/[id]/registrations` | `GET` | Missing full lead membership check | Enforces `assertCanManageEvent` | 🔒 Secured |
| `/api/v1/events/[id]` | `PATCH` | Direct creator or admin check | Enforces `assertCanManageEvent` | 🔒 Secured |
| `/api/v1/events/[id]/attendance` | `POST` | Route guarded | Enforces `assertCanManageEvent` | 🔒 Secured |
| `/api/v1/events/[id]/attendance/bulk` | `POST` | Checked creator only | Enforces `assertCanManageEvent` | 🔒 Secured |
| `/api/v1/users/me` | `GET/PATCH` | Used `user.id` (undefined) | Resolved `user.sub` from verified JWT | 🔒 Fixed |

---

## 4. Authorization Rules Implemented

```
Authenticated Request (via JWT `cg_token`)
       │
       ▼
Fetch Target Resource from PostgreSQL (`events`, `clubs`)
       │
       ▼
Evaluate Permission Guard:
 1. Is user an Admin (`user.role === 'admin'`)?
    ──► YES: Allow (Global administrative override)
 2. Is user the direct creator (`event.organiser_id === user.sub`)?
    ──► YES: Allow
 3. Is event hosted by a club AND user is active Lead/Core in `club_memberships`?
    ──► YES: Allow
 4. Otherwise:
    ──► NO: Throw ForbiddenError (HTTP 403 Forbidden)
```

---

## 5. Central Guard Implemented

Implemented `assertCanManageEvent` in [`lib/services/event.service.ts`](file:///home/mohitkumawat/dev/campus-grid/lib/services/event.service.ts):

```typescript
export async function assertCanManageEvent(
  event: { organiser_id?: string | null; club_id?: string | null },
  callerId: string,
  callerRole: string,
  actionDescription = 'manage this event'
): Promise<void> {
  if (callerRole === 'admin') {
    return;
  }

  if (event.organiser_id && event.organiser_id === callerId) {
    return;
  }

  if (event.club_id) {
    const memberCheck = await query(
      `SELECT 1 FROM club_memberships
       WHERE club_id = $1 AND user_id = $2 AND role IN ('lead', 'core') AND status = 'active'`,
      [event.club_id, callerId]
    );
    if (memberCheck.rowCount && memberCheck.rowCount > 0) {
      return;
    }
  }

  throw new ForbiddenError(`You do not have permission to ${actionDescription}.`);
}
```

---

## 6. Role Behaviors Under the Fixed Layer

* **Student:**
  * Can browse published events and public clubs.
  * Can register for event passes and cancel their own pass.
  * Cannot complete, archive, issue certificates, approve applications, or broadcast announcements for events they do not own or lead. Attempting these actions yields **HTTP 403 Forbidden**.
  * Cannot access `/api/v1/admin/*` endpoints (**HTTP 403 Forbidden**).
* **Club Lead:**
  * Has management authority for all events created by themselves or hosted under their club organization.
  * Cannot manage events belonging to unrelated clubs unless granted core/lead membership.
* **Admin:**
  * Has global operational authority across all events, clubs, user role assignments, and certificates.
* **Faculty:**
  * Marked as **FUTURE ONLY**. No faculty workflows were implemented in this security pass.

---

## 7. Automated Test Results

Executed automated test suite [`tests/auth-security.test.ts`](file:///home/mohitkumawat/dev/campus-grid/tests/auth-security.test.ts) against real PostgreSQL database:

```
─────────────────────────────────────────────────────────────
📊 Test Execution Summary:
─────────────────────────────────────────────────────────────
  ✅ [PASS] A. Student completing another user's event → 403 Forbidden
  ✅ [PASS] B. Student archiving another user's event → 403 Forbidden
  ✅ [PASS] C. Student issuing certificates for another user's event → 403 Forbidden
  ✅ [PASS] D. Student deciding applications for another user's event → 403 Forbidden
  ✅ [PASS] E. Student broadcasting announcements for another user's event → 403 Forbidden
  ✅ [PASS] F1. Creator broadcasting announcement to owned event → 200 OK
  ✅ [PASS] F2. Club Lead deciding applications for hosted club event → 200 OK
  ✅ [PASS] G. Admin globally completing any campus event → 200 OK
  ✅ [PASS] H. Student attempting /api/v1/admin/* endpoints → 403 Forbidden
  ✅ [PASS] I. Unauthenticated request without session → 401 Unauthorized
  ✅ [PASS] J. Body spoofing of organizerId/callerId cannot bypass authorization

Results: 11/11 tests passed (100% success rate).
```

---

## 8. Build Verification

Executed `npm run build` with Next.js Turbopack:

```
▲ Next.js 16.2.6 (Turbopack)
✓ Compiled successfully in 16.0s
✓ Finished TypeScript in 7.3s
✓ Collecting page data using 3 workers in 1654ms
✓ Generating static pages using 3 workers (33/33) in 667ms
✓ Finalizing page optimization in 21ms
```

---

## 9. Remaining Risks & Architectural Notes

* **Edge Middleware Session vs Role Guard:** `middleware.ts` verifies JWT signature but delegates role routing to client components / API routes. While API routes strictly enforce 403s, client page loads render fallback "Access Required" screens upon client evaluation.
* **Database Constraints:** Event mutations rely on PostgreSQL ACID transactions where multiple tables are updated (e.g. attendee count + registration status).
