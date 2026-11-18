# VedaAcademy Enrollment Module — API Keys & Services Guide

## Overview

This document lists every external service, API key, and infrastructure component used in the VedaAcademy Enrollment Module. It explains what each one does, where it's used in the codebase, whether it costs money, and how to configure it.

---

## 1. Self-Hosted Services (Docker — No External Keys Needed)

These run locally via `docker-compose.yml`. No accounts, no cost, no API keys.

### PostgreSQL (Database)
- **What it does:** Stores all application data — users, parent profiles, children, schools, applications, review actions, info requests, documents metadata
- **Port:** `5433` (mapped from container `5432`)
- **Credentials:** `enrolment` / `enrolment` (configured in docker-compose)
- **Config var:** `DATABASE_URL`
- **Used by:** Every backend endpoint

### Redis (Cache & Sessions)
- **What it does:** Caches sessions, rate limiting, chatbot conversation state storage
- **Port:** `6380` (mapped from container `6379`)
- **Config var:** `REDIS_URL`
- **Used by:** Auth sessions, chatbot service (`chatbot_service.py`)

### Mailpit (Email Testing)
- **What it does:** Catches all outgoing emails locally for testing — approval notifications, rejection emails, info request messages to parents
- **SMTP Port:** `1025`
- **Web UI:** `http://localhost:8025` (view caught emails in browser)
- **Config vars:** `SMTP_HOST`, `SMTP_PORT`
- **Used by:** `notification_service.py`, `email_templates.py`
- **Note:** In production, replace with a real SMTP provider (SendGrid, AWS SES, etc.)

### MinIO (S3-Compatible File Storage) — Currently Disabled
- **What it does:** Stores uploaded documents (birth certificates, transcripts, photos, medical records)
- **Ports:** `9000` (API), `9001` (console)
- **Credentials:** `minioadmin` / `minioadmin`
- **Config vars:** `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`
- **Used by:** `document_service.py`
- **Status:** Commented out in `docker-compose.yml`. Uncomment to enable document uploads.

---

## 2. External API Keys (For AI Features)

These are the only keys that require external accounts. **The app works fully without them** — AI features fall back to a rule-based text processor.

### OpenAI API Key (Primary)
| | |
|---|---|
| **Key name** | `OPENAI_API_KEY` |
| **Provider** | OpenAI ([platform.openai.com](https://platform.openai.com)) |
| **Model used** | `gpt-4o-mini` (mid-level, configurable via `LLM_MODEL`) |
| **Cost** | Pay-per-use: ~$0.15/1M input tokens, ~$0.60/1M output tokens |
| **Estimated monthly cost** | < $1 for a typical school (100 applications/month) |
| **Priority** | Primary LLM (tried first) |

**Where it's used:**

1. **"Improve with AI" button** — Staff portal
   - File: `app/routers/ai_assist.py`
   - Endpoint: `POST /api/v1/ai/improve-text`
   - Purpose: Rewrites info request messages and rejection reasons to be professional, warm, and well-structured (similar to Gmail's "Help me write")

2. **Enrollment Chatbot** — Parent portal
   - File: `app/services/chatbot_service.py`
   - Endpoint: `POST /api/v1/applications/chatbot`
   - Purpose: Guides parents through the enrollment form via a conversational AI assistant, collects student details step by step

3. **Agentic Workflows** (future)
   - Will power LangGraph-based multi-step enrollment workflows

### Google Gemini API Key (Fallback)
| | |
|---|---|
| **Key name** | `GOOGLE_API_KEY` |
| **Provider** | Google AI Studio ([aistudio.google.com](https://aistudio.google.com)) |
| **Model used** | `gemini-2.5-flash` (mid-level, configurable via `LLM_FALLBACK_MODEL`) |
| **Cost** | Free tier: 15 RPM / 1M TPM. Paid: ~$0.10/1M input, ~$0.40/1M output |
| **Estimated monthly cost** | **Free** for testing (free tier is generous). < $1 paid. |
| **Priority** | Fallback LLM (used only if OpenAI key is missing or fails) |

**Where it's used:** Same two features as OpenAI — acts as a backup.

### How the AI Fallback Chain Works

```
1. OpenAI (gpt-4o-mini)       → if OPENAI_API_KEY is set, try this first
        ↓ (fails or missing)
2. Google Gemini (2.0-flash)   → if GOOGLE_API_KEY is set, try this
        ↓ (fails or missing)
3. Rule-based fallback         → always works, no key needed
   - Capitalizes sentences
   - Adds "Dear Parent" greeting
   - Adds professional sign-off
   - Adds empathetic tone for rejections
```

### Cost Comparison

| Provider | Model | Input Cost | Output Cost | Free Tier |
|---|---|---|---|---|
| OpenAI | gpt-4o-mini | $0.15 / 1M tokens | $0.60 / 1M tokens | No (prepaid $5 min) |
| Google | gemini-2.5-flash | $0.10 / 1M tokens | $0.40 / 1M tokens | Yes (15 req/min free) |

For testing, **Gemini alone is enough** — the free tier handles it. For production, OpenAI + Gemini gives you reliability.

---

## 3. Internal Keys (Pre-configured — Change Only for Production)

These have working defaults for development. No external accounts needed.

### JWT_SECRET
- **What:** Signs authentication tokens (login sessions)
- **Default:** `change-me-to-a-long-random-secret-in-production`
- **Action:** Replace with a long random string before deploying to production
- **Used by:** `app/utils/jwt.py`

### PLATFORM_API_KEY
- **What:** Internal API key for service-to-service authentication
- **Default:** `platform-dev-key-change-me`
- **Action:** Replace for production
- **Used by:** `app/deps.py` (platform endpoint auth)

### BCRYPT_ROUNDS
- **What:** Password hashing strength
- **Default:** `12`
- **Action:** No change needed

---

## 4. Setup Instructions

### Quick Start (No AI — Everything Works)
```bash
# Just start Docker services
docker compose up -d

# That's it. All features work except AI will use rule-based fallback.
```

### Enable AI Features

**Option A: Google Gemini only (free for testing)**
```bash
# Create .env file in project root
echo "GOOGLE_API_KEY=your-gemini-key-here" > .env

# Restart the API
docker compose restart enrolment-api
```

**Option B: OpenAI only**
```bash
echo "OPENAI_API_KEY=sk-your-key-here" > .env
docker compose restart enrolment-api
```

**Option C: Both providers (recommended — with fallback)**
```bash
cat > .env << 'EOF'
OPENAI_API_KEY=sk-your-openai-key
GOOGLE_API_KEY=your-gemini-key
EOF

docker compose restart enrolment-api
```

### How to Get API Keys

| Provider | Sign up | Get key | Cost to start |
|---|---|---|---|
| Google Gemini | [aistudio.google.com](https://aistudio.google.com) | Get API Key → Create | **Free** (generous free tier) |
| OpenAI | [platform.openai.com](https://platform.openai.com) | API Keys → Create new | $5 prepaid minimum |

### Enable Document Uploads (Optional)
Uncomment the MinIO service in `docker-compose.yml`, then:
```bash
docker compose up -d enrolment-minio
```

---

## 5. Summary Table

| Key | Required? | Cost | What Happens Without It |
|---|---|---|---|
| `OPENAI_API_KEY` | No | ~$0.15-0.60/1M tokens | AI features use Gemini or rule-based fallback |
| `GOOGLE_API_KEY` | No | **Free tier** / ~$0.10-0.40/1M paid | AI features use OpenAI or rule-based fallback |
| `JWT_SECRET` | Has default | Free | Works in dev, must change for production |
| `DATABASE_URL` | Has default | Free (Docker) | Auto-configured |
| `REDIS_URL` | Has default | Free (Docker) | Auto-configured |
| `SMTP_HOST/PORT` | Has default | Free (Mailpit) | Emails caught locally |
| `S3_*` keys | Has default | Free (MinIO) | Document uploads (when MinIO enabled) |

---

## 6. Configuration File Reference

All settings are in: `services/enrolment-api/app/config.py`

### LLM Settings
| Setting | Default | Description |
|---|---|---|
| `LLM_MODEL` | `gpt-4o-mini` | Primary model (OpenAI) |
| `LLM_FALLBACK_MODEL` | `gemini-2.5-flash` | Fallback model (Google) |
| `LLM_TIMEOUT` | `15` | Request timeout in seconds |
| `LLM_MAX_RETRIES` | `1` | Max retry attempts |
| `CHATBOT_MAX_MESSAGES_PER_SESSION` | `50` | Max messages per chatbot conversation |
| `CHATBOT_MAX_SESSIONS_PER_DAY` | `5` | Max new chatbot sessions per parent per day |

### Dependencies (requirements.txt)
```
langchain-core>=0.3.0         # Core LangChain framework
langchain-openai>=0.2.0       # OpenAI integration (gpt-4o-mini)
langchain-google-genai>=2.0.0  # Google Gemini integration (gemini-2.5-flash)
```

Environment variables can be set via:
1. `.env` file in project root (read by docker-compose)
2. `environment:` block in `docker-compose.yml`
3. Shell environment (`export OPENAI_API_KEY=...`)

Priority: Shell env > `.env` file > defaults in `config.py`

---

## 7. Future: LangGraph Agentic Workflows

Harry sir's feedback mentioned agentic workflows. When implemented, LangGraph will use the **same `OPENAI_API_KEY` and `GOOGLE_API_KEY`** — no additional keys needed. The `langgraph` package will be added to `requirements.txt` alongside the existing `langchain-core`, `langchain-openai`, and `langchain-google-genai` dependencies.

Planned agentic features:
- Multi-step enrollment workflow with state management
- Automated document verification pipeline
- Smart application routing based on school criteria
- Parent follow-up automation
