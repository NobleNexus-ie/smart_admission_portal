# Notification Pipeline — Sequence Diagram

**Companion to:** [../ARCHITECTURE_AND_FLOWS.md](../ARCHITECTURE_AND_FLOWS.md) §5
**Status:** Draft — matches planned implementation
**Sub-slice:** P1.4 (core), P2.3 (advanced)

## Business summary

Every significant event in the enrolment lifecycle triggers an email notification. The notification service resolves the recipient, selects the template, renders it with event-specific variables, and dispatches via Resend. All deliveries are logged for audit and retry. Phase 2 adds automated reminders and configurable notification preferences.

## Core notification sequence

```mermaid
sequenceDiagram
    autonumber
    participant Trigger as Event Source<br/>(application_service, review_service)
    participant NS as notification_service
    participant TPL as Template Engine
    participant DB as PostgreSQL
    participant Email as Resend API
    participant Log as notifications table

    Trigger->>NS: notify(event_type, payload)
    NS->>DB: Resolve recipient<br/>(school contact_email or parent email)

    alt recipient not found
        NS->>Log: INSERT notification<br/>(status=failed, reason=no_recipient)
        NS-->>Trigger: {sent: false, reason: "no_recipient"}
    end

    NS->>TPL: render(template_name, variables)
    Note right of TPL: Variables include:<br/>student_name, school_name,<br/>parent_name, action_url,<br/>reason, field_list, etc.
    TPL-->>NS: {subject, html_body, text_body}

    NS->>Email: POST /emails<br/>{from, to, subject, html, text}

    alt Resend returns 200
        NS->>Log: INSERT notification<br/>(status=sent, resend_id, sent_at)
        NS-->>Trigger: {sent: true, notification_id}
    else Resend returns error
        NS->>Log: INSERT notification (status=retry_1)
        NS->>NS: Schedule retry (1 min)
        Note right of NS: Retry up to 3 times<br/>with 1-min intervals.<br/>After 3 failures → status=failed.
    end
```

## Notification templates

### Phase 1 templates

```mermaid
flowchart TB
    subgraph triggers [Event Triggers]
        REG[Parent registers]
        SUB[Application submitted]
        APR[School approves]
        REJ[School rejects]
        REQ[School requests info]
        RSP[Parent responds to info request]
    end

    subgraph templates [Email Templates]
        T1[verify_email]
        T2[app_received]
        T3[app_approved]
        T4[app_rejected]
        T5[info_requested]
        T6[info_provided]
    end

    subgraph recipients [Recipients]
        P[Parent]
        S[School]
    end

    REG --> T1 --> P
    SUB --> T2 --> S
    APR --> T3 --> P
    REJ --> T4 --> P
    REQ --> T5 --> P
    RSP --> T6 --> S
```

### Phase 2 additional templates

```mermaid
flowchart TB
    subgraph triggers2 [Phase 2 Triggers]
        T7D[7 days no school action]
        T2D[2 days before info deadline]
        MULTI[Multi-school submission]
        WEEK[Weekly schedule]
    end

    subgraph templates2 [Phase 2 Templates]
        T7[app_reminder]
        T8[info_deadline_reminder]
        T9[multi_school_summary]
        T10[weekly_digest]
    end

    subgraph recipients2 [Recipients]
        P2[Parent]
        S2[School]
    end

    T7D --> T7 --> S2
    T2D --> T8 --> P2
    MULTI --> T9 --> P2
    WEEK --> T10 --> P2
```

## Template variable reference

| Template | Variables |
|----------|----------|
| `verify_email` | `parent_name`, `verify_url` (24h expiry token) |
| `app_received` | `school_name`, `student_name`, `grade`, `parent_name`, `review_url` (signed link) |
| `app_approved` | `parent_name`, `student_name`, `school_name`, `notes` (optional) |
| `app_rejected` | `parent_name`, `student_name`, `school_name`, `reason` |
| `info_requested` | `parent_name`, `student_name`, `school_name`, `fields_list`, `documents_list`, `message`, `respond_url`, `deadline` (optional) |
| `info_provided` | `school_name`, `student_name`, `parent_name`, `review_url` |
| `app_reminder` | `school_name`, `student_name`, `days_pending`, `review_url` |
| `info_deadline_reminder` | `parent_name`, `school_name`, `deadline_date`, `respond_url` |
| `multi_school_summary` | `parent_name`, `student_name`, `schools_list` (names + statuses) |
| `weekly_digest` | `parent_name`, `applications` (array of {school, status, last_update}) |

## Secure link generation

All links in notification emails use signed tokens:

```
https://smartschooladmissions.com/review/{signed_token}

signed_token = base64url(
  HMAC-SHA256(
    key = APP_SECRET,
    data = {
      type: "review" | "respond" | "verify",
      target_id: uuid,
      recipient_id: uuid,
      issued_at: timestamp,
      expires_at: timestamp (optional)
    }
  )
) + "." + base64url(payload)
```

| Link Type | Expiry | Purpose |
|-----------|--------|---------|
| `verify` | 24 hours | Email verification |
| `review` | No expiry (requires login) | School staff review link |
| `respond` | No expiry (requires login) | Parent info-response link |
| `setup` | 24 hours | Staff account setup |

## Retry and failure handling

```mermaid
stateDiagram-v2
    [*] --> queued: notify() called
    queued --> sent: Resend 200 OK
    queued --> retry_1: Resend error
    retry_1 --> sent: Retry success
    retry_1 --> retry_2: Retry fails (1 min)
    retry_2 --> sent: Retry success
    retry_2 --> retry_3: Retry fails (1 min)
    retry_3 --> sent: Retry success
    retry_3 --> failed: 3rd retry fails
    sent --> [*]
    failed --> [*]

    note right of failed
      Alert platform admin
      if failure rate > 5%
    end note
```

## Phase 2: automated reminders

| Reminder | Trigger | Frequency | Condition |
|----------|---------|-----------|-----------|
| School inaction | Cron job (daily) | Once per application | `application_schools.status = 'pending'` AND `submitted_at < NOW() - 7 days` AND no reminder sent in last 7 days |
| Info deadline | Cron job (daily) | Once per request | `info_requests.deadline IS NOT NULL` AND `deadline - NOW() < 2 days` AND `info_requests.status = 'pending'` |
| Weekly digest | Cron job (weekly, Monday 9am) | Once per parent | Parent has `notification_preferences.frequency = 'weekly'` AND has active applications |
