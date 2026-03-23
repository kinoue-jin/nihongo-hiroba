"""Storage service for managing media files in Supabase Storage"""
import os
import logging
from typing import Optional
from supabase import Client

logger = logging.getLogger(__name__)


class StorageService:
    """
    Service for managing media storage in Supabase.

    Handles:
    - Public bucket: Persistent URLs for public media
    - Private bucket: Signed URLs for private media
    - Moving media between buckets when is_public status changes
    """

    PUBLIC_BUCKET = "media-public"
    PRIVATE_BUCKET = "media-private"

    def __init__(self, supabase_client: Optional[Client] = None):
        self.supabase = supabase_client
        self._ensure_buckets_exist()

    def _ensure_buckets_exist(self) -> None:
        """Ensure both public and private buckets exist in Supabase Storage."""
        if not self.supabase:
            return

        try:
            buckets = self.supabase.storage.list_buckets()
            bucket_names = [b.name for b in buckets]

            if self.PUBLIC_BUCKET not in bucket_names:
                self.supabase.storage.create_bucket(self.PUBLIC_BUCKET, {"public": True})

            if self.PRIVATE_BUCKET not in bucket_names:
                self.supabase.storage.create_bucket(self.PRIVATE_BUCKET, {"public": False})

        except Exception as e:
            logger.warning(f"Failed to ensure buckets exist: {e}")

    def upload_file(
        self,
        content: bytes,
        filename: str,
        mime_type: str,
        is_public: bool,
    ) -> str:
        """
        Upload a file to the appropriate bucket.

        Args:
            content: File content as bytes
            filename: Sanitized filename
            mime_type: MIME type of the file
            is_public: Whether the file should be publicly accessible

        Returns:
            The URL of the uploaded file
        """
        if not self.supabase:
            # Return a mock URL for testing/development without Supabase
            return f"https://mock-storage.example.com/{filename}"

        bucket = self.PUBLIC_BUCKET if is_public else self.PRIVATE_BUCKET

        try:
            response = self.supabase.storage.from_(bucket).upload(filename, content, {"content-type": mime_type})

            if is_public:
                # For public files, return the persistent URL
                return self._get_public_url(filename, bucket)
            else:
                # For private files, return the storage path (signed URL will be generated on access)
                return f"{bucket}/{filename}"

        except Exception as e:
            logger.error(f"Failed to upload file {filename}: {e}")
            raise ValueError(f"Failed to upload file: {e}")

    def delete_file(self, url: str) -> None:
        """
        Delete a file from storage.

        Args:
            url: The URL or path of the file to delete
        """
        if not self.supabase:
            return

        # Extract filename from URL
        filename = self._extract_filename(url)
        if not filename:
            logger.warning(f"Could not extract filename from URL: {url}")
            return

        # Determine bucket from URL or path
        if self.PUBLIC_BUCKET in url:
            bucket = self.PUBLIC_BUCKET
        elif self.PRIVATE_BUCKET in url:
            bucket = self.PRIVATE_BUCKET
        else:
            logger.warning(f"Could not determine bucket for URL: {url}")
            return

        try:
            self.supabase.storage.from_(bucket).remove(filename)
            logger.info(f"Deleted file {filename} from bucket {bucket}")
        except Exception as e:
            logger.error(f"Failed to delete file {filename}: {e}")

    def generate_signed_url(self, storage_path: str, expires_in: int = 3600) -> str:
        """
        Generate a signed URL for a private file.

        Args:
            storage_path: The path/key of the file in private storage (e.g., "media-private/filename.jpg")
            expires_in: Number of seconds until the signed URL expires

        Returns:
            A signed URL that provides temporary access to the file
        """
        if not self.supabase:
            return f"https://mock-storage.example.com/{storage_path}?signed=true&expires={expires_in}"

        # Extract just the filename from the path
        filename = storage_path.split("/")[-1] if "/" in storage_path else storage_path

        try:
            signed_url = self.supabase.storage.from_(self.PRIVATE_BUCKET).create_signed_url(filename, expires_in)
            return signed_url
        except Exception as e:
            logger.error(f"Failed to generate signed URL for {filename}: {e}")
            raise ValueError(f"Failed to generate signed URL: {e}")

    def move_between_buckets(self, url: str, new_is_public: bool) -> str:
        """
        Move a file between public and private buckets when is_public status changes.

        Args:
            url: Current URL of the file
            new_is_public: New public/private status

        Returns:
            The new URL of the file
        """
        if not self.supabase:
            return url

        filename = self._extract_filename(url)
        if not filename:
            raise ValueError(f"Could not extract filename from URL: {url}")

        old_bucket = self.PUBLIC_BUCKET if not new_is_public else self.PRIVATE_BUCKET
        new_bucket = self.PRIVATE_BUCKET if not new_is_public else self.PUBLIC_BUCKET

        try:
            # Download from old bucket
            response = self.supabase.storage.from_(old_bucket).download(filename)

            # Upload to new bucket
            self.supabase.storage.from_(new_bucket).upload(filename, response)

            # Delete from old bucket
            self.supabase.storage.from_(old_bucket).remove(filename)

            # Return new URL
            if new_is_public:
                return self._get_public_url(filename, new_bucket)
            else:
                return f"{new_bucket}/{filename}"

        except Exception as e:
            logger.error(f"Failed to move file {filename} between buckets: {e}")
            raise ValueError(f"Failed to move file between buckets: {e}")

    def _get_public_url(self, filename: str, bucket: str) -> str:
        """Get the public URL for a file in the public bucket."""
        if not self.supabase:
            return f"https://mock-storage.example.com/{bucket}/{filename}"

        try:
            # Get the public URL from Supabase
            url = self.supabase.storage.from_(bucket).get_public_url(filename)
            return url
        except Exception:
            # Fallback to constructing URL
            return f"https://{self.supabase._url}/storage/v1/object/public/{bucket}/{filename}"

    def _extract_filename(self, url: str) -> Optional[str]:
        """Extract filename from a URL or storage path."""
        if not url:
            return None

        # Handle full URLs
        if "://" in url:
            # Extract path component
            path = url.split("://", 1)[1]
            if "/" in path:
                filename = path.split("/")[-1]
                return filename if filename else None

        # Handle storage paths (e.g., "media-private/filename.jpg")
        if "/" in url:
            return url.split("/")[-1]

        return url if url else None
