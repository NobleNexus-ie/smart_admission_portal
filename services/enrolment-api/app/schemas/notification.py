from uuid import UUID

from app.schemas.common import APIModel


class NotificationPreferenceOut(APIModel):
    id: UUID
    frequency: str
    reminders_enabled: bool
    status_updates_enabled: bool


class NotificationPreferenceUpdate(APIModel):
    model_config = APIModel.model_config.copy()
    model_config["extra"] = "forbid"

    frequency: str | None = None
    reminders_enabled: bool | None = None
    status_updates_enabled: bool | None = None
