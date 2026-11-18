# VedaAcademy Enrolment Module — Architecture & Data Flow Diagrams

**Document Version:** 1.0
**Date:** October 2026
**Status:** Draft — planning artifact
**Audience:** Backend engineers, DevOps, technical architects
**Related:** [MASTER_ROADMAP.md](MASTER_ROADMAP.md), [Phase1/Phase1_Architecture.md](Phase1/Phase1_Architecture.md)

---

## Table of Contents

1. [Complete system architecture](#1-complete-system-architecture)
2. [Data flow: parent application (School-First)](#2-data-flow-parent-application-school-first)
3. [Data flow: parent application (Application-First / Agentic)](#3-data-flow-parent-application-application-first--agentic)
4. [Data flow: school review](#4-data-flow-school-review)
5. [Data flow: notification pipeline](#5-data-flow-notification-pipeline)
6. [Data flow: school onboarding](#6-data-flow-school-onboarding)
7. [API route map](#7-api-route-map)
8. [Database schema overview](#8-database-schema-overview)
9. [Authentication architecture](#9-authentication-architecture)
10. [Deployment architecture](#10-deployment-architecture)

---

## 1. Complete system architecture

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                     VEDAACADEMY ENROLMENT MICROSERVICE                           │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  EXTERNAL ENTRY POINTS                                                          │
│  ┌───────────────────────────┐  ┌──────────────────────────────────────────────┐│
│  │ School Website            │  │ smartschooladmissions.com                     ││
│  │ ┌───────────────────────┐ │  │ ┌──────────────────────────────────────────┐ ││
│  │ │ [Apply Now] Button    │─┼──│ │ Parent Portal (React SPA)               │ ││
│  │ │ (Secure embed link)   │ │  │ │  • Dashboard                            │ ││
│  │ └───────────────────────┘ │  │ │  • Enrolment                            │ ││
│  └───────────────────────────┘  │ │  • Profile                              │ ││
│                                  │ └──────────────────────────────────────────┘ ││
│  ┌───────────────────────────┐  │ ┌──────────────────────────────────────────┐ ││
│  │ Email Notification Link   │──│ │ School Staff Portal (React SPA)         │ ││
│  │ (Secure school-specific)  │  │ │  • Application Review                   │ ││
│  └───────────────────────────┘  │ │  • Approve / Reject / Request Info      │ ││
│                                  │ └──────────────────────────────────────────┘ ││
│                                  └──────────────────────────────────────────────┘│
│                                      │                                           │
│                                      ▼                                           │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  API GATEWAY (Traefik / Nginx)                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────────┐│
│  │ Rate limiting │ CORS │ JWT validation │ Route dispatch │ TLS termination    ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
│                                      │                                           │
│                                      ▼                                           │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ENROLMENT API SERVICE (FastAPI)                                                │
│  ┌──────────────────────────────────────────────────────────────────────────────┐│
│  │                                                                              ││
│  │  ROUTERS                                                                     ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐ ┌──────────────────────┐ ││
│  │  │ /auth       │ │ /parents    │ │ /schools     │ │ /applications        │ ││
│  │  │ register    │ │ profile     │ │ search       │ │ create / submit      │ ││
│  │  │ login       │ │ dashboard   │ │ detail       │ │ list / detail        │ ││
│  │  │ verify      │ │ documents   │ │ onboard      │ │ review / action      │ ││
│  │  │ refresh     │ │             │ │ compare      │ │ request-info         │ ││
│  │  └─────────────┘ └─────────────┘ └──────────────┘ └──────────────────────┘ ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐                         ││
│  │  │ /chatbot    │ │ /notif      │ │ /analytics   │                         ││
│  │  │ converse    │ │ send        │ │ school-stats │                         ││
│  │  │ review      │ │ templates   │ │ platform     │                         ││
│  │  └─────────────┘ └─────────────┘ └──────────────┘                         ││
│  │                                                                              ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
│                                      │                                           │
│                                      ▼                                           │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  SERVICE LAYER                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────────┐│
│  │                                                                              ││
│  │  auth_service.py              application_service.py                        ││
│  │  ┌──────────────────────┐     ┌────────────────────────────────────────┐    ││
│  │  │ register_parent()    │     │ create_application()                   │    ││
│  │  │ verify_email()       │     │ submit_to_school()                     │    ││
│  │  │ login()              │     │ submit_to_multiple_schools()           │    ││
│  │  │ register_staff()     │     │ get_application_status()               │    ││
│  │  │ login_staff()        │     │ update_application()                   │    ││
│  │  └──────────────────────┘     └────────────────────────────────────────┘    ││
│  │                                                                              ││
│  │  school_service.py            review_service.py                             ││
│  │  ┌──────────────────────┐     ┌────────────────────────────────────────┐    ││
│  │  │ onboard_school()     │     │ approve_application()                  │    ││
│  │  │ search_schools()     │     │ reject_application()                   │    ││
│  │  │ get_school_detail()  │     │ request_additional_info()              │    ││
│  │  │ compare_schools()    │     │ get_review_history()                   │    ││
│  │  │ generate_embed_link()│     │ assign_reviewer()                     │    ││
│  │  └──────────────────────┘     └────────────────────────────────────────┘    ││
│  │                                                                              ││
│  │  profile_service.py           notification_service.py                       ││
│  │  ┌──────────────────────┐     ┌────────────────────────────────────────┐    ││
│  │  │ create_profile()     │     │ send_application_received()            │    ││
│  │  │ update_profile()     │     │ send_status_update()                   │    ││
│  │  │ validate_mandatory() │     │ send_info_request()                    │    ││
│  │  │ upload_id_proof()    │     │ send_review_reminder()                 │    ││
│  │  └──────────────────────┘     └────────────────────────────────────────┘    ││
│  │                                                                              ││
│  │  chatbot_service.py (Phase 2)                                               ││
│  │  ┌──────────────────────┐                                                   ││
│  │  │ start_conversation() │                                                   ││
│  │  │ process_response()   │                                                   ││
│  │  │ generate_summary()   │                                                   ││
│  │  │ map_to_application() │                                                   ││
│  │  └──────────────────────┘                                                   ││
│  │                                                                              ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
│                                      │                                           │
│                                      ▼                                           │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  DATA LAYER                                                                     │
│  ┌─────────────────────┐  ┌───────────────┐  ┌────────────────────────────────┐ │
│  │ PostgreSQL           │  │ Redis          │  │ Object Storage (R2/S3)        │ │
│  │ ┌─────────────────┐ │  │ ┌───────────┐ │  │ ┌──────────────────────────┐  │ │
│  │ │ parents         │ │  │ │ Sessions  │ │  │ │ ID proofs                │  │ │
│  │ │ parent_profiles │ │  │ │ Rate lim  │ │  │ │ Application documents    │  │ │
│  │ │ schools         │ │  │ │ Cache     │ │  │ │ School logos / media     │  │ │
│  │ │ school_staff    │ │  │ └───────────┘ │  │ └──────────────────────────┘  │ │
│  │ │ applications    │ │  └───────────────┘  └────────────────────────────────┘ │
│  │ │ app_schools     │ │                                                        │
│  │ │ app_documents   │ │  ┌───────────────────────────────────────────────────┐ │
│  │ │ review_actions  │ │  │ Email Service (Resend)                             │ │
│  │ │ review_history  │ │  │ ┌───────────────────────────────────────────────┐ │ │
│  │ │ info_requests   │ │  │ │ Transactional emails                         │ │ │
│  │ │ notifications   │ │  │ │ Notification delivery + tracking             │ │ │
│  │ └─────────────────┘ │  │ └───────────────────────────────────────────────┘ │ │
│  └─────────────────────┘  └───────────────────────────────────────────────────┘ │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data flow: parent application (School-First)

```
                    SCHOOL-FIRST APPLICATION FLOW

  Parent                API Gateway          Enrolment API            Database
    │                       │                     │                      │
    │  Visit Apply Now      │                     │                      │
    │  link on school site  │                     │                      │
    │──────────────────────►│                     │                      │
    │                       │  Redirect to portal │                      │
    │                       │────────────────────►│                      │
    │                       │                     │                      │
    │  POST /auth/register  │                     │                      │
    │──────────────────────►│────────────────────►│                      │
    │                       │                     │  INSERT parents      │
    │                       │                     │─────────────────────►│
    │                       │                     │  Send verify email   │
    │                       │                     │─────────────────────►│ (Email)
    │  Click verify link    │                     │                      │
    │──────────────────────►│────────────────────►│                      │
    │                       │                     │  UPDATE verified=true│
    │                       │                     │─────────────────────►│
    │  POST /auth/login     │                     │                      │
    │──────────────────────►│────────────────────►│  JWT issued          │
    │  ◄─────────────────────────────────────────│                      │
    │                       │                     │                      │
    │  GET /parents/profile │                     │                      │
    │──────────────────────►│────────────────────►│  Profile incomplete  │
    │  ◄─────────────────────────────────────────│  → force completion  │
    │                       │                     │                      │
    │  PUT /parents/profile │                     │                      │
    │  {phone, id_proof}    │                     │                      │
    │──────────────────────►│────────────────────►│                      │
    │                       │                     │  UPDATE profile      │
    │                       │                     │  UPLOAD id_proof→R2  │
    │                       │                     │─────────────────────►│
    │                       │                     │                      │
    │  GET /schools/search  │                     │                      │
    │  ?board=CBSE&area=... │                     │                      │
    │──────────────────────►│────────────────────►│                      │
    │                       │                     │  SELECT schools      │
    │                       │                     │  WHERE board/area    │
    │                       │                     │─────────────────────►│
    │  ◄── school list ──────────────────────────│                      │
    │                       │                     │                      │
    │  GET /schools/{id}    │                     │                      │
    │──────────────────────►│────────────────────►│  School detail       │
    │  ◄── detail ───────────────────────────────│                      │
    │                       │                     │                      │
    │  POST /applications   │                     │                      │
    │  {school_id, form}    │                     │                      │
    │──────────────────────►│────────────────────►│                      │
    │                       │                     │  INSERT application  │
    │                       │                     │  INSERT app_schools  │
    │                       │                     │  UPLOAD documents    │
    │                       │                     │─────────────────────►│
    │                       │                     │  TRIGGER notify      │
    │                       │                     │─────────────────────►│ (Email)
    │  ◄── 201 Created ─────────────────────────│                      │
    │                       │                     │                      │
```

---

## 3. Data flow: parent application (Application-First / Agentic)

```
                    APPLICATION-FIRST (AGENTIC) FLOW

  Parent              Chatbot Service       Application Service      Database
    │                       │                     │                      │
    │  Start chatbot        │                     │                      │
    │──────────────────────►│                     │                      │
    │                       │  Init conversation  │                      │
    │                       │  context            │                      │
    │  ◄── First question ──│                     │                      │
    │                       │                     │                      │
    │  Answer Q1            │                     │                      │
    │──────────────────────►│                     │                      │
    │                       │  Validate + store   │                      │
    │                       │  partial response   │                      │
    │  ◄── Next question ───│                     │                      │
    │                       │                     │                      │
    │      ... (iterative conversation) ...       │                      │
    │                       │                     │                      │
    │  Final answer         │                     │                      │
    │──────────────────────►│                     │                      │
    │                       │  generate_summary() │                      │
    │                       │  map_to_application()                      │
    │                       │────────────────────►│                      │
    │                       │                     │  Validate form data  │
    │  ◄── Review summary ──│                     │                      │
    │                       │                     │                      │
    │  Confirm application  │                     │                      │
    │──────────────────────►│                     │                      │
    │                       │                     │                      │
    │  GET /schools/eligible│                     │                      │
    │──────────────────────►│                     │  SELECT schools      │
    │                       │                     │  active + inactive   │
    │                       │                     │  with status labels  │
    │  ◄── school list ─────│                     │─────────────────────►│
    │                       │                     │                      │
    │  Select schools       │                     │                      │
    │  [school_1, school_3] │                     │                      │
    │──────────────────────►│                     │                      │
    │                       │  submit_to_multiple │                      │
    │                       │────────────────────►│                      │
    │                       │                     │  INSERT application  │
    │                       │                     │  INSERT app_schools  │
    │                       │                     │  (for each school)   │
    │                       │                     │─────────────────────►│
    │                       │                     │  TRIGGER notify      │
    │                       │                     │  (for each school)   │
    │  ◄── 201 Created ────────────────────────│                      │
    │                       │                     │                      │
```

---

## 4. Data flow: school review

```
                    SCHOOL APPLICATION REVIEW FLOW

  School Staff          API Gateway          Enrolment API            Database
    │                       │                     │                      │
    │  Receive email notif  │                     │                      │
    │  with secure link     │                     │                      │
    │──────────────────────►│  Redirect to portal │                      │
    │                       │────────────────────►│                      │
    │                       │                     │                      │
    │  POST /auth/staff/    │                     │                      │
    │  login                │                     │                      │
    │──────────────────────►│────────────────────►│                      │
    │                       │                     │  Validate creds      │
    │                       │                     │  Check school_id     │
    │                       │                     │  Check permissions   │
    │                       │                     │─────────────────────►│
    │  ◄── JWT (school-scoped) ──────────────────│                      │
    │                       │                     │                      │
    │  GET /applications    │                     │                      │
    │  ?school_id={mine}    │                     │                      │
    │──────────────────────►│────────────────────►│                      │
    │                       │                     │  SELECT apps         │
    │                       │                     │  WHERE school_id     │
    │                       │                     │  = JWT.school_id     │
    │                       │                     │─────────────────────►│
    │  ◄── application list ─────────────────────│                      │
    │                       │                     │                      │
    │  GET /applications/   │                     │                      │
    │  {appId}              │                     │                      │
    │──────────────────────►│────────────────────►│  Application detail  │
    │  ◄── full detail ──────────────────────────│  + documents         │
    │                       │                     │                      │
    │                       │                     │                      │
    │  ┌─── DECISION ───────────────────────────────────────────────┐  │
    │  │                                                             │  │
    │  │  Option A: APPROVE                                         │  │
    │  │  POST /applications/{appId}/approve                        │  │
    │  │  → INSERT review_actions (status=approved)                 │  │
    │  │  → UPDATE app_schools.status = approved                    │  │
    │  │  → TRIGGER notify parent (email)                           │  │
    │  │                                                             │  │
    │  │  Option B: REJECT                                          │  │
    │  │  POST /applications/{appId}/reject                         │  │
    │  │  {reason: "..."}                                           │  │
    │  │  → INSERT review_actions (status=rejected, reason)         │  │
    │  │  → UPDATE app_schools.status = rejected                    │  │
    │  │  → TRIGGER notify parent (email)                           │  │
    │  │                                                             │  │
    │  │  Option C: REQUEST INFO                                    │  │
    │  │  POST /applications/{appId}/request-info                   │  │
    │  │  {fields: [...], documents: [...], message: "..."}         │  │
    │  │  → INSERT info_requests                                    │  │
    │  │  → UPDATE app_schools.status = info_requested              │  │
    │  │  → TRIGGER notify parent (email)                           │  │
    │  │                                                             │  │
    │  └────────────────────────────────────────────────────────────┘  │
    │                       │                     │                      │
    │  POST /auth/logout    │                     │                      │
    │──────────────────────►│────────────────────►│  Invalidate session  │
    │  ◄── 200 OK ───────────────────────────────│                      │
    │                       │                     │                      │
```

---

## 5. Data flow: notification pipeline

```
                    NOTIFICATION PIPELINE

  Event Trigger          Notification Service      Email Service       Recipient
    │                          │                        │                  │
    │  Application submitted   │                        │                  │
    │─────────────────────────►│                        │                  │
    │                          │  Resolve school email  │                  │
    │                          │  from school_registry  │                  │
    │                          │  Load template         │                  │
    │                          │  (app_received)        │                  │
    │                          │───────────────────────►│                  │
    │                          │                        │  Send email      │
    │                          │                        │  with secure     │
    │                          │                        │  review link     │
    │                          │                        │─────────────────►│ School
    │                          │                        │                  │
    │  Application approved    │                        │                  │
    │─────────────────────────►│                        │                  │
    │                          │  Resolve parent email  │                  │
    │                          │  Load template         │                  │
    │                          │  (app_approved)        │                  │
    │                          │───────────────────────►│                  │
    │                          │                        │─────────────────►│ Parent
    │                          │                        │                  │
    │  Info requested          │                        │                  │
    │─────────────────────────►│                        │                  │
    │                          │  Load template         │                  │
    │                          │  (info_requested)      │                  │
    │                          │  Include field list    │                  │
    │                          │───────────────────────►│                  │
    │                          │                        │─────────────────►│ Parent
    │                          │                        │                  │
    │  Parent responds         │                        │                  │
    │─────────────────────────►│                        │                  │
    │                          │  Load template         │                  │
    │                          │  (info_provided)       │                  │
    │                          │───────────────────────►│                  │
    │                          │                        │─────────────────►│ School
    │                          │                        │                  │

  NOTIFICATION TEMPLATES:
  ┌────────────────────────┬─────────────────────────────────────────────────────┐
  │ Template               │ Trigger                                             │
  ├────────────────────────┼─────────────────────────────────────────────────────┤
  │ verify_email           │ Parent registration                                 │
  │ app_received           │ Application submitted → school                      │
  │ app_approved           │ School approves → parent                            │
  │ app_rejected           │ School rejects → parent                             │
  │ info_requested         │ School requests info → parent                       │
  │ info_provided          │ Parent responds to request → school                 │
  │ app_reminder           │ 7 days no school action → school                    │
  │ profile_incomplete     │ Parent login + incomplete profile                   │
  └────────────────────────┴─────────────────────────────────────────────────────┘
```

---

## 6. Data flow: school onboarding

```
                    SCHOOL ONBOARDING FLOW

  Platform Admin /          API Gateway          Enrolment API            Database
  School Contact                │                     │                      │
    │                           │                     │                      │
    │  POST /schools/onboard    │                     │                      │
    │  {name, board, address,   │                     │                      │
    │   contact_email, ...}     │                     │                      │
    │──────────────────────────►│────────────────────►│                      │
    │                           │                     │  Validate school data│
    │                           │                     │  INSERT schools      │
    │                           │                     │  Generate embed_link │
    │                           │                     │  (school-specific    │
    │                           │                     │   signed URL)        │
    │                           │                     │─────────────────────►│
    │                           │                     │                      │
    │  POST /schools/{id}/staff │                     │                      │
    │  {email, role, name}      │                     │                      │
    │──────────────────────────►│────────────────────►│                      │
    │                           │                     │  INSERT school_staff │
    │                           │                     │  Send setup email    │
    │                           │                     │─────────────────────►│
    │  ◄── embed link + creds ──────────────────────│                      │
    │                           │                     │                      │
    │                           │                     │                      │
    │  School places [Apply Now]│                     │                      │
    │  button on their website  │                     │                      │
    │  with the embed link      │                     │                      │
    │                           │                     │                      │
```

---

## 7. API route map

### Parent-facing APIs

| Method | Endpoint | Description | Auth | Phase |
|--------|----------|-------------|------|-------|
| POST | `/api/v1/auth/register` | Parent registration | None | P1.1 |
| POST | `/api/v1/auth/verify-email` | Email verification | None | P1.1 |
| POST | `/api/v1/auth/login` | Parent login | None | P1.1 |
| POST | `/api/v1/auth/refresh` | Refresh JWT | JWT | P1.1 |
| GET | `/api/v1/parents/profile` | Get parent profile | JWT (parent) | P1.2 |
| PUT | `/api/v1/parents/profile` | Update profile | JWT (parent) | P1.2 |
| POST | `/api/v1/parents/profile/id-proof` | Upload ID proof | JWT (parent) | P1.2 |
| GET | `/api/v1/parents/dashboard` | Dashboard summary | JWT (parent) | P1.2 |
| GET | `/api/v1/schools/search` | Search schools (board, area) | JWT (parent) | P1.3 |
| GET | `/api/v1/schools/{id}` | School detail | JWT (parent) | P1.3 |
| GET | `/api/v1/schools/compare` | Compare schools side-by-side | JWT (parent) | P2.2 |
| POST | `/api/v1/applications` | Create application | JWT (parent) | P1.3 |
| GET | `/api/v1/applications` | List my applications | JWT (parent) | P1.3 |
| GET | `/api/v1/applications/{id}` | Application detail + status | JWT (parent) | P1.3 |
| PUT | `/api/v1/applications/{id}` | Update application | JWT (parent) | P1.3 |
| POST | `/api/v1/applications/{id}/documents` | Upload documents | JWT (parent) | P1.3 |
| POST | `/api/v1/applications/{id}/respond-info` | Respond to info request | JWT (parent) | P1.4 |
| POST | `/api/v1/chatbot/start` | Start agentic conversation | JWT (parent) | P2.1 |
| POST | `/api/v1/chatbot/respond` | Continue conversation | JWT (parent) | P2.1 |
| GET | `/api/v1/chatbot/summary` | Get completed summary | JWT (parent) | P2.1 |

### School-facing APIs

| Method | Endpoint | Description | Auth | Phase |
|--------|----------|-------------|------|-------|
| POST | `/api/v1/auth/staff/login` | School staff login | None | P1.4 |
| GET | `/api/v1/staff/applications` | List applications for my school | JWT (staff) | P1.4 |
| GET | `/api/v1/staff/applications/{id}` | Application detail | JWT (staff) | P1.4 |
| POST | `/api/v1/staff/applications/{id}/approve` | Approve application | JWT (staff, reviewer) | P1.4 |
| POST | `/api/v1/staff/applications/{id}/reject` | Reject application | JWT (staff, reviewer) | P1.4 |
| POST | `/api/v1/staff/applications/{id}/request-info` | Request additional info | JWT (staff, reviewer) | P1.4 |
| GET | `/api/v1/staff/analytics` | School analytics dashboard | JWT (staff, admin) | P3.1 |

### Platform / Onboarding APIs

| Method | Endpoint | Description | Auth | Phase |
|--------|----------|-------------|------|-------|
| POST | `/api/v1/schools/onboard` | Register new school | API key (platform) | P1.4 |
| POST | `/api/v1/schools/{id}/staff` | Add staff member | API key (platform) | P1.4 |
| GET | `/api/v1/schools/{id}/embed-link` | Get embed link for school website | API key (platform) | P1.4 |
| PUT | `/api/v1/schools/{id}` | Update school details | JWT (staff, admin) | P1.4 |
| GET | `/api/v1/platform/analytics` | Platform-wide statistics | API key (platform) | P3.1 |

---

## 8. Database schema overview

See [diagrams/data_model_erd.md](diagrams/data_model_erd.md) for the full ERD.

### Core tables

| Table | Purpose | Key relationships |
|-------|---------|-------------------|
| `parents` | Parent user accounts | Owns applications |
| `parent_profiles` | Extended profile (phone, ID proof, address) | 1:1 with parents |
| `schools` | Registered school directory | Has staff, receives applications |
| `school_staff` | School employee accounts | Belongs to school; has role + permissions |
| `applications` | Parent application records | Belongs to parent; linked to schools via `application_schools` |
| `application_schools` | Junction: application ↔ school | Tracks per-school status (pending/approved/rejected/info_requested) |
| `application_documents` | Uploaded documents per application | Belongs to application; stored in object storage |
| `review_actions` | Append-only review history | Tracks who did what when; belongs to application_school |
| `info_requests` | Requests for additional information | School→parent; linked to application_school |
| `info_responses` | Parent responses to info requests | Parent→school; linked to info_request |
| `notifications` | Notification log | Tracks all sent notifications with delivery status |
| `chatbot_sessions` | Agentic conversation state (Phase 2) | Belongs to parent; maps to application |

---

## 9. Authentication architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOWS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PARENT AUTH (email + verification)                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. Register → email + password → verification email sent   │ │
│  │ 2. Verify → click link → account activated                 │ │
│  │ 3. Login → email + password → JWT issued                   │ │
│  │ 4. JWT contains: {parent_id, role: "parent", email}        │ │
│  │ 5. Profile gate: middleware checks profile_complete flag    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  SCHOOL STAFF AUTH (credentials from onboarding)                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. Onboarding → platform creates school + staff accounts   │ │
│  │ 2. Staff receives setup email → sets password              │ │
│  │ 3. Login → email + password → JWT issued                   │ │
│  │ 4. JWT contains: {staff_id, school_id, role, permissions}  │ │
│  │ 5. School scope: all queries filtered by JWT.school_id     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ROLE-BASED ACCESS CONTROL                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Parent Roles:                                               │ │
│  │   • parent — full access to own applications + profile      │ │
│  │                                                              │ │
│  │ School Staff Roles:                                          │ │
│  │   • school_admin — manage school settings + all staff       │ │
│  │   • reviewer — view + act on applications                   │ │
│  │   • viewer — read-only access to applications               │ │
│  │                                                              │ │
│  │ Platform Roles:                                              │ │
│  │   • platform_admin — school onboarding + analytics          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  SCOPE ISOLATION                                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ • Parents see ONLY their own applications                   │ │
│  │ • School staff see ONLY applications to their school        │ │
│  │ • Platform admin sees aggregated analytics only             │ │
│  │ • JWT school_id enforced at service layer, not just router  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Deployment architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOYMENT                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐      ┌──────────────┐     ┌────────────────┐  │
│  │ CDN           │      │ API Gateway   │     │ Email Service  │  │
│  │ (Cloudflare)  │      │ (Traefik)     │     │ (Resend)       │  │
│  │ Static assets │      │ TLS + routing │     │ Transactional  │  │
│  └──────┬───────┘      └──────┬───────┘     └────────────────┘  │
│         │                      │                                  │
│         ▼                      ▼                                  │
│  ┌──────────────┐      ┌──────────────────┐                      │
│  │ Frontend SPA  │      │ Enrolment API    │                      │
│  │ (React)       │      │ (FastAPI)        │                      │
│  │ Fly.io static │      │ Fly.io container │                      │
│  └──────────────┘      └──────┬───────────┘                      │
│                                │                                  │
│                    ┌───────────┼───────────┐                      │
│                    ▼           ▼           ▼                      │
│           ┌──────────┐ ┌──────────┐ ┌──────────────┐            │
│           │PostgreSQL│ │ Redis    │ │Object Storage│            │
│           │(Neon)    │ │(Upstash) │ │(Cloudflare   │            │
│           │          │ │Sessions  │ │ R2)          │            │
│           │Enrolment │ │+ cache   │ │Documents     │            │
│           │schema    │ │          │ │+ ID proofs   │            │
│           └──────────┘ └──────────┘ └──────────────┘            │
│                                                                   │
│  Cost target: < $20/month (Fly.io + Neon free tier + R2 free)   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

---

## 11. AI Assistant Bot Architecture (LangChain-based)

> **Framework:** LangChain (Python) + LangSmith (observability)
> **Phase:** Post-MVP (Sprint 2, Weeks 3–4)
> **Depends on:** MVP School-First flow live and stable

### 11.1 Why LangChain

| Component | What It Does | Why We Need It |
|-----------|-------------|----------------|
| **Chains** | Sequential pipeline of steps | Parent message → extract data → validate → ask next question |
| **Memory** | Automatic conversation history management | Bot remembers what the parent already said without manual tracking |
| **Tools** | Bot can call Python functions | Validate DOB, check school eligibility, upload documents |
| **Output Parsers** | Force LLM to return structured JSON | Get `{name: "Priya", dob: "2018-03-15"}` instead of free text |
| **Callbacks** | Hook into every LLM call | Send traces to LangSmith for monitoring |
| **LangSmith** | Observability dashboard | See every conversation, debug failures, measure accuracy |

### 11.2 Agent Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ENROLMENT AI AGENT — LANGCHAIN ARCHITECTURE                            │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  FRONTEND (ChatbotPage.tsx)                                        │  │
│  │  Chat UI: message bubbles, typing indicator, file upload           │  │
│  │  "Switch to Form" button always visible                            │  │
│  │  Progress bar: Student → Academics → Documents → Review            │  │
│  └────────────────────────────┬───────────────────────────────────────┘  │
│                               │                                          │
│                               ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  API LAYER (FastAPI)                                               │  │
│  │  POST /chatbot/start    → create session, return welcome           │  │
│  │  POST /chatbot/respond  → process message, return next question    │  │
│  │  GET  /chatbot/summary  → return structured application data       │  │
│  │  POST /chatbot/switch   → transfer to manual form (pre-filled)    │  │
│  └────────────────────────────┬───────────────────────────────────────┘  │
│                               │                                          │
│                               ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  LANGCHAIN AGENT (chatbot_service.py)                              │  │
│  │                                                                    │  │
│  │  CHAIN: EnrolmentConversationChain                                 │  │
│  │                                                                    │  │
│  │  Step 1: UNDERSTAND                                                │  │
│  │  ┌──────────────────────────────────────────────────────────────┐  │  │
│  │  │ Input: parent's raw message                                  │  │  │
│  │  │ LLM call: "What did the parent say? Extract fields."         │  │  │
│  │  │ Output: {extracted_fields: {name: "X", dob: "Y"}}           │  │  │
│  │  │ Uses: LangChain OutputParser (Pydantic model)                │  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  │                         │                                          │  │
│  │                         ▼                                          │  │
│  │  Step 2: VALIDATE                                                  │  │
│  │  ┌──────────────────────────────────────────────────────────────┐  │  │
│  │  │ Run validation rules on each extracted field                 │  │  │
│  │  │ If invalid → ask parent to correct that specific field       │  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  │                         │                                          │  │
│  │                         ▼                                          │  │
│  │  Step 3: DETECT CORRECTIONS                                        │  │
│  │  ┌──────────────────────────────────────────────────────────────┐  │  │
│  │  │ Compare new extraction with existing session data             │  │  │
│  │  │ If field changed → ask parent to confirm correction          │  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  │                         │                                          │  │
│  │                         ▼                                          │  │
│  │  Step 4: UPDATE STATE                                              │  │
│  │  ┌──────────────────────────────────────────────────────────────┐  │  │
│  │  │ Save validated fields → advance topic if complete            │  │  │
│  │  │ Save session to DB (crash recovery)                          │  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  │                         │                                          │  │
│  │                         ▼                                          │  │
│  │  Step 5: RESPOND                                                   │  │
│  │  ┌──────────────────────────────────────────────────────────────┐  │  │
│  │  │ LLM generates friendly next question                         │  │  │
│  │  │ Return: {message, progress, current_topic, fields_remaining} │  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  │  TOOLS (LangChain Tool functions the agent can call):              │  │
│  │  ┌──────────────────────────────────────────────────────────────┐  │  │
│  │  │ validate_date_of_birth(dob_string) → {valid, parsed_date}   │  │  │
│  │  │ validate_phone_number(phone) → {valid, formatted}           │  │  │
│  │  │ check_school_eligibility(grade, school_id) → {eligible}     │  │  │
│  │  │ search_schools(board, area) → {school_list}                 │  │  │
│  │  │ upload_document(file, category) → {url, status}             │  │  │
│  │  │ get_missing_fields(session_id) → {missing_required_fields}  │  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  │  MEMORY (LangChain ConversationBufferMemory):                      │  │
│  │  ┌──────────────────────────────────────────────────────────────┐  │  │
│  │  │ Full conversation history per session                        │  │  │
│  │  │ Loaded from DB on each request, saved back after response    │  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                               │                                          │
│                    ┌──────────┼──────────┐                               │
│                    ▼          ▼          ▼                                │
│           ┌──────────┐ ┌──────────┐ ┌──────────────┐                    │
│           │PostgreSQL│ │ LLM      │ │ LangSmith    │                    │
│           │chatbot_  │ │(GPT-4o / │ │(Observability│                    │
│           │sessions  │ │ Claude)  │ │ Dashboard)   │                    │
│           └──────────┘ └──────────┘ └──────────────┘                    │
└──────────────────────────────────────────────────────────────────────────┘
```

### 11.3 Detailed Message Processing Pipeline

Every parent message goes through this exact flow:

```
PARENT SENDS MESSAGE
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ 1. LOAD SESSION                                          │
│    • Fetch chatbot_session from PostgreSQL by session_id │
│    • Load conversation_history into LangChain Memory     │
│    • Load application_data (fields collected so far)     │
│    • Load current_topic (e.g., "student_details")        │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ 2. EXTRACT STRUCTURED DATA                               │
│    • Send to LLM: system prompt + history + new message  │
│    • LangChain OutputParser forces JSON response:        │
│      {                                                    │
│        "extracted_fields": {"student_name": "Priya",     │
│                             "date_of_birth": "2018-03-15"}│
│        "is_correction": false,                           │
│        "parent_intent": "providing_info"                 │
│      }                                                    │
│    • If LLM returns unparseable response → retry once    │
│    • If retry fails → ask parent to rephrase             │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ 3. VALIDATE EACH FIELD                                   │
│                                                           │
│    student_name:                                          │
│      ✓ Length 2–100 characters                           │
│      ✓ No numbers or special characters                  │
│      ✗ Failed → "Could you spell the full name again?"   │
│                                                           │
│    date_of_birth:                                         │
│      ✓ Parse formats (15/03/2018, March 15 2018, etc.)  │
│      ✓ Age between 3 and 18                              │
│      ✗ "around 8" → ask for exact date                   │
│                                                           │
│    grade_applying_for:                                    │
│      ✓ Valid grade (LKG, UKG, 1–12)                     │
│      ✓ Normalize ("first grade" → "1")                   │
│                                                           │
│    phone_number:                                          │
│      ✓ 10-digit Indian mobile                            │
│      ✓ Strip +91, spaces, dashes                         │
│                                                           │
│    Result: {valid_fields: {...}, invalid_fields: [...]}  │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ 4. DETECT & HANDLE CORRECTIONS                           │
│                                                           │
│    Compare extracted fields with existing session data:   │
│                                                           │
│    CASE A: New field → save it                           │
│    CASE B: Same value → skip                             │
│    CASE C: Different value (CORRECTION)                  │
│      → "I had age as 3. Change to 6?"                    │
│      → If confirmed → overwrite old value                │
│    CASE D: Multiple answers in one message               │
│      → Extract ALL, validate each separately             │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ 5. UPDATE SESSION STATE                                  │
│    • Merge valid_fields into application_data             │
│    • Check: all required fields for current topic done?   │
│      Yes → advance to next topic                          │
│      No  → ask for remaining fields                       │
│    • Save session to PostgreSQL (crash recovery)          │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ 6. GENERATE RESPONSE                                     │
│    • LLM generates friendly next question                 │
│    • Acknowledges what parent said, asks next thing       │
│    • Return: {message, progress, current_topic,           │
│              fields_collected, fields_remaining}          │
└─────────────────────────────────────────────────────────┘
```

### 11.4 Topic Progression

```
welcome → student_details → academic_history → additional_info → documents → review → school_selection → submitted

FIELDS REQUIRED PER TOPIC:

student_details:
  ├── student_full_name (required)
  ├── date_of_birth (required)
  ├── gender (required)
  └── nationality (optional)

academic_history:
  ├── grade_applying_for (required)
  ├── previous_school_name (optional)
  ├── previous_board (optional)
  └── previous_marks (optional)

additional_info:
  ├── emergency_contact_name (required)
  ├── emergency_contact_phone (required)
  ├── special_needs (optional)
  └── medical_conditions (optional)

documents:
  ├── birth_certificate (required)
  ├── recent_photo (required)
  └── previous_transcripts (optional)

review:
  └── parent confirms all data is correct

school_selection:
  └── at least one active school selected
```

### 11.5 Edge Case Handling — Detailed Workflows

#### Edge Case 1: Vague answers

```
Parent: "he's around 8 years old"
  → EXTRACT: age_approximate = 8
  → VALIDATE: no exact DOB
  → RESPOND: "So he's about 8 — born around 2018. Could you tell me
    his exact date of birth? For example: 15 March 2018"
  → Parent: "March 15, 2018"
  → EXTRACT: dob = 2018-03-15
  → VALIDATE: valid ✓
  → SAVE
```

#### Edge Case 2: Parent corrects data mid-conversation

```
Turn 3 — Parent: "my son is 3 years old, born 2023"
  → SAVE: dob = 2023-XX-XX

Turn 7 — Parent: "wait, he's actually 6"
  → DETECT: age conflicts with stored value (3 vs 6)
  → RESPOND: "No problem! I had age as 3 (born 2023). Change to 6
    (born around 2020)? Could you confirm the exact date?"
  → Parent: "yes, June 10, 2020"
  → VALIDATE: 2020-06-10, age = 6 ✓
  → SAVE: dob = 2020-06-10 (overwrites old value)
  → LOG: correction recorded in session history
```

#### Edge Case 3: Multiple answers in one message

```
Parent: "His name is Arun Kumar, born 5 Jan 2017, he's a boy, Class 4"
  → EXTRACT: {name: "Arun Kumar", dob: "2017-01-05", gender: "male", grade: "4"}
  → VALIDATE: all 4 fields valid ✓
  → UPDATE: student_details COMPLETE + grade partially fills academic_history
  → RESPOND: "Got it! Arun Kumar, born Jan 5 2017, boy, applying for Class 4.
    Was Arun in any school before?"
```

#### Edge Case 4: Off-topic question

```
Parent: "What are the school timings?"
  → EXTRACT: no application fields found
  → DETECT INTENT: asking_question (not providing info)
  → RESPOND: "I don't have school timing details — you can check that
    on the school's website. Let's continue. Could you tell me your
    child's name?"
```

#### Edge Case 5: Mixed Hindi-English

```
Parent: "mera beta ka naam Arjun hai, uski age 7 hai"
  → LLM understands mixed language natively (GPT-4o / Claude)
  → EXTRACT: {student_name: "Arjun", age: 7}
  → VALIDATE: name ✓, age needs exact DOB
  → RESPOND: "Arjun, age 7 — noted! Could you tell me his exact date of birth?"
```

### 11.6 Fallback Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  FALLBACK DECISION TREE                                          │
│                                                                   │
│  Parent sends message                                            │
│       │                                                           │
│       ▼                                                           │
│  LLM responds within 5s?                                         │
│    Yes → normal flow                                              │
│    No  → retry once                                               │
│           │                                                       │
│           ▼                                                       │
│         Retry succeeds?                                           │
│           Yes → normal flow                                       │
│           No  → GRACEFUL DEGRADATION (see below)                 │
│                                                                   │
│  GRACEFUL DEGRADATION:                                           │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ 1. Load all collected data from chatbot_session              ││
│  │ 2. Map to application form fields                            ││
│  │ 3. Redirect to /apply/{school_id}?prefill=session_{id}      ││
│  │ 4. Form opens with chatbot-collected data pre-filled         ││
│  │ 5. Parent only fills remaining empty fields                  ││
│  │ Session status → "switched_to_form"                          ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                   │
│  OTHER SCENARIOS:                                                │
│                                                                   │
│  Bot can't understand after 3 tries on same field:              │
│    → "Having trouble understanding. You can:                     │
│       1. Try again with different words                          │
│       2. Skip this (if optional)                                 │
│       3. Switch to the regular form"                             │
│                                                                   │
│  Parent closes browser mid-conversation:                        │
│    → Session saved in PostgreSQL                                 │
│    → On return: "Welcome back! Continue where you left off?"     │
│                                                                   │
│  Complete LLM service outage:                                   │
│    → Chatbot button shows: "AI Assistant temporarily             │
│      unavailable. Please use the application form."              │
│    → Manual form is 100% independent of chatbot                  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. Evals — AI Agent Testing Framework

> **Tool:** LangSmith Evaluations + custom test suite
> **Purpose:** Verify the chatbot works correctly before deploy and continuously after

### 12.1 Three Levels of Evals

```
                    ┌──────────────┐
                    │  LEVEL 3     │  Run before every deploy
                    │  End-to-End  │  10 full conversations
                    │  Conversation│  Must pass: 9/10 complete
                    └──────┬───────┘
                           │
                ┌──────────┴──────────┐
                │  LEVEL 2            │  Run daily (automated)
                │  Scenario Tests     │  30 edge cases
                │  (corrections,      │  Must pass: 85%+
                │   vague inputs,     │
                │   multi-answer)     │
                └──────────┬──────────┘
                           │
           ┌───────────────┴───────────────┐
           │  LEVEL 1                       │  Run on every commit
           │  Field Extraction Tests        │  50+ test cases
           │  (unit-level: input → output)  │  Must pass: 95%+
           └───────────────────────────────┘
```

### 12.2 Level 1 — Field Extraction Evals (50+ tests)

| # | Input (parent says) | Expected Extraction | Pass If |
|---|--------------------|--------------------|---------|
| 1 | "My daughter Priya was born 15 March 2018" | name="Priya", dob="2018-03-15", gender="female" | All 3 fields correct |
| 2 | "He's 8 years old" | age=8, needs_dob_followup=true | Age extracted, follow-up flagged |
| 3 | "Applying for class 4 at DPS" | grade="4", previous_school="DPS" | Both fields correct |
| 4 | "uska naam Arjun hai" (Hindi) | name="Arjun" | Name extracted from Hindi |
| 5 | "DOB: 05/01/2017" | dob="2017-01-05" (DD/MM for India) | Correct date format |
| 6 | "She was born in March 2018" | dob_partial="2018-03", needs_exact=true | Partial date + follow-up |
| 7 | "Emergency: husband, 9876543210" | contact_name="husband", phone="9876543210" | Both fields correct |
| 8 | "No special needs" | special_needs=null | Correctly null |
| 9 | "mild asthma" | medical_conditions="mild asthma" | Condition captured |
| 10 | "CBSE board, 85% marks" | board="CBSE", marks="85%" | Both fields correct |

**Threshold:** 95% of 50+ tests must extract correctly.

### 12.3 Level 2 — Scenario Evals (30 edge cases)

| # | Scenario | What We Test | Pass If |
|---|----------|-------------|---------|
| 1 | Parent corrects age (3 → 6) | Correction detection + confirmation | Correct final value saved |
| 2 | Vague DOB ("around 8") | Follow-up for exact date | Exact DOB eventually collected |
| 3 | 5 fields in one message | Multi-field extraction | All valid fields saved |
| 4 | Off-topic ("what are fees?") | Redirect to application | Conversation continues |
| 5 | Mixed Hindi-English | Multilingual understanding | Fields correctly extracted |
| 6 | Invalid phone (8 digits) | Validation + re-ask | Valid phone eventually collected |
| 7 | Skip optional field | Topic advancement | Moves to next topic |
| 8 | Edit during review | Section navigation | Correct section re-opened |
| 9 | "Use the form instead" | Switch to pre-filled form | All data transferred |
| 10 | LLM returns bad JSON | Retry + rephrase request | No crash, graceful handling |
| 11 | Empty message | Re-ask current question | Bot repeats question |
| 12 | Wrong file type upload | Format error message | Clear error shown |

**Threshold:** 85% of 30+ scenarios handled correctly.

### 12.4 Level 3 — End-to-End Conversation Evals (10 full runs)

| # | Persona | Style | Pass If |
|---|---------|-------|---------|
| 1 | Straightforward parent | Exact answers | Completes in 8–10 turns |
| 2 | Verbose parent | Long paragraphs | Extracts only relevant fields |
| 3 | Correcting parent | Changes answers | Final data reflects corrections |
| 4 | Vague parent | Approximate answers | Gets exact data via follow-ups |
| 5 | Hindi-English parent | Mixed language | Understands and extracts |
| 6 | Impatient parent | Wants to skip steps | Skips optional, enforces required |
| 7 | Switches to form | Requests form mid-way | Form pre-filled correctly |
| 8 | Resumes later | Closes browser, returns | Resumes from correct state |
| 9 | Multiple children mentioned | Mentions siblings | Collects for one app only |
| 10 | All edge cases combined | Corrections + vague + multi | Completes successfully |

**Threshold:** 9 out of 10 must complete with correct data.

### 12.5 When Evals Run

```
Developer pushes code → CI/CD Pipeline:
  1. Unit tests (Python)           ── standard code tests
  2. Level 1 Evals (50+ cases)     ── extraction accuracy via LangSmith
  3. Level 2 Evals (30 scenarios)  ── edge case handling via LangSmith
  4. Level 3 Evals (10 convos)     ── full end-to-end (pre-deploy only)

Daily automated run (production):
  • Level 1 + Level 2 against production LLM
  • Detects if LLM model update caused regression
  • Alerts team if accuracy drops below threshold
```

---

## 13. Observability — Monitoring the Bot in Production

> **Tool:** LangSmith (built into LangChain) + application metrics

### 13.1 LangSmith Tracing

Every LLM call is automatically traced with:
- Input prompt (system + history + user message)
- Output response (raw LLM text)
- Parsed extraction (structured fields)
- Latency (time per call)
- Token count (input + output) and cost
- Error details (if LLM failed or returned unparseable response)

LangSmith Dashboard shows:
- Live conversation traces (click to see full history)
- Aggregate metrics: avg latency, error rate, tokens per conversation
- Filter by: date, success/failure, session_id

### 13.2 Application Metrics & Alerts

| Metric | Target | Alert If |
|--------|--------|----------|
| Chatbot response time | < 3 seconds | > 5 seconds |
| Conversation completion rate | > 85% | < 70% |
| Fallback to form rate | < 15% | > 25% |
| Extraction accuracy | > 95% | < 90% |
| Average turns to complete | 8–12 | > 20 |
| LLM error rate | < 2% | > 5% |

### 13.3 Alert Actions

| Alert | Auto-Action |
|-------|------------|
| LLM error rate > 5% for 10 minutes | Show "Use form instead" banner on chatbot page |
| Avg latency > 5s for 5 minutes | Log warning, investigate LLM provider |
| Fallback rate > 25% in last hour | Alert team — possible prompt or extraction regression |

### 13.4 LangSmith Trace Example

```
Trace: session_abc123 / Turn 4

INPUT:
  System: "You are an enrolment assistant for Indian schools..."
  History: [3 prior turns]
  User: "my son Arun is 6, born June 2020, was at DPS Noida"

PARSED EXTRACTION:
  {student_name: "Arun", dob: "2020-06-XX", previous_school: "DPS Noida"}

VALIDATION:
  student_name: ✓    dob: ⚠ needs exact date    previous_school: ✓

METRICS:  Latency: 1.8s | Tokens: 1,247 in + 412 out | Cost: $0.013
```

---

## 14. Veda School Integration Architecture

> **Current state:** Enrolment module is 100% standalone
> **Future:** REST API integration after MVP is stable

### 14.1 Current vs Future

```
CURRENT (MVP): STANDALONE — NO DIRECT LINK

  Veda School              Enrolment Module
  (vedaacademy.com)        (smartschooladmissions.com)
       ×── no connection ──×
  School data manually entered during onboarding.


FUTURE: INTEGRATED VIA REST API

  Veda School    ◄──── REST API ────►    Enrolment Module

  On approval:
    Enrolment → Veda: push student + parent + documents
  On school sync:
    Veda → Enrolment: push school details (name, board, grades)
```

### 14.2 Integration Points (Future)

| # | Integration | Direction | Trigger | Data |
|---|------------|-----------|---------|------|
| 1 | School sync | Veda → Enrolment | School registered in Veda | name, board, area, grades, contact |
| 2 | Student push | Enrolment → Veda | Application approved | student name, DOB, grade, parent contact |
| 3 | Document share | Enrolment → Veda | Application approved | Signed URLs to documents in R2 |
| 4 | Status callback | Veda → Enrolment | Student admitted | admission_confirmed, roll_number |

### 14.3 Integration API Contract (Future)

```
Enrolment → Veda (on approval):
POST {veda_api}/api/v1/integration/enrolment/admit
{
  "school_veda_id": "uuid",
  "student": {"name": "...", "dob": "...", "gender": "...", "grade": "..."},
  "parent": {"name": "...", "email": "...", "phone": "..."},
  "documents": [{"type": "birth_certificate", "url": "signed-url"}],
  "enrolment_application_id": "uuid"
}

Veda → Enrolment (school sync):
POST {enrolment_api}/api/v1/integration/veda/school-sync
{
  "veda_school_id": "uuid",
  "name": "Delhi Public School, Noida",
  "board": "CBSE",
  "grades_offered": ["LKG","UKG","1","2","3","4","5"],
  "status": "active"
}
```

### 14.4 Why Standalone First

| Reason | Explanation |
|--------|------------|
| Independent deployment | Ships without waiting for Veda changes |
| No tenant dependency | Parents don't need Veda accounts |
| Simpler MVP | No cross-service auth or sync complexity |
| Easy to integrate later | Clean REST boundary — one webhook per approval |

---

## 15. Application Validation Architecture

### 15.1 Four-Layer Validation Pipeline

```
PARENT SUBMITS DATA (form or chatbot)
       │
       ▼
  LAYER 1: FRONTEND (React)
    • Required field checks
    • Format checks (email, phone, date)
    • File type/size checks
    • Instant red border + error message
       │
       ▼
  LAYER 2: API (FastAPI / Pydantic)
    • Type checking, length limits, enum validation
    • File MIME type verification
    • Returns 422 with specific field errors
       │
       ▼
  LAYER 3: SERVICE (Business Rules)
    • Duplicate check (parent + school + year)
    • Profile completeness gate
    • School active check
    • Permission check (staff school scope)
    • State machine (valid status transitions only)
       │
       ▼
  LAYER 4: DATABASE (PostgreSQL)
    • NOT NULL, UNIQUE, FOREIGN KEY, CHECK constraints
    • Last line of defense
```

### 15.2 Application Status Transitions

```
  draft → submitted
  submitted → approved | rejected | info_requested
  info_requested → submitted (parent responds)
  approved → (terminal)
  rejected → (terminal)

  Any other transition is rejected with 400 error.
```

### 15.3 Error Response Format

```json
{
  "status": 422,
  "error": "validation_error",
  "details": [
    {"field": "date_of_birth", "message": "Child must be between 3 and 18 years old"},
    {"field": "phone", "message": "Must be exactly 10 digits"}
  ]
}
```

---

## 16. Document Management Architecture

### 16.1 Upload Pipeline

```
Parent uploads file
  → Frontend: check size ≤ 5MB, type = PDF/JPG/PNG
  → API: verify MIME type, strip EXIF metadata, generate unique path
  → Upload to Cloudflare R2 (private bucket)
  → Save metadata to application_documents table

Staff views document
  → API checks staff.school_id matches application's school
  → Generate time-limited signed URL (expires 15 min)
  → Staff never gets permanent document access
```

### 16.2 Document Categories

| Category | Required | Max Files | Max Size | Types |
|----------|----------|-----------|----------|-------|
| Birth certificate | Yes | 1 | 5 MB | PDF, JPG, PNG |
| Recent photograph | Yes | 1 | 2 MB | JPG, PNG |
| Previous transcripts | No | 5 | 5 MB each | PDF |
| ID proof (parent) | Yes | 1 | 5 MB | PDF, JPG, PNG |
| Additional | No | 10 | 5 MB each | PDF, JPG, PNG |

---

---

## 17. AI Agent — Technology Decisions & Environment Config

> **Purpose:** Defines exactly what tools/models to use during development, testing, and production
> **Applies to:** Sprint 2 (Weeks 3–4) — AI chatbot agent build

### 17.1 Environment Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  THREE ENVIRONMENTS                                               │
│                                                                    │
│  LOCAL DEV          TESTING / STAGING        PRODUCTION            │
│  (your laptop)      (CI + preview deploy)    (smartschooladmissions│
│                                                .com)               │
│  ┌──────────┐       ┌──────────────┐         ┌──────────────┐     │
│  │ GPT-4o-  │       │ GPT-4o-mini  │         │ GPT-4o-mini  │     │
│  │ mini     │       │ + eval suite │         │ (primary)    │     │
│  │ (cheap,  │       │ via LangSmith│         │              │     │
│  │  fast)   │       │              │         │ Claude Haiku │     │
│  └──────────┘       └──────────────┘         │ (fallback)   │     │
│                                               └──────────────┘     │
│  LangSmith:         LangSmith:               LangSmith:           │
│  dev project        staging project          prod project          │
│                                                                    │
│  DB: local Docker   DB: Neon branch          DB: Neon main        │
│  Redis: local       Redis: Upstash dev       Redis: Upstash prod  │
│  Storage: local     Storage: R2 test bucket  Storage: R2 prod     │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

### 17.2 LLM Provider Decision

```
┌──────────────────────────────────────────────────────────────────┐
│  LLM PROVIDER STACK                                               │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  LiteLLM (unified wrapper)                                  │   │
│  │  → Lets us switch providers with config change, no code     │   │
│  │  → Handles retries, fallback, timeout automatically         │   │
│  └────────────────────┬───────────────────────────────────────┘   │
│                       │                                            │
│         ┌─────────────┼─────────────┐                              │
│         ▼             ▼             ▼                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                        │
│  │ PRIMARY  │  │ FALLBACK │  │ EVAL     │                        │
│  │ GPT-4o-  │  │ Claude   │  │ GPT-4o   │                        │
│  │ mini     │  │ Haiku    │  │ (full)   │                        │
│  │          │  │ 4.5      │  │          │                        │
│  │ ₹1/app   │  │ ₹0.50/   │  │ ₹10/app  │                        │
│  │ <1s resp │  │ app      │  │ highest  │                        │
│  │          │  │ <1s resp │  │ accuracy │                        │
│  └──────────┘  └──────────┘  └──────────┘                        │
│                                                                    │
│  WHY THIS STACK:                                                  │
│  • GPT-4o-mini: best cost/speed/accuracy balance for production   │
│  • Claude Haiku: different provider = true redundancy             │
│  • GPT-4o full: only for running evals (accuracy baseline)        │
│  • LiteLLM: auto-fallback if primary fails                       │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

### 17.3 Complete Tech Stack for Agent

| Layer | Technology | Version | Purpose | Environment |
|-------|-----------|---------|---------|-------------|
| **LLM wrapper** | LiteLLM | latest | Unified API to call any LLM; auto-fallback | All |
| **Agent framework** | LangChain | 0.3+ | Chains, memory, tools, output parsers | All |
| **Observability** | LangSmith | cloud | Trace every LLM call; eval dashboard | All |
| **Primary LLM** | GPT-4o-mini (OpenAI) | latest | Fast + cheap extraction and response | All |
| **Fallback LLM** | Claude Haiku 4.5 (Anthropic) | latest | Auto-switch if OpenAI is down | Staging + Prod |
| **Eval baseline LLM** | GPT-4o (OpenAI) | latest | Highest accuracy for eval comparison | Testing only |
| **Structured output** | Function Calling (native) | — | Force LLM to return JSON schema | All |
| **Memory** | ConversationBufferMemory | — | Full conversation history per session | All |
| **State store** | PostgreSQL (chatbot_sessions) | 16+ | Persist conversation state across requests | All |
| **Prompt management** | LangChain PromptTemplates | — | Version-controlled system prompts | All |
| **Response mode** | Non-streaming | — | Simple HTTP request/response (no WebSocket) | All |

### 17.4 Environment-Specific Configuration

#### LOCAL DEVELOPMENT

```
Purpose: Build and debug the agent

LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
LLM_FALLBACK_MODEL=              # no fallback needed locally
LLM_TEMPERATURE=0.1              # low creativity, high consistency
LLM_MAX_TOKENS=1000              # cap response length
LLM_TIMEOUT_SECONDS=10           # fail fast locally

LANGSMITH_PROJECT=enrolment-dev
LANGSMITH_TRACING=true            # trace all calls for debugging

DATABASE_URL=postgresql://localhost:5432/enrolment_dev
REDIS_URL=redis://localhost:6379

RATE_LIMIT_MESSAGES_PER_MIN=100   # no limit during dev
RATE_LIMIT_SESSIONS_PER_DAY=100
LLM_DAILY_COST_CAP_INR=100       # ₹100/day cap for dev
```

**What you do locally:**
- Write and test LangChain chains
- Test extraction with sample inputs
- Debug via LangSmith dev project traces
- Run Level 1 evals manually
- Test fallback by intentionally setting wrong API key

#### TESTING / STAGING (CI + preview deploy)

```
Purpose: Run evals, catch regressions before production

LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
LLM_FALLBACK_MODEL=claude-haiku-4-5-20251001
LLM_TEMPERATURE=0.1
LLM_MAX_TOKENS=1000
LLM_TIMEOUT_SECONDS=8

LANGSMITH_PROJECT=enrolment-staging
LANGSMITH_TRACING=true

DATABASE_URL=postgresql://neon-staging/enrolment_staging
REDIS_URL=redis://upstash-staging

RATE_LIMIT_MESSAGES_PER_MIN=20
RATE_LIMIT_SESSIONS_PER_DAY=50
LLM_DAILY_COST_CAP_INR=500       # ₹500/day for test runs

EVAL_BASELINE_MODEL=gpt-4o       # full model for eval accuracy comparison
EVAL_LEVEL1_THRESHOLD=0.95       # 95% extraction accuracy
EVAL_LEVEL2_THRESHOLD=0.85       # 85% scenario pass rate
EVAL_LEVEL3_THRESHOLD=0.90       # 9/10 conversations complete
```

**What happens in staging:**
- CI runs Level 1 + Level 2 evals on every PR
- Level 3 evals run before deploy to production
- LangSmith staging project shows all eval traces
- Fallback chain tested (primary + Claude Haiku)
- If any eval threshold fails → deploy is blocked

#### PRODUCTION

```
Purpose: Live chatbot serving real parents

LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
LLM_FALLBACK_MODEL=claude-haiku-4-5-20251001
LLM_TEMPERATURE=0.1
LLM_MAX_TOKENS=1000
LLM_TIMEOUT_SECONDS=5            # strict timeout for UX
LLM_RETRY_COUNT=1                 # one retry before fallback
LLM_RETRY_DELAY_MS=500            # 500ms between retries

LANGSMITH_PROJECT=enrolment-prod
LANGSMITH_TRACING=true

DATABASE_URL=postgresql://neon-prod/enrolment_prod
REDIS_URL=redis://upstash-prod

RATE_LIMIT_MESSAGES_PER_MIN=10    # per parent
RATE_LIMIT_MESSAGES_PER_SESSION=50 # max messages in one conversation
RATE_LIMIT_SESSIONS_PER_DAY=5     # per parent
LLM_DAILY_COST_CAP_INR=500       # ₹500/day total budget

# Observability alerts
ALERT_ERROR_RATE_THRESHOLD=0.05   # alert if >5% errors
ALERT_LATENCY_THRESHOLD_MS=5000   # alert if avg >5s
ALERT_FALLBACK_RATE_THRESHOLD=0.25 # alert if >25% switch to form
```

**What happens in production:**
- LangSmith traces every real conversation
- Daily automated eval run (Level 1 + 2) against production LLM
- Alerts fire if metrics cross thresholds
- Auto-banner if LLM is down ("Use form instead")
- Cost cap prevents runaway LLM spending

### 17.5 LLM Fallback Chain — How It Works

```
Parent sends message
       │
       ▼
┌─────────────────────────────────────────────┐
│  LiteLLM Router                              │
│                                               │
│  Try 1: GPT-4o-mini (OpenAI)                │
│    ├── Success (< 5s) → return response      │
│    └── Fail (timeout / error / 5xx)          │
│         │                                     │
│         ▼                                     │
│  Retry: GPT-4o-mini (once, after 500ms)      │
│    ├── Success → return response              │
│    └── Fail again                             │
│         │                                     │
│         ▼                                     │
│  Try 2: Claude Haiku 4.5 (Anthropic)         │
│    ├── Success → return response              │
│    │   (same extraction schema works with     │
│    │    both providers via LiteLLM)           │
│    └── Fail                                   │
│         │                                     │
│         ▼                                     │
│  FALLBACK: Switch to manual form              │
│    → Load collected data from session          │
│    → Redirect to pre-filled form               │
│    → Log incident in LangSmith                 │
│                                               │
└─────────────────────────────────────────────┘

LiteLLM config (Python):

model_list = [
    {
        "model_name": "enrolment-bot",
        "litellm_params": {
            "model": "gpt-4o-mini",
            "api_key": OPENAI_API_KEY,
            "timeout": 5,
            "max_retries": 1,
        }
    },
    {
        "model_name": "enrolment-bot",
        "litellm_params": {
            "model": "claude-haiku-4-5-20251001",
            "api_key": ANTHROPIC_API_KEY,
            "timeout": 5,
            "max_retries": 0,
        }
    },
]
router = litellm.Router(model_list=model_list)
```

### 17.6 Prompt Strategy — Two-Prompt Approach

```
┌─────────────────────────────────────────────────────────────────┐
│  WHY TWO SEPARATE LLM CALLS PER TURN                            │
│                                                                   │
│  CALL 1: EXTRACTION (precise, no creativity)                     │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ System: "You are a data extraction tool. Extract structured   ││
│  │   fields from the parent's message. Return ONLY valid JSON.   ││
│  │   Do not generate conversation text."                         ││
│  │                                                                ││
│  │ Uses: Function Calling / Tool Use                             ││
│  │ Temperature: 0.0 (zero creativity)                            ││
│  │ Output: {extracted_fields: {...}, is_correction: bool}        ││
│  │                                                                ││
│  │ Cost: ~₹0.50 per call (small input, structured output)       ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                   │
│  CALL 2: RESPONSE GENERATION (friendly, natural)                 │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ System: "You are a friendly school enrolment assistant.        ││
│  │   Acknowledge what the parent said. Ask the next question.    ││
│  │   One topic at a time. Keep it short (2-3 sentences)."        ││
│  │                                                                ││
│  │ Input: includes validated fields + what's remaining            ││
│  │ Temperature: 0.3 (slightly creative for natural language)     ││
│  │ Output: plain text response to show parent                    ││
│  │                                                                ││
│  │ Cost: ~₹0.50 per call                                        ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                   │
│  Total per turn: ~₹1.00                                          │
│  Total per application (10 turns): ~₹10                          │
│  Total for 1,000 applications/month: ~₹10,000 (~$120)           │
│                                                                   │
│  WHY NOT ONE COMBINED CALL?                                      │
│  • Extraction + conversation in one call reduces accuracy         │
│  • Separate calls = each is simpler, more reliable               │
│  • Extraction at temp=0.0 gives consistent structured output     │
│  • Response at temp=0.3 gives natural conversational tone        │
│  • Easier to debug: extraction trace vs response trace           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 17.7 Rate Limiting & Cost Protection

```
┌─────────────────────────────────────────────────────────────────┐
│  RATE LIMITS (enforced at API layer via Redis)                   │
│                                                                   │
│  Per parent:                                                     │
│  ├── 10 messages per minute (prevent spam)                       │
│  ├── 50 messages per session (prevent infinite loops)            │
│  └── 5 sessions per day (prevent abuse)                          │
│                                                                   │
│  Global:                                                         │
│  ├── ₹500/day LLM cost cap (budget protection)                  │
│  └── 100 concurrent sessions max (server protection)             │
│                                                                   │
│  What happens when limit is hit:                                 │
│  ├── Per-minute: "You're sending messages too fast. Please wait  │
│  │   a moment." (429 response)                                    │
│  ├── Per-session: "This conversation has reached its limit.       │
│  │   Please review and submit, or start fresh." + auto-review    │
│  ├── Per-day: "You've used all your AI sessions for today.       │
│  │   Please use the regular application form."                   │
│  └── Cost cap: chatbot disabled for all users until next day;    │
│      manual form still works                                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 17.8 Data Privacy Rules

```
┌─────────────────────────────────────────────────────────────────┐
│  WHAT GOES TO THE LLM                                            │
│                                                                   │
│  SENT to LLM (required for extraction):                         │
│  ├── Parent's message text                                       │
│  ├── Conversation history (for context)                          │
│  ├── Current topic and collected fields                          │
│  └── System prompt with instructions                             │
│                                                                   │
│  NEVER sent to LLM:                                              │
│  ├── Parent's email or password                                  │
│  ├── Parent's authentication token (JWT)                         │
│  ├── Uploaded documents (files stay in R2)                       │
│  ├── Other parents' data                                         │
│  └── School staff credentials                                    │
│                                                                   │
│  PRIVACY SAFEGUARDS:                                             │
│  ├── Use API tier only (OpenAI + Anthropic do NOT train on       │
│  │   API data — confirmed in their terms)                        │
│  ├── Parent consent at chatbot start: "This assistant uses AI    │
│  │   to help fill your application. Your responses are processed │
│  │   securely and not used to train AI models."                  │
│  ├── LangSmith traces stored in our LangSmith org (not public)  │
│  └── Conversation data auto-deleted 90 days after submission     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 17.9 Document Upload Decision

```
┌─────────────────────────────────────────────────────────────────┐
│  DOCUMENT HANDLING IN CHATBOT                                    │
│                                                                   │
│  SPRINT 2 (MVP chatbot):                                        │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Chatbot collects TEXT fields only                             ││
│  │ (name, DOB, grade, contacts, etc.)                            ││
│  │                                                                ││
│  │ At REVIEW step → show upload section:                         ││
│  │ ┌──────────────────────────────────┐                          ││
│  │ │ Application Summary              │                          ││
│  │ │ Student: Arun Kumar              │                          ││
│  │ │ DOB: June 10, 2020              │                          ││
│  │ │ Grade: Class 1                   │                          ││
│  │ │ ...                              │                          ││
│  │ │                                  │                          ││
│  │ │ ── Upload Documents ──           │                          ││
│  │ │ Birth certificate: [Upload]      │                          ││
│  │ │ Recent photo: [Upload]           │                          ││
│  │ │ Transcripts: [Upload] (optional) │                          ││
│  │ │                                  │                          ││
│  │ │ [Submit Application]             │                          ││
│  │ └──────────────────────────────────┘                          ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                   │
│  SPRINT 3+ (enhanced chatbot):                                   │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Inline upload during chat:                                    ││
│  │ Bot: "Could you upload Arun's birth certificate?"             ││
│  │ Parent: [clicks upload button in chat] → file sent            ││
│  │ Bot: "Got it! Now a recent photo please."                     ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                   │
│  WHY SEPARATE IN SPRINT 2:                                       │
│  • File upload in chat UI is complex (drag-drop, preview, retry) │
│  • Review step upload is simpler and already built for MVP form  │
│  • Reuses existing document upload component from School-First   │
│  • Less risk of file upload bugs blocking chatbot launch         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 17.10 Monthly Cost Estimate

| Item | Development | Staging/Testing | Production (1K apps/month) |
|------|-------------|-----------------|---------------------------|
| GPT-4o-mini (primary) | ₹100/month | ₹500/month (evals) | ₹10,000/month |
| Claude Haiku (fallback) | ₹0 | ₹100/month | ₹500/month (only when fallback) |
| GPT-4o (eval baseline) | ₹0 | ₹2,000/month | ₹0 (not used in prod) |
| LangSmith | Free tier | Free tier | Free tier (5K traces/month) |
| LiteLLM | Free (open source) | Free | Free |
| **Total LLM cost** | **~₹100/month** | **~₹2,600/month** | **~₹10,500/month (~$125)** |

### 17.11 Decision Summary Table

| # | Decision | Choice | Alternative Considered | Why This Choice |
|---|----------|--------|----------------------|-----------------|
| 1 | LLM Provider | GPT-4o-mini + Claude Haiku fallback | GPT-4o, Gemini, Llama | Best cost/speed/accuracy balance |
| 2 | LLM Wrapper | LiteLLM | Direct API calls | Provider-agnostic; switch with config |
| 3 | Agent Framework | LangChain Chains | LangGraph, raw code | Simpler; sufficient for linear flow |
| 4 | Structured Output | Function Calling (native) | OutputParser, regex | Most reliable extraction |
| 5 | Memory | ConversationBufferMemory | Summary, Window | Full history for max accuracy |
| 6 | Streaming | No (typing indicator) | SSE / WebSocket | Simpler; responses are short |
| 7 | Prompt Strategy | Two separate calls (extract + respond) | Single combined call | Higher accuracy per call |
| 8 | Observability | LangSmith | Custom logging, Datadog | Built into LangChain; free tier |
| 9 | Eval Tool | LangSmith Evaluations | Custom scripts, pytest | Integrated with traces; dashboard |
| 10 | Doc Upload | Separate review step (Sprint 2) | Inline in chat | Simpler; reuses MVP component |
| 11 | Rate Limiting | Redis-based per-parent limits | None | Prevents abuse + cost overrun |
| 12 | Privacy | API tier + consent banner | Anonymization | Standard practice; no accuracy loss |

---

**Last Updated:** October 27, 2026
**Version:** 2.1
**Status:** Draft — planning artifact
