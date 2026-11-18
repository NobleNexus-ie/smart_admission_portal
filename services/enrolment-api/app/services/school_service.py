from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.enums import ROLE_PERMISSIONS, SchoolStatus, StaffRole
from app.models.school import School
from app.models.school_staff import SchoolStaff
from app.schemas.school import SchoolOnboardRequest, SchoolUpdateRequest, StaffCreateRequest
from app.services.auth_service import AuthService
from app.services.notification_service import notify
from app.utils.errors import AppError
from app.utils.tokens import create_embed_token, verify_embed_token

settings = get_settings()


class SchoolService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def search(
        self,
        *,
        board: str | None = None,
        area: str | None = None,
        name: str | None = None,
        school_type: str | None = None,
        city: str | None = None,
        state: str | None = None,
        limit: int = 20,
        offset: int = 0,
        include_inactive: bool = True,
    ) -> tuple[list[School], int]:
        q = select(School)
        count_q = select(func.count()).select_from(School)

        filters = []
        if board:
            filters.append(School.board == board)
        if area:
            filters.append(School.area.ilike(f"%{area}%"))
        if name:
            filters.append(School.name.ilike(f"%{name}%"))
        if school_type:
            filters.append(School.school_type == school_type)
        if city:
            filters.append(School.city.ilike(f"%{city}%"))
        if state:
            filters.append(School.state.ilike(f"%{state}%"))
        if not include_inactive:
            filters.append(School.status == SchoolStatus.ACTIVE.value)
        else:
            filters.append(
                School.status.in_(
                    [SchoolStatus.ACTIVE.value, SchoolStatus.INACTIVE.value, SchoolStatus.PENDING.value]
                )
            )

        for f in filters:
            q = q.where(f)
            count_q = count_q.where(f)

        total = await self.db.scalar(count_q) or 0
        q = q.order_by(School.name).limit(limit).offset(offset)
        items = list((await self.db.scalars(q)).all())
        return items, total

    async def get(self, school_id: UUID) -> School:
        school = await self.db.get(School, school_id)
        if not school:
            raise AppError(404, "School not found")
        return school

    async def onboard(self, data: SchoolOnboardRequest) -> School:
        school = School(
            name=data.name,
            board=data.board.value,
            school_type=data.school_type,
            address=data.address,
            area=data.area,
            city=data.city,
            state=data.state,
            contact_email=data.contact_email.lower(),
            phone=data.phone,
            description=data.description,
            facilities=data.facilities or [],
            website_url=data.website_url,
            grades_offered=data.grades_offered or [],
            status=SchoolStatus.PENDING.value,
        )
        self.db.add(school)
        await self.db.flush()

        school.embed_link_token = create_embed_token(school.id)
        await self.db.flush()
        return school

    async def add_staff(self, school_id: UUID, data: StaffCreateRequest) -> SchoolStaff:
        school = await self.get(school_id)
        existing = await self.db.scalar(
            select(SchoolStaff).where(SchoolStaff.email == data.email.lower())
        )
        if existing:
            raise AppError(409, "A staff account with this email already exists")

        token, expires = AuthService.issue_setup_token()
        role = data.role.value if isinstance(data.role, StaffRole) else data.role
        staff = SchoolStaff(
            school_id=school.id,
            email=data.email.lower(),
            name=data.name,
            role=role,
            permissions=ROLE_PERMISSIONS.get(role, []),
            setup_token=token,
            setup_token_expires_at=expires,
        )
        self.db.add(staff)
        await self.db.flush()

        setup_url = f"{settings.FRONTEND_URL}/staff/setup?token={token}"
        await notify(
            self.db,
            template="staff_setup",
            recipient_email=staff.email,
            variables={"school_name": school.name, "setup_url": setup_url},
            metadata={"staff_id": str(staff.id), "school_id": str(school.id)},
        )
        return staff

    async def activate(self, school_id: UUID) -> School:
        school = await self.get(school_id)
        school.status = SchoolStatus.ACTIVE.value
        school.updated_at = datetime.now(timezone.utc)
        if not school.embed_link_token:
            school.embed_link_token = create_embed_token(school.id)
        await self.db.flush()
        return school

    async def update(self, school_id: UUID, data: SchoolUpdateRequest, staff_school_id: UUID) -> School:
        if school_id != staff_school_id:
            raise AppError(403, "You do not have access to update this school")
        school = await self.get(school_id)
        payload = data.model_dump(exclude_unset=True)
        if "board" in payload and payload["board"] is not None:
            payload["board"] = payload["board"].value if hasattr(payload["board"], "value") else payload["board"]
        if "contact_email" in payload and payload["contact_email"]:
            payload["contact_email"] = str(payload["contact_email"]).lower()
        for key, value in payload.items():
            setattr(school, key, value)
        school.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        return school

    async def get_embed_link(self, school_id: UUID) -> dict:
        school = await self.get(school_id)
        if not school.embed_link_token:
            school.embed_link_token = create_embed_token(school.id)
            await self.db.flush()
        url = f"{settings.FRONTEND_URL}/apply/{school.embed_link_token}"
        html = (
            f'<a href="{url}" target="_blank" rel="noopener" '
            f'style="background:#1a73e8;color:#fff;padding:10px 20px;'
            f'text-decoration:none;border-radius:4px;">Apply Now</a>'
        )
        return {"token": school.embed_link_token, "url": url, "html_snippet": html}

    async def resolve_embed(self, token: str) -> tuple[School, str]:
        # Accept either stored token or HMAC token
        school = await self.db.scalar(
            select(School).where(School.embed_link_token == token)
        )
        if not school:
            school_id = verify_embed_token(token)
            if not school_id:
                raise AppError(404, "Invalid embed link")
            school = await self.db.get(School, UUID(school_id))
        if not school:
            raise AppError(404, "Invalid embed link")
        return school, str(school.id)
