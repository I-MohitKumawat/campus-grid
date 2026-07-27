# CampusGrid Role & Permission Matrix

This document defines the Role-Based Access Control (RBAC) matrix across platform roles, distinguishing between currently active permissions and planned future capabilities.

---

## 1. Role Definitions

- **Student:** Registered campus student accessing events, digital passes, club memberships, and personal identity profile.
- **Club Lead:** Student leader appointed to manage specific club organizations, create events, and verify attendance.
- **Organizer:** Contextual role describing the owner/creator of a specific event.
- **Faculty:** Institutional faculty advisor overseeing club activities and approving major campus events.
- **Admin:** Platform administrator with complete operational management capabilities over all entities.

---

## 2. Permission Matrix

| Capability / Action | Student | Club Lead | Organizer (Contextual) | Admin | Faculty (Future) | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **View Published Events** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | **Active** |
| **Register for Event Pass** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | **Active** |
| **View Personal Profile** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | **Active** |
| **Edit Personal Profile** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | **Active** |
| **Join Campus Club** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | **Active** |
| **Create Event Draft** | ❌ Denied | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | **Active** |
| **Edit Owned Event** | ❌ Denied | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | **Active** |
| **Publish Event** | ❌ Denied | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | **Active** |
| **Verify QR Attendance** | ❌ Denied | ✅ Allowed | ✅ Allowed | ✅ Allowed | ❌ Denied | **Active** |
| **Complete Event & Issue Certificates** | ❌ Denied | ✅ Allowed | ✅ Allowed | ✅ Allowed | ❌ Denied | **Active** |
| **Create Campus Club** | ❌ Denied | ❌ Denied | ❌ Denied | ✅ Allowed | ❌ Denied | **Active** |
| **Assign Club Lead** | ❌ Denied | ❌ Denied | ❌ Denied | ✅ Allowed | ❌ Denied | **Active** |
| **Assign Platform Roles** | ❌ Denied | ❌ Denied | ❌ Denied | ✅ Allowed | ❌ Denied | **Active** |
| **Archive Club or Event** | ❌ Denied | ❌ Denied | ❌ Denied | ✅ Allowed | ❌ Denied | **Active** |
| **Approve Faculty Review Event** | ❌ Denied | ❌ Denied | ❌ Denied | ✅ Allowed | 🔄 Planned | **Planned** |
| **Institutional Budget Audit** | ❌ Denied | ❌ Denied | ❌ Denied | ✅ Allowed | 🔄 Planned | **Planned** |
