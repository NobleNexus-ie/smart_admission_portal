from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.deps import DbSession, get_current_parent, parent_id_from
from app.services.chatbot_service import ChatbotService

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


class RespondRequest(BaseModel):
    session_id: UUID
    message: str = Field(min_length=1, max_length=2000)


class SwitchToFormRequest(BaseModel):
    session_id: UUID


@router.post("/start")
async def start_conversation(
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    return await ChatbotService(db).start_conversation(parent_id_from(current))


@router.post("/respond")
async def respond(
    body: RespondRequest,
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    return await ChatbotService(db).process_response(
        body.session_id, parent_id_from(current), body.message
    )


@router.get("/summary")
async def get_summary(
    session_id: UUID,
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    return await ChatbotService(db).get_summary(session_id, parent_id_from(current))


@router.post("/switch-to-form")
async def switch_to_form(
    body: SwitchToFormRequest,
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    return await ChatbotService(db).switch_to_form(body.session_id, parent_id_from(current))
