from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from app.deps import DbSession, get_current_parent, parent_id_from
from app.services.chatbot_service import ChatbotService

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


class RespondRequest(BaseModel):
    session_id: UUID
    message: str = Field(min_length=1, max_length=2000)


class SwitchToFormRequest(BaseModel):
    session_id: UUID


class SelectChildRequest(BaseModel):
    session_id: UUID
    child_id: str


class DeleteSessionsRequest(BaseModel):
    session_ids: list[UUID]


@router.get("/sessions")
async def list_sessions(
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    return await ChatbotService(db).list_sessions(parent_id_from(current))


@router.delete("/sessions")
async def delete_sessions(
    body: DeleteSessionsRequest,
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    return await ChatbotService(db).delete_sessions(body.session_ids, parent_id_from(current))


@router.post("/start")
async def start_conversation(
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    return await ChatbotService(db).start_conversation(parent_id_from(current))


@router.get("/resume/{session_id}")
async def resume_session(
    session_id: UUID,
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    return await ChatbotService(db).resume_session(session_id, parent_id_from(current))


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


@router.post("/select-child")
async def select_child(
    body: SelectChildRequest,
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    return await ChatbotService(db).select_child(
        body.session_id, parent_id_from(current), body.child_id
    )


@router.get("/search-schools")
async def search_schools(
    session_id: UUID,
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
    grade: str | None = Query(None),
    board: str | None = Query(None),
    city: str | None = Query(None),
    area: str | None = Query(None),
):
    return await ChatbotService(db).search_schools(
        session_id, parent_id_from(current),
        grade=grade, board=board, city=city, area=area,
    )
