# Parent Application Flow — School-First (Sequence Diagram)

**Companion to:** [../ARCHITECTURE_AND_FLOWS.md](../ARCHITECTURE_AND_FLOWS.md) §2
**Status:** Draft — matches planned implementation
**Sub-slice:** P1.2–P1.3

## Business summary

A parent arrives via a school's "Apply Now" embed link or directly at smartschooladmissions.com. They register, verify email, complete their profile, search for schools, and submit an application. The embed link pre-selects the school; direct visitors use the search flow.

## Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Parent
    participant Web as School Website
    participant Portal as smartschooladmissions.com
    participant API as Enrolment API
    participant DB as PostgreSQL
    participant R2 as Object Storage
    participant Email as Resend

    rect rgb(245,248,250)
    Note over Parent,Email: A. Entry via school website
    Parent->>Web: Clicks [Apply Now] button
    Web->>Portal: Redirect with signed embed token<br/>?token=school_abc_signed
    Portal->>API: GET /schools/resolve-embed?token=...
    API->>DB: SELECT school WHERE embed_link_token
    API-->>Portal: {school_id, school_name, status}
    Note right of Portal: School context stored in session.<br/>After auth, parent lands on<br/>this school's application form.
    end

    rect rgb(250,248,245)
    Note over Parent,Email: B. Registration + verification
    Parent->>API: POST /auth/register {email, password}
    API->>DB: INSERT parents (is_verified=false)
    alt email already exists
        API-->>Parent: 409 — Account already exists
    end
    API->>Email: Send verification email (24h token)
    API-->>Parent: 201 — Check your email
    Parent->>API: POST /auth/verify-email {token}
    alt token expired
        API-->>Parent: 410 — Verification link expired
    end
    API->>DB: UPDATE parents SET is_verified=true
    API-->>Parent: 200 — Verified
    end

    rect rgb(245,250,245)
    Note over Parent,Email: C. Login + profile gate
    Parent->>API: POST /auth/login {email, password}
    API->>DB: SELECT parent WHERE email AND is_verified
    API->>API: Verify bcrypt hash
    API-->>Parent: 200 {access_token, refresh_token}
    Parent->>API: GET /parents/profile
    API-->>Parent: {profile_complete: false}
    Note right of Portal: Profile gate middleware<br/>blocks access to /applications<br/>until profile_complete = true
    Parent->>API: PUT /parents/profile<br/>{full_name, phone, address}
    API->>DB: UPDATE parent_profiles
    Parent->>API: POST /parents/profile/id-proof<br/>(multipart file upload)
    API->>R2: PUT object (id_proof_{parent_id}.pdf)
    R2-->>API: storage_key
    API->>DB: UPDATE parent_profiles.id_proof_url
    API-->>Parent: 200 {profile_complete: true}
    end

    rect rgb(248,245,250)
    Note over Parent,Email: D. School search + application
    Parent->>API: GET /schools/search?board=CBSE&area=Bangalore
    API->>DB: SELECT schools WHERE board='CBSE' AND area ILIKE '%bangalore%'
    API-->>Parent: {schools: [{id, name, board, area, status}], total, page}
    Parent->>API: GET /schools/{school_id}
    API->>DB: SELECT school with full details
    API-->>Parent: {name, board, address, description, facilities, status}
    Note right of Parent: If arrived via embed link,<br/>school is pre-selected.<br/>Otherwise, parent chooses.
    Parent->>API: POST /applications<br/>{school_id, form_data: {student_name, dob, grade, ...}}
    API->>DB: BEGIN
    API->>DB: INSERT applications (status=draft)
    API->>DB: INSERT application_schools (status=pending)
    alt duplicate application to same school
        API-->>Parent: 409 — Already applied to this school
    end
    Parent->>API: POST /applications/{id}/documents<br/>(birth_cert, photo, transcripts)
    API->>R2: PUT objects (doc_{app_id}_{filename})
    API->>DB: INSERT application_documents
    Parent->>API: PUT /applications/{id}/submit
    API->>DB: UPDATE applications.status = 'submitted'
    API->>DB: UPDATE application_schools.submitted_at = NOW()
    API->>DB: COMMIT
    API->>Email: Send app_received to school contact_email
    API-->>Parent: 200 — Application submitted
    end
```

## Error codes raised

| Code | HTTP | Condition |
|------|------|-----------|
| `ACCOUNT_EXISTS` | 409 | Email already registered |
| `VERIFICATION_EXPIRED` | 410 | Verification token expired |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `EMAIL_NOT_VERIFIED` | 403 | Attempting login before verification |
| `PROFILE_INCOMPLETE` | 403 | Attempting application access before profile completion |
| `DUPLICATE_APPLICATION` | 409 | Already applied to this school |
| `SCHOOL_NOT_ACTIVE` | 403 | Attempting to apply to inactive school |
| `INVALID_EMBED_TOKEN` | 400 | Embed link token invalid or revoked |
