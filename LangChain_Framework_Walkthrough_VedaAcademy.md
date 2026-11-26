# LangChain Framework Walkthrough — VedaAcademy Smart Admission Portal

**Project**: VedaAcademy Smart Admission Portal  
**Author**: Samitha  
**Date**: November 2026  
**Purpose**: Detailed walkthrough of how the LangChain framework and AI modules are used to create the Agentic AI enrollment assistant.

---

## Table of Contents

1. [Overview — What is LangChain and Why We Use It](#1-overview)
2. [Dependencies and Installation](#2-dependencies)
3. [Architecture — How AI Fits Into the System](#3-architecture)
4. [The Core AI Pipeline — Step by Step](#4-core-pipeline)
5. [Component 1: Pydantic Structured Output Schema](#5-pydantic-schema)
6. [Component 2: Dynamic System Prompt Engineering](#6-system-prompt)
7. [Component 3: Message Construction (Chat History)](#7-message-construction)
8. [Component 4: LLM Provider Selection and Initialization](#8-llm-provider)
9. [Component 5: Structured Output with Function Calling](#9-structured-output)
10. [Component 6: Rule-Based Fallback System](#10-fallback)
11. [Component 7: Post-LLM Validation Layer](#11-validation)
12. [Component 8: AI-Assisted Text Improvement (Staff Side)](#12-ai-assist)
13. [The Complete Request-Response Flow](#13-complete-flow)
14. [Topic-Based Conversation State Machine](#14-state-machine)
15. [How the Agent Decides What to Ask](#15-agent-decisions)
16. [Error Handling and Resilience Strategy](#16-error-handling)
17. [Security Considerations](#17-security)
18. [Summary of LangChain Modules Used](#18-summary)

---

## 1. Overview — What is LangChain and Why We Use It <a name="1-overview"></a>

### What is LangChain?

LangChain is a Python framework for building applications powered by Large Language Models (LLMs). It provides:

- **Unified interface** to multiple LLM providers (OpenAI, Google, Anthropic, etc.)
- **Structured output** — forcing the LLM to return data in a specific format (JSON with defined fields)
- **Message abstractions** — standard classes for system/human/AI messages
- **Composability** — ability to chain LLM calls with other processing steps

### Why We Use LangChain in VedaAcademy

In our enrollment portal, we don't just need a chatbot that talks — we need an **Agentic AI** that:

1. **Understands** natural language from parents (in English, Hindi-English mix, etc.)
2. **Extracts structured data** from conversational text (names, dates, phone numbers)
3. **Makes decisions** about what to ask next based on what's been collected
4. **Validates** extracted data against business rules
5. **Maintains conversation context** across multiple exchanges

LangChain makes this possible by letting us define a schema (using Pydantic) and having the LLM fill it out reliably, rather than trying to parse free-text LLM responses with regex.

---

## 2. Dependencies and Installation <a name="2-dependencies"></a>

**File**: `services/enrolment-api/requirements.txt`

The LangChain-related packages we use:

```
langchain-core>=0.3.0          # Core abstractions (messages, structured output)
langchain-openai>=0.2.0        # OpenAI integration (ChatOpenAI)
langchain-google-genai>=2.0.0  # Google Gemini integration (ChatGoogleGenerativeAI)
pydantic==2.10.2               # Data validation and schema definition
pydantic-settings==2.6.1       # Environment variable configuration
```

### What Each Package Does

| Package | Purpose | Used For |
|---------|---------|----------|
| `langchain-core` | Base classes and interfaces | `SystemMessage`, `HumanMessage`, `AIMessage`, `with_structured_output()` |
| `langchain-openai` | OpenAI API wrapper | `ChatOpenAI` class to call GPT-4o-mini |
| `langchain-google-genai` | Google AI wrapper | `ChatGoogleGenerativeAI` to call Gemini 2.5 Flash |
| `pydantic` | Schema definition | `ChatbotExtraction` model that defines what the LLM must return |

**Note**: We do NOT use the full `langchain` package. We only use the lightweight `langchain-core` plus provider-specific packages. This keeps our dependency footprint small.

---

## 3. Architecture — How AI Fits Into the System <a name="3-architecture"></a>

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + TypeScript)                │
│                                                                  │
│   ChatbotPage.tsx  ──HTTP POST──>  /api/v1/chatbot/respond      │
│   (User types message)             (FastAPI endpoint)            │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI + Python)                    │
│                                                                  │
│   chatbot.py (Router)                                            │
│       │                                                          │
│       ▼                                                          │
│   ChatbotService.process_response()                              │
│       │                                                          │
│       ├── 1. Load session from PostgreSQL (JSONB)                │
│       ├── 2. Handle special commands (__apply_more_schools__, etc)│
│       ├── 3. Build system prompt + message history               │
│       ├── 4. Call LLM via LangChain ◄──── THE AI PART           │
│       ├── 5. Validate extracted fields                           │
│       ├── 6. Rule-based fallback extraction                      │
│       ├── 7. Decide topic transitions                            │
│       ├── 8. Compute progress percentage                         │
│       └── 9. Save session, return response                       │
│                                                                  │
│   ┌─────────────────────────────────────────┐                    │
│   │         LLM LAYER (LangChain)           │                    │
│   │                                          │                    │
│   │   Primary: OpenAI GPT-4o-mini           │                    │
│   │   Fallback: Google Gemini 2.5 Flash     │                    │
│   │   Last resort: Rule-based extraction    │                    │
│   └─────────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decision: Hybrid AI + Rule-Based

We use a **three-tier** approach:

1. **LangChain + LLM** (primary) — Handles natural language understanding, conversational responses, and field extraction
2. **Rule-based fallback** (if LLM call fails) — Regex patterns that extract fields from common input patterns
3. **Post-LLM validation** (always runs) — Validates every extracted field against business rules regardless of source

This means the system **never crashes** if the AI is unavailable — it gracefully degrades to rule-based extraction.

---

## 4. The Core AI Pipeline — Step by Step <a name="4-core-pipeline"></a>

**File**: `services/enrolment-api/app/services/chatbot_service.py`

Here is exactly what happens when a parent sends a message:

```
Parent types: "My son Arjun was born on 15/03/2015"
                              │
                              ▼
Step 1: _build_system_prompt()
   → Creates a detailed instruction prompt telling the LLM:
     - What topic we're currently on (e.g., "student_details")
     - What fields we already have
     - What fields we still need
     - Rules for extraction and conversation
                              │
                              ▼
Step 2: _build_messages()
   → Assembles the full conversation:
     [SystemMessage, ...previous messages..., HumanMessage("My son Arjun...")]
                              │
                              ▼
Step 3: _call_llm()
   → Tries LangChain first, falls back to rule-based if it fails
                              │
                              ▼
Step 4: _call_langchain()
   → LangChain converts messages to LLM format
   → Calls GPT-4o-mini (or Gemini) with structured output
   → LLM returns: {
       "message": "Great! I've noted Arjun's details...",
       "extracted_fields": {
           "student_full_name": "Arjun",
           "gender": "Male",
           "date_of_birth": "2015-03-15"
       },
       "topic_complete": false
     }
                              │
                              ▼
Step 5: _validate_field() for each extracted field
   → "Arjun" ✓ (valid name)
   → "Male" ✓ (in VALID_GENDERS, raw input has "son" = gender hint)
   → "2015-03-15" ✓ (valid date, child is > 2 years old)
                              │
                              ▼
Step 6: Rule-based fallback extraction
   → Checks if the LLM missed anything that regex can catch
   → e.g., phone numbers, DOB patterns the LLM didn't extract
                              │
                              ▼
Step 7: Topic transition check
   → Are all required fields for "student_details" collected?
   → If yes: move to "academic_history", generate transition message
   → If no: continue on current topic, ask for FIRST missing field
                              │
                              ▼
Step 8: Compute completeness (progress bar)
   → Form fields (60%) + School selection (20%) + Documents (10%) + Submission (10%)
                              │
                              ▼
Step 9: Save to PostgreSQL and return JSON response to frontend
```

---

## 5. Component 1: Pydantic Structured Output Schema <a name="5-pydantic-schema"></a>

**File**: `chatbot_service.py`, lines 243-253

```python
from pydantic import BaseModel, Field

class ChatbotExtraction(BaseModel):
    """Structured output from the enrollment chatbot LLM."""
    message: str = Field(
        description="Conversational response to the parent"
    )
    extracted_fields: dict[str, str] = Field(
        default_factory=dict,
        description="Application fields extracted from the parent's message",
    )
    topic_complete: bool = Field(
        default=False,
        description="True when ALL required fields for the current topic are collected",
    )
```

### What This Does

This Pydantic model tells LangChain: "The LLM's response MUST have exactly these three fields." LangChain uses this model to:

1. Generate a JSON Schema from the Pydantic model
2. Send that schema to the LLM as a "function definition" (OpenAI function calling)
3. Force the LLM to return a JSON object matching this exact structure
4. Automatically parse the JSON back into a `ChatbotExtraction` Python object

### Why This Matters

Without structured output, we'd get back a free-text response like:
```
"Sure! I've noted the name as Arjun, male, born March 15 2015. What grade?"
```
And we'd need complex regex/NLP to extract the data. With structured output, we get a clean Python object:
```python
result.message = "Sure! I've noted Arjun's details..."
result.extracted_fields = {"student_full_name": "Arjun", "gender": "Male", ...}
result.topic_complete = False
```

### The Three Fields Explained

| Field | Type | Purpose |
|-------|------|---------|
| `message` | `str` | The conversational reply shown to the parent in the chat UI |
| `extracted_fields` | `dict[str, str]` | Key-value pairs of application data the LLM found in the message |
| `topic_complete` | `bool` | Signal that all required fields for the current topic are collected |

The `extracted_fields` dictionary uses these keys:
- `student_full_name`, `date_of_birth`, `gender`, `nationality` (student details)
- `grade_applying_for`, `previous_school_name`, `previous_board`, `previous_marks` (academics)
- `emergency_contact_name`, `emergency_contact_phone`, `medical_conditions`, `special_needs` (additional info)

---

## 6. Component 2: Dynamic System Prompt Engineering <a name="6-system-prompt"></a>

**File**: `chatbot_service.py`, function `_build_system_prompt()` (lines 260-332)

The system prompt is the most critical part — it instructs the LLM on how to behave. It is **dynamically constructed** for every single message based on the current conversation state.

### Structure of the System Prompt

```
┌─────────────────────────────────────────────────┐
│  SYSTEM_PROMPT (base rules, always included)     │
│  - "You are VedaAcademy's enrollment assistant"  │
│  - "Ask ONE field at a time"                     │
│  - "Be warm and encouraging"                     │
│  - Rules for name extraction, DOB, corrections   │
├─────────────────────────────────────────────────┤
│  CURRENT TOPIC: student_details                  │
│  INSTRUCTIONS FOR THIS TOPIC: (topic-specific)   │
├─────────────────────────────────────────────────┤
│  PARENT CONTEXT (from profile, do NOT re-ask):   │
│    Parent name: Rajesh Kumar                     │
│    Phone: 9876543210                             │
│    City: Delhi                                   │
├─────────────────────────────────────────────────┤
│  SAVED CHILDREN:                                 │
│    - Arjun (DOB: 2015-03-15, Gender: Male)      │
│    - Sam (DOB: 2017-08-20, Gender: Male)        │
├─────────────────────────────────────────────────┤
│  FIELD STATUS:                                   │
│    Fields for this topic: [name, dob, gender...] │
│    Already have: [student_full_name]             │
│    Still need (mandatory): [date_of_birth]       │
│    Still need (optional): [nationality]          │
├─────────────────────────────────────────────────┤
│  Other fields you can extract if mentioned: ...  │
├─────────────────────────────────────────────────┤
│  Data collected so far:                          │
│    student_full_name: Arjun                      │
└─────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Context-aware**: The prompt includes what we already know (parent name, children) so the LLM never re-asks for known info.
2. **State-aware**: The prompt tells the LLM exactly which fields are missing for the current topic.
3. **One field at a time**: The instructions explicitly say "ask for the FIRST missing field only."
4. **Cross-topic extraction**: Even if the parent mentions a future field (e.g., grade while giving name), the LLM can extract it early.

### Topic-Specific Prompts

Each conversation topic has its own instruction set:

```python
TOPIC_PROMPTS = {
    "welcome": "Greet the parent like a friendly human...",
    "student_details": "You are collecting: student_full_name, date_of_birth, gender, nationality...",
    "academic_history": "You are collecting: grade_applying_for, previous_school_name...",
    "additional_info": "You are collecting: emergency_contact_name, emergency_contact_phone...",
    "review": "Present a clear summary of ALL collected application data...",
}
```

---

## 7. Component 3: Message Construction (Chat History) <a name="7-message-construction"></a>

**File**: `chatbot_service.py`, function `_build_messages()` (lines 335-347)

```python
def _build_messages(session: ChatbotSession, user_message: str | None = None) -> list[dict[str, str]]:
    system = _build_system_prompt(session)
    messages = [{"role": "system", "content": system}]

    for entry in session.conversation_history or []:
        messages.append({"role": entry["role"], "content": entry["content"]})

    if user_message:
        messages.append({"role": "user", "content": user_message})

    return messages
```

### What This Does

Assembles the complete message array that gets sent to the LLM:

```
[
  SystemMessage("You are VedaAcademy's enrollment assistant..."),  ← Instructions
  HumanMessage("Hi I want to enroll my son"),                     ← Turn 1
  AIMessage("Welcome! What is your son's name?"),                 ← Turn 1 reply
  HumanMessage("His name is Arjun"),                              ← Turn 2
  AIMessage("Great! When was Arjun born?"),                       ← Turn 2 reply
  HumanMessage("15 March 2015"),                                  ← Turn 3 (current)
]
```

### Why Conversation History Matters

The LLM is **stateless** — it has no memory between API calls. By including the full conversation history, the LLM can:
- Understand context ("he" refers to Arjun)
- Avoid repeating questions
- Handle corrections ("actually, the name is Arjun Kumar, not just Arjun")
- Maintain a natural conversational tone

### Storage

The conversation history is stored in PostgreSQL as a JSONB column in the `chatbot_sessions` table:

```python
class ChatbotSession(Base):
    __tablename__ = "chatbot_sessions"
    conversation_history: Mapped[list] = mapped_column(JSONB, default=list)
    application_data: Mapped[dict] = mapped_column(JSONB, default=dict)
    current_topic: Mapped[str] = mapped_column(String(50), default="welcome")
    status: Mapped[str] = mapped_column(String(20), default="active")
```

---

## 8. Component 4: LLM Provider Selection and Initialization <a name="8-llm-provider"></a>

**File**: `chatbot_service.py`, function `_get_langchain_llm()` (lines 391-413)

```python
def _get_langchain_llm():
    """Create the appropriate LangChain chat model based on available API keys."""
    if settings.OPENAI_API_KEY:
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=settings.LLM_MODEL,          # "gpt-4o-mini"
            api_key=settings.OPENAI_API_KEY,
            temperature=0.3,
            max_tokens=500,
            request_timeout=settings.LLM_TIMEOUT,  # 15 seconds
        )

    if settings.GOOGLE_API_KEY:
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=settings.LLM_FALLBACK_MODEL,  # "gemini-2.5-flash"
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.3,
            max_tokens=500,
            timeout=float(settings.LLM_TIMEOUT),
        )

    raise RuntimeError("No LLM API key configured")
```

### Provider Priority

```
1. OpenAI GPT-4o-mini (primary)   — if OPENAI_API_KEY is set
2. Google Gemini 2.5 Flash (fallback) — if GOOGLE_API_KEY is set
3. RuntimeError                    — if neither key is available
```

### Configuration (from `.env`)

```
LLM_MODEL=gpt-4o-mini           # OpenAI model name
LLM_FALLBACK_MODEL=gemini-2.5-flash  # Google model name
LLM_TIMEOUT=15                   # Seconds before timeout
LLM_MAX_RETRIES=1                # Retry count on failure
```

### Why These Parameter Values?

| Parameter | Value | Reason |
|-----------|-------|--------|
| `temperature` | 0.3 | Low temperature = more deterministic/predictable extraction. We want consistent field parsing, not creative writing. |
| `max_tokens` | 500 | Enough for a 2-3 sentence response + field extraction JSON. Prevents runaway costs. |
| `timeout` | 15s | Parents expect fast responses. If the LLM takes longer, we fall back to rule-based. |

### Why Lazy Imports?

Notice the imports are inside the function (`from langchain_openai import ChatOpenAI`). This is intentional:
- The app starts faster (no heavy imports at startup)
- If OpenAI package isn't installed but Google is, the app still works
- Only the needed provider is imported

---

## 9. Component 5: Structured Output with Function Calling <a name="9-structured-output"></a>

**File**: `chatbot_service.py`, function `_call_langchain()` (lines 365-388)

This is the **heart of the LangChain integration**:

```python
async def _call_langchain(messages: list[dict[str, str]]) -> dict[str, Any]:
    """Use LangChain with structured output for field extraction."""
    from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

    # Step 1: Get the LLM instance
    llm = _get_langchain_llm()

    # Step 2: Wrap LLM with structured output
    structured_llm = llm.with_structured_output(
        ChatbotExtraction,          # Our Pydantic schema
        method="function_calling"   # Use OpenAI function calling protocol
    )

    # Step 3: Convert our messages to LangChain message objects
    lc_messages = []
    for m in messages:
        if m["role"] == "system":
            lc_messages.append(SystemMessage(content=m["content"]))
        elif m["role"] == "user":
            lc_messages.append(HumanMessage(content=m["content"]))
        elif m["role"] == "assistant":
            lc_messages.append(AIMessage(content=m["content"]))

    # Step 4: Call the LLM asynchronously
    result: ChatbotExtraction = await structured_llm.ainvoke(lc_messages)

    # Step 5: Convert to plain dict for further processing
    return {
        "message": result.message,
        "extracted_fields": result.extracted_fields,
        "topic_complete": result.topic_complete,
    }
```

### Breaking Down Each Step

#### Step 2: `with_structured_output()` — The Key LangChain Feature

This is the most important LangChain method in our entire project. Here's what it does:

```python
structured_llm = llm.with_structured_output(ChatbotExtraction, method="function_calling")
```

Behind the scenes, LangChain:

1. **Converts** the Pydantic `ChatbotExtraction` model into a JSON Schema:
   ```json
   {
     "type": "object",
     "properties": {
       "message": {"type": "string", "description": "Conversational response..."},
       "extracted_fields": {"type": "object", "additionalProperties": {"type": "string"}},
       "topic_complete": {"type": "boolean", "description": "True when ALL..."}
     },
     "required": ["message", "extracted_fields", "topic_complete"]
   }
   ```

2. **Sends** this schema to the LLM as a "function definition" (OpenAI function calling API)

3. **Forces** the LLM to call this "function" with arguments matching the schema

4. **Parses** the LLM's response back into a `ChatbotExtraction` Python object

#### The `method="function_calling"` Parameter

OpenAI's function calling is a feature where:
- You define "functions" (tools) the LLM can "call"
- The LLM decides when to call them and fills in the arguments
- LangChain creates a fake "function" from our Pydantic model
- The LLM is forced to always call it, so we always get structured output

This is more reliable than asking the LLM to output JSON in a text response, because:
- The format is guaranteed (no missing fields, no malformed JSON)
- The LLM is specifically trained for this mode (higher accuracy)
- Pydantic validates the response automatically

#### Step 3: LangChain Message Types

LangChain uses specific message classes instead of plain dicts:

```python
SystemMessage(content="You are...")   # Instructions for the LLM
HumanMessage(content="My son...")     # What the parent said
AIMessage(content="Great! What...")   # What the AI previously responded
```

These are from `langchain_core.messages` and are the standard LangChain way to represent conversation turns. Each provider (OpenAI, Google) knows how to convert these to their native format.

#### Step 4: `ainvoke()` — Async Invocation

```python
result = await structured_llm.ainvoke(lc_messages)
```

- `ainvoke` is the **async** version (we use `await` because FastAPI is async)
- LangChain makes the HTTP request to the LLM provider
- Waits for the response
- Parses it into a `ChatbotExtraction` object
- Returns it

---

## 10. Component 6: Rule-Based Fallback System <a name="10-fallback"></a>

**File**: `chatbot_service.py`, function `_fallback_response()` (lines 420-458)

If the LLM call fails (network error, API key issue, timeout), we fall back to pure Python logic:

```python
async def _call_llm(messages: list[dict[str, str]]) -> dict[str, Any]:
    # If no API keys at all, go straight to fallback
    if not settings.OPENAI_API_KEY and not settings.GOOGLE_API_KEY:
        return _fallback_response(messages)

    try:
        return await _call_langchain(messages)
    except Exception as exc:
        logger.warning("LangChain call failed: %s", exc)
        return _fallback_response(messages)   # Graceful degradation
```

### Fallback Extractors

Each topic has its own fallback extractor:

| Topic | Fallback Function | What It Does |
|-------|------------------|--------------|
| `welcome` | Inline | Returns a welcome message, no extraction needed |
| `student_details` | `_extract_student_details_fallback()` | Regex for names, DOB patterns, gender keywords |
| `academic_history` | `_extract_academic_fallback()` | Regex for grade numbers, board names |
| `additional_info` | `_extract_additional_fallback()` | Regex for phone numbers, name patterns |
| `review` | Inline | Returns summary prompt |

### Example: Student Details Fallback

```python
def _extract_student_details_fallback(messages):
    raw_text = last_msg
    text = raw_text.lower()
    words = re.findall(r'[a-zA-Z]+', text)
    fields = {}

    # Gender detection from keywords
    if "son" in words:
        fields["gender"] = "Male"
    elif "daughter" in words:
        fields["gender"] = "Female"
    for g in ("male", "female", "other", "boy", "girl"):
        if g in words:
            fields["gender"] = {"boy": "Male", "girl": "Female"}.get(g, g.capitalize())

    # DOB detection from patterns like "15/03/2015" or "2015-03-15"
    dob_match = re.search(r'(\d{4}[-/:.]\d{1,2}[-/:.]\d{1,2})', text)
    ...

    # Name detection from patterns like "name is Arjun" or "child is Arjun"
    name_patterns = [
        r"(?:name\s+is|called|named)\s+(\w+(?:\s+\w+)*)",
        r"(?:child|kid|son|daughter)\s+(?:is\s+)?(\w+(?:\s+\w+)*)",
    ]
    ...
```

This means parents can still use the chatbot even when no AI service is available — they just won't get the natural conversational experience.

---

## 11. Component 7: Post-LLM Validation Layer <a name="11-validation"></a>

**File**: `chatbot_service.py`, function `_validate_field()` (lines 702+)

Every field the LLM extracts goes through validation:

```python
for key, value in llm_result.get("extracted_fields", {}).items():
    validated = _validate_field(key, str(value), raw_input=message)
    if validated is not None:
        app_data[key] = validated      # Accept the field
    else:
        if not app_data.get(key):
            rejected_fields[key] = str(value)  # Reject and ask again
```

### Validation Rules Per Field

| Field | Validation | Example |
|-------|-----------|---------|
| `gender` | Must be in {"male", "female", "other"} AND raw input must contain gender hints | "amjj" → rejected; "male" → "Male" |
| `date_of_birth` | Must parse as date, not future, child must be > 2 years old | "2015-03-15" → valid; "2025-01-01" → rejected |
| `grade_applying_for` | Must be Nursery/LKG/UKG/Grade 1-12, with aliases | "10" → "Grade 10"; "lkg" → "LKG" |
| `emergency_contact_phone` | Must be valid phone format: 10-digit Indian or international with country code | "9876543210" → valid; "+1 2025551234" → valid |
| `nationality` | Any non-empty text, title-cased | "indian" → "Indian" |
| `previous_board` | Must match known boards or aliases | "cbse" → "CBSE"; "ib" → "International" |

### Why Validate After LLM?

LLMs can hallucinate. Without validation:
- "amjj" could be interpreted as "Male" by the LLM
- A future date could be accepted as a DOB
- An invalid phone number could be stored

The validation layer is our **safety net** — it catches LLM mistakes before they reach the database.

---

## 12. Component 8: AI-Assisted Text Improvement (Staff Side) <a name="12-ai-assist"></a>

**File**: `services/enrolment-api/app/routers/ai_assist.py`

This is a **second, independent use** of LangChain — for the staff portal, not the parent chatbot.

### What It Does

When a school staff member writes a message to a parent (info request, rejection, etc.), they can click "Improve with AI" to polish the text:

```python
@router.post("/improve-text")
async def improve_text(body: ImproveTextRequest, ...):
    system_prompt = IMPROVE_PROMPTS.get(body.context, IMPROVE_PROMPTS["general"])

    if settings.OPENAI_API_KEY:
        from langchain_openai import ChatOpenAI
        llm = ChatOpenAI(model=settings.LLM_MODEL, ...)
        result = await llm.ainvoke([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": body.text},
        ])
        return ImproveTextResponse(improved_text=result.content.strip(), used_ai=True)

    # Fallback to Google, then rule-based
```

### Context-Specific Prompts

```python
IMPROVE_PROMPTS = {
    "info_request": "You are a school admissions officer writing to a parent. "
                    "Rewrite the message to be professional, warm, and clear...",
    "rejection":    "Rewrite to be empathetic, professional, and respectful...",
    "general":      "Rewrite to be professional, clear, and well-structured...",
}
```

### Key Difference from Chatbot

| Feature | Chatbot (Parent) | AI Assist (Staff) |
|---------|------------------|-------------------|
| Structured output | Yes (`ChatbotExtraction`) | No (plain text response) |
| Function calling | Yes | No |
| Conversation history | Full history sent | Single message only |
| Fallback | Rule-based extraction | Rule-based text formatting |

The AI Assist uses `llm.ainvoke()` directly for a simple text-in → text-out pattern, while the chatbot uses `llm.with_structured_output().ainvoke()` for structured JSON extraction.

---

## 13. The Complete Request-Response Flow <a name="13-complete-flow"></a>

Here's the complete journey of a single parent message through the system:

```
FRONTEND                           BACKEND                           EXTERNAL
────────                           ───────                           ────────

1. Parent types                 
   "My son Arjun, born            
   15 March 2015"                 
        │                         
        ▼                         
2. ChatbotPage.tsx sends          
   POST /api/v1/chatbot/respond   
   { session_id, message }        
        │                         
        ▼                         
                              3. chatbot.py router receives
                                 Validates JWT token
                                 Calls ChatbotService.process_response()
                                      │
                                      ▼
                              4. Load ChatbotSession from PostgreSQL
                                 (conversation_history, application_data,
                                  current_topic, status)
                                      │
                                      ▼
                              5. Check for special commands
                                 (__apply_more_schools__,
                                  __select_schools__:ids, etc.)
                                 → Not a special command, continue
                                      │
                                      ▼
                              6. _build_system_prompt(session)
                                 Creates dynamic instruction prompt
                                 with context, field status, etc.
                                      │
                                      ▼
                              7. _build_messages(session, message)
                                 [SystemMessage, ...history...,
                                  HumanMessage("My son Arjun...")]
                                      │
                                      ▼
                              8. _call_llm(messages)
                                 → _call_langchain(messages)
                                      │
                                      ▼
                              9. _get_langchain_llm()
                                 Creates ChatOpenAI(gpt-4o-mini)
                                      │
                                      ▼
                              10. llm.with_structured_output(
                                     ChatbotExtraction,
                                     method="function_calling")
                                      │
                                      ▼
                              11. structured_llm.ainvoke(messages)──────► OpenAI API
                                                                          │
                                                                          ▼
                                                                   GPT-4o-mini processes:
                                                                   - Reads system prompt
                                                                   - Understands context
                                                                   - Extracts fields
                                                                   - Generates response
                                                                          │
                                                                          ▼
                              12. LangChain parses response ◄──────── Returns JSON:
                                  into ChatbotExtraction object      {function_call: {
                                                                       name: "ChatbotExtraction",
                                                                       arguments: {
                                                                         message: "...",
                                                                         extracted_fields: {...},
                                                                         topic_complete: false
                                                                       }}}
                                      │
                                      ▼
                              13. Validate each extracted field
                                  _validate_field("student_full_name", "Arjun")  → "Arjun" ✓
                                  _validate_field("gender", "Male", raw="My son...") → "Male" ✓
                                  _validate_field("date_of_birth", "2015-03-15") → "2015-03-15" ✓
                                      │
                                      ▼
                              14. Rule-based fallback extraction
                                  (catches anything LLM missed)
                                      │
                                      ▼
                              15. Check topic completion
                                  student_details needs: name ✓, dob ✓, gender ✓
                                  Still need: nationality (optional)
                                  → Ask for nationality next
                                      │
                                      ▼
                              16. _compute_completeness()
                                  3 of 12 fields filled = 15%
                                      │
                                      ▼
                              17. Update session in PostgreSQL
                                  Save new application_data
                                  Append to conversation_history
                                      │
                                      ▼
                              18. Return JSON response
        │                         
        ▼                         
19. ChatbotPage.tsx renders       
    - Bot message in chat         
    - Progress bar: 15%           
    - Topic label: "Student       
      details"                    
```

---

## 14. Topic-Based Conversation State Machine <a name="14-state-machine"></a>

The chatbot follows a strict topic progression:

```
welcome → student_details → academic_history → additional_info → review → schools → documents
```

### State Transitions

```
                    ┌──────────┐
                    │ WELCOME  │  "Hi! Which child would you like to enroll?"
                    └────┬─────┘
                         │ topic_complete = true
                         ▼
              ┌──────────────────┐
              │ STUDENT_DETAILS  │  Collect: name, DOB, gender, nationality
              └────────┬─────────┘
                       │ All required fields filled
                       ▼
              ┌──────────────────┐
              │ ACADEMIC_HISTORY │  Collect: grade, prev school, board, marks
              └────────┬─────────┘
                       │ All required fields filled
                       ▼
              ┌──────────────────┐
              │ ADDITIONAL_INFO  │  Collect: emergency contact, medical, special needs
              └────────┬─────────┘
                       │ All required fields filled
                       ▼
              ┌──────────────────┐
              │     REVIEW       │  Show summary, allow edits
              └────────┬─────────┘
                       │ Parent confirms / clicks "Select Schools"
                       ▼
              ┌──────────────────┐
              │     SCHOOLS      │  Select schools from list (UI-driven)
              └────────┬─────────┘
                       │ Schools selected
                       ▼
              ┌──────────────────┐
              │    DOCUMENTS     │  Upload required documents, submit
              └────────┬─────────┘
                       │ Application submitted
                       ▼
              ┌──────────────────┐
              │    SUBMITTED     │  Progress: 100%
              └──────────────────┘
```

### Dynamic Transitions

When moving between topics, the system uses `_build_dynamic_transition()` to generate a contextual transition message that asks for the **first missing field** in the new topic:

```python
def _build_dynamic_transition(topic: str, app_data: dict) -> str:
    if topic == "academic_history":
        if not app_data.get("grade_applying_for"):
            return "Great, I have your child's basic details! Now — what grade would you like to apply for?"
        elif not app_data.get("previous_school_name"):
            return "Great, I have your child's basic details! Now — did your child attend a previous school?"
        # ... check each field in order
```

This ensures fields pre-filled from the child's profile are skipped, and only truly missing information is asked.

---

## 15. How the Agent Decides What to Ask <a name="15-agent-decisions"></a>

The "agentic" behaviour comes from the combination of:

### 1. The LLM's Natural Intelligence

The system prompt gives the LLM enough context to make natural conversation decisions:
- "If the parent says 'my son', infer gender as Male"
- "If the parent provides multiple fields at once, acknowledge all"
- "If something is unclear, ask a clarifying question"

### 2. Programmatic Field Tracking

The Python code tracks exactly what's filled and what's missing:

```python
TOPIC_FIELDS = {
    "student_details": ["student_full_name", "date_of_birth", "gender", "nationality"],
    "academic_history": ["grade_applying_for", "previous_school_name", ...],
    ...
}
REQUIRED_FIELDS = {"student_full_name", "date_of_birth", "gender", ...}
OPTIONAL_FIELDS = {"nationality", "previous_school_name", ...}
```

### 3. Field Status in System Prompt

```
Still need (mandatory): [date_of_birth, gender]
Still need (optional): [nationality]
Already have: [student_full_name]
```

### 4. Post-LLM Topic Transition Logic

```python
# After LLM returns, check if topic is complete
if session.current_topic in TOPIC_FIELDS:
    fields = TOPIC_FIELDS[session.current_topic]
    required = [f for f in fields if f in REQUIRED_FIELDS]
    all_filled = all(app_data.get(f) for f in required)
    if all_filled:
        next_t = _next_topic(session.current_topic)
        session.current_topic = next_t
        bot_message = _build_dynamic_transition(next_t, app_data)
```

This is what makes it "agentic" — the system doesn't follow a rigid script. It adapts based on what information has been collected from any source (conversation, pre-filled profile, corrections).

---

## 16. Error Handling and Resilience Strategy <a name="16-error-handling"></a>

### Three-Tier Resilience

```
Tier 1: LangChain + OpenAI GPT-4o-mini
   │
   │ fails (timeout, API error, rate limit)
   ▼
Tier 2: LangChain + Google Gemini 2.5 Flash
   │
   │ fails (or no Google API key)
   ▼
Tier 3: Rule-based Python fallback
   │
   │ Always works (no external dependency)
   ▼
Response guaranteed
```

### Error Scenarios Handled

| Scenario | What Happens |
|----------|-------------|
| No API keys configured | Goes straight to rule-based fallback |
| OpenAI API timeout | Falls back to Google Gemini, then rule-based |
| LLM returns invalid JSON | LangChain retries, then fallback |
| LLM hallucinates a field | `_validate_field()` catches and rejects it |
| LLM extracts field from gibberish | `_raw_input_has_gender_hint()` catches it |
| Network error | Frontend shows "Unable to connect to server" (Axios interceptor) |
| React component crash | ErrorBoundary shows friendly "Something went wrong" page |

---

## 17. Security Considerations <a name="17-security"></a>

### API Key Protection

- API keys are stored in `.env` file (not committed to Git)
- Settings loaded via `pydantic-settings` from environment variables
- Keys are never logged or returned in API responses

### Rate Limiting

```python
CHATBOT_MAX_MESSAGES_PER_SESSION: int = 50    # Max messages per chat session
CHATBOT_MAX_SESSIONS_PER_DAY: int = 20        # Max new sessions per day
```

### LLM Cost Control

- `max_tokens=500` limits each LLM response size
- `temperature=0.3` reduces unnecessary verbosity
- `timeout=15` prevents hanging requests
- `gpt-4o-mini` is the cheapest capable OpenAI model

### Input Validation

- All user messages are length-limited (max 2000 chars via Pydantic)
- JWT authentication required for all chatbot endpoints
- Session ownership verified (parent can only access their own sessions)

---

## 18. Summary of LangChain Modules Used <a name="18-summary"></a>

### Complete List of LangChain Imports

| Import | From | Used In | Purpose |
|--------|------|---------|---------|
| `SystemMessage` | `langchain_core.messages` | `_call_langchain()` | Wraps system/instruction prompt |
| `HumanMessage` | `langchain_core.messages` | `_call_langchain()` | Wraps parent's chat messages |
| `AIMessage` | `langchain_core.messages` | `_call_langchain()` | Wraps bot's previous responses |
| `ChatOpenAI` | `langchain_openai` | `_get_langchain_llm()`, `ai_assist.py` | OpenAI GPT-4o-mini client |
| `ChatGoogleGenerativeAI` | `langchain_google_genai` | `_get_langchain_llm()`, `ai_assist.py` | Google Gemini client |
| `.with_structured_output()` | Method on LLM instances | `_call_langchain()` | Forces LLM to return Pydantic schema |
| `.ainvoke()` | Method on LLM instances | `_call_langchain()`, `ai_assist.py` | Async LLM invocation |

### Where LangChain is Used (File Map)

```
services/enrolment-api/
├── app/
│   ├── config.py                    # LLM settings (model names, API keys, timeout)
│   ├── services/
│   │   └── chatbot_service.py       # PRIMARY: Full chatbot with structured output
│   │       ├── ChatbotExtraction    # Pydantic schema for LLM output
│   │       ├── _call_langchain()    # LangChain invocation with structured output
│   │       ├── _get_langchain_llm() # LLM provider selection
│   │       └── _fallback_response() # Rule-based fallback when LLM unavailable
│   └── routers/
│       └── ai_assist.py             # SECONDARY: Staff text improvement
│           └── improve_text()       # Simple LLM text rewriting
└── requirements.txt                 # LangChain package dependencies
```

### What Makes This "Agentic"

Traditional chatbots follow a fixed script. Our system is agentic because:

1. **It understands context** — The LLM interprets natural language, not just keywords
2. **It makes decisions** — The system decides what to ask next based on what's collected
3. **It handles corrections** — Parents can say "actually, change the name to..." and it updates
4. **It extracts from context** — "my son" → gender is Male, without being explicitly told
5. **It adapts per child** — Pre-filled data is skipped, only missing fields are asked
6. **It validates intelligently** — Rejects gibberish, handles multiple date formats, international phone numbers
7. **It degrades gracefully** — Works with AI, works with rules, never crashes

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│              VedaAcademy AI Architecture                     │
│                                                              │
│  Framework:    LangChain (langchain-core 0.3+)              │
│  Primary LLM:  OpenAI GPT-4o-mini via langchain-openai      │
│  Fallback LLM: Google Gemini 2.5 Flash via langchain-google │
│  Last Resort:  Rule-based Python (regex extraction)          │
│                                                              │
│  Key Feature:  Structured Output (function calling)          │
│  Schema:       Pydantic BaseModel → ChatbotExtraction        │
│  Output:       { message, extracted_fields, topic_complete } │
│                                                              │
│  2 Use Cases:                                                │
│    1. Parent Chatbot  → Structured extraction + conversation │
│    2. Staff AI Assist → Simple text improvement              │
│                                                              │
│  Files:                                                      │
│    chatbot_service.py  (1900+ lines, main AI logic)         │
│    ai_assist.py        (128 lines, text improvement)         │
│    config.py           (settings and API keys)               │
└─────────────────────────────────────────────────────────────┘
```

---

*End of walkthrough. This document covers every LangChain integration point in the VedaAcademy Smart Admission Portal.*
