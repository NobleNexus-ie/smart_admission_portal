from datetime import timedelta

from app.services.storage_client import get_storage_client


def generate_signed_url(storage_key: str, expires_seconds: int = 3600) -> str:
    client = get_storage_client()
    return client.generate_presigned_url(storage_key, expires=timedelta(seconds=expires_seconds))
