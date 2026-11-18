from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.deps import DbSession, get_current_staff

router = APIRouter(prefix="/ai", tags=["ai-assist"])


class ImproveTextRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    context: str = Field(default="general", max_length=100)


class ImproveTextResponse(BaseModel):
    improved_text: str
    used_ai: bool


IMPROVE_PROMPTS = {
    "info_request": (
        "You are a school admissions officer writing to a parent. "
        "Rewrite the following message to be professional, warm, and clear. "
        "Keep the same meaning but improve grammar, tone, and clarity. "
        "Make it sound like a polite formal email. Reply with ONLY the improved text, nothing else."
    ),
    "rejection": (
        "You are a school admissions officer writing a rejection reason to a parent. "
        "Rewrite the following to be empathetic, professional, and respectful while being clear about the reason. "
        "Keep the same meaning. Reply with ONLY the improved text, nothing else."
    ),
    "general": (
        "Rewrite the following text to be professional, clear, and well-structured. "
        "Keep the same meaning but improve grammar and tone. Reply with ONLY the improved text, nothing else."
    ),
}


@router.post("/improve-text", response_model=ImproveTextResponse)
async def improve_text(
    body: ImproveTextRequest,
    db: DbSession,
    staff: Annotated[dict, Depends(get_current_staff)],
):
    from app.config import get_settings

    settings = get_settings()
    system_prompt = IMPROVE_PROMPTS.get(body.context, IMPROVE_PROMPTS["general"])

    # Try OpenAI first (gpt-4o-mini)
    if settings.OPENAI_API_KEY:
        try:
            from langchain_openai import ChatOpenAI

            llm = ChatOpenAI(
                model=settings.LLM_MODEL,
                api_key=settings.OPENAI_API_KEY,
                timeout=settings.LLM_TIMEOUT,
            )
            result = await llm.ainvoke([
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": body.text},
            ])
            return ImproveTextResponse(improved_text=result.content.strip(), used_ai=True)
        except Exception:
            pass

    # Try Google Gemini as fallback
    if settings.GOOGLE_API_KEY:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI

            llm = ChatGoogleGenerativeAI(
                model=settings.LLM_FALLBACK_MODEL,
                google_api_key=settings.GOOGLE_API_KEY,
                timeout=settings.LLM_TIMEOUT,
                temperature=0.3,
            )
            result = await llm.ainvoke([
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": body.text},
            ])
            return ImproveTextResponse(improved_text=result.content.strip(), used_ai=True)
        except Exception:
            pass

    # Rule-based fallback
    improved = _rule_based_improve(body.text, body.context)
    return ImproveTextResponse(improved_text=improved, used_ai=False)


def _rule_based_improve(text: str, context: str) -> str:
    text = text.strip()
    if not text:
        return text

    # Capitalize first letter of each sentence
    sentences = []
    for s in text.replace(". ", ".\n").split("\n"):
        s = s.strip()
        if s:
            sentences.append(s[0].upper() + s[1:] if len(s) > 1 else s.upper())
    text = " ".join(sentences)

    # Ensure ending punctuation
    if text and text[-1] not in ".!?":
        text += "."

    if context == "info_request":
        if not text.lower().startswith(("dear", "hello", "hi ", "respected")):
            text = f"Dear Parent,\n\n{text}"
        if not any(
            text.lower().endswith(x)
            for x in ("regards", "thank you", "thanks", "sincerely")
        ):
            text += "\n\nThank you for your cooperation.\n\nBest regards,\nAdmissions Team"
    elif context == "rejection":
        if not text.lower().startswith(("dear", "hello", "we regret")):
            text = f"Dear Parent,\n\nWe regret to inform you that {text[0].lower()}{text[1:]}"
        if not any(
            text.lower().endswith(x)
            for x in ("regards", "wish you", "thank you", "best")
        ):
            text += "\n\nWe wish you and your child the very best in future endeavours.\n\nBest regards,\nAdmissions Team"

    return text
