# VedaAcademy Enrolment Module — Requirements Index

**Document Version:** 2.0
**Date:** October 2026
**Status:** Draft — planning artifact
**Audience:** Product, Engineering, Leadership, Stakeholders
**Domain:** smartschooladmissions.com — Standalone Enrolment Microservice

> **v2.0:** Restructured for **2-week MVP sprint**. Agentic chatbot, multi-school submission, and analytics moved to Post-MVP sprints.

---

## Overview

This folder contains the complete requirements, architecture, phased roadmap, and implementation checklist for the **VedaAcademy Enrolment Module** — a standalone microservice that allows parents to apply to schools through a central portal, while authorised school staff independently review, manage, and process applications.

---

## Folder Structure

```
requirements-enrollment/
├── INDEX.md                          ← You are here
├── MASTER_ROADMAP.md                 ← 2-week sprint plan, day-by-day breakdown
├── ARCHITECTURE_AND_FLOWS.md         ← System architecture & data flow diagrams
├── IMPLEMENTATION_CHECKLIST.md       ← Master checklist (MVP vs Post-MVP)
│
├── Phase1/                           ← MVP Sprint (Week 1–2)
│   ├── INDEX.md                      ← Phase 1 navigation guide
│   ├── BUSINESS_REQUIREMENTS.md      ← Business goals, scope, KPIs
│   ├── PRODUCT_REQUIREMENTS.md       ← User stories, acceptance criteria
│   └── Phase1_Architecture.md        ← Technical architecture blueprint
│
├── Phase2/                           ← Post-MVP Sprint 2 (Week 3–4)
│   ├── INDEX.md
│   └── PHASE2_ENHANCEMENTS.md        ← Agentic chatbot, multi-school, comparisons
│
├── Phase3/                           ← Post-MVP Sprint 3+ (Week 5+)
│   ├── INDEX.md
│   └── PHASE3_SCALE_AND_LAUNCH.md    ← Analytics, hardening, integrations
│
└── diagrams/                         ← Mermaid sequence & flow diagrams
    ├── parent_application_sequence.md
    ├── school_review_sequence.md
    ├── agentic_application_sequence.md    (Post-MVP reference)
    ├── school_onboarding_sequence.md
    ├── notification_flow_sequence.md
    └── data_model_erd.md
```

---

## 2-Week Sprint Summary

| Week | Days | Focus | Key Deliverables |
|------|------|-------|------------------|
| **Week 1** | D1–D5 | Backend APIs | Schema, auth, profile, school search, application CRUD, review actions, notifications |
| **Week 2** | D6–D10 | Frontend + Deploy | Auth pages, parent portal, school search, application form, staff review, integration tests, **production deploy** |

### What ships in 2 weeks

- Parent registration + email verification + profile
- Parent dashboard (3 menu items)
- School search by board/area/name
- School-First application form + document upload
- School onboarding + embed link for websites
- School staff auth + RBAC (admin/reviewer/viewer)
- Application review: approve / reject / request-info
- Parent follow-up (respond to info requests)
- 6 email notification templates
- Production deploy at smartschooladmissions.com

### What's deferred to Post-MVP

- Agentic chatbot (Sprint 2)
- Multi-school submission (Sprint 2)
- School comparison (Sprint 3)
- Analytics dashboards (Sprint 3)
- Notification preferences (Sprint 3)
- Payment processing (Sprint 4+)

---

## How to Use This Folder

### For Developers (start here)
1. Read `MASTER_ROADMAP.md` §4–§5 (10 min) — day-by-day plan
2. Read `Phase1/Phase1_Architecture.md` §3–§5 (20 min) — services, schema, auth
3. Open `IMPLEMENTATION_CHECKLIST.md` — work through daily checklists
4. Reference `diagrams/` while implementing each flow

### For Product / Leadership
1. Read `MASTER_ROADMAP.md` §1–§2 — what ships vs what's deferred
2. Read `Phase1/BUSINESS_REQUIREMENTS.md` — goals and KPIs
3. Check §10 in roadmap — MVP gate success criteria

---

**Last Updated:** October 24, 2026
**Version:** 2.0
**Status:** Draft — 2-week sprint plan
