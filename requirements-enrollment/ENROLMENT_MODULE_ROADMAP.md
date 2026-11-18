# VedaAcademy Enrolment Module — Consolidated Roadmap

**Prepared for:**Review before implementation
**Date:** October 24, 2026
**Module:** Standalone Enrolment Microservice (smartschooladmissions.com)
**Timeline:** 2-week MVP sprint + post-MVP enhancements

---

## 1. What We're Building

A standalone enrolment platform where:
- **Parents** visit a school's website → click "Apply Now" → land on smartschooladmissions.com → register, fill an application, upload documents, and submit
- **Schools** receive an email notification → log in → review the application → approve, reject, or request more information
- **No new tenant or organisation** is created per parent — the system is independent of Veda School

---

## 2. Two-Week MVP — What Ships

The MVP delivers the **complete School-First flow** end-to-end. Everything below will be live and working at smartschooladmissions.com by the end of Week 2.

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Parent Registration** | Sign up with email + password; verify via email link |
| 2 | **Parent Profile** | Complete mandatory profile (name, phone, ID proof) before applying |
| 3 | **Parent Dashboard** | Simple dashboard with 3 menu items: Dashboard, Enrolment, Profile |
| 4 | **School Search** | Search schools by education board (CBSE, ICSE, State Board) or area |
| 5 | **Application Form** | Multi-step form: student details → academics → documents → review → submit |
| 6 | **Document Upload** | Upload birth certificate, photo, transcripts with the application |
| 7 | **School Onboarding** | One-time school registration by platform admin; generates "Apply Now" embed link |
| 8 | **School Staff Login** | Staff log in with credentials created during onboarding; see only their school's applications |
| 9 | **Application Review** | Staff can approve, reject (with reason), or request additional information |
| 10 | **Parent Follow-Up** | Parent receives notification, uploads requested documents, school re-reviews |
| 11 | **Email Notifications** | Automated emails for: verification, application received, approved, rejected, info requested, info provided |
| 12 | **Embed Link** | Secure link schools place as an "Apply Now" button on their website |
| 13 | **Production Deploy** | Live at smartschooladmissions.com with HTTPS, database, file storage |

---

## 3. What's Deferred (Post-MVP)

These features are designed and documented but will be built **after** the MVP is live:

| Feature | Why Deferred | When |
|---------|-------------|------|
| AI Chatbot Application (Agentic) | Needs LLM integration; manual form works first | Weeks 3–4 |
| Apply to Multiple Schools at Once | Needs chatbot + eligibility engine | Weeks 3–4 |
| School Comparison (side-by-side) | Needs richer school profiles | Weeks 5–6 |
| Analytics Dashboards | Needs data volume to be meaningful | Weeks 5–6 |
| Payment Processing (application fees) | Not in initial scope | Week 7+ |
| SMS / Push Notifications | Email-first for MVP | Week 7+ |

---

## 4. Week-by-Week Plan

### Week 1 — Build All Backend APIs

All the server-side logic, database, authentication, and email system.

```
Mon (Day 1)  ──→  Database + Infrastructure setup
Tue (Day 2)  ──→  Parent & staff login system + parent profile
Wed (Day 3)  ──→  School search + application form + submit
Thu (Day 4)  ──→  School staff review (approve/reject/request info)
Fri (Day 5)  ──→  Email notifications + testing + seed data
```

### Week 2 — Build All Screens + Go Live

All the user-facing pages and production deployment.

```
Mon (Day 6)  ──→  Login, register, verify email screens + parent dashboard
Tue (Day 7)  ──→  Profile form + school search page
Wed (Day 8)  ──→  Application form (multi-step) + document upload
Thu (Day 9)  ──→  School staff review screens + info-request workflow
Fri (Day 10) ──→  Testing + production deploy → LIVE
```

---

## 5. Day-by-Day Task Breakdown

### Day 1 (Monday) — Foundation

| Task | Details |
|------|---------|
| Create database | 11 tables: parents, profiles, schools, staff, applications, documents, reviews, notifications, etc. |
| Set up project | FastAPI backend, React frontend, Docker for local development |
| Configure services | File storage (Cloudflare R2), email service (Resend), cache (Redis) |

**By end of day:** Project runs locally; database is ready; health check works

---

### Day 2 (Tuesday) — Authentication + Profile

| Task | Details |
|------|---------|
| Parent registration | Email + password signup → sends verification email |
| Email verification | Click link in email → account activated |
| Parent login | Email + password → secure token issued |
| Staff login | School staff login → sees only their school's data |
| Profile management | Parent fills name, phone, uploads ID proof |
| Profile gate | Must complete profile before applying (enforced) |

**By end of day:** A parent can register, verify, log in, and fill their profile

---

### Day 3 (Wednesday) — Schools + Applications

| Task | Details |
|------|---------|
| School search API | Search by board (CBSE/ICSE/etc.), area, or school name |
| School onboarding | Platform admin can register a school and add staff |
| Embed link | Generate secure "Apply Now" link for school websites |
| Application form API | Create, save draft, upload documents, submit |
| Submission | Application linked to chosen school; duplicate prevented |

**By end of day:** Schools are searchable; a parent can create and submit an application

---

### Day 4 (Thursday) — School Review

| Task | Details |
|------|---------|
| Application list | Staff sees only applications to their school |
| Approve | One-click approve with optional notes |
| Reject | Reject with mandatory reason (shown to parent) |
| Request info | Ask parent for specific documents or updated fields |
| Parent follow-up | Parent responds to requests; school is notified |
| Review history | Every action recorded with who/when (audit trail) |

**By end of day:** Staff can log in and process applications; the full review cycle works

---

### Day 5 (Friday) — Notifications + Polish

| Task | Details |
|------|---------|
| Verification email | Sent when parent registers |
| Application received | Sent to school when parent submits |
| Approved notification | Sent to parent when school approves |
| Rejected notification | Sent to parent with reason |
| Info requested | Sent to parent with list of what's needed |
| Info provided | Sent to school when parent responds |
| Seed data | 5 sample schools + staff + 10 sample applications for testing |

**By end of day:** Complete backend with all notifications working

---

### Day 6 (Monday) — Login & Dashboard Screens

| Task | Details |
|------|---------|
| Login page | Email + password form |
| Register page | Sign-up form with email + password |
| Verify email page | Shown after clicking verification link |
| Parent dashboard | Summary cards: total, pending, approved, rejected applications |
| Navigation | Sidebar with exactly 3 items: Dashboard, Enrolment, Profile |

**By end of day:** Parent can register, log in, and see their dashboard in a browser

---

### Day 7 (Tuesday) — Profile & School Search Screens

| Task | Details |
|------|---------|
| Profile form | Name, phone, address fields + ID proof upload |
| Profile completion | Blocks access to applications until profile is done |
| School search page | Filters for board, area, name; paginated results |
| School cards | Name, board, area, active/inactive badge, "Apply" button |

**By end of day:** Parent can complete profile and search for schools in browser

---

### Day 8 (Wednesday) — Application Form Screen

| Task | Details |
|------|---------|
| Step 1 | Student details: name, date of birth, gender, grade |
| Step 2 | Academic history + emergency contact |
| Step 3 | Upload documents (birth certificate, photo, transcripts) |
| Review step | Show all entered data before submission |
| Submit | Confirmation dialog → application submitted |
| Application list | Parent's applications with status badges |

**By end of day:** Parent can fill out complete application and submit in browser

---

### Day 9 (Thursday) — Staff Review Screens

| Task | Details |
|------|---------|
| Staff login page | Separate login for school staff |
| Application list | Filterable by status: All / Pending / Approved / Rejected |
| Review page | Full student + parent + document details |
| Action buttons | Approve (with notes), Reject (with reason), Request Info (select items) |
| Parent notification | "Action Required" badge on parent dashboard |
| Respond page | Parent updates info + uploads requested documents |

**By end of day:** Full cycle works: parent submits → school reviews → parent responds

---

### Day 10 (Friday) — Testing + Go Live

| Task | Details |
|------|---------|
| Test 1 | Parent: register → verify → profile → search → apply → submit |
| Test 2 | School: onboard → staff login → review → approve → parent gets email |
| Test 3 | Info request: school asks → parent responds → school re-reviews |
| Test 4 | Embed link: school website → redirect → register → apply |
| Test 5 | Security: staff from School A cannot see School B's applications |
| Deploy | Production: Fly.io + Neon database + Cloudflare R2 + Resend email |
| DNS | smartschooladmissions.com points to production |
| Smoke test | Register + apply + review in production |

**By end of day: smartschooladmissions.com is live and operational**

---

## 6. Application Lifecycle

This is how an application moves through the system:

```
Parent starts form
       │
       ▼
   ┌────────┐     Parent fills details     ┌───────────┐
   │  DRAFT  │ ──────────────────────────→  │ SUBMITTED │
   └────────┘     and clicks Submit         └─────┬─────┘
                                                   │
                                    School reviews │
                              ┌────────────────────┼────────────────────┐
                              ▼                    ▼                    ▼
                       ┌──────────┐        ┌──────────┐       ┌───────────────┐
                       │ APPROVED │        │ REJECTED │       │ INFO REQUESTED│
                       └──────────┘        └──────────┘       └───────┬───────┘
                                                                      │
                                                          Parent responds
                                                                      │
                                                                      ▼
                                                              ┌───────────┐
                                                              │ SUBMITTED │
                                                              │ (again)   │
                                                              └───────────┘
```

---

## 7. User Roles & Access

| Role | What They Can Do | What They Cannot Do |
|------|-----------------|---------------------|
| **Parent** | Register, fill profile, search schools, apply, upload docs, track status, respond to info requests | See other parents' applications; access school admin features |
| **School Admin** | Log in, view all applications to their school, approve/reject/request-info, manage staff | See applications to other schools; onboard new schools |
| **School Reviewer** | Log in, view applications, approve/reject/request-info | Manage school settings or staff accounts |
| **School Viewer** | Log in, view applications (read-only) | Take any action on applications |
| **Platform Admin** | Onboard schools, add staff, generate embed links | See individual application data |

---

## 8. Email Notifications

| When | Who Gets Email | What It Says |
|------|---------------|-------------|
| Parent registers | Parent | "Verify your email" with link |
| Application submitted | School | "New application received" with review link |
| School approves | Parent | "Congratulations! Your application was approved" |
| School rejects | Parent | "Application update" with the school's reason |
| School requests info | Parent | "Action needed" with list of what to provide |
| Parent responds | School | "Updated information received" with review link |

---

## 9. Technology Stack

| Component | Technology | Cost |
|-----------|-----------|------|
| Backend API | Python + FastAPI | — |
| Frontend | React + TypeScript + Tailwind CSS | — |
| Database | PostgreSQL (Neon) | Free tier |
| File Storage | Cloudflare R2 | Free tier (10 GB) |
| Email | Resend | Free tier (100/day) |
| Cache | Redis (Upstash) | Free tier |
| Hosting | Fly.io | Free tier |
| **Total monthly cost** | | **$0** (free tiers) |

---

## 10. Post-MVP Roadmap

After the 2-week MVP is live, features are added in 2-week sprints:

```
WEEK 1–2:  MVP (School-First flow, live at smartschooladmissions.com)
              │
WEEK 3–4:  Sprint 2 → AI Chatbot + Apply to Multiple Schools
              │
WEEK 5–6:  Sprint 3 → School Comparison + Analytics Dashboards
              │
WEEK 7+:   Sprint 4 → Security Hardening + Payments + Self-Serve Onboarding
```

| Sprint | Timeline | Features | Business Impact |
|--------|----------|----------|-----------------|
| **MVP** | Week 1–2 | School-First application flow, review, notifications | Parents can apply; schools can review |
| **Sprint 2** | Week 3–4 | AI chatbot, multi-school submission, reminders | Parents apply to 3–5 schools at once via AI assistant |
| **Sprint 3** | Week 5–6 | Comparison, analytics, notification preferences | Schools get insights; parents get better UX |
| **Sprint 4+** | Week 7+ | Security audit, payments, self-serve onboarding | Revenue enablement; scale readiness |

---

## 11. Success Criteria

### MVP must hit all of these by Day 10:

| # | Criterion | Pass/Fail |
|---|-----------|-----------|
| 1 | Parent can register, verify email, and log in | |
| 2 | Parent can complete profile (name + phone) | |
| 3 | Parent can search schools by board and area | |
| 4 | Parent can submit application to one school | |
| 5 | School receives email notification | |
| 6 | School staff can log in and see their applications only | |
| 7 | School staff can approve or reject | |
| 8 | Parent receives email on approval/rejection | |
| 9 | Embed link from school website works end-to-end | |
| 10 | System is live at smartschooladmissions.com | |

---

## 12. Risks & Contingency

| Risk | What Happens | Our Plan |
|------|-------------|----------|
| Application form takes too long to build | Delays Day 8 | Simplify to 3 steps instead of 5; cut optional fields |
| Email not delivering | Schools don't know about applications | Test email service on Day 1; verify DNS early |
| Frontend falls behind | Can't deploy on Day 10 | Cut polish; use default component styles; prioritise function over appearance |
| Production deploy issues | Site not accessible | Do a test deploy on Day 8; fix issues on Day 9 |

### If we're behind by Day 7, we cut (in order):
1. Password reset — parents can re-register
2. Document upload — accept form data only; documents by email
3. ID proof upload — name + phone is enough for profile
4. School detail page — apply directly from search
5. Info-request UI — schools email parents directly

---

**This document covers the complete plan. All detailed technical specifications, database schemas, API endpoints, and sequence diagrams are in the `requirements-enrollment/` folder for the development team.**

**Next step:** Harry sir reviews and approves → development begins Day 1.

---

*Prepared by: VedaAcademy Engineering*
*Date: October 24, 2026*
