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
from app.models.child import Child
from app.models.parent import Parent
from app.models.parent_profile import ParentProfile
from app.models.school import School
from app.utils.errors import AppError

logger = logging.getLogger(__name__)
settings = get_settings()

TOPICS = [
    "welcome",
    "student_details",
    "academic_history",
    "additional_info",
    "review",
    "schools",
    "documents",
]

TOPIC_FIELDS: dict[str, list[str]] = {
    "student_details": [
        "student_full_name",
        "date_of_birth",
        "gender",
        "nationality",
    ],
    "academic_history": [
        "grade_applying_for",
        "previous_school_name",
        "previous_board",
        "previous_marks",
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

OPTIONAL_FIELDS = {
    "nationality",
    "previous_school_name",
    "previous_board",
    "previous_marks",
    "medical_conditions",
    "special_needs",
}

ALL_FIELDS = REQUIRED_FIELDS | OPTIONAL_FIELDS

_INTERNAL_KEYS = {"_parent_context", "_children", "_skip_child_match", "_selected_school_ids", "_already_submitted_school_ids", "_school_filters"}

VALID_GENDERS = {"male", "female", "other"}
_GENDER_INDICATORS = {
    "male", "female", "other", "boy", "girl", "son", "daughter",
    "man", "woman", "m", "f", "he", "she", "his", "her",
    "ladka", "ladki", "beta", "beti",
}
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
- Ask about ONE field at a time — do NOT bundle multiple questions in one message
- Be warm and encouraging
- If the parent provides multiple pieces of info at once, acknowledge all of them and move to the NEXT missing field
- If something is unclear, ask a specific clarifying question
- Support Hindi-English mixed input naturally
- Keep responses concise (2-3 sentences max)
- Never make up information the parent hasn't provided
- NEVER repeat a previous response verbatim — always write a fresh reply
- IMPORTANT: Distinguish between the PARENT introducing themselves ("I am Samitha", "this is Ravi") and the CHILD's name. This form collects the CHILD's details, not the parent's. If the parent introduces themselves, greet them but still ask for the child's name.
- If the parent CORRECTS a field (e.g., "actually his name is X", "no, the name is Y"), update extracted_fields with the new value and acknowledge the correction.
- If the parent gives an approximate age (e.g., "he is around 5", "she's 7 years old"), do NOT convert that to a date_of_birth — ask for the exact date of birth instead.
- NEVER accept a future date of birth or a date that makes the child less than 2 years old. If the date is invalid, do NOT put it in extracted_fields — tell the parent the date is invalid and ask them to correct it.
- NEVER skip optional fields silently. For optional fields (nationality, previous_school_name, previous_board, previous_marks, medical_conditions, special_needs), ask the parent explicitly. If they say "none" or "no", record "No" in extracted_fields to indicate the parent explicitly confirmed there is none.
- NEVER ask for information already provided in the parent context below.

You must extract structured data from the parent's messages into the extracted_fields object.
IMPORTANT: Extract ALL recognizable fields from the message, even if they belong to a FUTURE topic. For example, if the parent mentions a previous school name while giving student details, extract previous_school_name too.
All possible fields: student_full_name, date_of_birth, gender, nationality, grade_applying_for, previous_school_name, previous_board, previous_marks, emergency_contact_name, emergency_contact_phone, medical_conditions, special_needs.
Only include fields you are confident about from THIS message.
Set topic_complete to true only when ALL required fields for the current topic have been collected."""

TOPIC_PROMPTS: dict[str, str] = {
    "welcome": (
        "Greet the parent like a friendly human — use their name naturally (e.g., 'Hi Rajesh! Great to see you here.'). "
        "Keep it casual and warm, like a helpful school counselor chatting. "
        "Briefly mention you'll guide them through the application in a quick chat. "
        "If the parent has saved children in their profile, ask in a friendly way which child they'd like to apply for. "
        "If no children saved, warmly ask them to tell you about their child. "
        "Do NOT sound robotic or list instructions. Keep it short and human. "
        "Set extracted_fields to {} and topic_complete to true."
    ),
    "student_details": (
        "You are collecting: student_full_name, date_of_birth (YYYY-MM-DD format), gender (Male/Female/Other), "
        "and nationality (optional, default Indian).\n"
        "IMPORTANT: Ask for only ONE missing field at a time. Check the 'Still need' list and ask for the FIRST missing field only.\n"
        "Extract any of these fields from the parent's message.\n"
        "IMPORTANT: 'student_full_name' is the CHILD's name, NOT the parent's name. "
        "If someone says 'I am X' or 'this is X' or 'my name is X', they are likely introducing THEMSELVES (the parent). "
        "Greet them and ask specifically for their CHILD's name.\n"
        "If the parent says 'his name is X' or 'her name is X' or 'child name is X', THAT is the child's name.\n"
        "If the parent corrects the name, use the corrected name in extracted_fields.\n"
        "If date_of_birth is given in any format, convert to YYYY-MM-DD.\n"
        "If only an age is given (e.g., 'he is 5'), do NOT guess a date — ask for the exact date of birth.\n"
        "If gender can be inferred (e.g., 'my son' / 'his' → Male, 'my daughter' / 'her' → Female), extract it.\n"
        "For nationality, if not mentioned, ask once. If parent says nothing or 'Indian', set nationality to 'Indian'.\n"
    ),
    "academic_history": (
        "You are collecting: grade_applying_for (e.g., 'Grade 3', 'LKG', 'Nursery'), "
        "previous_school_name (optional), previous_board (optional, e.g., CBSE/ICSE/State Board), "
        "previous_marks (optional, e.g., percentage or grade).\n"
        "IMPORTANT: Ask for only ONE missing field at a time. Check the 'Still need' list and ask for the FIRST missing field only.\n"
        "Extract fields from the parent's message. If multiple fields are provided at once, accept all of them.\n"
        "For previous_board, extract the board name exactly: CBSE, ICSE, Matriculation, State Board, or International.\n"
        "If the parent says the child hasn't been to school before, set previous_school_name to 'No', "
        "previous_board to 'No', and previous_marks to 'No'.\n"
        "IMPORTANT: Do NOT skip optional fields. Ask about each one individually. "
        "If parent says 'no' or 'none', record 'No' in extracted_fields.\n"
    ),
    "additional_info": (
        "You are collecting: emergency_contact_name, emergency_contact_phone, "
        "medical_conditions (optional), special_needs (optional).\n"
        "IMPORTANT: Ask for only ONE missing field at a time. Check the 'Still need' list and ask for the FIRST missing field only.\n"
        "Extract fields from the parent's message.\n"
        "IMPORTANT: Do NOT skip medical_conditions or special_needs. Ask each one individually. "
        "If they say 'none' or 'no', set the field to 'No' in extracted_fields.\n"
        "Phone number should include country code for non-Indian numbers (e.g., +1 for US, +44 for UK, +971 for UAE). For Indian numbers, 10 digits or +91 format."
    ),
    "review": (
        "Present a clear summary of ALL collected application data, organized by section.\n"
        "Mark any optional fields that are blank as '(Not provided)'.\n"
        "Let the parent know they can tell you what to change, or proceed to "
        "upload documents and select schools on the next screen.\n"
        "Set topic_complete to true — the system will auto-complete the session."
    ),
}


TOPIC_TRANSITIONS: dict[str, str] = {
    "academic_history": (
        "Great, I have all your child's basic details! "
        "Now let's talk about academics — what grade would you like to apply for? "
        "Also, if your child attended a previous school, please share the school name, board (e.g., CBSE, ICSE), and marks."
    ),
    "additional_info": (
        "Got the academic details! "
        "Now I need an emergency contact — please provide a name and 10-digit phone number. "
        "Also let me know about any medical conditions or special needs (say 'none' if there aren't any)."
    ),
    "review": (
        "Here's a summary of everything we've collected. "
        "Please review the details below. If you'd like to change anything, just tell me. "
        "Otherwise, click 'Select Schools' to continue."
    ),
}


def _build_dynamic_transition(topic: str, app_data: dict) -> str:
    """Build a transition message that asks about only the FIRST missing field."""
    if topic == "academic_history":
        first_missing = None
        if not app_data.get("grade_applying_for"):
            first_missing = "what grade would you like to apply for"
        elif not app_data.get("previous_school_name"):
            first_missing = "did your child attend a previous school? If yes, what was the school name? (say 'no' if not)"
        elif not app_data.get("previous_board"):
            first_missing = "which board was the previous school? (e.g., CBSE, ICSE, State Board — or say 'no' if not applicable)"
        elif not app_data.get("previous_marks"):
            first_missing = "what were the previous marks or percentage? (say 'no' if not applicable)"
        if not first_missing:
            return "Great, I have all the academic details too! Let's move on."
        return f"Great, I have all your child's basic details! Now — {first_missing}?"

    if topic == "additional_info":
        first_missing = None
        if not app_data.get("emergency_contact_name"):
            first_missing = "please provide an emergency contact person's name"
        elif not app_data.get("emergency_contact_phone"):
            first_missing = "what is the emergency contact's phone number? (include country code if not Indian, e.g., +1 for US, +44 for UK)"
        elif not app_data.get("medical_conditions"):
            first_missing = "does your child have any medical conditions? (say 'none' if not)"
        elif not app_data.get("special_needs"):
            first_missing = "does your child have any special needs? (say 'none' if not)"
        if not first_missing:
            return "Got all the additional info! Let me prepare the summary."
        return f"Got the academic details! Now — {first_missing}?"

    if topic == "review":
        return TOPIC_TRANSITIONS["review"]

    return TOPIC_TRANSITIONS.get(topic, "Let's continue to the next section.")


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

    parent_ctx = collected.get("_parent_context") or {}
    children_ctx = collected.get("_children") or []

    parent_info = ""
    if parent_ctx:
        parts = []
        if parent_ctx.get("name"):
            parts.append(f"Parent name: {parent_ctx['name']}")
        if parent_ctx.get("phone"):
            parts.append(f"Phone: {parent_ctx['phone']}")
        if parent_ctx.get("city"):
            parts.append(f"City: {parent_ctx['city']}")
        if parent_ctx.get("state"):
            parts.append(f"State: {parent_ctx['state']}")
        if parts:
            parent_info = "\nPARENT CONTEXT (already known, do NOT ask for these):\n  " + "\n  ".join(parts)

    children_info = ""
    if children_ctx:
        child_lines = []
        for c in children_ctx:
            child_lines.append(f"  - {c['name']} (DOB: {c.get('dob', 'N/A')}, Gender: {c.get('gender', 'N/A')})")
        children_info = "\nSAVED CHILDREN:\n" + "\n".join(child_lines)

    app_fields = {k: v for k, v in collected.items() if k not in _INTERNAL_KEYS and v}
    collected_summary = ""
    if app_fields:
        lines = [f"  {k}: {v}" for k, v in app_fields.items()]
        collected_summary = "\nData collected so far:\n" + "\n".join(lines)

    if topic in TOPIC_FIELDS:
        topic_fields = TOPIC_FIELDS[topic]
        mandatory_here = [f for f in topic_fields if f in REQUIRED_FIELDS]
        optional_here = [f for f in topic_fields if f in OPTIONAL_FIELDS]
        missing_mandatory = [f for f in mandatory_here if not app_fields.get(f)]
        missing_optional = [f for f in optional_here if not app_fields.get(f)]
        have = [f for f in topic_fields if app_fields.get(f)]
        field_status = (
            f"\nFields for this topic: {topic_fields}"
            f"\nMandatory: {mandatory_here}"
            f"\nOptional: {optional_here}"
            f"\nAlready have: {have}"
            f"\nStill need (mandatory): {missing_mandatory}"
            f"\nStill need (optional — ask explicitly, record 'None' if declined): {missing_optional}"
        )
    else:
        field_status = ""

    all_fields_not_collected = [
        f for f_list in TOPIC_FIELDS.values()
        for f in f_list
        if not app_fields.get(f)
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
        f"{parent_info}"
        f"{children_info}"
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

    if "CURRENT TOPIC: review" in system_msg:
        return {
            "message": (
                "Here's your application summary. Please review the details above. "
                "If everything looks good, you can proceed to upload documents and select schools. "
                "Or tell me what you'd like to change."
            ),
            "extracted_fields": {},
            "topic_complete": True,
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

    dob_match = re.search(r'(?<!\d)(\d{4}[-/:.]\d{1,2}[-/:.]\d{1,2})(?!\d)', text)
    if not dob_match:
        dob_match = re.search(r'(?<!\d)(\d{1,2}[-/:.]\d{1,2}[-/:.]\d{4})(?!\d)', text)
        if dob_match:
            parts = re.split(r'[-/:.]', dob_match.group(1))
            fields["date_of_birth"] = f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
    if not dob_match:
        dob_match = re.search(r'(?<!\d)(\d{1,2})[-/:\s]+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*[-/,:\s]+(\d{4})(?!\d)', text)
        if dob_match:
            months = {"jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "jun": "06",
                       "jul": "07", "aug": "08", "sep": "09", "oct": "10", "nov": "11", "dec": "12"}
            day = dob_match.group(1).zfill(2)
            month = months.get(dob_match.group(2)[:3], "01")
            year = dob_match.group(3)
            fields["date_of_birth"] = f"{year}-{month}-{day}"
    elif dob_match and "date_of_birth" not in fields:
        fields["date_of_birth"] = re.sub(r'[/:.]+', '-', dob_match.group(1))

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

    phone_match = re.search(r'(\+?\d[\d\s\-]{7,15}\d)', raw_text)
    if phone_match:
        validated_ph = _validate_field("emergency_contact_phone", phone_match.group(1))
        if validated_ph:
            fields["emergency_contact_phone"] = validated_ph

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
        fields.setdefault("medical_conditions", "No")
        fields.setdefault("special_needs", "No")

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
            missing.append("a phone number (with country code if non-Indian)")
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
        "message": "I need an emergency contact. Please provide a name and phone number (e.g., 'Contact is Rajesh Kumar 9876543210' or '+1 2025551234').",
        "extracted_fields": {},
        "topic_complete": False,
    }


# ---------------------------------------------------------------------------
# Field validation
# ---------------------------------------------------------------------------

def _raw_input_has_gender_hint(raw_msg: str) -> bool:
    """Check whether the user's raw message contains any recognizable gender word."""
    words = set(re.findall(r"[a-zA-Z]+", raw_msg.lower()))
    return bool(words & _GENDER_INDICATORS)


def _validate_field(key: str, value: str, *, raw_input: str = "") -> str | None:
    if key == "gender" and value.lower() not in VALID_GENDERS:
        return None
    if key == "gender":
        if raw_input and not _raw_input_has_gender_hint(raw_input):
            return None
        return value.capitalize()
    if key == "grade_applying_for":
        normalized = value.strip()
        for g in VALID_GRADES:
            if g.lower() == normalized.lower():
                return g
        normalized = re.sub(r"(?i)^class\s+", "Grade ", normalized)
        normalized = re.sub(r"(?i)^std\.?\s*", "Grade ", normalized)
        normalized = re.sub(r"(?i)^standard\s+", "Grade ", normalized)
        for g in VALID_GRADES:
            if g.lower() == normalized.lower():
                return g
        digit_match = re.search(r"\d+", normalized)
        if digit_match:
            num = int(digit_match.group())
            if 1 <= num <= 12:
                return f"Grade {num}"
        lower = normalized.lower()
        if lower in ("nursery", "pre-nursery", "prenursery"):
            return "Nursery"
        if lower in ("lkg", "lower kg", "lower kindergarten"):
            return "LKG"
        if lower in ("ukg", "upper kg", "upper kindergarten"):
            return "UKG"
        return None
    if key == "date_of_birth":
        cleaned = value.strip().replace(":", "").strip()
        dt = None
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%m/%d/%Y"):
            try:
                dt = datetime.strptime(cleaned, fmt)
                break
            except ValueError:
                continue
        if dt is None:
            return None
        now = datetime.now()
        if dt > now:
            return None
        age_years = (now - dt).days / 365.25
        if age_years < 2:
            return None
        return dt.strftime("%Y-%m-%d")
    if key == "emergency_contact_phone":
        cleaned = value.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        if cleaned.startswith("+"):
            digits = "".join(c for c in cleaned[1:] if c.isdigit())
            cc = cleaned[1:]
            if cc.startswith("91") and len(digits) == 12:
                return f"+91{digits[2:]}"
            if cc.startswith("1") and len(digits) == 11:
                return f"+1{digits[1:]}"
            if cc.startswith("44") and 12 <= len(digits) <= 13:
                return f"+44{digits[2:]}"
            if cc.startswith("61") and len(digits) == 11:
                return f"+61{digits[2:]}"
            if cc.startswith("971") and len(digits) in (12, 13):
                return f"+971{digits[3:]}"
            if cc.startswith("65") and len(digits) == 10:
                return f"+65{digits[2:]}"
            if 7 <= len(digits) <= 15:
                return f"+{digits}"
            return None
        digits = "".join(c for c in cleaned if c.isdigit())
        if len(digits) == 10:
            return digits
        if len(digits) == 12 and digits.startswith("91"):
            return f"+91{digits[2:]}"
        if len(digits) == 11 and digits.startswith("0"):
            return digits[1:]
        return None
    if key == "previous_board":
        normalized = value.lower().replace(" board", "").strip()
        if normalized in _BOARD_ALIASES:
            return _BOARD_ALIASES[normalized]
        for board in VALID_BOARDS:
            if board.lower() == normalized:
                return board
        return "Other"
    if key == "nationality":
        return value.strip().title() if value.strip() else "Indian"
    if key == "previous_marks":
        return value.strip() if value.strip() else None
    return value


_FIELD_ALIASES: dict[str, str] = {
    "name": "student_full_name",
    "full name": "student_full_name",
    "student name": "student_full_name",
    "child name": "student_full_name",
    "dob": "date_of_birth",
    "date of birth": "date_of_birth",
    "birthday": "date_of_birth",
    "birth date": "date_of_birth",
    "gender": "gender",
    "sex": "gender",
    "nationality": "nationality",
    "grade": "grade_applying_for",
    "grade applying": "grade_applying_for",
    "grade applying for": "grade_applying_for",
    "previous school": "previous_school_name",
    "prev school": "previous_school_name",
    "school name": "previous_school_name",
    "previous board": "previous_board",
    "prev board": "previous_board",
    "board": "previous_board",
    "previous marks": "previous_marks",
    "prev marks": "previous_marks",
    "marks": "previous_marks",
    "emergency contact name": "emergency_contact_name",
    "emergency contact": "emergency_contact_name",
    "contact name": "emergency_contact_name",
    "emergency name": "emergency_contact_name",
    "emergency phone": "emergency_contact_phone",
    "emergency contact phone": "emergency_contact_phone",
    "contact phone": "emergency_contact_phone",
    "phone": "emergency_contact_phone",
    "phone number": "emergency_contact_phone",
    "medical conditions": "medical_conditions",
    "medical": "medical_conditions",
    "health": "medical_conditions",
    "special needs": "special_needs",
    "special": "special_needs",
}


def _match_field_from_text(text: str) -> str | None:
    text_lower = text.lower()
    best_match = None
    best_len = 0
    for alias, field_key in _FIELD_ALIASES.items():
        if alias in text_lower and len(alias) > best_len:
            best_match = field_key
            best_len = len(alias)
    return best_match


def _rejection_message(key: str, raw_value: str) -> str:
    """Return a user-friendly message explaining why a value was rejected."""
    label = key.replace("_", " ").title()
    if key == "date_of_birth":
        try:
            dt = datetime.strptime(raw_value, "%Y-%m-%d")
            if dt > datetime.now():
                return f'The date of birth "{raw_value}" is in the future. Please provide a valid past date (e.g., 15/03/2010).'
            return f'The date of birth "{raw_value}" would make the child less than 2 years old. Please check and try again.'
        except ValueError:
            return f'I couldn\'t parse "{raw_value}" as a date. Please use a format like DD/MM/YYYY (e.g., 15/03/2010).'
    if key == "emergency_contact_phone":
        return f'"{raw_value}" doesn\'t look like a valid phone number. Please provide a number with country code (e.g., +91 9876543210) or a 10-digit Indian number.'
    if key == "gender":
        return f'"{raw_value}" is not a recognized gender. Please say Male, Female, or Other.'
    if key == "grade_applying_for":
        return f'"{raw_value}" is not a recognized grade. Valid options: Nursery, LKG, UKG, Grade 1–12.'
    if key == "previous_board":
        return f'"{raw_value}" — I\'ll record it as "Other". Valid boards: CBSE, ICSE, Matriculation, State Board, International.'
    if key == "nationality":
        return f'Could not set nationality from "{raw_value}". Please provide your child\'s nationality (e.g., Indian).'
    return f'I couldn\'t validate the {label} value "{raw_value}". Could you please provide it again?'


def _compute_completeness(
    app_data: dict,
    current_topic: str = "welcome",
    status: str = "active",
    raw_data: dict | None = None,
) -> int:
    """Progress covers the ENTIRE flow: form fields (60%) + schools (20%) + docs/submit (20%)."""
    if status == "submitted":
        return 100

    total = len(ALL_FIELDS)
    if total == 0:
        return 0
    filled = sum(1 for f in ALL_FIELDS if app_data.get(f))
    form_pct = int(filled / total * 60)

    src = raw_data if raw_data is not None else app_data
    selected_schools = src.get("_selected_school_ids") or []
    school_pct = 20 if selected_schools else 0

    doc_pct = 10 if current_topic == "documents" else 0

    return min(form_pct + school_pct + doc_pct, 90)


def _get_missing_fields(app_data: dict) -> tuple[list[str], list[str]]:
    missing_mandatory = [f for f in REQUIRED_FIELDS if not app_data.get(f)]
    missing_optional = [f for f in OPTIONAL_FIELDS if not app_data.get(f)]
    return missing_mandatory, missing_optional


def _app_fields(app_data: dict) -> dict:
    return {k: v for k, v in (app_data or {}).items() if k not in _INTERNAL_KEYS}


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

    async def _load_parent_context(self, parent_id: UUID) -> tuple[ParentProfile | None, list[Child]]:
        profile = await self.db.scalar(
            select(ParentProfile).where(ParentProfile.parent_id == parent_id)
        )
        children = list(
            (await self.db.scalars(
                select(Child).where(Child.parent_id == parent_id)
            )).all()
        )
        return profile, children

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

        active_sessions = (await self.db.scalars(
            select(ChatbotSession).where(
                ChatbotSession.parent_id == parent_id,
                ChatbotSession.status == "active",
            )
        )).all()
        for old in active_sessions:
            old.status = "abandoned"
        if active_sessions:
            await self.db.flush()

        profile, children = await self._load_parent_context(parent_id)

        parent_context = {}
        if profile:
            parent_context = {
                "name": profile.full_name,
                "phone": profile.phone,
                "city": profile.city,
                "state": profile.state,
            }

        children_data = []
        for c in children:
            children_data.append({
                "id": str(c.id),
                "name": c.full_name,
                "dob": c.date_of_birth,
                "gender": c.gender,
                "nationality": c.nationality,
                "previous_school_name": c.previous_school_name,
                "previous_board": c.previous_board,
                "previous_grade": c.previous_grade,
                "previous_marks": c.previous_marks,
                "medical_conditions": c.medical_conditions,
                "special_needs": c.special_needs,
            })

        session = ChatbotSession(
            parent_id=parent_id,
            current_topic="welcome",
            status="active",
            conversation_history=[],
            application_data={
                "_parent_context": parent_context,
                "_children": children_data,
            },
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

    async def select_child(self, session_id: UUID, parent_id: UUID, child_id: str) -> dict:
        session = await self._get_session(session_id, parent_id)
        app_data = dict(session.application_data or {})
        children = app_data.get("_children") or []

        child = next((c for c in children if c["id"] == child_id), None)
        if not child:
            raise AppError(404, "Child not found in your profile")

        field_map = {
            "name": "student_full_name",
            "dob": "date_of_birth",
            "gender": "gender",
            "nationality": "nationality",
            "previous_school_name": "previous_school_name",
            "previous_board": "previous_board",
            "previous_marks": "previous_marks",
            "medical_conditions": "medical_conditions",
            "special_needs": "special_needs",
        }
        for src, dst in field_map.items():
            val = child.get(src)
            if val:
                validated = _validate_field(dst, str(val))
                if validated is not None:
                    app_data[dst] = validated

        history = list(session.conversation_history or [])
        pre_filled = [k for k, v in _app_fields(app_data).items() if v]
        history.append({
            "role": "assistant",
            "content": (
                f"I've loaded {child['name']}'s details from your profile. "
                f"Pre-filled: {', '.join(f.replace('_', ' ').title() for f in pre_filled)}. "
                f"Let me check what else we need."
            ),
        })

        current_topic = session.current_topic
        while True:
            advanced = False
            if current_topic in TOPIC_FIELDS:
                required_here = [f for f in TOPIC_FIELDS[current_topic] if f in REQUIRED_FIELDS]
                optional_unanswered = [f for f in TOPIC_FIELDS[current_topic] if f in OPTIONAL_FIELDS and not app_data.get(f)]
                if all(app_data.get(f) for f in required_here) and not optional_unanswered:
                    nxt = _next_topic(current_topic)
                    if nxt:
                        current_topic = nxt
                        advanced = True
            if not advanced:
                break

        if current_topic in TOPIC_FIELDS:
            missing = [f for f in TOPIC_FIELDS[current_topic] if not app_data.get(f)]
            if missing:
                transition = _build_dynamic_transition(current_topic, app_data)
                history.append({"role": "assistant", "content": transition})

        session.conversation_history = history
        session.application_data = app_data
        session.current_topic = current_topic
        session.updated_at = datetime.now(timezone.utc)
        await self.db.flush()

        return self._session_to_response(session)

    async def search_schools(self, session_id: UUID, parent_id: UUID, **filters) -> list[dict]:
        await self._get_session(session_id, parent_id)
        q = select(School).where(
            School.status.in_(["active", "inactive"])
        )
        if filters.get("grade"):
            q = q.where(School.grades_offered.contains([filters["grade"]]))
        if filters.get("board"):
            q = q.where(School.board == filters["board"])
        if filters.get("city"):
            q = q.where(School.city.ilike(f"%{filters['city']}%"))
        if filters.get("area"):
            q = q.where(School.area.ilike(f"%{filters['area']}%"))

        q = q.order_by(School.status.asc(), School.name)
        schools = list((await self.db.scalars(q)).all())

        import re as _re
        seen = set()
        results = []
        for s in schools:
            norm_name = _re.sub(r"[^a-z0-9]", "", s.name.lower())
            norm_city = _re.sub(r"[^a-z0-9]", "", (s.city or "").lower())
            key = (norm_name, norm_city)
            if key in seen:
                continue
            seen.add(key)
            results.append({
                "id": str(s.id),
                "name": s.name,
                "board": s.board,
                "area": s.area,
                "city": s.city,
                "state": s.state,
                "status": s.status,
                "grades_offered": s.grades_offered or [],
                "required_documents": s.required_documents or [],
            })
        return results

    def _match_child_by_name(self, session: ChatbotSession, message: str) -> dict | None:
        app_data = session.application_data or {}
        children = app_data.get("_children") or []
        if not children:
            return None

        msg_lower = message.lower()
        apply_phrases = ("apply for", "apply to", "want to apply", "like to apply", "enroll", "enrol")
        explicitly_requesting = any(p in msg_lower for p in apply_phrases)

        if app_data.get("_skip_child_match") and not explicitly_requesting:
            return None

        if _app_fields(app_data).get("student_full_name") and not explicitly_requesting:
            return None

        for child in children:
            child_name = child.get("name", "")
            first_name = child_name.split()[0].lower() if child_name else ""
            full_lower = child_name.lower()
            if first_name and (first_name in msg_lower or full_lower in msg_lower):
                return child
        return None

    def _parse_school_filters(self, message: str) -> dict[str, str] | None:
        """Parse natural language school filter requests like 'show me CBSE schools in Delhi'."""
        msg = message.strip().lower()
        # Only trigger if the message looks like a filter request
        filter_signals = (
            "show", "find", "search", "filter", "only", "list",
            "schools in", "schools near", "schools from",
            "cbse", "icse", "state board", "matriculation", "international",
        )
        if not any(s in msg for s in filter_signals):
            return None
        filters: dict[str, str] = {}
        # Board detection
        for alias, board in _BOARD_ALIASES.items():
            if alias in msg:
                filters["board"] = board
                break
        # City/area detection — look for "in <place>" or "near <place>"
        loc_match = re.search(r'\b(?:in|near|from|around)\s+([a-z][a-z\s]{1,30})', msg)
        if loc_match:
            place = loc_match.group(1).strip().rstrip(".,!?")
            # Skip if it matches a board name
            if place.lower() not in _BOARD_ALIASES and place.lower() not in ("school", "schools", "board"):
                filters["city"] = place.title()
        if filters:
            return filters
        return None

    async def _get_already_submitted_school_ids(self, session: ChatbotSession) -> list[str]:
        from app.models.application import Application
        from app.models.application_school import ApplicationSchool
        student_name = _app_fields(session.application_data or {}).get("student_full_name", "").strip().lower()
        if not student_name:
            return []
        apps = (await self.db.scalars(
            select(Application).where(
                Application.parent_id == session.parent_id,
                Application.method == "agentic",
            )
        )).all()
        submitted_school_ids: list[str] = []
        for app in apps:
            if (app.form_data or {}).get("student_full_name", "").strip().lower() == student_name:
                app_schools = (await self.db.scalars(
                    select(ApplicationSchool).where(ApplicationSchool.application_id == app.id)
                )).all()
                for asch in app_schools:
                    submitted_school_ids.append(str(asch.school_id))
        return submitted_school_ids

    async def _fetch_schools_for_session(self, session: ChatbotSession) -> list[dict]:
        q = select(School).where(School.status.in_(["active", "inactive"])).order_by(School.status.asc(), School.name)
        schools = list((await self.db.scalars(q)).all())
        import re as _re
        seen: set[tuple[str, str]] = set()
        results = []
        for s in schools:
            norm_name = _re.sub(r"[^a-z0-9]", "", s.name.lower())
            norm_city = _re.sub(r"[^a-z0-9]", "", (s.city or "").lower())
            key = (norm_name, norm_city)
            if key in seen:
                continue
            seen.add(key)
            results.append({
                "id": str(s.id),
                "name": s.name,
                "board": s.board,
                "area": s.area,
                "city": s.city,
                "state": s.state,
                "status": s.status,
                "grades_offered": s.grades_offered or [],
                "required_documents": s.required_documents or [],
            })
        return results

    async def process_response(self, session_id: UUID, parent_id: UUID, message: str) -> dict:
        session = await self._get_session(session_id, parent_id)

        history = list(session.conversation_history or [])
        msg_count = sum(1 for h in history if h["role"] == "user")
        if msg_count >= settings.CHATBOT_MAX_MESSAGES_PER_SESSION:
            raise AppError(429, "Session message limit reached. Please review your application or switch to the form.")

        if message == "__new_child__":
            app_data = dict(session.application_data or {})
            app_data["_skip_child_match"] = True
            session.application_data = app_data
            session.current_topic = "student_details"
            history.append({"role": "assistant", "content": "No problem! Let's start fresh. Please tell me your child's full name."})
            session.conversation_history = history
            session.updated_at = datetime.now(timezone.utc)
            await self.db.flush()
            return self._session_to_response(session)

        if message == "__edit_details__":
            app_data = dict(session.application_data or {})
            fields = _app_fields(app_data)
            field_list = []
            for f in ALL_FIELDS:
                label = f.replace("_", " ").title()
                val = fields.get(f)
                if val:
                    field_list.append(f"• {label}: {val}")
                else:
                    field_list.append(f"• {label}: (not provided)")
            session.status = "active"
            session.current_topic = "review"
            history.append({
                "role": "assistant",
                "content": (
                    "Sure! Here are your current details:\n\n"
                    + "\n".join(field_list)
                    + "\n\nWhich field would you like to change? Just tell me, e.g., "
                    "\"change the name to Ravi\" or \"update emergency phone to 9876543210\"."
                ),
            })
            session.conversation_history = history
            session.updated_at = datetime.now(timezone.utc)
            await self.db.flush()
            return self._session_to_response(session)

        if message == "__continue_to_schools__":
            session.current_topic = "schools"
            app_data = dict(session.application_data or {})
            app_data["_selected_school_ids"] = []
            already_submitted_ids = await self._get_already_submitted_school_ids(session)
            app_data["_already_submitted_school_ids"] = already_submitted_ids
            session.application_data = app_data
            history.append({
                "role": "assistant",
                "content": "Great! Now let's select the schools you'd like to apply to. Please pick from the list below and click 'Confirm Schools'.",
            })
            session.conversation_history = history
            session.updated_at = datetime.now(timezone.utc)
            await self.db.flush()
            return self._session_to_response(session)

        if message.startswith("__select_schools__:"):
            school_ids_str = message.split(":", 1)[1]
            school_ids = [sid.strip() for sid in school_ids_str.split(",") if sid.strip()]
            if not school_ids:
                history.append({"role": "assistant", "content": "Please select at least one school to continue."})
                session.conversation_history = history
                await self.db.flush()
                return self._session_to_response(session)
            app_data = dict(session.application_data or {})
            app_data["_selected_school_ids"] = school_ids
            session.application_data = app_data
            session.current_topic = "documents"
            schools = await self._fetch_schools_for_session(session)
            selected_names = []
            extra_docs = set()
            for s in schools:
                if s["id"] in school_ids and s["status"] == "active":
                    selected_names.append(s["name"])
                    for d in s.get("required_documents") or []:
                        if d not in ("birth_cert", "photo", "transcript"):
                            extra_docs.add(d)
            doc_msg = "Please upload the following documents:\n• Birth Certificate (required)\n• Recent Photograph (required)\n• Previous Transcripts (optional)"
            if extra_docs:
                for d in sorted(extra_docs):
                    doc_msg += f"\n• {d.replace('_', ' ').title()} (required by selected school)"
            history.append({
                "role": "assistant",
                "content": (
                    f"You've selected {len(selected_names)} school(s): {', '.join(selected_names)}.\n\n"
                    f"{doc_msg}\n\nPlease upload the documents below and click 'Submit Application'."
                ),
            })
            session.conversation_history = history
            session.updated_at = datetime.now(timezone.utc)
            await self.db.flush()
            return self._session_to_response(session)

        if message == "__application_submitted__":
            session.status = "submitted"
            history.append({
                "role": "assistant",
                "content": (
                    "Your application has been submitted successfully! "
                    "You'll receive email confirmations from each school. "
                    "You can track the status from your dashboard, or apply to more schools."
                ),
            })
            session.conversation_history = history
            session.updated_at = datetime.now(timezone.utc)
            await self.db.flush()
            return self._session_to_response(session)

        if message == "__apply_more_schools__":
            session.status = "active"
            session.current_topic = "schools"
            app_data = dict(session.application_data or {})
            app_data["_selected_school_ids"] = []
            already_submitted_ids = await self._get_already_submitted_school_ids(session)
            app_data["_already_submitted_school_ids"] = already_submitted_ids
            session.application_data = app_data
            history.append({
                "role": "assistant",
                "content": "Sure! Let's apply to more schools. Please select additional schools from the list below.",
            })
            session.conversation_history = history
            session.updated_at = datetime.now(timezone.utc)
            await self.db.flush()
            return self._session_to_response(session)

        # Conversational school filtering: parse natural language filters during school selection
        if session.current_topic == "schools":
            filters = self._parse_school_filters(message)
            if filters:
                history.append({"role": "user", "content": message})
                filtered_schools = await self.search_schools(
                    session.id, session.parent_id, **filters,
                )
                active_count = sum(1 for s in filtered_schools if s["status"] == "active")
                inactive_count = sum(1 for s in filtered_schools if s["status"] == "inactive")
                parts = []
                if filters.get("board"):
                    parts.append(f"{filters['board']} board")
                if filters.get("city"):
                    parts.append(f"in {filters['city']}")
                if filters.get("area"):
                    parts.append(f"near {filters['area']}")
                filter_desc = " ".join(parts) if parts else "your criteria"
                if filtered_schools:
                    reply = (
                        f"I found {len(filtered_schools)} school(s) matching {filter_desc} "
                        f"({active_count} active, {inactive_count} inactive). "
                        "The list below has been updated — pick the ones you'd like!"
                    )
                else:
                    reply = (
                        f"No schools matched {filter_desc}. "
                        "Try broadening your search, or use the filters above to explore."
                    )
                history.append({"role": "assistant", "content": reply})
                app_data = dict(session.application_data or {})
                app_data["_school_filters"] = filters
                session.application_data = app_data
                session.conversation_history = history
                session.updated_at = datetime.now(timezone.utc)
                await self.db.flush()
                resp = self._session_to_response(session)
                resp["school_filters"] = filters
                return resp

        history.append({"role": "user", "content": message})

        removal_keywords = ("remove", "clear", "delete", "blank", "erase", "reset")
        msg_lower = message.strip().lower()
        if any(kw in msg_lower for kw in removal_keywords):
            target_field = _match_field_from_text(msg_lower)
            if target_field:
                app_data = dict(session.application_data or {})
                old_val = _app_fields(app_data).get(target_field)
                if old_val:
                    app_data.pop(target_field, None)
                    label = target_field.replace("_", " ").title()
                    fields = _app_fields(app_data)
                    new_pct = _compute_completeness(fields, session.current_topic, session.status, app_data)

                    if target_field in REQUIRED_FIELDS:
                        session.status = "active"
                        for topic, topic_fields in TOPIC_FIELDS.items():
                            if target_field in topic_fields:
                                session.current_topic = topic
                                break

                    history.append({
                        "role": "assistant",
                        "content": (
                            f"Done! I've removed {label} (was: \"{old_val}\"). "
                            f"Progress is now {new_pct}%."
                            + (f" Since {label} is required, please provide it again when you're ready."
                               if target_field in REQUIRED_FIELDS else "")
                        ),
                    })
                    session.application_data = app_data
                    session.conversation_history = history
                    session.updated_at = datetime.now(timezone.utc)
                    await self.db.flush()
                    return self._session_to_response(session)
                else:
                    label = target_field.replace("_", " ").title()
                    history.append({
                        "role": "assistant",
                        "content": f"{label} is not currently set, so there's nothing to remove.",
                    })
                    session.conversation_history = history
                    session.updated_at = datetime.now(timezone.utc)
                    await self.db.flush()
                    return self._session_to_response(session)

        matched_child = self._match_child_by_name(session, message)
        if matched_child and session.current_topic in ("welcome", "student_details"):
            app_data = dict(session.application_data or {})
            app_data.pop("_skip_child_match", None)
            session.application_data = app_data
            session.conversation_history = history
            await self.db.flush()
            return await self.select_child(session.id, session.parent_id, matched_child["id"])

        skip_words = {"skip", "no", "none", "no thanks", "nope", "na", "nah", "nothing"}
        skip_phrases = {
            "i dont know", "i don't know", "dont know", "don't know",
            "not sure", "no idea", "i have no idea", "i am not sure",
            "im not sure", "i'm not sure", "no clue",
        }
        msg_lower_stripped = message.strip().lower()
        is_skip = msg_lower_stripped in skip_words or msg_lower_stripped in skip_phrases
        if is_skip and session.current_topic in TOPIC_FIELDS:
            app_data = dict(session.application_data or {})

            required_here = [f for f in TOPIC_FIELDS[session.current_topic] if f in REQUIRED_FIELDS]
            missing_required = [f for f in required_here if not app_data.get(f)]

            if not missing_required:
                skipped_any = False
                for f in TOPIC_FIELDS[session.current_topic]:
                    if f in OPTIONAL_FIELDS and not app_data.get(f):
                        app_data[f] = "None"
                        skipped_any = True
                if skipped_any:
                    nxt = _next_topic(session.current_topic)
                    if nxt:
                        session.current_topic = nxt
                    if session.current_topic == "review":
                        fields = _app_fields(app_data)
                        missing_m, _ = _get_missing_fields(fields)
                        if not missing_m:
                            summary_lines = []
                            for f in ALL_FIELDS:
                                label = f.replace("_", " ").title()
                                val = fields.get(f, "—")
                                opt = " (Optional)" if f in OPTIONAL_FIELDS else ""
                                summary_lines.append(f"  {label}{opt}: {val}")
                            history.append({
                                "role": "assistant",
                                "content": "All details collected! Here's a summary:\n" + "\n".join(summary_lines) + "\n\nPlease review and click 'Select Schools' to continue.",
                            })
                        else:
                            history.append({"role": "assistant", "content": "No problem! Let's move on."})
                    else:
                        transition = _build_dynamic_transition(session.current_topic, app_data)
                        history.append({"role": "assistant", "content": transition})
                    session.application_data = app_data
                    session.conversation_history = history
                    session.updated_at = datetime.now(timezone.utc)
                    await self.db.flush()
                    return self._session_to_response(session)
            # else: required fields still missing — fall through to LLM

        if session.current_topic == "review":
            app_data = dict(session.application_data or {})
            old_snapshot = dict(_app_fields(app_data))
            changed_fields: list[str] = []
            review_rejected: dict[str, str] = {}

            llm_result = await _call_llm(_build_messages(session, message))
            for key, value in (llm_result.get("extracted_fields") or {}).items():
                if value is not None and value != "":
                    validated = _validate_field(key, str(value), raw_input=message)
                    if validated is not None:
                        app_data[key] = validated
                    else:
                        review_rejected[key] = str(value)

            # Rule-based fallback: try to extract fields the LLM missed
            target_field = _match_field_from_text(message)
            if target_field and target_field not in (llm_result.get("extracted_fields") or {}):
                raw_val = re.sub(
                    r"(?i)^.*?(?:update|change|set|modify|correct|fix)\s+(?:\w+\s+){0,3}(?:to|:)\s*",
                    "", message,
                ).strip().rstrip(".,!?")
                if not raw_val:
                    colon_match = re.search(r"[:\-]\s*(.+)", message)
                    if colon_match:
                        raw_val = colon_match.group(1).strip()
                if raw_val:
                    validated = _validate_field(target_field, raw_val, raw_input=message)
                    if validated is not None:
                        app_data[target_field] = validated
                    else:
                        review_rejected[target_field] = raw_val

            # Direct DOB extraction from the message
            dob_m = re.search(r'(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})', message)
            if dob_m:
                raw_dob = f"{dob_m.group(1)}/{dob_m.group(2)}/{dob_m.group(3)}"
                validated_dob = _validate_field("date_of_birth", raw_dob)
                if validated_dob:
                    app_data["date_of_birth"] = validated_dob
                    review_rejected.pop("date_of_birth", None)
                elif "date_of_birth" not in review_rejected:
                    review_rejected["date_of_birth"] = raw_dob
            elif not dob_m:
                dob_m2 = re.search(r'(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})', message)
                if dob_m2:
                    raw_dob = f"{dob_m2.group(1)}-{dob_m2.group(2)}-{dob_m2.group(3)}"
                    validated_dob = _validate_field("date_of_birth", raw_dob)
                    if validated_dob:
                        app_data["date_of_birth"] = validated_dob
                        review_rejected.pop("date_of_birth", None)
                    elif "date_of_birth" not in review_rejected:
                        review_rejected["date_of_birth"] = raw_dob

            # Direct phone extraction (supports +CC formats and plain 10-digit)
            phone_m = re.search(r'(\+?\d[\d\s\-]{7,15}\d)', message)
            if phone_m and "emergency_contact_phone" not in (llm_result.get("extracted_fields") or {}):
                validated_phone = _validate_field("emergency_contact_phone", phone_m.group(1))
                if validated_phone:
                    app_data["emergency_contact_phone"] = validated_phone

            new_fields = _app_fields(app_data)
            for f in ALL_FIELDS:
                if new_fields.get(f) != old_snapshot.get(f):
                    changed_fields.append(f)

            missing_m, _ = _get_missing_fields(new_fields)

            if review_rejected:
                rejection_parts = [_rejection_message(k, v) for k, v in review_rejected.items()]
                if changed_fields:
                    labels = [f.replace("_", " ").title() for f in changed_fields]
                    history.append({
                        "role": "assistant",
                        "content": f"Updated: {', '.join(labels)}. However: {' '.join(rejection_parts)}",
                    })
                else:
                    history.append({
                        "role": "assistant",
                        "content": " ".join(rejection_parts),
                    })
            elif changed_fields:
                labels = [f.replace("_", " ").title() for f in changed_fields]
                if not missing_m:
                    history.append({
                        "role": "assistant",
                        "content": f"Done! Updated: {', '.join(labels)}. Your application is ready — click 'Select Schools' to continue.",
                    })
                else:
                    history.append({
                        "role": "assistant",
                        "content": f"Updated: {', '.join(labels)}. But we're still missing: {', '.join(f.replace('_', ' ').title() for f in missing_m)}. Could you provide those?",
                    })
            else:
                history.append({
                    "role": "assistant",
                    "content": (
                        "I couldn't identify what to update from your message. "
                        "Please try like this:\n"
                        '• "change name to Ravi Kumar"\n'
                        '• "update DOB to 15/03/2010"\n'
                        '• "set grade to Grade 5"\n'
                        '• "update emergency phone to 9876543210"'
                    ),
                })
            session.conversation_history = history
            session.application_data = app_data
            session.updated_at = datetime.now(timezone.utc)
            await self.db.flush()
            return self._session_to_response(session)

        messages = _build_messages(session, message)
        llm_result = await _call_llm(messages)

        app_data = dict(session.application_data or {})
        rejected_fields = {}
        for key, value in (llm_result.get("extracted_fields") or {}).items():
            if value is None or value == "":
                continue
            if app_data.get(key) and str(value).lower() == str(app_data[key]).lower():
                continue
            validated = _validate_field(key, str(value), raw_input=message)
            if validated is not None:
                app_data[key] = validated
            else:
                if not app_data.get(key):
                    rejected_fields[key] = str(value)

        # Rule-based fallback: catch fields the LLM missed
        msg_stripped = message.strip()
        fallback_extracted = []

        if not app_data.get("grade_applying_for") and "grade_applying_for" not in rejected_fields:
            msg_lower = msg_stripped.lower()
            is_grade_input = bool(re.match(r'^\d{1,2}$', msg_stripped)) or \
                bool(re.match(r'^(grade|class|std|standard|nursery|lkg|ukg)\s*\d*$', msg_lower, re.IGNORECASE))
            if is_grade_input:
                grade_val = _validate_field("grade_applying_for", msg_stripped)
                if grade_val:
                    app_data["grade_applying_for"] = grade_val
                    fallback_extracted.append("grade_applying_for")

        if not app_data.get("gender") and "gender" not in (llm_result.get("extracted_fields") or {}):
            msg_lower = msg_stripped.lower()
            if any(w in msg_lower for w in ("my son", "his name", "boy", "he is", "he's")):
                app_data["gender"] = "Male"
                fallback_extracted.append("gender")
            elif any(w in msg_lower for w in ("my daughter", "her name", "girl", "she is", "she's")):
                app_data["gender"] = "Female"
                fallback_extracted.append("gender")

        phone_match_fb = re.search(r'(\+?\d[\d\s\-]{7,15}\d)', msg_stripped)
        if phone_match_fb and "emergency_contact_phone" not in (llm_result.get("extracted_fields") or {}):
            validated_phone = _validate_field("emergency_contact_phone", phone_match_fb.group(1))
            if validated_phone:
                app_data["emergency_contact_phone"] = validated_phone
                fallback_extracted.append("emergency_contact_phone")

        if "date_of_birth" not in (llm_result.get("extracted_fields") or {}) and "date_of_birth" not in rejected_fields:
            dob_m = re.search(r'(?<!\d)(\d{4})[-/:.](\d{1,2})[-/:.](\d{1,2})(?!\d)', msg_stripped)
            if not dob_m:
                dob_m2 = re.search(r'(?<!\d)(\d{1,2})[-/:.](\d{1,2})[-/:.](\d{4})(?!\d)', msg_stripped)
                if dob_m2:
                    raw = f"{dob_m2.group(3)}-{dob_m2.group(2).zfill(2)}-{dob_m2.group(1).zfill(2)}"
                    validated_dob = _validate_field("date_of_birth", raw)
                    if validated_dob:
                        app_data["date_of_birth"] = validated_dob
                        fallback_extracted.append("date_of_birth")
                    else:
                        rejected_fields["date_of_birth"] = raw
            else:
                raw = f"{dob_m.group(1)}-{dob_m.group(2).zfill(2)}-{dob_m.group(3).zfill(2)}"
                validated_dob = _validate_field("date_of_birth", raw)
                if validated_dob:
                    app_data["date_of_birth"] = validated_dob
                    fallback_extracted.append("date_of_birth")
                else:
                    rejected_fields["date_of_birth"] = raw

        bot_message = llm_result["message"]

        if fallback_extracted:
            labels = [f.replace("_", " ").title() for f in fallback_extracted]
            cur = session.current_topic
            still_need = [
                f.replace("_", " ").title()
                for f in (TOPIC_FIELDS.get(cur) or [])
                if not app_data.get(f)
            ]
            if still_need:
                bot_message = f"Got it, noted {', '.join(labels)}! I still need: {', '.join(still_need)}. Could you provide those?"
            else:
                bot_message = f"Got it, noted {', '.join(labels)}! Let me check what's next."

        if rejected_fields:
            rejection_parts = [_rejection_message(k, v) for k, v in rejected_fields.items()]
            bot_message = " ".join(rejection_parts)
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
                    if not app_data.get(f)
                ]
                if missing:
                    bot_message = f"Thanks! I still need: {', '.join(missing)}. Could you provide those?"
                else:
                    bot_message = "Great, I have everything I need for this section! Let me move on."

        history.append({"role": "assistant", "content": bot_message})

        current_topic = session.current_topic

        # Handle legacy "documents" topic from old sessions
        if current_topic == "documents":
            current_topic = "review"

        topic_advanced = False

        while True:
            advanced_this_round = False
            if current_topic in TOPIC_FIELDS:
                required_for_topic = [
                    f for f in TOPIC_FIELDS[current_topic]
                    if f in REQUIRED_FIELDS
                ]
                all_required_done = all(app_data.get(f) for f in required_for_topic)
                if all_required_done:
                    optional_for_topic = [
                        f for f in TOPIC_FIELDS[current_topic]
                        if f in OPTIONAL_FIELDS and not app_data.get(f)
                    ]
                    if optional_for_topic:
                        opt_labels = [f.replace("_", " ").title() for f in optional_for_topic]
                        history.append({
                            "role": "assistant",
                            "content": (
                                f"Before we move on — these are optional but helpful: "
                                f"{', '.join(opt_labels)}. "
                                f"Would you like to provide any of these, or say 'skip' to continue?"
                            ),
                        })
                        break
                    nxt = _next_topic(current_topic)
                    if nxt:
                        current_topic = nxt
                        topic_advanced = True
                        advanced_this_round = True
            elif llm_result.get("topic_complete") and current_topic not in TOPIC_FIELDS:
                nxt = _next_topic(current_topic)
                if nxt:
                    current_topic = nxt
                    topic_advanced = True
                    advanced_this_round = True
            if not advanced_this_round:
                break

        if topic_advanced:
            if current_topic == "review":
                fields = _app_fields(app_data)
                missing_m, _ = _get_missing_fields(fields)
                if not missing_m:
                    summary_lines = []
                    for f in ALL_FIELDS:
                        label = f.replace("_", " ").title()
                        val = fields.get(f)
                        opt = " (Optional)" if f in OPTIONAL_FIELDS else ""
                        summary_lines.append(f"  - {label}{opt}: {val or '—'}")
                    summary = "\n".join(summary_lines)
                    review_msg = TOPIC_TRANSITIONS.get("review", "Please review your details.")
                    history[-1] = {
                        "role": "assistant",
                        "content": f"{review_msg}\n\n{summary}",
                    }
                else:
                    current_topic = session.current_topic
                    topic_advanced = False
            else:
                transition = _build_dynamic_transition(current_topic, app_data)
                history[-1] = {"role": "assistant", "content": transition}

        session.conversation_history = history
        session.application_data = app_data
        session.current_topic = current_topic
        session.updated_at = datetime.now(timezone.utc)
        await self.db.flush()

        return self._session_to_response(session)

    async def get_summary(self, session_id: UUID, parent_id: UUID) -> dict:
        session = await self._get_session(session_id, parent_id)
        raw = session.application_data or {}
        fields = _app_fields(raw)
        missing_m, missing_o = _get_missing_fields(fields)
        return {
            "session_id": str(session.id),
            "application_data": fields,
            "completeness": _compute_completeness(fields, session.current_topic, session.status, raw),
            "missing_fields": missing_m,
            "missing_mandatory": missing_m,
            "missing_optional": missing_o,
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

    async def list_sessions(self, parent_id: UUID) -> list[dict]:
        from app.models.application import Application
        from app.models.application_school import ApplicationSchool

        sessions = (
            await self.db.scalars(
                select(ChatbotSession)
                .where(ChatbotSession.parent_id == parent_id)
                .order_by(ChatbotSession.updated_at.desc())
                .limit(10)
            )
        ).all()
        result = []
        for s in sessions:
            raw = s.application_data or {}
            fields = _app_fields(raw)
            student_name = fields.get("student_full_name", "")
            completeness = _compute_completeness(fields, s.current_topic, s.status, raw)
            if not student_name and completeness == 0:
                continue

            submitted_count = 0
            if s.status == "completed" and student_name:
                apps = (await self.db.scalars(
                    select(Application).where(
                        Application.parent_id == parent_id,
                        Application.method == "agentic",
                        Application.status == "submitted",
                    )
                )).all()
                for app in apps:
                    if (app.form_data or {}).get("student_full_name", "").strip().lower() == student_name.strip().lower():
                        count = await self.db.scalar(
                            select(func.count()).select_from(ApplicationSchool).where(
                                ApplicationSchool.application_id == app.id
                            )
                        )
                        submitted_count += count or 0

            result.append({
                "session_id": str(s.id),
                "status": s.status,
                "current_topic": s.current_topic,
                "student_name": student_name,
                "completeness": completeness,
                "updated_at": s.updated_at.isoformat() if s.updated_at else None,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "submitted_school_count": submitted_count,
            })
        return result

    async def delete_sessions(self, session_ids: list[UUID], parent_id: UUID) -> dict:
        from sqlalchemy import delete as sa_delete
        result = await self.db.execute(
            sa_delete(ChatbotSession).where(
                ChatbotSession.id.in_(session_ids),
                ChatbotSession.parent_id == parent_id,
            )
        )
        await self.db.flush()
        return {"deleted": result.rowcount}

    async def resume_session(self, session_id: UUID, parent_id: UUID) -> dict:
        session = await self.db.scalar(
            select(ChatbotSession).where(
                ChatbotSession.id == session_id,
                ChatbotSession.parent_id == parent_id,
            )
        )
        if not session:
            raise AppError(404, "Chat session not found")
        if session.status not in ("active", "completed", "abandoned", "submitted", "switched_to_form"):
            raise AppError(400, "This chat session can no longer be resumed")
        if session.status == "abandoned":
            session.status = "active"
        app_data = dict(session.application_data or {})
        if "_children" not in app_data or "_parent_context" not in app_data:
            profile, children = await self._load_parent_context(parent_id)
            if profile and "_parent_context" not in app_data:
                app_data["_parent_context"] = {
                    "name": profile.full_name,
                    "phone": profile.phone,
                    "city": profile.city,
                    "state": profile.state,
                }
            if "_children" not in app_data:
                app_data["_children"] = [
                    {
                        "id": str(c.id), "name": c.full_name,
                        "dob": c.date_of_birth, "gender": c.gender,
                        "nationality": c.nationality,
                        "previous_school_name": c.previous_school_name,
                        "previous_board": c.previous_board,
                        "previous_grade": c.previous_grade,
                        "previous_marks": c.previous_marks,
                        "medical_conditions": c.medical_conditions,
                        "special_needs": c.special_needs,
                    }
                    for c in children
                ]
            session.application_data = app_data
            await self.db.flush()
        return self._session_to_response(session)

    async def _get_session(self, session_id: UUID, parent_id: UUID) -> ChatbotSession:
        session = await self.db.scalar(
            select(ChatbotSession).where(
                ChatbotSession.id == session_id,
                ChatbotSession.parent_id == parent_id,
            )
        )
        if not session:
            raise AppError(404, "Chat session not found")
        if session.status not in ("active", "completed", "abandoned", "submitted"):
            raise AppError(400, "This chat session is no longer active")
        return session

    def _session_to_response(self, session: ChatbotSession) -> dict:
        history = session.conversation_history or []
        last_message = history[-1]["content"] if history else ""
        raw_data = session.application_data or {}
        fields = _app_fields(raw_data)
        missing_m, missing_o = _get_missing_fields(fields)
        children = [] if raw_data.get("_skip_child_match") else (raw_data.get("_children") or [])
        selected_school_ids = raw_data.get("_selected_school_ids") or []
        already_submitted_school_ids = raw_data.get("_already_submitted_school_ids") or []
        return {
            "session_id": str(session.id),
            "message": last_message,
            "current_topic": session.current_topic,
            "conversation_history": history,
            "application_data": fields,
            "completeness": _compute_completeness(fields, session.current_topic, session.status, raw_data),
            "status": session.status,
            "missing_mandatory": missing_m,
            "missing_optional": missing_o,
            "children": children,
            "selected_school_ids": selected_school_ids,
            "already_submitted_school_ids": already_submitted_school_ids,
        }
