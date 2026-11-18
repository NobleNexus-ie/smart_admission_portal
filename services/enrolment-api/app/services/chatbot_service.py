from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.chatbot_session import ChatbotSession
from app.utils.errors import AppError

logger = logging.getLogger(__name__)
settings = get_settings()

TOPICS = [
    "welcome",
    "student_details",
    "academic_history",
    "additional_info",
    "documents",
    "review",
]

TOPIC_FIELDS: dict[str, list[str]] = {
    "student_details": [
        "student_full_name",
        "date_of_birth",
        "gender",
    ],
    "academic_history": [
        "grade_applying_for",
        "previous_school_name",
        "previous_board",
    ],
    "additional_info": [
        "emergency_contact_name",
        "emergency_contact_phone",
        "medical_conditions",
        "special_needs",
    ],
}

REQUIRED_FIELDS = {
    "student_full_name",
    "date_of_birth",
    "gender",
    "grade_applying_for",
    "emergency_contact_name",
    "emergency_contact_phone",
}

VALID_GENDERS = {"male", "female", "other"}
VALID_GRADES = [
    "Nursery", "LKG", "UKG",
    *(f"Grade {i}" for i in range(1, 13)),
]
VALID_BOARDS = ["CBSE", "ICSE", "Matriculation", "State Board", "International", "Other"]
_BOARD_ALIASES: dict[str, str] = {
    "cbse": "CBSE",
    "icse": "ICSE",
    "isc": "ICSE",
    "matriculation": "Matriculation",
    "matric": "Matriculation",
    "state board": "State Board",
    "state": "State Board",
    "international": "International",
    "ib": "International",
    "igcse": "International",
    "cambridge": "International",
}

SYSTEM_PROMPT = """You are VedaAcademy's friendly enrollment assistant helping Indian parents apply to schools.
You speak in clear, simple English. You collect application information through natural conversation.

RULES:
- Ask about ONE topic at a time
- Be warm and encouraging
- If the parent provides multiple pieces of info at once, acknowledge all of them
- If something is unclear, ask a specific clarifying question
- Support Hindi-English mixed input naturally
- Keep responses concise (2-3 sentences max)
- Never make up information the parent hasn't provided
- NEVER repeat a previous response verbatim — always write a fresh reply
- IMPORTANT: Distinguish between the PARENT introducing themselves ("I am Samitha", "this is Ravi") and the CHILD's name. This form collects the CHILD's details, not the parent's. If the parent introduces themselves, greet them but still ask for the child's name.
- If the parent CORRECTS a field (e.g., "actually his name is X", "no, the name is Y"), update extracted_fields with the new value and acknowledge the correction.
- If the parent gives an approximate age (e.g., "he is around 5", "she's 7 years old"), do NOT convert that to a date_of_birth — ask for the exact date of birth instead.

You must extract structured data from the parent's messages into the extracted_fields object.
IMPORTANT: Extract ALL recognizable fields from the message, even if they belong to a FUTURE topic. For example, if the parent mentions a previous school name while giving student details, extract previous_school_name too.
All possible fields: student_full_name, date_of_birth, gender, grade_applying_for, previous_school_name, previous_board, emergency_contact_name, emergency_contact_phone, medical_conditions, special_needs.
Only include fields you are confident about from THIS message.
Set topic_complete to true only when ALL required fields for the current topic have been collected."""

TOPIC_PROMPTS: dict[str, str] = {
    "welcome": (
        "Greet the parent warmly. Explain you'll help them fill out a school application "
        "through a quick conversation. Ask them to start by telling you about their child — "
        "their full name, date of birth, and gender. "
        "Set extracted_fields to {} and topic_complete to true."
    ),
    "student_details": (
        "You are collecting: student_full_name, date_of_birth (YYYY-MM-DD format), gender (Male/Female/Other).\n"
        "Extract any of these fields from the parent's message.\n"
        "IMPORTANT: 'student_full_name' is the CHILD's name, NOT the parent's name. "
        "If someone says 'I am X' or 'this is X' or 'my name is X', they are likely introducing THEMSELVES (the parent). "
        "Greet them and ask specifically for their CHILD's name.\n"
        "If the parent says 'his name is X' or 'her name is X' or 'child name is X', THAT is the child's name.\n"
        "If the parent corrects the name, use the corrected name in extracted_fields.\n"
        "If date_of_birth is given in any format, convert to YYYY-MM-DD.\n"
        "If only an age is given (e.g., 'he is 5'), do NOT guess a date — ask for the exact date of birth.\n"
        "If gender can be inferred (e.g., 'my son' / 'his' → Male, 'my daughter' / 'her' → Female), extract it.\n"
        "Ask for any missing fields naturally. Focus on what is STILL NEEDED — check the 'Still need' list."
    ),
    "academic_history": (
        "You are collecting: grade_applying_for (e.g., 'Grade 3', 'LKG', 'Nursery'), "
        "previous_school_name (optional), previous_board (optional, e.g., CBSE/ICSE/State Board).\n"
        "Only grade_applying_for is required, but ALWAYS extract previous_school_name and previous_board "
        "if the parent mentions them — even in the same message as the grade.\n"
        "For previous_board, extract the board name exactly: CBSE, ICSE, Matriculation, State Board, or International.\n"
        "If the parent says the child hasn't been to school before, that's fine.\n"
        "Ask what grade they want to apply for."
    ),
    "additional_info": (
        "You are collecting: emergency_contact_name, emergency_contact_phone, "
        "medical_conditions (optional), special_needs (optional).\n"
        "Ask for an emergency contact (name and phone number).\n"
        "Then ask if there are any medical conditions or special needs to note — "
        "it's okay if there aren't any.\n"
        "Phone should be 10 digits for Indian numbers."
    ),
    "documents": (
        "Tell the parent they'll need to upload documents (birth certificate, photo, etc.) "
        "but they can do this later through the application form or when they review.\n"
        "Let them know we'll remind them about required documents.\n"
        "Set topic_complete to true — document upload happens in the UI, not in chat."
    ),
    "review": (
        "Present a summary of ALL collected application data in a clear, formatted way.\n"
        "Ask the parent to review and confirm if everything looks correct.\n"
        "If they want to change something, help them update it.\n"
        "Set topic_complete to true only when the parent confirms the summary."
    ),
}


TOPIC_TRANSITIONS: dict[str, str] = {
    "academic_history": (
        "Great, I have all your child's basic details! "
        "Now let's talk about academics — what grade would you like to apply for? "
        "Also, if your child attended a previous school, please share the school name and board (e.g., CBSE, ICSE)."
    ),
    "additional_info": (
        "Got the academic details! "
        "Now I need an emergency contact — please provide a name and 10-digit phone number. "
        "Also let me know if there are any medical conditions or special needs (say 'none' if not)."
    ),
    "documents": (
        "Almost done! You'll need to upload documents like a birth certificate and photo, "
        "but you can do that later through the application form. Let me prepare your summary now."
    ),
    "review": (
        "Here's a summary of everything we've collected. "
        "Please review and type 'confirm' if everything looks correct, "
        "or tell me what you'd like to change."
    ),
}


# ---------------------------------------------------------------------------
# LangChain structured output schema
# ---------------------------------------------------------------------------

class ChatbotExtraction(BaseModel):
    """Structured output from the enrollment chatbot LLM."""
    message: str = Field(description="Conversational response to the parent")
    extracted_fields: dict[str, str] = Field(
        default_factory=dict,
        description="Application fields extracted from the parent's message",
    )
    topic_complete: bool = Field(
        default=False,
        description="True when ALL required fields for the current topic are collected",
    )


# ---------------------------------------------------------------------------
# Message construction
# ---------------------------------------------------------------------------

def _build_system_prompt(session: ChatbotSession) -> str:
    topic = session.current_topic
    collected = session.application_data or {}

    collected_summary = ""
    if collected:
        lines = [f"  {k}: {v}" for k, v in collected.items() if v]
        collected_summary = f"\nData collected so far:\n" + "\n".join(lines)

    if topic in TOPIC_FIELDS:
        topic_fields = TOPIC_FIELDS[topic]
        missing = [f for f in topic_fields if f not in collected or not collected.get(f)]
        have = [f for f in topic_fields if f in collected and collected.get(f)]
        field_status = f"\nRequired fields for this topic: {topic_fields}\nAlready have: {have}\nStill need: {missing}"
    else:
        field_status = ""

    all_fields_not_collected = [
        f for f_list in TOPIC_FIELDS.values()
        for f in f_list
        if not collected.get(f)
    ]
    ahead_hint = ""
    if all_fields_not_collected:
        ahead_hint = (
            f"\nOther fields you can also extract if mentioned: {all_fields_not_collected}"
        )

    return (
        f"{SYSTEM_PROMPT}\n\n"
        f"CURRENT TOPIC: {topic}\n"
        f"INSTRUCTIONS FOR THIS TOPIC: {TOPIC_PROMPTS.get(topic, '')}\n"
        f"{field_status}"
        f"{ahead_hint}"
        f"{collected_summary}"
    )


def _build_messages(
    session: ChatbotSession, user_message: str | None = None
) -> list[dict[str, str]]:
    system = _build_system_prompt(session)
    messages: list[dict[str, str]] = [{"role": "system", "content": system}]

    for entry in session.conversation_history or []:
        messages.append({"role": entry["role"], "content": entry["content"]})

    if user_message:
        messages.append({"role": "user", "content": user_message})

    return messages


# ---------------------------------------------------------------------------
# LangChain LLM integration
# ---------------------------------------------------------------------------

async def _call_llm(messages: list[dict[str, str]]) -> dict[str, Any]:
    if not settings.OPENAI_API_KEY and not settings.GOOGLE_API_KEY:
        return _fallback_response(messages)

    try:
        return await _call_langchain(messages)
    except Exception as exc:
        logger.warning("LangChain call failed: %s", exc)
        return _fallback_response(messages)


async def _call_langchain(messages: list[dict[str, str]]) -> dict[str, Any]:
    """Use LangChain with structured output for field extraction."""
    from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

    llm = _get_langchain_llm()

    structured_llm = llm.with_structured_output(ChatbotExtraction, method="function_calling")

    lc_messages = []
    for m in messages:
        if m["role"] == "system":
            lc_messages.append(SystemMessage(content=m["content"]))
        elif m["role"] == "user":
            lc_messages.append(HumanMessage(content=m["content"]))
        elif m["role"] == "assistant":
            lc_messages.append(AIMessage(content=m["content"]))

    result: ChatbotExtraction = await structured_llm.ainvoke(lc_messages)

    return {
        "message": result.message,
        "extracted_fields": result.extracted_fields,
        "topic_complete": result.topic_complete,
    }


def _get_langchain_llm():
    """Create the appropriate LangChain chat model based on available API keys."""
    if settings.OPENAI_API_KEY:
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=settings.LLM_MODEL,
            api_key=settings.OPENAI_API_KEY,
            temperature=0.3,
            max_tokens=500,
            request_timeout=settings.LLM_TIMEOUT,
        )

    if settings.GOOGLE_API_KEY:
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=settings.LLM_FALLBACK_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.3,
            max_tokens=500,
            timeout=float(settings.LLM_TIMEOUT),
        )

    raise RuntimeError("No LLM API key configured")


# ---------------------------------------------------------------------------
# Rule-based fallback (no API key)
# ---------------------------------------------------------------------------

def _fallback_response(messages: list[dict[str, str]]) -> dict[str, Any]:
    system_msg = messages[0]["content"] if messages else ""

    if "CURRENT TOPIC: welcome" in system_msg:
        return {
            "message": (
                "Welcome to VedaAcademy! I'm here to help you apply to schools. "
                "Let's start with your child's details — what is your child's full name, "
                "date of birth, and gender?"
            ),
            "extracted_fields": {},
            "topic_complete": True,
        }

    if "CURRENT TOPIC: student_details" in system_msg:
        return _extract_student_details_fallback(messages)

    if "CURRENT TOPIC: academic_history" in system_msg:
        return _extract_academic_fallback(messages)

    if "CURRENT TOPIC: additional_info" in system_msg:
        return _extract_additional_fallback(messages)

    if "CURRENT TOPIC: documents" in system_msg:
        return {
            "message": (
                "Great! You'll need to upload some documents like birth certificate "
                "and a recent photo. You can do this when you review your application. "
                "Let me prepare your application summary now."
            ),
            "extracted_fields": {},
            "topic_complete": True,
        }

    if "CURRENT TOPIC: review" in system_msg:
        return {
            "message": (
                "Here's your application summary. Please review the details above. "
                "If everything looks good, type 'confirm' to proceed. "
                "Or tell me what you'd like to change."
            ),
            "extracted_fields": {},
            "topic_complete": False,
        }

    return {
        "message": "Could you tell me more? I want to make sure I get everything right.",
        "extracted_fields": {},
        "topic_complete": False,
    }


def _get_recent_user_text(messages: list[dict[str, str]]) -> str | None:
    """Get text from only the last user message (current topic input)."""
    for m in reversed(messages):
        if m["role"] == "user":
            return m["content"]
    return None


def _parse_already_have(system_msg: str) -> set[str]:
    """Parse 'Already have' fields from the system message."""
    m = re.search(r"Already have:\s*\[([^\]]*)\]", system_msg)
    if not m:
        return set()
    raw = m.group(1)
    return {s.strip().strip("'\"") for s in raw.split(",") if s.strip().strip("'\"") }


def _extract_student_details_fallback(messages: list[dict[str, str]]) -> dict[str, Any]:
    last_msg = _get_recent_user_text(messages)
    if not last_msg:
        return {
            "message": "Please tell me your child's full name, date of birth, and gender.",
            "extracted_fields": {},
            "topic_complete": False,
        }

    system_msg = messages[0]["content"] if messages else ""
    already_have = _parse_already_have(system_msg)

    raw_text = last_msg
    text = raw_text.lower()
    words = re.findall(r'[a-zA-Z]+', text)
    fields: dict[str, str] = {}

    if "son" in words:
        fields["gender"] = "Male"
    elif "daughter" in words:
        fields["gender"] = "Female"
    for g in ("male", "female", "other", "boy", "girl"):
        if g in words:
            fields["gender"] = {"boy": "Male", "girl": "Female"}.get(g, g.capitalize())
            break

    cleaned = re.sub(r"[^\w\s]", " ", raw_text).strip()

    name_patterns = [
        r"(?:name\s+is|called|named|i\s*am)\s+(\w+(?:\s+\w+)*)",
        r"(?:child|kid|son|daughter)\s+(?:is\s+)?(\w+(?:\s+\w+)*)",
    ]
    for pattern in name_patterns:
        m = re.search(pattern, cleaned, re.IGNORECASE)
        if m:
            name = m.group(1).strip()
            stop_words = {"and", "is", "was", "born", "on", "in", "he", "she", "his", "her", "the", "a", "my", "dob", "date", "of", "gender", "male", "female", "boy", "girl", "other", "old", "years", "year"}
            parts = []
            for word in name.split():
                if word.lower() in stop_words:
                    break
                parts.append(word.capitalize())
            if parts:
                fields["student_full_name"] = " ".join(parts)
                break

    dob_match = re.search(r'(\d{4}[-/]\d{1,2}[-/]\d{1,2})', text)
    if not dob_match:
        dob_match = re.search(r'(\d{1,2}[-/]\d{1,2}[-/]\d{4})', text)
        if dob_match:
            parts = re.split(r'[-/]', dob_match.group(1))
            fields["date_of_birth"] = f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
    if not dob_match:
        dob_match = re.search(r'(\d{1,2})[-/\s]+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*[-/,\s]+(\d{4})', text)
        if dob_match:
            months = {"jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "jun": "06",
                       "jul": "07", "aug": "08", "sep": "09", "oct": "10", "nov": "11", "dec": "12"}
            day = dob_match.group(1).zfill(2)
            month = months.get(dob_match.group(2)[:3], "01")
            year = dob_match.group(3)
            fields["date_of_birth"] = f"{year}-{month}-{day}"
    elif dob_match and "date_of_birth" not in fields:
        fields["date_of_birth"] = dob_match.group(1).replace("/", "-")

    all_have = already_have | set(fields.keys())
    missing = []
    if "student_full_name" not in all_have:
        missing.append("your child's full name")
    if "date_of_birth" not in all_have:
        missing.append("date of birth")
    if "gender" not in all_have:
        missing.append("gender (boy or girl)")

    if missing:
        msg = f"Thanks! I still need: {', '.join(missing)}. Could you provide those?"
    else:
        msg = "Got it! Let me now ask about academics."

    return {
        "message": msg,
        "extracted_fields": fields,
        "topic_complete": len(missing) == 0,
    }


def _extract_academic_fallback(messages: list[dict[str, str]]) -> dict[str, Any]:
    last_msg = _get_recent_user_text(messages)
    if not last_msg:
        return {
            "message": "What grade would you like to apply for? (e.g., Nursery, LKG, Grade 1, etc.)",
            "extracted_fields": {},
            "topic_complete": False,
        }

    text = last_msg.lower()
    fields: dict[str, str] = {}

    for grade in VALID_GRADES:
        if grade.lower() in text:
            fields["grade_applying_for"] = grade
            break

    for alias, board_val in _BOARD_ALIASES.items():
        if alias in text:
            fields["previous_board"] = board_val
            break

    school_match = re.search(r"(?:at|from|school\s+(?:is|was)?)\s+([A-Za-z\s]+?)(?:\s+(?:cbse|icse|board|school|matric)|$)", last_msg, re.IGNORECASE)
    if school_match:
        school_name = school_match.group(1).strip()
        if len(school_name) >= 2:
            fields["previous_school_name"] = school_name

    if "grade_applying_for" in fields:
        return {
            "message": f"Great, applying for {fields['grade_applying_for']}! Now let's get emergency contact details.",
            "extracted_fields": fields,
            "topic_complete": True,
        }

    return {
        "message": "What grade would you like your child to be enrolled in?",
        "extracted_fields": fields,
        "topic_complete": False,
    }


def _extract_additional_fallback(messages: list[dict[str, str]]) -> dict[str, Any]:
    last_msg = _get_recent_user_text(messages)
    if not last_msg:
        return {
            "message": "Please provide an emergency contact name and phone number.",
            "extracted_fields": {},
            "topic_complete": False,
        }

    system_msg = messages[0]["content"] if messages else ""
    already_have = _parse_already_have(system_msg)

    raw_text = last_msg
    text = raw_text.lower()
    fields: dict[str, str] = {}

    phone_match = re.search(r'\b(\d{10})\b', raw_text)
    if phone_match:
        fields["emergency_contact_phone"] = phone_match.group(1)

    cleaned_raw = re.sub(r"[^\w\s]", " ", raw_text).strip()
    name_patterns = [
        r"(?:contact\s+(?:(?:name\s+)?is\s+)?|emergency\s+contact\s+)([a-zA-Z]+(?:\s+[a-zA-Z]+)*)",
        r"^([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)",
    ]
    for pat in name_patterns:
        name_match = re.search(pat, cleaned_raw, re.IGNORECASE)
        if name_match:
            name_val = name_match.group(1).strip()
            stop = {"and", "is", "phone", "number", "mobile", "cell", "medical", "none", "no"}
            parts = []
            for w in name_val.split():
                if w.lower() in stop or w.isdigit():
                    break
                parts.append(w.capitalize())
            if parts:
                fields["emergency_contact_name"] = " ".join(parts)
                break

    none_words = {"none", "no", "nil", "nothing", "nope", "na", "n/a"}
    if any(w in re.findall(r'[a-zA-Z]+', text) for w in none_words):
        fields.setdefault("medical_conditions", "None")
        fields.setdefault("special_needs", "None")

    all_have = already_have | set(fields.keys())
    have_required = "emergency_contact_name" in all_have and "emergency_contact_phone" in all_have
    have_optional = "medical_conditions" in all_have

    if have_required and have_optional:
        return {
            "message": "Got it! Let me prepare your documents step next.",
            "extracted_fields": fields,
            "topic_complete": True,
        }
    if have_required:
        return {
            "message": "Thanks! Any medical conditions or special needs to note? If not, just say 'none'.",
            "extracted_fields": fields,
            "topic_complete": False,
        }
    if fields:
        missing = []
        if "emergency_contact_name" not in all_have:
            missing.append("the contact person's name")
        if "emergency_contact_phone" not in all_have:
            missing.append("a 10-digit phone number")
        if missing:
            return {
                "message": f"I still need {' and '.join(missing)} for the emergency contact.",
                "extracted_fields": fields,
                "topic_complete": False,
            }
        return {
            "message": "Thanks! Any medical conditions or special needs to note? If not, just say 'none'.",
            "extracted_fields": fields,
            "topic_complete": False,
        }

    return {
        "message": "I need an emergency contact. Please provide a name and 10-digit phone number (e.g., 'Contact is Rajesh Kumar 9876543210').",
        "extracted_fields": {},
        "topic_complete": False,
    }


# ---------------------------------------------------------------------------
# Field validation
# ---------------------------------------------------------------------------

def _validate_field(key: str, value: str) -> str | None:
    if key == "gender" and value.lower() not in VALID_GENDERS:
        return None
    if key == "gender":
        return value.capitalize()
    if key == "grade_applying_for":
        for g in VALID_GRADES:
            if g.lower() == value.lower():
                return g
        return None
    if key == "date_of_birth":
        try:
            dt = datetime.strptime(value, "%Y-%m-%d")
            if dt > datetime.now():
                return None
            return value
        except ValueError:
            return None
    if key == "emergency_contact_phone":
        digits = "".join(c for c in value if c.isdigit())
        if len(digits) == 10:
            return digits
        return None
    if key == "previous_board":
        normalized = value.lower().replace(" board", "").strip()
        if normalized in _BOARD_ALIASES:
            return _BOARD_ALIASES[normalized]
        for board in VALID_BOARDS:
            if board.lower() == normalized:
                return board
        return "Other"
    return value


def _compute_completeness(app_data: dict) -> int:
    if not REQUIRED_FIELDS:
        return 100
    filled = sum(1 for f in REQUIRED_FIELDS if app_data.get(f))
    return int(filled / len(REQUIRED_FIELDS) * 100)


def _next_topic(current: str) -> str | None:
    try:
        idx = TOPICS.index(current)
        if idx + 1 < len(TOPICS):
            return TOPICS[idx + 1]
    except ValueError:
        pass
    return None


# ---------------------------------------------------------------------------
# ChatbotService
# ---------------------------------------------------------------------------

class ChatbotService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def start_conversation(self, parent_id: UUID) -> dict:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        count = await self.db.scalar(
            select(func.count())
            .select_from(ChatbotSession)
            .where(
                ChatbotSession.parent_id == parent_id,
                ChatbotSession.created_at >= today_start,
            )
        )
        if (count or 0) >= settings.CHATBOT_MAX_SESSIONS_PER_DAY:
            raise AppError(429, "You've reached the maximum number of chat sessions for today. Please try again tomorrow.")

        active = await self.db.scalar(
            select(ChatbotSession).where(
                ChatbotSession.parent_id == parent_id,
                ChatbotSession.status == "active",
            )
        )
        if active:
            return self._session_to_response(active)

        session = ChatbotSession(
            parent_id=parent_id,
            current_topic="welcome",
            status="active",
            conversation_history=[],
            application_data={},
        )
        self.db.add(session)
        await self.db.flush()

        messages = _build_messages(session)
        llm_result = await _call_llm(messages)

        session.conversation_history = [
            {"role": "assistant", "content": llm_result["message"]}
        ]
        session.current_topic = "student_details"
        session.updated_at = datetime.now(timezone.utc)
        await self.db.flush()

        return self._session_to_response(session)

    async def process_response(self, session_id: UUID, parent_id: UUID, message: str) -> dict:
        session = await self._get_session(session_id, parent_id)

        history = list(session.conversation_history or [])
        msg_count = sum(1 for h in history if h["role"] == "user")
        if msg_count >= settings.CHATBOT_MAX_MESSAGES_PER_SESSION:
            raise AppError(429, "Session message limit reached. Please review your application or switch to the form.")

        history.append({"role": "user", "content": message})

        if session.current_topic == "review":
            confirm_words = {"confirm", "yes", "looks good", "correct", "ok", "okay", "lgtm", "done"}
            if any(w in message.lower() for w in confirm_words):
                history.append({
                    "role": "assistant",
                    "content": "Your application is confirmed! You can now select a school and submit.",
                })
                session.conversation_history = history
                session.status = "completed"
                session.updated_at = datetime.now(timezone.utc)
                await self.db.flush()
                return self._session_to_response(session)

        messages = _build_messages(session, message)
        llm_result = await _call_llm(messages)

        app_data = dict(session.application_data or {})
        for key, value in (llm_result.get("extracted_fields") or {}).items():
            if value is None or value == "":
                continue
            validated = _validate_field(key, str(value))
            if validated is not None:
                app_data[key] = validated

        bot_message = llm_result["message"]
        last_bot = next(
            (m["content"] for m in reversed(history) if m["role"] == "assistant"),
            None,
        )
        if last_bot and bot_message.strip() == last_bot.strip():
            cur = session.current_topic
            if cur in TOPIC_FIELDS:
                missing = [
                    f.replace("_", " ")
                    for f in TOPIC_FIELDS[cur]
                    if f in REQUIRED_FIELDS and not app_data.get(f)
                ]
                if missing:
                    bot_message = f"Thanks! I still need: {', '.join(missing)}. Could you provide those?"
                else:
                    bot_message = "Great, I have everything I need for this section! Let me move on."

        history.append({"role": "assistant", "content": bot_message})

        current_topic = session.current_topic
        topic_advanced = False
        if current_topic in TOPIC_FIELDS:
            required_for_topic = [
                f for f in TOPIC_FIELDS[current_topic]
                if f in REQUIRED_FIELDS
            ]
            all_collected = all(app_data.get(f) for f in required_for_topic)
            if all_collected:
                nxt = _next_topic(current_topic)
                if nxt:
                    current_topic = nxt
                    topic_advanced = True
        elif llm_result.get("topic_complete") and current_topic not in TOPIC_FIELDS:
            nxt = _next_topic(current_topic)
            if nxt:
                current_topic = nxt
                topic_advanced = True

        if topic_advanced:
            transition = TOPIC_TRANSITIONS.get(current_topic)
            if transition:
                history[-1] = {"role": "assistant", "content": transition}
            if current_topic == "documents":
                nxt = _next_topic("documents")
                if nxt:
                    current_topic = nxt
                    review_transition = TOPIC_TRANSITIONS.get(current_topic)
                    if review_transition:
                        collected = app_data
                        summary_lines = [f"  - {k.replace('_', ' ').title()}: {v}" for k, v in collected.items() if v]
                        summary = "\n".join(summary_lines)
                        history.append({
                            "role": "assistant",
                            "content": f"{review_transition}\n\n{summary}\n\nType 'confirm' to submit or tell me what to change.",
                        })

        session.conversation_history = history
        session.application_data = app_data
        session.current_topic = current_topic
        session.updated_at = datetime.now(timezone.utc)
        await self.db.flush()

        return self._session_to_response(session)

    async def get_summary(self, session_id: UUID, parent_id: UUID) -> dict:
        session = await self._get_session(session_id, parent_id)
        app_data = session.application_data or {}
        missing = [f for f in REQUIRED_FIELDS if not app_data.get(f)]
        return {
            "session_id": str(session.id),
            "application_data": app_data,
            "completeness": _compute_completeness(app_data),
            "missing_fields": missing,
            "status": session.status,
        }

    async def switch_to_form(self, session_id: UUID, parent_id: UUID) -> dict:
        session = await self.db.scalar(
            select(ChatbotSession).where(
                ChatbotSession.id == session_id,
                ChatbotSession.parent_id == parent_id,
            )
        )
        if not session:
            raise AppError(404, "Chat session not found")
        app_data = session.application_data or {}

        if session.status in ("active", "completed"):
            session.status = "switched_to_form"
            session.updated_at = datetime.now(timezone.utc)
            await self.db.flush()

        return {
            "form_data": app_data,
            "session_id": str(session.id),
        }

    async def _get_session(self, session_id: UUID, parent_id: UUID) -> ChatbotSession:
        session = await self.db.scalar(
            select(ChatbotSession).where(
                ChatbotSession.id == session_id,
                ChatbotSession.parent_id == parent_id,
            )
        )
        if not session:
            raise AppError(404, "Chat session not found")
        if session.status not in ("active", "completed"):
            raise AppError(400, "This chat session is no longer active")
        return session

    def _session_to_response(self, session: ChatbotSession) -> dict:
        history = session.conversation_history or []
        last_message = history[-1]["content"] if history else ""
        return {
            "session_id": str(session.id),
            "message": last_message,
            "current_topic": session.current_topic,
            "conversation_history": history,
            "application_data": session.application_data or {},
            "completeness": _compute_completeness(session.application_data or {}),
            "status": session.status,
        }
