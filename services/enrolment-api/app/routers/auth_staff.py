from fastapi import APIRouter

from app.deps import DbSession
from app.schemas.auth import StaffLoginRequest, StaffLoginResponse, StaffSetupRequest, TokenResponse
from app.schemas.common import MessageResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth/staff", tags=["auth-staff"])


@router.post("/login", response_model=StaffLoginResponse)
async def staff_login(body: StaffLoginRequest, db: DbSession):
    result = await AuthService(db).login_staff(body.email, body.password)
    return StaffLoginResponse(**result)


@router.post("/setup", response_model=MessageResponse)
async def staff_setup(body: StaffSetupRequest, db: DbSession):
    staff = await AuthService(db).setup_staff(body.token, body.password)
    return MessageResponse(
        message="Staff account activated. You can now log in.",
        data={"staff_id": str(staff.id), "email": staff.email},
    )
