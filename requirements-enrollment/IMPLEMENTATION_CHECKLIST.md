# VedaAcademy Enrolment Module — 2-Week Sprint Checklist

**Document Version:** 2.0
**Date:** October 2026
**Status:** Draft — tracking artifact
**Audience:** Development team, project managers

> **v2.0:** Restructured for 2-week delivery. Items are ordered by day. Post-MVP items listed separately at the end.

---

## Week 1: Backend Sprint (Days 1–5)

### Day 1 (Mon) — Schema + Infrastructure

#### Database & Migrations
- [ ] PostgreSQL provisioned (Neon free tier)
- [ ] `parents` table — id, email, password_hash, is_verified, created_at
- [ ] `parent_profiles` table — parent_id FK, full_name, phone, id_proof_url, profile_complete
- [ ] `schools` table — id, name, board, address, area, city, contact_email, status, embed_link_token
- [ ] `school_staff` table — id, school_id FK, email, password_hash, name, role
- [ ] `applications` table — id, parent_id FK, form_data JSONB, status, method, created_at
- [ ] `application_schools` table — application_id FK, school_id FK, status, submitted_at
- [ ] `application_documents` table — id, application_id FK, file_name, storage_key, mime_type
- [ ] `review_actions` table — id, application_school_id FK, action, reason, performed_by FK
- [ ] `info_requests` table — id, application_school_id FK, fields JSONB, message, created_by FK
- [ ] `info_responses` table — id, info_request_id FK, response_data JSONB
- [ ] `notifications` table — id, recipient_email, template, status, sent_at
- [ ] Alembic migration chain initialised
- [ ] Key indexes created (parents.email, schools.board, schools.area, application_schools.school_id)

#### Infrastructure
- [ ] FastAPI skeleton with router structure
- [ ] Docker Compose: api, db (Postgres 16), redis, minio (S3-compat), mailpit
- [ ] R2 bucket created (or MinIO for local)
- [ ] Redis connection configured
- [ ] Resend API key configured
- [ ] Health check endpoint (`GET /health`)
- [ ] CORS configuration
- [ ] `.env.example` with all required variables

**Day 1 exit:** `docker compose up` runs clean; all tables exist; `/health` returns 200

---

### Day 2 (Tue) — Authentication + Profile

#### Parent Auth
- [ ] `POST /auth/register` — email + password → insert parent → send verify email
- [ ] `POST /auth/verify-email` — token validation → set is_verified=true
- [ ] `POST /auth/login` — email + password → bcrypt verify → JWT
- [ ] `POST /auth/refresh` — refresh token → new access token
- [ ] JWT payload: `{sub: parent_id, role: "parent", email, profile_complete}`
- [ ] Password hashing (bcrypt, cost=12)
- [ ] Verification token (24h expiry)
- [ ] Rate limit: 5 login attempts / 15 min / IP

#### Staff Auth
- [ ] `POST /auth/staff/login` — email + password → JWT with school_id
- [ ] JWT payload: `{sub: staff_id, role, school_id, permissions}`
- [ ] Staff setup endpoint: `POST /auth/staff/setup` — token + password → activate account

#### Profile
- [ ] `GET /parents/profile` — return profile (or `profile_complete: false`)
- [ ] `PUT /parents/profile` — update name, phone, address
- [ ] `POST /parents/profile/id-proof` — upload file to R2 → store URL
- [ ] Profile-gate middleware: block `/applications/*` if `profile_complete=false`
- [ ] Signed URL generation for document download

**Day 2 exit:** Parent register → verify → login → complete profile (all via Swagger)

---

### Day 3 (Wed) — Schools + Applications

#### School Search
- [ ] `GET /schools/search?board=&area=&name=` — filter + paginate
- [ ] `GET /schools/{id}` — full school detail
- [ ] Filter by board (CBSE, ICSE, Matriculation, State Board, International, Other)
- [ ] Filter by area (ILIKE match)
- [ ] Free-text name search
- [ ] Pagination (limit/offset, default 20)

#### School Onboarding
- [ ] `POST /schools/onboard` — register school (platform admin)
- [ ] `POST /schools/{id}/staff` — add staff + send setup email
- [ ] `PUT /schools/{id}/activate` — set status=active
- [ ] Embed link token generation (HMAC-SHA256)
- [ ] `GET /schools/{id}/embed-link` — return URL + HTML snippet

#### Application CRUD
- [ ] `POST /applications` — create application (form_data JSONB)
- [ ] `GET /applications` — list parent's applications
- [ ] `GET /applications/{id}` — application detail with per-school status
- [ ] `PUT /applications/{id}` — update draft
- [ ] `POST /applications/{id}/documents` — upload documents to R2
- [ ] `PUT /applications/{id}/submit` — transition to submitted; create app_school record
- [ ] Duplicate check: one application per parent per school

**Day 3 exit:** Schools searchable; parent can create + submit application (via Swagger)

---

### Day 4 (Thu) — Review Flow + Embed Link

#### Application Review (school-scoped)
- [ ] `GET /staff/applications` — list apps WHERE school_id = JWT.school_id
- [ ] `GET /staff/applications/{id}` — full detail (student info + docs + history)
- [ ] `POST /staff/applications/{id}/approve` — with optional notes
- [ ] `POST /staff/applications/{id}/reject` — with mandatory reason (min 10 chars)
- [ ] `POST /staff/applications/{id}/request-info` — fields + documents + message
- [ ] School-scoped enforcement at service layer (not just router)
- [ ] Permission check: reviewer/admin can act; viewer is read-only
- [ ] Append-only review_actions insert on every action

#### Info Request + Parent Follow-Up
- [ ] `POST /applications/{id}/respond-info` — parent response with optional doc uploads
- [ ] Status transition: info_requested → pending (on response)
- [ ] `GET /applications/{id}/info-requests` — list info requests for an application

#### Embed Link Resolution
- [ ] `GET /schools/resolve-embed?token=...` — validate token → return school_id
- [ ] Frontend will use this to pre-select school after auth

**Day 4 exit:** Staff can log in, see their school's apps only, approve/reject/request-info

---

### Day 5 (Fri) — Notifications + Backend Polish

#### Email Notifications
- [ ] `verify_email` template — to parent on registration
- [ ] `app_received` template — to school on submission
- [ ] `app_approved` template — to parent on approval
- [ ] `app_rejected` template — to parent on rejection (includes reason)
- [ ] `info_requested` template — to parent (includes field list + respond link)
- [ ] `info_provided` template — to school (includes review link)
- [ ] Template rendering with variable substitution
- [ ] Secure link generation in all email templates
- [ ] Retry logic: 3 attempts, 1-min interval
- [ ] Delivery logging in notifications table

#### Backend Polish
- [ ] Pydantic strict validation on all request schemas
- [ ] Error response standardisation (code, message, details)
- [ ] API docs auto-generated (FastAPI /docs endpoint)
- [ ] Backend unit tests for auth + review + notifications
- [ ] Seed data script: 5 schools + 2 staff per school + 10 sample applications

**Day 5 exit:** Full backend lifecycle works; all emails send; seed data loadable

---

## Week 2: Frontend + Deploy Sprint (Days 6–10)

### Day 6 (Mon) — Auth + Parent Layout

- [ ] Login page (email + password)
- [ ] Register page (email + password + confirm)
- [ ] Email verification page (token from URL)
- [ ] Parent layout with sidebar: Dashboard, Enrolment, Profile
- [ ] Dashboard page: application counts (total, pending, approved, rejected)
- [ ] Recent activity feed (last 5 events)
- [ ] "Action Required" badge for info-requested applications
- [ ] JWT storage + auto-refresh + auth guard on routes
- [ ] Axios interceptor for JWT header injection

**Day 6 exit:** Parent can register, verify, log in, see dashboard in browser

---

### Day 7 (Tue) — Profile + School Search

- [ ] Profile form: full_name, phone, address, city, state
- [ ] ID proof upload component (drag-and-drop or click)
- [ ] Profile completion indicator + redirect if incomplete
- [ ] School search page with filter sidebar (board dropdown, area text, name text)
- [ ] School results as cards (name, board, area, status badge, [Apply] button)
- [ ] School detail page (if time; otherwise link directly to apply)
- [ ] Active/inactive status clearly shown

**Day 7 exit:** Parent can complete profile, search schools in browser

---

### Day 8 (Wed) — Application Form

- [ ] Multi-step form (3 minimum steps):
  - Step 1: Student Details (name, DOB, gender, grade applying for)
  - Step 2: Academic + Additional (previous school, emergency contact)
  - Step 3: Documents + Review + Submit
- [ ] Form validation with react-hook-form + zod
- [ ] Document upload component (birth cert, photo minimum)
- [ ] Review step showing all entered data
- [ ] Submit confirmation dialog
- [ ] Application list page (parent's applications with status badges)
- [ ] Application detail page (with per-school status)

**Day 8 exit:** Parent can fill complete application and submit in browser

---

### Day 9 (Thu) — Staff Portal + Info Request

- [ ] Staff login page (separate route /staff/login)
- [ ] Staff layout with "Applications" in sidebar
- [ ] Application list page (filtered by staff's school automatically)
- [ ] Status filter tabs (All / Pending / Approved / Rejected / Info Requested)
- [ ] Application review page (full student + parent + document detail)
- [ ] Approve button (with optional notes dialog)
- [ ] Reject button (with mandatory reason dialog)
- [ ] Request Info button (select fields + documents + message)
- [ ] Parent: info-request notification on dashboard
- [ ] Parent: respond-to-info page (update fields + upload docs)

**Day 9 exit:** Full review cycle works in browser: submit → notify → review → decide → parent notified

---

### Day 10 (Fri) — Integration Test + Deploy

#### Testing
- [ ] E2E: Parent register → verify → profile → search → apply → submit
- [ ] E2E: School onboard → staff login → view apps → approve → parent email
- [ ] E2E: Request info → parent responds → school re-reviews
- [ ] E2E: Embed link → redirect → register → apply to that school
- [ ] E2E: School isolation (staff from school A cannot see school B apps)

#### Production Deploy
- [ ] Fly.io app created (enrolment-api + enrolment-web)
- [ ] Neon production database + migrations run
- [ ] Upstash Redis provisioned
- [ ] R2 production bucket created
- [ ] Resend domain verified (smartschooladmissions.com)
- [ ] DNS configured: smartschooladmissions.com → Fly.io
- [ ] TLS certificate active
- [ ] Environment variables set via Fly.io secrets
- [ ] Production smoke test: register → apply → review → approve
- [ ] **smartschooladmissions.com is live**

**Day 10 exit:** System live and functional in production

---

## Post-MVP Items (tracked for future sprints)

### Sprint 2 (Weeks 3–4)
- [ ] Agentic chatbot application flow (chatbot_sessions table + LLM integration)
- [ ] Multi-school submission (submit one application to multiple schools)
- [ ] Automated email reminders (7-day school inaction)
- [ ] Password reset flow

### Sprint 3 (Weeks 5–6)
- [ ] School comparison (side-by-side)
- [ ] School analytics dashboard (funnel, response time, by grade)
- [ ] Parent application timeline view
- [ ] Notification preferences (immediate / daily / weekly)
- [ ] Advanced document categories

### Sprint 4+ (Week 7+)
- [ ] Security hardening + OWASP audit
- [ ] Performance optimisation + load testing
- [ ] Payment processing (application fees)
- [ ] Self-serve school onboarding
- [ ] Sibling linking
- [ ] Waitlist management

---

## Cut-If-Behind Fallbacks

If behind by Day 7, cut in this order to hit Day 10 deploy:

| Priority | Cut | Workaround | Restore in |
|----------|-----|------------|------------|
| 1 | Password reset | Parent re-registers | Day 11 |
| 2 | Document upload | Accept form only; docs via email | Day 12 |
| 3 | ID proof upload | Name + phone = profile complete | Day 12 |
| 4 | School detail page | Apply directly from search results | Day 13 |
| 5 | Info-request UI | School staff emails parent directly | Sprint 2 |

---

**Last Updated:** October 24, 2026
**Version:** 2.0
**Status:** Draft — 2-week sprint checklist
