# VedaAcademy Enrolment Module — Business Requirements Document (BRD)

**Document Version:** 1.0
**Date:** October 2026
**Author:** Technology Consultant (on behalf of VedaAcademy)
**Status:** Draft — planning artifact
**Audience:** CTO, Development Team, Product Owner, Stakeholders

---

## Table of Contents

- [1. Executive Summary](#1-executive-summary)
  - [1.1 Business Context](#11-business-context)
  - [1.2 Business Objectives](#12-business-objectives)
- [2. Business Scope](#2-business-scope)
  - [2.1 In Scope — Phase 1 (4-Week Build)](#21-in-scope--phase-1-4-week-build)
  - [2.2 Out of Scope — Phase 1 (Deferred)](#22-out-of-scope--phase-1-deferred)
- [3. Target Market & Customer Segments](#3-target-market--customer-segments)
- [4. Stakeholders](#4-stakeholders)
- [5. Business Requirements](#5-business-requirements)
  - [5.1 Standalone Microservice Architecture](#51-standalone-microservice-architecture)
  - [5.2 Parent Application Portal](#52-parent-application-portal)
  - [5.3 School Registration and Onboarding](#53-school-registration-and-onboarding)
  - [5.4 Application Review and Management](#54-application-review-and-management)
  - [5.5 Notification and Communication](#55-notification-and-communication)
  - [5.6 Security Requirements](#56-security-requirements)
  - [5.7 Performance Requirements](#57-performance-requirements)
  - [5.8 Data Privacy Requirements](#58-data-privacy-requirements)
- [6. Business Risks & Mitigations](#6-business-risks--mitigations)
- [7. Success Metrics (KPIs)](#7-success-metrics-kpis)
- [8. Assumptions & Constraints](#8-assumptions--constraints)
- [9. Sign-Off & Approval](#9-sign-off--approval)

---

## 1. Executive Summary

### 1.1 Business Context

The school admissions process in India and across APAC regions remains largely manual, fragmented, and inefficient. Parents visit multiple schools, fill out paper forms, and track application status through phone calls. Schools manage applications through spreadsheets, email, and manual filing. There is a clear market gap for a centralised, digital-first school admissions platform.

Key market observations:

- **Fragmented market:** No dominant platform exists for centralised school admissions in India's $117B education market
- **Parent pain:** Average parent applies to 3–5 schools per child; each requires a separate application process
- **School pain:** Admissions offices spend 60–80% of their time on manual application processing during peak season
- **Digital readiness:** Post-COVID, 85% of urban parents in India are comfortable with online application processes
- **Regulatory tailwind:** NEP 2020 encourages digital transformation in school administration

**VedaAcademy Enrolment** (smartschooladmissions.com) is positioned to capture this gap as a standalone admissions portal that schools can embed into their existing websites, enabling parents to discover, compare, and apply to multiple schools through a single platform.

### 1.2 Business Objectives

| # | Objective | Success Metric | Timeline |
|---|-----------|----------------|----------|
| **BO-01** | Launch MVP enrolment platform | First school onboarded, first application submitted | Week 4 (Phase 1) |
| **BO-02** | Enable school website integration | Schools can embed Apply Now button; parents redirected seamlessly | Week 4 (Phase 1) |
| **BO-03** | Support dual application methods | School-First (Phase 1) + Application-First Agentic (Phase 2) | Week 7 (Phase 2) |
| **BO-04** | Centralise multi-school applications | Parents submit one application to multiple schools | Week 6 (Phase 2) |
| **BO-05** | Provide school-side review workflow | Schools can approve/reject/request-info independently | Week 4 (Phase 1) |
| **BO-06** | Maintain independence from Veda School | No org/tenant creation per parent; standalone deployment | Verified at launch |
| **BO-07** | Achieve target onboarding rate | 50+ schools within 90 days of launch | 90 days post-launch |
| **BO-08** | Demonstrate parent adoption | 500+ applications within 90 days | 90 days post-launch |

---

## 2. Business Scope

### 2.1 In Scope — Phase 1 (4-Week Build)

| Domain | Included Capabilities |
|--------|----------------------|
| **Parent Portal** | Registration, email verification, profile management, dashboard (3 menu items) |
| **School-First Application** | School search by board/area, school detail view, single-school application form, document upload |
| **School Onboarding** | One-time registration, staff account creation, embed link generation |
| **Application Review** | School staff login, application list (school-scoped), approve/reject/request-info |
| **Notifications** | Email notifications for all lifecycle events (submit, approve, reject, request-info, respond) |
| **Parent Follow-Up** | Respond to info requests, upload additional documents |
| **Authentication** | Separate parent + school staff auth, JWT, RBAC |
| **Infrastructure** | Standalone microservice, independent database, API gateway, object storage |

### 2.2 Out of Scope — Phase 1 (Deferred)

| Feature | Deferred To | Rationale |
|---------|-------------|-----------|
| Agentic chatbot application | Phase 2 | Requires LLM integration; school-first path must be stable first |
| Multi-school submission | Phase 2 | Depends on agentic flow and eligibility engine |
| School comparison (side-by-side) | Phase 2 | Requires enriched school profiles |
| Analytics dashboards | Phase 3 | Needs data volume before analytics are meaningful |
| Payment processing | Phase 4+ | Application fee collection not in initial scope |
| Waitlist management | Phase 4+ | Requires school capacity tracking |
| Sibling linking | Phase 4+ | Requires family account model |
| Push / SMS notifications | Phase 3 | Email-first approach for Phase 1 |
| Veda School data sync | Phase 4+ | Maintain strict independence initially |

---

## 3. Target Market & Customer Segments

### 3.1 Primary Customer Segments

| Segment | Description | Size (India) |
|---------|-------------|--------------|
| **Urban private schools** | CBSE, ICSE, State Board private schools in metros + tier-2 cities | ~400,000 schools |
| **Parents (applicants)** | Parents of children aged 3–17 seeking school admissions | ~50M families/year |
| **School groups / chains** | Multi-school organisations (e.g. DPS, DAV, Kendriya Vidyalaya) | ~2,000 groups |

### 3.2 Geographic Focus

| Phase | Region | Rationale |
|-------|--------|-----------|
| Launch | India (metros: Bangalore, Chennai, Mumbai, Delhi NCR) | Highest density of English-medium private schools; digital-ready parents |
| Phase 2 expansion | India (tier-2 cities) | Organic growth from metro success |
| Phase 3+ | APAC (Singapore, Malaysia, UAE) | International school market; VedaAcademy brand recognition |

### 3.3 Competitive Positioning

| Competitor | Strength | VedaAcademy Advantage |
|------------|----------|----------------------|
| SchoolMyKids | School discovery | VedaAcademy adds end-to-end application + review workflow |
| Ezyschooling | Marketplace model | VedaAcademy provides school-side tools + embed integration |
| Manual process | Status quo (paper/spreadsheet) | Digital-first with tracking, notifications, multi-school submit |
| School-built portals | Custom but isolated | Centralised platform; parent applies once, schools review independently |

---

## 4. Stakeholders

| Role | Name / Team | Responsibility |
|------|-------------|----------------|
| **Product Owner** | VedaAcademy Product | Feature prioritisation, acceptance criteria |
| **Technical Lead** | Engineering | Architecture decisions, code reviews |
| **Backend Developer** | Engineering | API development, database, services |
| **Frontend Developer** | Engineering | React SPA, parent + school portals |
| **DevOps** | Engineering | Infrastructure, CI/CD, monitoring |
| **QA** | Quality | Test planning, E2E tests, security review |
| **School Relations** | Business | School onboarding, feedback collection |

---

## 5. Business Requirements

### 5.1 Standalone Microservice Architecture

| # | Requirement | Priority |
|---|-------------|----------|
| BR-01 | Enrolment module shall operate as a standalone microservice independent of Veda School | P0 |
| BR-02 | No new organisation or tenant shall be created for parent accounts | P0 |
| BR-03 | A single shared test tenant may be used behind the scenes if needed for initial implementation | P1 |
| BR-04 | The microservice shall maintain independent APIs, data ownership, and deployment | P0 |
| BR-05 | Architecture shall support future expansion without coupling to Veda School's internal structure | P0 |
| BR-06 | Secure integrations with other VedaAcademy services shall be supported where required | P1 |

### 5.2 Parent Application Portal

| # | Requirement | Priority |
|---|-------------|----------|
| BR-10 | Parents shall access the portal via a secure link embedded on school websites | P0 |
| BR-11 | The portal shall be hosted at smartschooladmissions.com | P0 |
| BR-12 | First-time parents shall verify identity through email verification | P0 |
| BR-13 | After login, parents shall see only: Dashboard, Enrolment, Profile | P0 |
| BR-14 | First-time users must complete their profile before accessing the enrolment form | P0 |
| BR-15 | Phone number and ID proof shall be configurable as mandatory profile fields | P0 |
| BR-16 | School-First approach: search by board (CBSE, Matriculation, State Board) or area | P0 |
| BR-17 | Application-First (Agentic) approach: chatbot-assisted single application | P1 (Phase 2) |
| BR-18 | Parents shall be able to select multiple schools for one application (Agentic) | P1 (Phase 2) |
| BR-19 | Both active and inactive schools shall be displayed with status clearly indicated | P0 |

### 5.3 School Registration and Onboarding

| # | Requirement | Priority |
|---|-------------|----------|
| BR-20 | Schools shall be registered through a one-time onboarding process | P0 |
| BR-21 | School-specific credentials and contact information shall be maintained | P0 |
| BR-22 | Schools shall be provided a secure, school-specific link for website integration | P0 |
| BR-23 | Schools shall be able to embed an "Apply Now" button using the provided link | P0 |

### 5.4 Application Review and Management

| # | Requirement | Priority |
|---|-------------|----------|
| BR-30 | Authorised school staff shall access applications submitted to their school only | P0 |
| BR-31 | Staff shall be able to approve, reject, or request additional information | P0 |
| BR-32 | Only staff with appropriate permissions shall manage applications | P0 |
| BR-33 | Application status, school association, and review history shall be maintained | P0 |
| BR-34 | Active/inactive schools shall be distinguished; submissions blocked for ineligible schools | P0 |

### 5.5 Notification and Communication

| # | Requirement | Priority |
|---|-------------|----------|
| BR-40 | Schools shall receive email notification when an application is submitted | P0 |
| BR-41 | Notification emails shall contain a secure link to review the application | P0 |
| BR-42 | Parents shall receive notifications for status changes and info requests | P0 |
| BR-43 | Parents shall be able to update application details or upload documents when requested | P0 |

### 5.6 Security Requirements

| # | Requirement | Priority |
|---|-------------|----------|
| BR-50 | Parent and school staff authentication shall be separate | P0 |
| BR-51 | Role-based access control shall restrict actions to authorised users | P0 |
| BR-52 | Application data shall be stored independently of Veda School database | P0 |
| BR-53 | All embed links and notification links shall be cryptographically signed | P0 |
| BR-54 | HTTPS shall be enforced on all endpoints | P0 |
| BR-55 | Document uploads shall be validated for type, size, and content | P0 |

### 5.7 Performance Requirements

| # | Requirement | Target |
|---|-------------|--------|
| BR-60 | API response time (p95) | < 200ms |
| BR-61 | School search results (p95) | < 300ms |
| BR-62 | Document upload (p95, 5MB file) | < 3 seconds |
| BR-63 | Concurrent parent sessions | 200+ |
| BR-64 | System uptime | > 99.5% |

### 5.8 Data Privacy Requirements

| # | Requirement | Priority |
|---|-------------|----------|
| BR-70 | Parent consent shall be collected during registration | P0 |
| BR-71 | Data retention policy: applications retained for 2 years | P1 |
| BR-72 | Parents shall be able to export their own data | P1 |
| BR-73 | Data deletion request flow shall be supported | P1 |
| BR-74 | Privacy policy shall be accessible on the portal | P0 |

---

## 6. Business Risks & Mitigations

| # | Risk | Impact | Likelihood | Mitigation |
|---|------|--------|------------|------------|
| R1 | Low school adoption in first 90 days | Platform has insufficient supply; parents cannot find schools | High | Direct school outreach in metros; offer free onboarding; showcase parent traffic |
| R2 | Parent trust concerns (new platform) | Low application submission rate | Medium | Email verification; privacy policy; school branding on embed; data encryption |
| R3 | Admissions seasonality (peak Jan–Apr in India) | Launch timing critical | Medium | Target Oct–Dec launch for next season readiness; use off-season for school onboarding |
| R4 | School staff digital literacy | Poor adoption of review tools | Medium | Simple UI; guided onboarding; email-first notifications with direct links |
| R5 | Data privacy regulatory changes | Compliance overhead | Low | GDPR-aligned from day one; consent-first design; data minimisation |
| R6 | Competing school-built portals | Schools prefer their own solution | Medium | Differentiate with multi-school discovery, analytics, and zero-cost integration |

---

## 7. Success Metrics (KPIs)

### 7.1 Development KPIs (10-Week Build)

| # | Metric | Target | Phase |
|---|--------|--------|-------|
| D1 | Phase 1 complete (school-first E2E) | Week 4 | P1 |
| D2 | Phase 2 complete (agentic + multi-school) | Week 7 | P2 |
| D3 | Phase 3 complete (launch-ready) | Week 10 | P3 |
| D4 | Test coverage (backend) | > 80% | P3 |
| D5 | Security audit — zero critical findings | Week 9 | P3 |
| D6 | p95 API latency | < 200ms | P3 |

### 7.2 Business KPIs (Post-Launch, 90 Days)

| # | Metric | Target |
|---|--------|--------|
| B1 | Schools onboarded | 50+ |
| B2 | Parent registrations | 1,000+ |
| B3 | Applications submitted | 500+ |
| B4 | Application completion rate (started → submitted) | > 70% |
| B5 | School response rate (within 7 days) | > 80% |
| B6 | Parent NPS | > 40 |
| B7 | System uptime | > 99.5% |
| B8 | Embed link integration (schools with Apply Now) | > 30 |

---

## 8. Assumptions & Constraints

### 8.1 Assumptions

1. Schools have an existing website where they can place an "Apply Now" button
2. Schools have at least one staff member with email access for application review
3. Parents have access to email for verification and notifications
4. Internet connectivity is sufficient for form submission and document upload
5. Schools are willing to undergo a one-time onboarding process
6. The initial target market is English-medium private schools in Indian metros

### 8.2 Constraints

| Constraint | Impact |
|------------|--------|
| 10-week development timeline | Feature scope must be phased; Phase 1 = MVP |
| Standalone microservice (no Veda School coupling) | Independent database, auth, deployment |
| No tenant per parent | Cannot reuse Veda's multi-tenant model for parent accounts |
| Email-only notifications (Phase 1) | Push/SMS deferred to Phase 3 |
| Infrastructure cost target < $20/month | Free-tier services where possible |

---

## 9. Sign-Off & Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Product Owner | | | Pending |
| Technical Lead | | | Pending |
| CTO | | | Pending |

---

**Last Updated:** October 24, 2026
**Version:** 1.0
**Status:** Draft — awaiting review
