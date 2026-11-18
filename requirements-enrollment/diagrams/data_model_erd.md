# Enrolment Module — Data Model ERD

**Companion to:** [../Phase1/Phase1_Architecture.md](../Phase1/Phase1_Architecture.md) §5
**Status:** Draft — matches planned schema
**Phase:** P1.1 (core tables), P2.1 (chatbot_sessions), P2.3 (notification_preferences)

## Entity-Relationship Diagram

```mermaid
erDiagram
    parents ||--|| parent_profiles : "1:1"
    parents ||--o{ applications : creates
    parents ||--o{ chatbot_sessions : "has (Phase 2)"
    parents ||--o| notification_preferences : "has (Phase 2)"

    applications ||--o{ application_schools : "submitted to"
    applications ||--o{ application_documents : contains

    schools ||--o{ application_schools : receives
    schools ||--o{ school_staff : employs

    application_schools ||--o{ review_actions : "reviewed via"
    application_schools ||--o{ info_requests : "may request info"

    info_requests ||--o| info_responses : "responded to"

    school_staff ||--o{ review_actions : performs
    school_staff ||--o{ info_requests : creates

    parents {
        uuid id PK
        varchar email UK "NOT NULL; login identifier"
        varchar password_hash "NOT NULL; bcrypt"
        boolean is_verified "DEFAULT false"
        timestamptz created_at "DEFAULT NOW()"
        timestamptz updated_at
    }

    parent_profiles {
        uuid id PK
        uuid parent_id FK_UK "UNIQUE; 1:1 with parents"
        varchar full_name "NOT NULL"
        varchar phone "configurable required"
        varchar address
        varchar city
        varchar state
        varchar id_proof_type "enum: aadhaar, passport, dl, voter_id"
        varchar id_proof_url "R2 signed URL reference"
        boolean profile_complete "DEFAULT false"
        timestamptz updated_at
    }

    schools {
        uuid id PK
        varchar name "NOT NULL"
        varchar board "NOT NULL; enum"
        varchar address "NOT NULL"
        varchar area "NOT NULL; for geo search"
        varchar city "NOT NULL"
        varchar state "NOT NULL"
        varchar contact_email "NOT NULL; receives notifications"
        varchar phone
        text description
        varchar logo_url
        varchar status "enum: pending, active, inactive, archived"
        varchar embed_link_token UK "HMAC-signed; for Apply Now links"
        jsonb facilities "array of strings"
        varchar fee_range "Phase 2"
        varchar student_teacher_ratio "Phase 2"
        jsonb grades_offered "Phase 2; array of grade names"
        varchar website_url
        timestamptz created_at
        timestamptz updated_at
    }

    school_staff {
        uuid id PK
        uuid school_id FK "NOT NULL"
        varchar email UK "NOT NULL"
        varchar password_hash "NULL until setup"
        varchar name "NOT NULL"
        varchar role "enum: school_admin, reviewer, viewer"
        jsonb permissions "derived from role"
        varchar setup_token "24h expiry; NULL after use"
        timestamptz created_at
    }

    applications {
        uuid id PK
        uuid parent_id FK "NOT NULL"
        jsonb form_data "student details, academic, additional"
        varchar status "enum: draft, submitted, completed"
        varchar method "enum: school_first, agentic"
        timestamptz created_at
        timestamptz submitted_at
        timestamptz updated_at
    }

    application_schools {
        uuid id PK
        uuid application_id FK "NOT NULL"
        uuid school_id FK "NOT NULL"
        varchar status "enum: pending, approved, rejected, info_requested"
        timestamptz submitted_at
        timestamptz reviewed_at
    }

    application_documents {
        uuid id PK
        uuid application_id FK "NOT NULL"
        varchar category "enum: birth_cert, photo, transcript, medical, id_proof, other"
        varchar file_name "original filename"
        varchar storage_key "R2 object key"
        varchar mime_type "validated server-side"
        integer file_size "bytes"
        timestamptz uploaded_at
    }

    review_actions {
        uuid id PK
        uuid application_school_id FK "NOT NULL"
        uuid performed_by FK "school_staff.id"
        varchar action "enum: approved, rejected, request_info"
        text reason "required for reject"
        text notes "optional"
        timestamptz performed_at "NOT NULL; DEFAULT NOW()"
    }

    info_requests {
        uuid id PK
        uuid application_school_id FK "NOT NULL"
        uuid created_by FK "school_staff.id"
        jsonb fields_requested "array of field names"
        jsonb documents_requested "array of doc categories"
        text message "free-text to parent"
        varchar status "enum: pending, responded, expired"
        date deadline "optional; Phase 2"
        timestamptz created_at
    }

    info_responses {
        uuid id PK
        uuid info_request_id FK "UNIQUE; one response per request"
        jsonb response_data "updated field values"
        jsonb documents "array of {storage_key, category, filename}"
        timestamptz responded_at
    }

    notifications {
        uuid id PK
        varchar recipient_email "NOT NULL"
        varchar template "NOT NULL; template name"
        varchar status "enum: queued, sent, retry_1, retry_2, retry_3, failed"
        varchar resend_id "from Resend API"
        jsonb metadata "event_type, target_ids, variables"
        timestamptz sent_at
        timestamptz created_at
    }

    chatbot_sessions {
        uuid id PK
        uuid parent_id FK "NOT NULL"
        jsonb conversation_state "current extracted fields"
        jsonb conversation_history "array of messages"
        jsonb application_data "structured form data"
        varchar current_topic "enum: welcome, student_details, etc."
        varchar status "enum: active, completed, abandoned, switched_to_form"
        timestamptz created_at
        timestamptz updated_at
    }

    notification_preferences {
        uuid id PK
        uuid parent_id FK_UK "UNIQUE; 1:1 with parents"
        varchar frequency "enum: immediate, daily, weekly"
        boolean reminders_enabled "DEFAULT true"
        boolean status_updates_enabled "DEFAULT true"
        timestamptz updated_at
    }
```

## Index strategy

| Index Name | Table | Columns | Type | Purpose |
|------------|-------|---------|------|---------|
| `ix_parents_email` | parents | email | UNIQUE B-tree | Login lookup |
| `ix_parent_profiles_parent` | parent_profiles | parent_id | UNIQUE B-tree | Profile lookup |
| `ix_schools_board` | schools | board | B-tree | Board filter |
| `ix_schools_area` | schools | area | B-tree | Area filter |
| `ix_schools_status` | schools | status | B-tree | Active/inactive filter |
| `ix_schools_board_area_status` | schools | board, area, status | Composite B-tree | Combined search filter |
| `ix_schools_embed_token` | schools | embed_link_token | UNIQUE B-tree | Embed link resolve |
| `ix_schools_name_trgm` | schools | name | GIN (pg_trgm) | Fuzzy name search |
| `ix_school_staff_email` | school_staff | email | UNIQUE B-tree | Staff login |
| `ix_school_staff_school` | school_staff | school_id | B-tree | Staff by school |
| `ix_applications_parent` | applications | parent_id | B-tree | Parent's applications |
| `ix_applications_status` | applications | status | B-tree | Status filter |
| `ix_app_schools_school` | application_schools | school_id | B-tree | School's applications |
| `ix_app_schools_status` | application_schools | status | B-tree | Status filter |
| `uq_app_schools_app_school` | application_schools | application_id, school_id | UNIQUE B-tree | Prevent duplicate submission |
| `ix_review_actions_app_school` | review_actions | application_school_id | B-tree | Review history lookup |
| `ix_review_actions_performed_at` | review_actions | performed_at DESC | B-tree | Chronological history |
| `ix_info_requests_app_school` | info_requests | application_school_id | B-tree | Info requests per app |
| `ix_notifications_recipient` | notifications | recipient_email | B-tree | Notification history |
| `ix_notifications_status` | notifications | status | B-tree | Retry queue |
| `ix_chatbot_sessions_parent` | chatbot_sessions | parent_id | B-tree | Parent's sessions |

## Constraints summary

| Constraint | Table | Type | Purpose |
|------------|-------|------|---------|
| `parents.email` | parents | UNIQUE | One account per email |
| `school_staff.email` | school_staff | UNIQUE | One staff account per email |
| `schools.embed_link_token` | schools | UNIQUE | One embed link per school |
| `parent_profiles.parent_id` | parent_profiles | UNIQUE FK | 1:1 with parents |
| `(application_id, school_id)` | application_schools | UNIQUE | No duplicate submissions |
| `info_responses.info_request_id` | info_responses | UNIQUE FK | One response per request |
| `notification_preferences.parent_id` | notification_preferences | UNIQUE FK | 1:1 with parents |
| `review_actions` | review_actions | No UPDATE/DELETE | Append-only audit trail |

## Data retention

| Table | Retention | Rationale |
|-------|-----------|-----------|
| parents, parent_profiles | Until deletion request | GDPR right to erasure |
| applications, application_schools | 2 years after last status change | Admissions record keeping |
| application_documents | 2 years after last status change | Supporting evidence |
| review_actions | 2 years (linked to application) | Audit trail |
| notifications | 90 days | Delivery audit |
| chatbot_sessions | 30 days after completion | Debug + improvement; no PII after anonymisation |
