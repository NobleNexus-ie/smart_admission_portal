from pydantic import EmailStr, Field, field_validator

from app.schemas.common import APIModel
from app.utils.tokens import validate_password_strength


class RegisterRequest(APIModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def check_password(cls, v: str) -> str:
        errors = validate_password_strength(v)
        if errors:
            raise ValueError("; ".join(errors))
        return v


class VerifyEmailRequest(APIModel):
    token: str


class LoginRequest(APIModel):
    email: EmailStr
    password: str


class RefreshRequest(APIModel):
    refresh_token: str


class ParentUserOut(APIModel):
    id: str
    email: str
    is_verified: bool
    role: str = "parent"


class StaffUserOut(APIModel):
    id: str
    email: str
    name: str
    school_id: str
    role: str


class TokenResponse(APIModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class ParentLoginResponse(TokenResponse):
    user: ParentUserOut


class StaffLoginResponse(TokenResponse):
    user: StaffUserOut


class StaffLoginRequest(APIModel):
    email: EmailStr
    password: str


class StaffSetupRequest(APIModel):
    token: str
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def check_password(cls, v: str) -> str:
        errors = validate_password_strength(v)
        if errors:
            raise ValueError("; ".join(errors))
        return v


class ForgotPasswordRequest(APIModel):
    email: EmailStr


class ResetPasswordRequest(APIModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def check_password(cls, v: str) -> str:
        errors = validate_password_strength(v)
        if errors:
            raise ValueError("; ".join(errors))
        return v
