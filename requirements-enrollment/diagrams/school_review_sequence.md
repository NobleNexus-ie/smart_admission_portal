# School Application Review Flow — Sequence Diagram

**Companion to:** [../ARCHITECTURE_AND_FLOWS.md](../ARCHITECTURE_AND_FLOWS.md) §4
**Status:** Draft — matches planned implementation
**Sub-slice:** P1.4

## Business summary

When a parent submits an application, the school's registered contact email receives a notification with a secure review link. School staff log in, view applications scoped to their school only, and take one of three actions: approve, reject (with mandatory reason), or request additional information. All actions are append-only in the review history. One school's staff cannot see another school's applications.

## Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Staff as School Staff
    participant Email as Email Inbox
    participant Portal as smartschooladmissions.com
    participant API as Enrolment API
    participant DB as PostgreSQL
    participant Notif as Notification Service
    actor Parent

    rect rgb(245,248,250)
    Note over Staff,Parent: A. Notification received
    Notif->>Email: app_received email<br/>to school contact_email
    Note right of Email: Email contains:<br/>Student name, grade,<br/>[Review Application] button<br/>(signed link with app_school_id)
    Staff->>Email: Opens notification email
    Staff->>Portal: Clicks [Review Application]
    Portal->>Portal: Redirect to staff login<br/>(if not already authenticated)
    end

    rect rgb(250,248,245)
    Note over Staff,Parent: B. Staff authentication
    Staff->>API: POST /auth/staff/login {email, password}
    API->>DB: SELECT school_staff WHERE email
    API->>API: Verify bcrypt hash
    API->>API: Build JWT {staff_id, school_id, role, permissions}
    API-->>Staff: 200 {access_token}
    Note right of API: JWT.school_id is immutable —<br/>all subsequent queries are<br/>scoped to this school_id.
    end

    rect rgb(245,250,245)
    Note over Staff,Parent: C. View applications
    Staff->>API: GET /staff/applications?status=pending
    API->>API: Extract school_id from JWT
    API->>DB: SELECT application_schools AS<br/>JOIN applications JOIN parents<br/>WHERE school_id = JWT.school_id<br/>AND status = 'pending'<br/>ORDER BY submitted_at DESC
    Note right of DB: School-scoped query.<br/>Service layer enforces this,<br/>not just the router.
    API-->>Staff: {applications: [...], total, page}
    Staff->>API: GET /staff/applications/{app_school_id}
    API->>DB: SELECT full detail<br/>(student info, parent info, documents, review history)
    alt app_school.school_id != JWT.school_id
        API-->>Staff: 403 SCOPE_DENIED
    end
    API-->>Staff: {application detail + document signed URLs}
    end

    rect rgb(248,245,250)
    Note over Staff,Parent: D. Review action — one of three paths

    alt Path 1: APPROVE
        Staff->>API: POST /staff/applications/{id}/approve<br/>{notes: "Welcome to our school"}
        API->>DB: BEGIN
        API->>DB: INSERT review_actions<br/>(action=approved, performed_by=staff_id)
        API->>DB: UPDATE application_schools.status = 'approved'
        API->>DB: COMMIT
        API->>Notif: Queue app_approved email → parent
        Notif->>Parent: Email: "Congratulations! Approved by {school}"
        API-->>Staff: 200 {status: approved}

    else Path 2: REJECT
        Staff->>API: POST /staff/applications/{id}/reject<br/>{reason: "Class capacity reached for this grade"}
        Note right of API: reason is mandatory (min 10 chars)
        API->>DB: BEGIN
        API->>DB: INSERT review_actions<br/>(action=rejected, reason, performed_by)
        API->>DB: UPDATE application_schools.status = 'rejected'
        API->>DB: COMMIT
        API->>Notif: Queue app_rejected email → parent
        Notif->>Parent: Email: "Update from {school}" with reason
        API-->>Staff: 200 {status: rejected}

    else Path 3: REQUEST INFO
        Staff->>API: POST /staff/applications/{id}/request-info<br/>{fields: ["emergency_contact"],<br/> documents: ["medical_records"],<br/> message: "Please provide emergency contact and medical records"}
        API->>DB: BEGIN
        API->>DB: INSERT info_requests<br/>(fields, documents, message, created_by)
        API->>DB: UPDATE application_schools.status = 'info_requested'
        API->>DB: COMMIT
        API->>Notif: Queue info_requested email → parent
        Notif->>Parent: Email: "Action needed" with field list
        API-->>Staff: 200 {status: info_requested}
    end
    end

    rect rgb(250,250,245)
    Note over Staff,Parent: E. Logout
    Staff->>API: POST /auth/staff/logout
    API->>DB: Blacklist JWT in Redis (TTL = token remaining lifetime)
    API-->>Staff: 200 — Logged out
    end
```

## Permission enforcement

| Action | Required Role | Permission Key |
|--------|--------------|----------------|
| View application list | viewer, reviewer, school_admin | `applications:read` |
| View application detail | viewer, reviewer, school_admin | `applications:read` |
| Approve application | reviewer, school_admin | `applications:review` |
| Reject application | reviewer, school_admin | `applications:review` |
| Request additional info | reviewer, school_admin | `applications:review` |
| Manage school settings | school_admin | `school:manage` |

## Error codes raised

| Code | HTTP | Condition |
|------|------|-----------|
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `SCOPE_DENIED` | 403 | Accessing application from another school |
| `FORBIDDEN_PERMISSION` | 403 | Viewer attempting review action |
| `INVALID_APPLICATION_STATUS` | 409 | Attempting action on already-finalised application |
| `REASON_REQUIRED` | 422 | Reject without reason or reason < 10 chars |
| `OPTIMISTIC_LOCK_CONFLICT` | 409 | Another staff member acted on same application concurrently |
