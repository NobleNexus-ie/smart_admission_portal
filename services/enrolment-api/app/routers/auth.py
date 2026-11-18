from fastapi import APIRouter

from app.deps import DbSession
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    ParentLoginResponse,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    VerifyEmailRequest,
)
from app.schemas.common import MessageResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=MessageResponse)
async def register(body: RegisterRequest, db: DbSession):
    parent = await AuthService(db).register(body.email, body.password)
    return MessageResponse(
        message="Registration successful. Please check your email to verify your account.",
        data={"parent_id": str(parent.id), "email": parent.email},
    )


@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(body: VerifyEmailRequest, db: DbSession):
    parent = await AuthService(db).verify_email(body.token)
    return MessageResponse(
        message="Email verified successfully",
        data={"parent_id": str(parent.id), "email": parent.email},
    )


@router.post("/login", response_model=ParentLoginResponse)
async def login(body: LoginRequest, db: DbSession):
    result = await AuthService(db).login_parent(body.email, body.password)
    return ParentLoginResponse(**result)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: DbSession):
    tokens = await AuthService(db).refresh(body.refresh_token)
    return TokenResponse(**tokens)


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(body: ForgotPasswordRequest, db: DbSession):
    await AuthService(db).forgot_password(body.email)
    return MessageResponse(
        message="If an account exists with that email, a password reset link has been sent.",
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(body: ResetPasswordRequest, db: DbSession):
    parent = await AuthService(db).reset_password(body.token, body.new_password)
    return MessageResponse(
        message="Password reset successfully. You can now sign in with your new password.",
        data={"parent_id": str(parent.id)},
    )
