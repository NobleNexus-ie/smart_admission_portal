from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.deps import DbSession, get_current_parent, parent_id_from
from app.schemas.parent import ChildCreate, ChildResponse, ChildUpdate
from app.services.child_service import ChildService

router = APIRouter(prefix="/parents/children", tags=["children"])


@router.get("", response_model=list[ChildResponse])
async def list_children(
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    return await ChildService(db).list_children(parent_id_from(current))


@router.post("", response_model=ChildResponse, status_code=201)
async def create_child(
    body: ChildCreate,
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    return await ChildService(db).create_child(parent_id_from(current), body)


@router.get("/{child_id}", response_model=ChildResponse)
async def get_child(
    child_id: UUID,
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    return await ChildService(db).get_child(parent_id_from(current), child_id)


@router.put("/{child_id}", response_model=ChildResponse)
async def update_child(
    child_id: UUID,
    body: ChildUpdate,
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    return await ChildService(db).update_child(parent_id_from(current), child_id, body)


@router.delete("/{child_id}", status_code=204)
async def delete_child(
    child_id: UUID,
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    await ChildService(db).delete_child(parent_id_from(current), child_id)
