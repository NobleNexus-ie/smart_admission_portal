from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.deps import DbSession, get_current_parent, parent_id_from
from app.services.onboarding_service import OnboardingService

router = APIRouter(prefix="/parents/onboarding", tags=["onboarding"])


class StepAdvanceRequest(BaseModel):
    step_key: str
    data: dict = {}


@router.get("/state")
async def get_onboarding_state(
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    return await OnboardingService(db).get_state(parent_id_from(current))


@router.post("/step")
async def advance_onboarding_step(
    body: StepAdvanceRequest,
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    return await OnboardingService(db).advance_step(
        parent_id_from(current), body.step_key, body.data
    )
