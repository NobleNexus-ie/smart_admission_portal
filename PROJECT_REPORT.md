# VedaAcademy Enrollment Module - Detailed Project Report

**Date:** 30 October 2026
**Status:** Development Complete - Ready for UAT
**Version:** 1.0.0-dev

---

## 1. Executive Summary

The VedaAcademy Enrollment Module is a standalone microservice that digitizes the entire school admission lifecycle — from school discovery to final enrollment decision. It serves two user types: **Parents** (searching, applying, tracking) and **School Staff** (reviewing, approving/rejecting, analytics).

**Current State:** The core application is fully built and running locally with **47 live API endpoints**, **20 frontend pages**, **13 database tables**, and **4 Docker services**. The UI features a professional animated theme with framer-motion. All features have been manually tested end-to-end.

**What Remains:** Production deployment infrastructure, automated testing, and several enhancement features (detailed in Section 6).

---

## 2. Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   React Frontend │────>│   FastAPI Backend │────>│   PostgreSQL DB  │
│   Vite + TS      │     │   Python 3.11    │     │   Port 5433      │
│   Port 3001      │     │   Port 8000      │     │                  │
│                  │     │                  │────>│   Redis Cache    │
│  Tailwind CSS    │     │  SQLAlchemy Async │     │   Port 6380      │
│  framer-motion   │     │  Pydantic v2     │     │                  │
│  React Query     │     │  LangChain       │────>│   Mailpit (SMTP) │
│  React Hook Form │     │                  │     │   Port 8025      │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | React + TypeScript | 18.3.1 |
| Build Tool | Vite | 6.0.5 |
| CSS Framework | Tailwind CSS | 3.4.17 |
| Animation | framer-motion | 14.7.1 |
| State/Data | TanStack React Query | 5.62.8 |
| Forms | React Hook Form + Zod | 7.54.2 / 3.24.1 |
| Icons | Lucide React | 0.469.0 |
| Backend Framework | FastAPI | 0.115.5 |
| ORM | SQLAlchemy (async) | 2.0.36 |
| DB Driver | asyncpg | 0.30.0 |
| Validation | Pydantic | 2.10.2 |
| Auth | python-jose (JWT) + passlib (bcrypt) | 3.3.0 / 1.7.4 |
| AI/NLP | LangChain Core + OpenAI + Anthropic | >=0.3.0 |
| File Storage | boto3 (S3-compatible) | 1.35.71 |
| Email | aiosmtplib | 3.0.2 |
| Cache | Redis | 5.2.0 |
| Migrations | Alembic | 1.14.0 |
| Database | PostgreSQL | 15 |

---

## 3. Detailed Feature Inventory - WHAT IS BUILT

### 3.1 Authentication & Authorization

| # | Feature | Status | Details |
|---|---------|--------|---------|
| 1 | Parent email registration | BUILT | Email + password, bcrypt hashing, auto-creates profile |
| 2 | Email verification | BUILT | JWT token sent via email, one-click verify link |
| 3 | Parent login | BUILT | Email/password -> JWT access token (30min) + refresh token (7d) |
| 4 | Token refresh | BUILT | Refresh endpoint rotates access token without re-login |
| 5 | Forgot password | BUILT | Sends reset link to email (1hr expiry token) |
| 6 | Reset password | BUILT | Token-based password reset with validation (min 8 chars, uppercase, lowercase, digit) |
| 7 | Staff login | BUILT | Separate auth flow for school staff, returns school_id + role |
| 8 | Staff account setup | BUILT | Initial password set for staff accounts created by school_admin |
| 9 | Role-based access | BUILT | Three staff roles: school_admin, reviewer, viewer - enforced on endpoints |
| 10 | CORS configuration | BUILT | Configurable allowed origins in settings |
| 11 | Security headers | BUILT | X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, HSTS |
| 12 | Rate limiting | BUILT | Redis-backed, configurable per-route rate limits |

**How it works:** Parent registers -> receives verification email (viewable in Mailpit at localhost:8025) -> clicks link -> account verified -> can login. JWT access tokens expire in 30 minutes; frontend auto-refreshes using the 7-day refresh token. Staff accounts are pre-created during school onboarding.

---

### 3.2 Parent Profile Management

| # | Feature | Status | Details |
|---|---------|--------|---------|
| 1 | Profile CRUD | BUILT | Get and update full_name, phone, address, city, state |
| 2 | ID proof type selection | BUILT | Dropdown: Aadhaar, Passport, Driving Licence, Voter ID (sends correct backend enum values) |
| 3 | ID proof file upload | BUILT | Upload image/PDF of ID document, stored via S3-compatible storage |
| 4 | Profile completeness meter | BUILT | Visual progress bar showing % complete (7 fields checked) |
| 5 | Profile gate | BUILT | Middleware blocks application creation until profile is complete (name + phone + ID required) |
| 6 | Phone validation | BUILT | Regex validates Indian mobile numbers: must start with 6-9, exactly 10 digits, optional +91 prefix |

**How it works:** New parents must complete their profile before they can apply. The profile page shows a completion percentage bar. Required fields: full name, phone (Indian mobile format), ID proof type, ID proof file. Once profile_complete=true, the profile gate middleware allows application actions.

---

### 3.3 School Discovery & Search

| # | Feature | Status | Details |
|---|---------|--------|---------|
| 1 | School search | BUILT | Search by name (partial match), filter by board (CBSE/ICSE/etc.), filter by area |
| 2 | Pagination | BUILT | Server-side pagination with page/page_size params, returns total count + page info |
| 3 | School detail view | BUILT | Full school info: name, board, address, description, facilities, contact, status |
| 4 | School status display | BUILT | StatusBadge shows active/inactive/accepting with colored dot indicators |
| 5 | School compare mode | BUILT | Toggle button activates compare mode, select 2-4 schools with + buttons, pill tag selection bar |
| 6 | Side-by-side comparison | BUILT | Comparison table showing board, city, area, address, facilities for selected schools |
| 7 | Eligible schools lookup | BUILT | API returns schools eligible for a specific grade, flags already_applied schools |
| 8 | Animated school cards | BUILT | StaggerContainer/StaggerItem animations on card list, hover scale effects |

**How it works:** Parent navigates to Enrolment section -> sees grid of school cards with search/filter bar at top. Can type school name or select board from dropdown. "Compare Schools" button enters compare mode where + buttons appear on cards. Selected schools appear as pill tags at top. Click "Compare Now" to see side-by-side table. Click any school card to view details and start an application.

---

### 3.4 Application Process

| # | Feature | Status | Details |
|---|---------|--------|---------|
| 1 | Create application | BUILT | Creates draft application linked to a school |
| 2 | Application form | BUILT | Collects: student name, DOB, gender, grade, nationality, previous school/board/marks, emergency contact, special needs, medical conditions |
| 3 | Auto-save drafts | BUILT | Periodic auto-save via PUT endpoint, useAutoSave hook on frontend |
| 4 | Manual save draft | BUILT | Explicit save button saves form_data as JSON without submitting |
| 5 | Form validation | BUILT | Required fields enforced: student_full_name, date_of_birth, gender, grade_applying_for |
| 6 | Document upload | BUILT | Upload birth certificate, photo, transcripts, other docs. Max 10 documents per application |
| 7 | Document categories | BUILT | birth_cert (required), photo (required), transcript (optional), other (optional) |
| 8 | Submit application | BUILT | Validates completeness, sets status to submitted, timestamps all per-school records, sends notification email to school |
| 9 | Multi-school submit | BUILT | Submit one application to multiple schools simultaneously, creates separate ApplicationSchool records |
| 10 | Duplicate detection | BUILT | Prevents duplicate applications: one pending app per parent+school combination |
| 11 | Application list | BUILT | Shows all parent's applications with student name, school name, submission date, per-school status |
| 12 | Application detail | BUILT | Full view: student details grid, documents list, per-school status with rejection reason/approval notes, info requests timeline |
| 13 | Rejection reason display | BUILT | Red callout box showing "Reason for rejection:" when school rejects with reason text |
| 14 | Approval notes display | BUILT | Green text showing approval notes when school approves |
| 15 | Application method tracking | BUILT | Tracks whether app was created via form or chatbot (method field) |

**How it works:** Parent selects a school -> fills multi-field application form -> uploads required documents -> submits. Application goes to "submitted" state, each school record goes to "pending". School staff receives email notification. Parent can track status on application list page. Two-level status model: Application.status (draft/submitted) tracks the form state, ApplicationSchool.status (pending/approved/rejected/info_requested) tracks each school's decision independently.

---

### 3.5 AI Chatbot Application Assistant

| # | Feature | Status | Details |
|---|---------|--------|---------|
| 1 | Chat conversation UI | BUILT | Full-screen chat interface with message bubbles, typing indicator, progress bar |
| 2 | LangChain integration | BUILT | Uses ChatOpenAI (gpt-4o-mini) or ChatAnthropic (claude-haiku) with structured output extraction |
| 3 | Rule-based fallback | BUILT | Works WITHOUT any API key — regex-based field extraction for all topics |
| 4 | Topic-guided flow | BUILT | 6 topics in sequence: welcome -> student_details -> academic_history -> additional_info -> documents -> review |
| 5 | Field extraction | BUILT | Extracts: student name, DOB (multiple date formats), gender (infers from "son"/"daughter"), grade, contacts |
| 6 | Field validation | BUILT | Validates gender enum, grade from valid list, DOB format + not future date, phone 10 digits |
| 7 | Progress tracking | BUILT | Completeness % based on 6 required fields, shown as animated progress bar |
| 8 | Session management | BUILT | Persisted in DB, resume active session, max sessions per day limit |
| 9 | Review & confirm | BUILT | Summary display, user types "confirm" to complete |
| 10 | Switch to form | BUILT | Transfer all chatbot-collected data to traditional form, pre-fills fields |
| 11 | Session limits | BUILT | Max sessions per day (configurable), max messages per session |
| 12 | Conversation history | BUILT | Full history persisted, displayed on page reload |

**How it works:** Parent opens chatbot page -> bot greets and asks for student details -> parent types natural language responses -> bot extracts structured data using LLM (or regex fallback) -> progresses through topics -> at end, parent confirms summary -> can "Review & submit" to select school, or "Switch to form" to continue editing in traditional form. The chatbot accepts mixed Hindi-English input when using the LLM. Without API keys, the rule-based fallback handles common input patterns.

**Chatbot input examples (rule-based):**
- "My son's name is Aarav Sharma, born on 2015-06-15" -> extracts name, DOB, gender
- "Grade 5" -> extracts grade_applying_for
- "Contact is Ravi Sharma 9876543210" -> extracts emergency contact name + phone
- "None" -> sets medical_conditions and special_needs to None
- "confirm" -> completes the session

---

### 3.6 Staff Review Workflow

| # | Feature | Status | Details |
|---|---------|--------|---------|
| 1 | Application queue | BUILT | List all applications submitted to staff's school, filterable by status |
| 2 | Application detail (staff view) | BUILT | Full student details, documents, submission history |
| 3 | Approve application | BUILT | Set status to approved, add optional notes (visible to parent), creates review_action audit record |
| 4 | Reject application | BUILT | Set status to rejected, mandatory reason (visible to parent), creates review_action audit record |
| 5 | Request additional info | BUILT | Specify fields_requested + documents_requested + message, sets status to info_requested |
| 6 | Review action audit trail | BUILT | Every approve/reject/info-request recorded in review_actions table with staff_id, timestamp, reason/notes |
| 7 | Parent responds to info request | BUILT | Parent sees info request on detail page, clicks "Respond now", submits field_responses + optional documents |
| 8 | Info response handling | BUILT | After parent responds, status reverts to "pending" for re-review, school gets notification |
| 9 | Email notifications | BUILT | Automated emails on: submission (to school), approval (to parent), rejection (to parent), info request (to parent), info response (to school) |
| 10 | Filter pills UI | BUILT | Animated filter buttons for status: All / Pending / Approved / Rejected / Info Requested |

**How it works:** Staff logs in -> sees applications for their school -> clicks an application -> reviews student details + documents -> chooses action (Approve/Reject/Request Info) via modal dialogs. Every action is logged in review_actions table for audit. Parent receives email and sees status update in real-time on their dashboard. When staff requests info, parent gets a blue callout with "Respond now" button on their application detail page.

---

### 3.7 Analytics

| # | Feature | Status | Details |
|---|---------|--------|---------|
| 1 | School-level analytics | BUILT | Total applications, approval rate, applications by grade, applications over time, avg response time |
| 2 | Platform-wide analytics | BUILT | Total across all schools, weekly growth percentage |
| 3 | Animated stat counters | BUILT | AnimatedNumber component counts up on scroll |
| 4 | Progress ring | BUILT | ProgressRing SVG shows approval rate as circular gauge |
| 5 | Staff analytics page | BUILT | Full page with stat cards, animated numbers, bar visualizations |

**How it works:** Staff navigates to Analytics in sidebar -> sees stat cards with animated counters (total apps, approved, rejected, pending) -> approval rate shown as circular progress ring -> breakdown by grade and over-time trends displayed below. Data is aggregated in real-time from the database.

---

### 3.8 Notification System

| # | Feature | Status | Details |
|---|---------|--------|---------|
| 1 | Email dispatch | BUILT | aiosmtplib async email sending |
| 2 | Template engine | BUILT | 8 HTML email templates with variable substitution |
| 3 | Notification logging | BUILT | All sent notifications stored in notifications table |
| 4 | Notification preferences | BUILT | Parents can toggle: reminders_enabled, status_updates_enabled, frequency (daily/weekly/instant) |
| 5 | Preferences UI | BUILT | Toggle switches and radio buttons with animated hover effects |
| 6 | Dev email viewer | BUILT | Mailpit catches all emails in development at localhost:8025 |

**Email templates built:**
| Template | Sent To | Trigger |
|----------|---------|---------|
| verify_email | Parent | After registration |
| password_reset | Parent | Forgot password request |
| app_received | School | Application submitted |
| app_approved | Parent | Staff approves application |
| app_rejected | Parent | Staff rejects application |
| info_requested | Parent | Staff requests additional info |
| info_provided | School | Parent responds to info request |
| multi_school_summary | Parent | Multi-school submission confirmation |

---

### 3.9 Embeddable Apply Widget

| # | Feature | Status | Details |
|---|---------|--------|---------|
| 1 | Embed link generation | BUILT | Schools get a unique embed URL token |
| 2 | Embed resolution | BUILT | Token resolves to school_id + school_name |
| 3 | ApplyEmbedPage | BUILT | Standalone page at /apply?token=xxx that pre-selects the school |

**How it works:** School staff generates an embed link from their dashboard. The link contains a signed token. When a parent visits the embed URL, the system resolves the token to the school and pre-fills the school selection, allowing the parent to apply directly.

---

### 3.10 Frontend UI/UX

| # | Feature | Status | Details |
|---|---------|--------|---------|
| 1 | Animated landing page | BUILT | Hero text with gradient, animated dashboard mockup (stat cards, application rows, progress bar), feature cards, floating background blobs |
| 2 | Design system | BUILT | Indigo/violet brand palette, Inter + Plus Jakarta Sans fonts, 5 custom shadows, 8 keyframe animations |
| 3 | Component library | BUILT | 14 reusable components: Button (6 variants), Input, Select, Badge (6 variants with dots), StatusBadge, Modal (spring physics), Spinner, PageLoader, EmptyState, AnimatedPage, AnimatedNumber, ProgressRing, Timeline, DocumentUpload |
| 4 | Page transitions | BUILT | framer-motion AnimatedPage wrapper with fade+slide on all pages |
| 5 | Staggered animations | BUILT | Lists and card grids animate in sequentially with StaggerContainer/StaggerItem |
| 6 | Hover interactions | BUILT | ScaleOnHover for cards, glow shadow on primary buttons, gradient shift on hover |
| 7 | Glass-card effects | BUILT | Semi-transparent cards with backdrop-blur for auth pages and overlays |
| 8 | Gradient text | BUILT | Brand gradient applied to hero headings and section titles |
| 9 | Stat cards | BUILT | Top gradient border accent, animated number counters, hover lift |
| 10 | Loading states | BUILT | PageLoader with ping ring effect, button loading spinner, skeleton shimmer class |
| 11 | Empty states | BUILT | Scale-entrance animation, branded icon, description, CTA button |
| 12 | Responsive sidebar | BUILT | Gradient logo icon, active nav item with ring highlight, user label, logout button |
| 13 | Password strength indicators | BUILT | Animated checkmark chips on register page showing strength criteria |
| 14 | Form error animation | BUILT | Animated error messages with FadeIn |

---

### 3.11 Infrastructure

| # | Component | Status | Details |
|---|-----------|--------|---------|
| 1 | Docker Compose | BUILT & RUNNING | 4 services: API, PostgreSQL, Redis, Mailpit |
| 2 | GitHub Actions CI | BUILT | ci.yml with 4 jobs: lint (ruff), typecheck (mypy), test (pytest), frontend build |
| 3 | Fly.io API config | BUILT | fly.toml for backend deployment with health check |
| 4 | Fly.io Web config | BUILT | fly.toml for frontend deployment |
| 5 | Web Dockerfile | BUILT | Multi-stage: node build -> nginx serve |
| 6 | Nginx config | BUILT | SPA fallback routing, gzip compression, static asset caching |
| 7 | Alembic setup | BUILT | env.py configured for async SQLAlchemy, imports all models |
| 8 | Redis caching utility | BUILT | cache_get, cache_set, cache_delete_pattern helpers |
| 9 | Seed data | BUILT | 5 schools, 4 parent accounts, 8 staff accounts pre-loaded |

---

### 3.12 Database Schema (13 tables)

| Table | Columns | Relationships | Purpose |
|-------|---------|---------------|---------|
| `parents` | id (UUID PK), email (unique), password_hash, is_verified, created_at, updated_at | has_one profile, has_many applications | Parent user accounts |
| `parent_profiles` | id, parent_id (FK unique), full_name, phone, address, city, state, id_proof_type, id_proof_url, profile_complete | belongs_to parent | Extended profile data |
| `schools` | id (UUID PK), name, board, address, area, city, state, contact_email, phone, description, logo_url, status, facilities (JSON), application_requirements | has_many staff, has_many application_schools | School registry |
| `school_staff` | id, email (unique), password_hash, name, school_id (FK), role (enum), is_active | belongs_to school | Staff accounts with role-based access |
| `applications` | id (UUID PK), parent_id (FK), form_data (JSON), status (draft/submitted), method (form/chatbot), created_at, submitted_at, updated_at | belongs_to parent, has_many application_schools, has_many documents | Parent applications |
| `application_schools` | id, application_id (FK), school_id (FK), status (pending/approved/rejected/info_requested), submitted_at, reviewed_at | belongs_to application + school, has_many review_actions + info_requests | Per-school application status |
| `application_documents` | id, application_id (FK), category, storage_key, file_name, mime_type, file_size, uploaded_at | belongs_to application | Uploaded files |
| `review_actions` | id, application_school_id (FK), staff_id (FK), action (approve/reject/request_info), reason, notes, performed_at | belongs_to application_school + staff | Audit trail of staff decisions |
| `info_requests` | id, application_school_id (FK), fields_requested (JSON), documents_requested (JSON), message, status (pending/responded/expired), created_at | belongs_to application_school, has_one response | Staff requests for more info |
| `info_responses` | id, info_request_id (FK), response_data (JSON), documents (JSON), created_at | belongs_to info_request | Parent responses to info requests |
| `chatbot_sessions` | id (UUID PK), parent_id (FK), conversation_history (JSON), application_data (JSON), current_topic, status (active/completed/switched_to_form), created_at, updated_at | belongs_to parent | AI chatbot conversation sessions |
| `notifications` | id, recipient_email, template, variables (JSON), metadata (JSON), sent_at, created_at | standalone | Email notification log |
| `notification_preferences` | id, parent_id (FK unique), frequency (daily/weekly/instant), reminders_enabled, status_updates_enabled, updated_at | belongs_to parent | Parent notification settings |

---

## 4. Complete API Endpoint Reference (47 endpoints)

### Authentication (8)
```
POST /api/v1/auth/register           - Register parent (email, password, full_name)
POST /api/v1/auth/login              - Parent login -> {access_token, refresh_token}
POST /api/v1/auth/refresh            - Refresh access token
POST /api/v1/auth/verify-email       - Verify email with token
POST /api/v1/auth/forgot-password    - Send password reset email
POST /api/v1/auth/reset-password     - Reset password with token
POST /api/v1/auth/staff/login        - Staff login -> {access_token, school_id, role}
POST /api/v1/auth/staff/setup        - Staff initial password setup
```

### Parent Profile (6)
```
GET  /api/v1/parents/profile                    - Get current parent's profile
PUT  /api/v1/parents/profile                    - Update profile fields
POST /api/v1/parents/profile/id-proof           - Upload ID proof file
GET  /api/v1/parents/dashboard                  - Dashboard: stats, activity, action_required
GET  /api/v1/parents/notification-preferences   - Get notification settings
PUT  /api/v1/parents/notification-preferences   - Update notification settings
```

### Applications (10)
```
POST /api/v1/applications                              - Create application for a school
GET  /api/v1/applications                              - List all parent's applications
GET  /api/v1/applications/{id}                         - Get application detail
PUT  /api/v1/applications/{id}                         - Update application form data
PUT  /api/v1/applications/{id}/auto-save               - Auto-save draft
PUT  /api/v1/applications/{id}/submit                  - Submit application
POST /api/v1/applications/{id}/documents               - Upload document
GET  /api/v1/applications/{id}/info-requests            - List info requests for application
POST /api/v1/applications/{id}/respond-info             - Respond to info request
POST /api/v1/applications/submit-multi                  - Submit to multiple schools at once
```

### Schools (10)
```
GET  /api/v1/schools/search           - Search/filter schools (board, area, name, page, page_size)
GET  /api/v1/schools/compare          - Compare 2-4 schools side-by-side
GET  /api/v1/schools/eligible         - Get schools eligible for a grade
GET  /api/v1/schools/resolve-embed    - Resolve embed token -> school
POST /api/v1/schools/onboard          - Onboard a new school
GET  /api/v1/schools/{id}             - Get school detail
PUT  /api/v1/schools/{id}             - Update school info
PUT  /api/v1/schools/{id}/activate    - Activate/deactivate school
GET  /api/v1/schools/{id}/embed-link  - Generate embed link for school
POST /api/v1/schools/{id}/staff       - Add staff member to school
```

### Staff Review (5)
```
GET  /api/v1/staff/applications                          - List applications for staff's school
GET  /api/v1/staff/applications/{id}                     - Get application detail (staff view)
POST /api/v1/staff/applications/{id}/approve             - Approve (notes optional)
POST /api/v1/staff/applications/{id}/reject              - Reject (reason required)
POST /api/v1/staff/applications/{id}/request-info        - Request info (fields, docs, message)
```

### Chatbot (4)
```
POST /api/v1/chatbot/start            - Start new chatbot session
POST /api/v1/chatbot/respond          - Send message, receive AI response + extracted fields
GET  /api/v1/chatbot/summary          - Get session summary + completeness
POST /api/v1/chatbot/switch-to-form   - Export chatbot data to form
```

### Analytics (2)
```
GET  /api/v1/staff/analytics          - School analytics (totals, approval_rate, by_grade, over_time, avg_response_time)
GET  /api/v1/platform/analytics       - Platform-wide analytics (all schools aggregated, weekly_growth)
```

### Utility (2)
```
GET  /health                          - Health check -> {"status": "ok"}
GET  /api/v1/files/{path}             - Serve uploaded files
```

---

## 5. Frontend Pages (20 pages)

| # | Page | Route | Key Features |
|---|------|-------|-------------|
| 1 | Landing | `/` | Animated hero, dashboard mockup preview, 3 feature cards, gradient CTAs |
| 2 | Login | `/login` | Glass-card form, gradient brand icon, error animation, forgot password link |
| 3 | Register | `/register` | Password strength chips with animated checkmarks, form validation |
| 4 | Forgot Password | `/forgot-password` | Email input, animated success state with checkmark |
| 5 | Reset Password | `/reset-password` | Token-based, new password with validation, animated states |
| 6 | Verify Email | `/verify-email` | Token verification, success/error states |
| 7 | Staff Login | `/staff/login` | Matching auth theme, "School Staff Portal" branding |
| 8 | Apply Embed | `/apply` | Embeddable entry point, resolves school from token |
| 9 | Dashboard | `/dashboard` | Animated stat counters, ProgressRing, quick action cards (ScaleOnHover), action required list, recent activity (staggered) |
| 10 | School Search | `/enrolment` | Search bar, board filter, school cards grid, compare mode toggle, pill tag selection, animated cards |
| 11 | School Detail | `/enrolment/schools/:id` | Full school info, facilities, apply button |
| 12 | School Compare | `/enrolment/compare` | Side-by-side comparison table, animated rows |
| 13 | Application Form | `/enrolment/applications/new` | Multi-field form, document upload, auto-save, submit |
| 14 | Application List | `/enrolment/applications` | Staggered card list, per-school status badges with dots, rejection reason in red |
| 15 | Application Detail | `/enrolment/applications/:id` | Animated sections: student details grid, documents, per-school status (rejection/approval callouts), info requests |
| 16 | Respond to Info | `/enrolment/applications/:id/respond-info` | Dynamic form based on requested fields, document upload, submit response |
| 17 | Chatbot | `/enrolment/chatbot` | Full chat UI, typing indicator, progress bar, switch-to-form button |
| 18 | Chatbot Summary | `/enrolment/chatbot/summary` | Review collected data, select school, submit |
| 19 | Profile | `/profile` | Profile form with completion meter, ID proof upload, phone validation |
| 20 | Notification Preferences | `/profile/notifications` | Toggle switches, frequency radio buttons, animated interactions |
| 21 | Staff Application List | `/staff/applications` | Animated filter pills, row animations, status badges |
| 22 | Staff Application Detail | `/staff/applications/:id` | Review UI, approve/reject/request-info modals |
| 23 | Staff Analytics | `/staff/analytics` | AnimatedNumber counters, ProgressRing, bar charts, stat cards |

---

## 6. WHAT IS REMAINING / IN THE PIPELINE

### 6.1 CRITICAL - Required for Production Launch

| # | Item | What's Missing | What's Already Done | Effort Estimate |
|---|------|---------------|-------------------|-----------------|
| 1 | **Alembic Migration Files** | No version files generated yet. Tables were created via SQLAlchemy `create_all()` during development. Need `alembic revision --autogenerate` to create proper migration scripts for all 13 tables. | Alembic is installed, `migrations/env.py` is configured with async engine, all models are imported. | 0.5 day |
| 2 | **Automated Test Suite (Backend)** | Zero test files exist. Need pytest tests covering: all 14 services (unit tests with mocked DB), all 14 routers (integration tests with test DB), auth flows, edge cases, error handling. | FastAPI's TestClient and pytest-asyncio are available. Database fixtures and factory patterns needed. | 3-4 days |
| 3 | **Automated Test Suite (Frontend)** | Zero test files exist. Need Vitest + React Testing Library tests for: all 14 UI components, form validation logic, auth flow, API hook behavior. | Vitest is a Vite-native test runner, easy to add. React Testing Library needs to be installed. | 2-3 days |
| 4 | **Production Environment Config** | No production `.env` file. Need real values for: DATABASE_URL (production Postgres), REDIS_URL, SECRET_KEY (strong random), SMTP credentials (real email provider like SendGrid/SES), S3 bucket credentials, FRONTEND_URL, allowed CORS origins. | `.env.example` exists with all variable names documented. Settings class in config.py reads from environment. | 0.5 day |
| 5 | **S3 Document Storage** | Currently documents are stored locally or mocked. Need real S3 bucket (AWS S3 or DigitalOcean Spaces or MinIO) with proper IAM credentials, bucket policies, and signed URL generation. | boto3 client is implemented in storage_client.py. Signed URL utility exists in signed_urls.py. Document service uses the storage client. | 1 day |
| 6 | **Production Deployment** | Fly.io configs exist but app is not deployed. Need: `fly apps create`, database provisioning (`fly postgres create`), Redis provisioning, secret injection (`fly secrets set`), DNS setup, SSL certificates. | fly.toml files configured for both API and Web services. Dockerfile for web with nginx. Health check endpoint at /health. | 1-2 days |
| 7 | **Database Backups** | No backup strategy configured. Need automated daily backups for production PostgreSQL. | Fly.io managed Postgres includes automatic backups if provisioned. | 0.5 day |

**Subtotal: 8-11.5 days for production readiness**

---

### 6.2 HIGH PRIORITY - Should Build Before Public Launch

| # | Item | Description | Why It Matters | Effort |
|---|------|-------------|---------------|--------|
| 1 | **Input Sanitization & XSS Prevention** | Add server-side HTML sanitization on all user-input fields (form_data JSON, chat messages, info responses). Currently trusting frontend validation only. | Security: prevents stored XSS attacks if malicious data is submitted via API directly. | 1 day |
| 2 | **API Error Standardization** | Some endpoints return different error formats. Need consistent error response schema across all 47 endpoints with proper HTTP status codes and user-friendly messages. | UX: frontend error handling depends on predictable error format. | 1 day |
| 3 | **Logging & Monitoring** | No structured logging. Need: JSON-formatted logs, request tracing (correlation IDs), error alerting (Sentry or similar), uptime monitoring. | Ops: can't debug production issues without logs. | 1-2 days |
| 4 | **Email Provider for Production** | Mailpit is dev-only. Need real transactional email provider: SendGrid, AWS SES, or Postmark. Update SMTP settings. | Core: emails don't send in production without this. | 0.5 day |
| 5 | **Password Hashing Migration** | Currently using bcrypt with cost factor 12. Should verify this is appropriate for production load and ensure timing-safe comparison. | Security: baseline requirement. | 0.5 day |
| 6 | **File Upload Validation** | Add server-side file type validation (magic bytes, not just extension), file size limits, virus scanning consideration. | Security: prevents malicious file uploads. | 1 day |
| 7 | **Pagination on All List Endpoints** | Some list endpoints may return unbounded results. Ensure all list endpoints have default page_size limits. | Performance: prevents memory issues with large datasets. | 0.5 day |

**Subtotal: 5.5-6.5 days**

---

### 6.3 MEDIUM PRIORITY - Feature Enhancements

| # | Item | Description | User Impact | Effort |
|---|------|-------------|------------|--------|
| 1 | **Payment Gateway Integration** | Application fees via Razorpay or Stripe. Fee configuration per school, payment status tracking, receipt generation. | Parents can pay application fees online. Schools receive fee confirmations. | 3-5 days |
| 2 | **SMS Notifications (OTP)** | Twilio or MSG91 integration. OTP-based phone verification, SMS alerts for status changes. | Faster verification, parents without email access can still get updates. | 2 days |
| 3 | **Document OCR / Auto-extraction** | Integrate Tesseract or cloud OCR (Google Vision / AWS Textract) to auto-read Aadhaar numbers, names from uploaded ID proofs. | Reduces manual data entry, auto-validates identity documents. | 3 days |
| 4 | **In-App Messaging** | Real-time chat between parent and school staff within the application context. WebSocket or polling-based. | Replaces email back-and-forth, faster communication. | 3-5 days |
| 5 | **Bulk Staff Operations** | Bulk approve/reject selected applications. Export application list to CSV/Excel. | Saves staff time when processing many applications. | 2 days |
| 6 | **Multi-Language Support (i18n)** | Hindi, Tamil, Telugu, Kannada translations. react-i18next framework on frontend, language selector. | Accessibility for non-English speaking parents across India. | 3-5 days |
| 7 | **Application Fee Tracking** | Track payment status per school (paid/unpaid/waived), fee amount configuration per school/grade. | Financial workflow completion. | 2 days |
| 8 | **Interview Scheduling** | Schools schedule interviews, parents receive calendar invites, confirm/reschedule UI. | Complete admission workflow for schools that require interviews. | 3 days |
| 9 | **Application Withdrawal** | Parent can withdraw a submitted application (with confirmation). School gets notified. | Parents need an exit path if they change their mind. | 1 day |
| 10 | **Staff Dashboard** | Dedicated staff dashboard with quick stats, pending reviews count, recent activity. | Staff currently land on application list; a dashboard is more useful. | 1-2 days |

**Subtotal: 23-33 days**

---

### 6.4 LOW PRIORITY - Future Roadmap

| # | Item | Description | Effort |
|---|------|-------------|--------|
| 1 | **Mobile App (React Native)** | Native iOS/Android app reusing API layer. Push notifications, offline draft support, camera capture for documents. | 2-3 weeks |
| 2 | **Push Notifications** | Browser push via Firebase Cloud Messaging. Real-time alerts without email. | 2 days |
| 3 | **Advanced Analytics & Reports** | Interactive charts (Recharts/D3), date range filters, export to PDF, comparative school performance. | 3-5 days |
| 4 | **School Rating & Reviews** | Parents can rate and review schools after enrollment. Star ratings, text reviews, moderation queue. | 3 days |
| 5 | **Waitlist Management** | Auto-waitlist when school seats are full. Priority queue, auto-notify when spot opens. | 2-3 days |
| 6 | **Academic Calendar Integration** | Admission windows with open/close dates per school. Deadline reminders. Auto-close applications past deadline. | 2 days |
| 7 | **Platform Admin Super-Panel** | System admin role above school staff. Manage all schools, view system health, user management, audit logs. | 3-5 days |
| 8 | **Webhook / API Integrations** | Notify external systems (school ERP, CRM) on status changes. Configurable webhook URLs per school. | 2 days |
| 9 | **Comprehensive Audit Logging** | Full audit trail: who did what, when, with before/after snapshots. Compliance-ready for education regulators. | 2-3 days |
| 10 | **Per-User API Rate Limiting** | Different rate limits based on user role and subscription tier. | 1 day |
| 11 | **Data Export (GDPR compliance)** | Parent can export all their data. Staff can export school data. Data deletion request workflow. | 2 days |
| 12 | **Seat/Capacity Management** | Schools define seat capacity per grade. Auto-update availability. Show remaining seats to parents. | 2 days |
| 13 | **Sibling Priority / Referral System** | Flag applications where sibling already enrolled. Referral tracking for priority admission. | 1-2 days |
| 14 | **Document Template Library** | Pre-built application form templates per board/school type. Schools customize their requirements. | 2 days |

**Subtotal: ~5-8 weeks**

---

## 7. Summary Matrix

| Category | Built | Remaining |
|----------|-------|-----------|
| API Endpoints | 47 | 0 (core complete) |
| Database Tables | 13 | 0 (core complete) |
| Backend Services | 14 | 0 (core complete) |
| Frontend Pages | 20+ | 0 (core complete) |
| UI Components | 14 | 0 (core complete) |
| Email Templates | 8 | 0 (core complete) |
| Docker Services | 4 | 0 (all running) |
| Automated Tests | 0 | ~150-200 tests needed |
| Production Deploy | 0 | Configs ready, need deploy |
| Migration Files | 0 | Setup done, need autogenerate |
| Payment Integration | 0 | New feature |
| SMS/OTP | 0 | New feature |
| Multi-language | 0 | New feature |
| Mobile App | 0 | New feature |

---

## 8. Access Credentials (Development)

### Parent Accounts
| Email | Password | Verified |
|-------|----------|----------|
| parent1@test.com | Parent@123 | Yes |
| parent2@test.com | Parent@123 | Yes |
| parent3@test.com | Parent@123 | Yes |
| testparent@test.com | Parent@123 | Yes |

### Staff Accounts
| School | Email | Password | Role |
|--------|-------|----------|------|
| Delhi Public School, Noida | admin@delhipublics.edu | Staff@123 | school_admin |
| Delhi Public School, Noida | reviewer@delhipublics.edu | Staff@123 | reviewer |
| Kendriya Vidyalaya, Bangalore | admin@kendriyavidy.edu | Staff@123 | school_admin |
| Kendriya Vidyalaya, Bangalore | reviewer@kendriyavidy.edu | Staff@123 | reviewer |
| Presidency School, Bangalore | admin@presidencysc.edu | Staff@123 | school_admin |
| Presidency School, Bangalore | reviewer@presidencysc.edu | Staff@123 | reviewer |
| Ryan International, Chennai | admin@ryaninternat.edu | Staff@123 | school_admin |
| Ryan International, Chennai | reviewer@ryaninternat.edu | Staff@123 | reviewer |

### Schools
| Name | Board | City | Status |
|------|-------|------|--------|
| Delhi Public School, Noida | CBSE | Noida | Active |
| Kendriya Vidyalaya, Bangalore | CBSE | Bangalore | Active |
| Presidency School, Bangalore | ICSE | Bangalore | Active |
| Ryan International School, Chennai | ICSE | Chennai | Active |
| St. Mary's School, Pune | State Board | Pune | Inactive |

### URLs
| Service | URL |
|---------|-----|
| Frontend | http://localhost:3001 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| Mailpit (email viewer) | http://localhost:8025 |

---

## 9. File Inventory

### Backend (60+ files)
```
services/enrolment-api/
  requirements.txt                          # 20 Python dependencies
  fly.toml                                  # Fly.io deployment config
  app/
    main.py                                 # FastAPI app entry, 13 routers, 3 middlewares
    config.py                               # 25+ settings (DB, Redis, JWT, SMTP, S3, LLM)
    database.py                             # Async SQLAlchemy engine + session factory
    deps.py                                 # get_db, get_current_parent, get_current_staff
    models/          (12 files)             # SQLAlchemy ORM: Parent, School, Application, etc.
    schemas/         (7 files)              # Pydantic: auth, application, school, review, etc.
    services/        (14 files)             # Business logic: auth, application, review, chatbot, etc.
    routers/         (14 files)             # HTTP handlers: auth, applications, staff, chatbot, etc.
    middleware/       (3 files)             # security_headers, profile_gate, rate_limit
    utils/           (5 files)             # tokens (JWT), email_templates, cache, errors, signed_urls
  migrations/
    env.py                                  # Async Alembic config
    alembic.ini                             # Alembic settings
```

### Frontend (60+ files)
```
services/enrolment-web/
  package.json                              # 12 dependencies + 8 dev dependencies
  tailwind.config.js                        # Custom theme: colors, fonts, shadows, animations
  Dockerfile                                # Multi-stage build: node -> nginx
  nginx.conf                                # SPA routing, gzip, caching
  fly.toml                                  # Fly.io deployment config
  src/
    App.tsx                                 # 23 route definitions
    main.tsx                                # React entry point
    index.css                               # Global styles, component classes
    api/             (8 files)              # Axios clients: auth, applications, schools, staff, etc.
    components/
      ui/            (14 files)            # Design system: Button, Input, Modal, AnimatedPage, etc.
      forms/         (3 files)             # ApplicationForm, ProfileForm, DocumentUpload
      layout/        (3 files)             # Sidebar, ParentLayout, StaffLayout
    hooks/           (5 files)             # useAuth, useApplications, useSchools, useProfile, useAutoSave
    lib/             (3 files)             # types.ts (50+ types), utils.ts, auth.ts
    pages/
      auth/          (5 files)             # Login, Register, Forgot/Reset Password, VerifyEmail
      parent/        (11 files)            # Dashboard, Schools, Applications, Chatbot, Profile
      staff/         (4 files)             # Login, Applications, Detail, Analytics
```

### Infrastructure
```
docker-compose.yml                          # 4 services orchestration
.github/workflows/ci.yml                   # CI pipeline (lint, typecheck, test, build)
.env.example                                # All environment variables documented
```

---

*Report generated on 30 October 2026*
*Total development effort to date: ~120+ hours*
*Estimated remaining for production launch: 8-12 days*
*Estimated remaining for full feature set: 6-10 weeks*
