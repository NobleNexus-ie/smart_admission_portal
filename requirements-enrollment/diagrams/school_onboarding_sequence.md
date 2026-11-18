# School Onboarding Flow — Sequence Diagram

**Companion to:** [../ARCHITECTURE_AND_FLOWS.md](../ARCHITECTURE_AND_FLOWS.md) §6
**Status:** Draft — matches planned implementation
**Sub-slice:** P1.4

## Business summary

School onboarding is a one-time process. A platform administrator registers the school, adds staff accounts, and generates a secure embed link. Staff receive a setup email to create their password. The school places the embed link as an "Apply Now" button on their website. This is the only path to create a school in the enrolment system — there is no school self-registration in Phase 1.

## Sequence

```mermaid
sequenceDiagram
    autonumber
    actor PA as Platform Admin
    participant API as Enrolment API
    participant DB as PostgreSQL
    participant R2 as Object Storage
    participant Email as Resend
    actor Staff as School Staff
    actor Parent

    rect rgb(245,248,250)
    Note over PA,Parent: A. Register school
    PA->>API: POST /schools/onboard<br/>{name, board, address, area, city, state,<br/> contact_email, phone, description}
    API->>API: Validate: no duplicate school (name + city)
    API->>DB: INSERT schools (status='pending')
    API->>API: Generate embed_link_token (HMAC-SHA256 signed)
    API->>DB: UPDATE schools.embed_link_token
    API-->>PA: 201 {school_id, embed_link_token, status: pending}
    end

    rect rgb(245,250,245)
    Note over PA,Parent: B. Upload school branding (optional)
    PA->>API: POST /schools/{id}/logo (multipart)
    API->>R2: PUT school_logo_{school_id}.png
    API->>DB: UPDATE schools.logo_url
    API-->>PA: 200
    end

    rect rgb(250,248,245)
    Note over PA,Parent: C. Add staff accounts
    PA->>API: POST /schools/{id}/staff<br/>{email, name, role: "school_admin"}
    API->>DB: INSERT school_staff<br/>(school_id, email, name, role, password_hash=NULL)
    API->>API: Generate setup token (24h expiry)
    API->>Email: Send staff_setup email<br/>"Set up your account at smartschooladmissions.com"
    API-->>PA: 201 {staff_id}

    PA->>API: POST /schools/{id}/staff<br/>{email, name, role: "reviewer"}
    API->>DB: INSERT school_staff
    API->>Email: Send staff_setup email
    API-->>PA: 201 {staff_id}
    end

    rect rgb(248,245,250)
    Note over PA,Parent: D. Staff sets up account
    Staff->>API: POST /auth/staff/setup<br/>{token, password}
    API->>API: Validate setup token (not expired, not used)
    API->>DB: UPDATE school_staff.password_hash = bcrypt(password)
    API->>DB: Mark setup token as used
    API-->>Staff: 200 — Account ready
    end

    rect rgb(245,248,250)
    Note over PA,Parent: E. Activate school
    PA->>API: PUT /schools/{id}/activate
    API->>DB: UPDATE schools.status = 'active'
    API-->>PA: 200 {status: active}
    Note right of PA: School is now discoverable<br/>in parent search results<br/>and can receive applications.
    end

    rect rgb(250,250,245)
    Note over PA,Parent: F. Embed link integration
    PA->>API: GET /schools/{id}/embed-link
    API-->>PA: {embed_url: "https://smartschooladmissions.com/apply/{token}",<br/> html_snippet: "<a href='...' class='veda-apply-btn'>Apply Now</a>"}
    Note over PA,Parent: Platform admin shares embed_url<br/>and optional HTML snippet<br/>with the school's web admin.
    Note over Parent: When a parent clicks the button<br/>on the school's website,<br/>they are redirected to the portal<br/>with the school pre-selected.
    end
```

## School status lifecycle

```mermaid
stateDiagram-v2
    [*] --> pending: POST /schools/onboard
    pending --> active: PUT /schools/{id}/activate
    active --> inactive: PUT /schools/{id}/deactivate
    inactive --> active: PUT /schools/{id}/activate
    active --> archived: DELETE /schools/{id} (soft delete)
    inactive --> archived: DELETE /schools/{id} (soft delete)
    archived --> [*]

    note right of pending
      Not visible to parents.
      Staff setup in progress.
    end note

    note right of active
      Visible to parents.
      Accepting applications.
    end note

    note right of inactive
      Visible to parents
      with "Not Accepting" badge.
      Existing applications unaffected.
    end note
```

## Onboarding data collected

| Field | Required | Validation |
|-------|----------|------------|
| `name` | Yes | 2–200 characters; unique per city |
| `board` | Yes | Enum: CBSE, ICSE, Matriculation, State Board, International, Other |
| `address` | Yes | Max 500 characters |
| `area` | Yes | Max 100 characters (locality/neighbourhood) |
| `city` | Yes | Max 100 characters |
| `state` | Yes | Max 100 characters |
| `contact_email` | Yes | Valid email; receives application notifications |
| `phone` | Yes | E.164 or Indian format |
| `description` | No | Max 2,000 characters |
| `facilities` | No | JSONB array of strings |
| `fee_range` | No | Free text (e.g., "₹50K–₹80K/year") |
| `grades_offered` | No | JSONB array (e.g., ["KG", "Grade 1", ..., "Grade 12"]) |
| `website_url` | No | Valid URL |

## Staff roles created during onboarding

| Role | Permissions | Typical Staff |
|------|------------|---------------|
| `school_admin` | Full access: manage school settings, manage staff, review all applications | Principal, registrar |
| `reviewer` | View + act on applications (approve, reject, request info) | Admissions coordinator |
| `viewer` | Read-only access to applications | Office staff, teachers with read access |
