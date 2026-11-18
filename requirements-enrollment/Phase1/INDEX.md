# Phase 1 — MVP Sprint (2 Weeks)

## Overview

This folder contains the **business, product, and technical documentation** for the Enrolment Module MVP — a 2-week sprint delivering the complete School-First enrolment flow from parent registration to school review.

> **v2.0:** Compressed from 4-week Phase 1 to a 2-week full MVP sprint. Week 1 = all backend APIs. Week 2 = all frontend + production deploy.

---

## Files in This Folder

### 1. **BUSINESS_REQUIREMENTS.md**
**Purpose:** Business context, objectives, scope, KPIs, risks
**For:** Product managers, leadership, stakeholders

### 2. **PRODUCT_REQUIREMENTS.md**
**Purpose:** User stories, acceptance criteria, feature specifications (10 features)
**For:** Development team, QA, designers

### 3. **Phase1_Architecture.md**
**Purpose:** Technical architecture blueprint (services, database, auth, deployment)
**For:** Backend engineers, DevOps, technical architects

---

## 2-Week MVP Scope

### Week 1 (Days 1–5): Backend
| Day | Deliverable | Exit Criteria |
|-----|-------------|---------------|
| D1 | Schema + Infra | Docker Compose runs; all tables exist; /health returns 200 |
| D2 | Auth + Profile | Parent can register → verify → login → complete profile |
| D3 | Schools + Applications | Schools searchable; parent can create + submit application |
| D4 | Review + Embed | Staff can review applications; embed link resolves |
| D5 | Notifications + Polish | All 6 email templates send; seed data loadable |

### Week 2 (Days 6–10): Frontend + Deploy
| Day | Deliverable | Exit Criteria |
|-----|-------------|---------------|
| D6 | Auth pages + Layout | Parent can register and log in via browser |
| D7 | Profile + Search | Parent can complete profile, search schools |
| D8 | Application Form | Parent can fill and submit application |
| D9 | Staff Portal | Full review cycle works in browser |
| D10 | Test + Deploy | **smartschooladmissions.com is live** |

### Deferred to Post-MVP
- Agentic chatbot (Sprint 2, Weeks 3–4)
- Multi-school submission (Sprint 2)
- School comparison (Sprint 3)
- Analytics dashboards (Sprint 3)
- Advanced notifications / preferences (Sprint 3)

---

**Last Updated:** October 24, 2026
**Version:** 2.0
