from __future__ import annotations

import logging
import os
import shutil
from datetime import timedelta
from functools import lru_cache
from pathlib import Path

from app.config import get_settings

logger = logging.getLogger(__name__)


class LocalStorageClient:
    """Filesystem-based storage for development when S3/MinIO is unavailable."""

    def __init__(self) -> None:
        self.root = Path("/app/uploads") if os.path.isdir("/app") else Path("uploads")
        self.root.mkdir(parents=True, exist_ok=True)
        logger.info("Using local filesystem storage at %s", self.root)

    def ensure_bucket(self) -> None:
        self.root.mkdir(parents=True, exist_ok=True)

    def upload_bytes(self, key: str, data: bytes, content_type: str) -> str:
        path = self.root / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return key

    def generate_presigned_url(self, key: str, expires: timedelta | int = 3600) -> str:
        return f"/api/v1/files/{key}"

    def delete_object(self, key: str) -> None:
        path = self.root / key
        if path.exists():
            path.unlink()


class S3StorageClient:
    """S3-compatible storage client (MinIO, Cloudflare R2, AWS S3)."""

    def __init__(self) -> None:
        import boto3
        from botocore.client import Config

        settings = get_settings()
        self.bucket = settings.S3_BUCKET
        self._client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
            config=Config(signature_version="s3v4"),
        )

    def ensure_bucket(self) -> None:
        from botocore.exceptions import ClientError

        try:
            self._client.head_bucket(Bucket=self.bucket)
            logger.info("S3 bucket %s exists", self.bucket)
        except ClientError:
            try:
                self._client.create_bucket(Bucket=self.bucket)
                logger.info("Created S3 bucket %s", self.bucket)
            except ClientError as exc:
                logger.warning("Could not create bucket %s: %s", self.bucket, exc)

    def upload_bytes(self, key: str, data: bytes, content_type: str) -> str:
        self._client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )
        return key

    def generate_presigned_url(self, key: str, expires: timedelta | int = 3600) -> str:
        if isinstance(expires, timedelta):
            expires_in = int(expires.total_seconds())
        else:
            expires_in = int(expires)
        return self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires_in,
        )

    def delete_object(self, key: str) -> None:
        from botocore.exceptions import ClientError

        try:
            self._client.delete_object(Bucket=self.bucket, Key=key)
        except ClientError as exc:
            logger.warning("Failed to delete %s: %s", key, exc)


@lru_cache
def get_storage_client() -> S3StorageClient | LocalStorageClient:
    settings = get_settings()
    try:
        client = S3StorageClient()
        client.ensure_bucket()
        return client
    except Exception as exc:
        logger.warning("S3 storage unavailable (%s), falling back to local filesystem", exc)
        return LocalStorageClient()
