"""Tests for storage service"""
import pytest
from unittest.mock import patch, MagicMock


@pytest.fixture
def mock_supabase():
    """Mock Supabase client"""
    return MagicMock()


@pytest.fixture
def storage_service(mock_supabase):
    """Create StorageService with mocked client"""
    from app.services.storage import StorageService
    service = StorageService(mock_supabase)
    return service


class TestSanitizeFilename:
    """Tests for filename sanitization (tested via media router)"""

    def test_sanitize_allows_valid_extensions(self):
        """Test that valid extensions are allowed"""
        from app.routers.media import sanitize_filename

        result = sanitize_filename("test.jpg")
        assert result.endswith(".jpg")
        assert len(result) > 4  # Has UUID prefix

        result = sanitize_filename("test.jpeg")
        assert result.endswith(".jpeg")

        result = sanitize_filename("test.png")
        assert result.endswith(".png")

        result = sanitize_filename("test.webp")
        assert result.endswith(".webp")

        result = sanitize_filename("test.pdf")
        assert result.endswith(".pdf")

    def test_sanitize_rejects_invalid_extensions(self):
        """Test that invalid extensions are rejected"""
        from fastapi import HTTPException
        from app.routers.media import sanitize_filename

        with pytest.raises(HTTPException) as exc_info:
            sanitize_filename("malicious.exe")

        assert "not allowed" in str(exc_info.value.detail)

        with pytest.raises(HTTPException):
            sanitize_filename("script.js")

        with pytest.raises(HTTPException):
            sanitize_filename("file.gif")


class TestValidateMimeType:
    """Tests for MIME type validation"""

    def test_validate_allows_valid_mime_types(self):
        """Test that valid MIME types are allowed"""
        from app.routers.media import validate_mime_type

        # JPEG content
        result = validate_mime_type(b"\xff\xd8\xff\xe0")  # JPEG magic bytes
        assert result == "image/jpeg"

    def test_validate_rejects_invalid_mime_types(self):
        """Test that invalid MIME types are rejected"""
        from fastapi import HTTPException
        from app.routers.media import validate_mime_type

        with pytest.raises(HTTPException) as exc_info:
            validate_mime_type(b"#!/bin/bash\necho 'malicious'")

        assert "not allowed" in str(exc_info.value.detail)


class TestUploadFile:
    """Tests for file upload"""

    def test_upload_public_file(self, storage_service, mock_supabase):
        """Test uploading a public file"""
        content = b"test image content"
        filename = "test.jpg"
        mime_type = "image/jpeg"
        is_public = True

        # Mock bucket list
        mock_bucket = MagicMock()
        mock_bucket.name = "media-public"
        mock_supabase.storage.list_buckets.return_value = [mock_bucket]
        mock_supabase.storage.from_.return_value.upload.return_value = True
        mock_supabase.storage.from_.return_value.get_public_url.return_value = "https://example.com/test.jpg"

        result = storage_service.upload_file(content, filename, mime_type, is_public)

        assert "test.jpg" in result

    def test_upload_private_file(self, storage_service, mock_supabase):
        """Test uploading a private file"""
        content = b"private content"
        filename = "secret.pdf"
        mime_type = "application/pdf"
        is_public = False

        mock_bucket = MagicMock()
        mock_bucket.name = "media-private"
        mock_supabase.storage.list_buckets.return_value = [mock_bucket]
        mock_supabase.storage.from_.return_value.upload.return_value = True

        result = storage_service.upload_file(content, filename, mime_type, is_public)

        assert "media-private" in result or "secret.pdf" in result


class TestGenerateSignedUrl:
    """Tests for signed URL generation"""

    def test_generate_signed_url(self, storage_service, mock_supabase):
        """Test generating a signed URL for private file"""
        storage_path = "media-private/test.jpg"
        expires_in = 3600

        mock_supabase.storage.from_.return_value.create_signed_url.return_value = "https://signed-url.com/..."

        result = storage_service.generate_signed_url(storage_path, expires_in)

        mock_supabase.storage.from_.return_value.create_signed_url.assert_called_once_with("test.jpg", expires_in)
        assert "signed-url" in result or result.startswith("https://")


class TestDeleteFile:
    """Tests for file deletion"""

    def test_delete_file(self, storage_service, mock_supabase):
        """Test deleting a file"""
        url = "https://example.com/media-public/test.jpg"

        mock_bucket = MagicMock()
        mock_bucket.name = "media-public"
        mock_supabase.storage.list_buckets.return_value = [mock_bucket]
        mock_supabase.storage.from_.return_value.remove.return_value = True

        # Should not raise
        storage_service.delete_file(url)

        mock_supabase.storage.from_.return_value.remove.assert_called_once()


class TestMoveBetweenBuckets:
    """Tests for moving files between buckets"""

    def test_move_to_public(self, storage_service, mock_supabase):
        """Test moving file from private to public bucket"""
        old_path = "media-private/test.jpg"
        content = b"test content"

        mock_supabase.storage.from_("media-private").download.return_value = content
        mock_supabase.storage.from_("media-public").upload.return_value = True
        mock_supabase.storage.from_("media-private").remove.return_value = True
        mock_supabase.storage.from_("media-public").get_public_url.return_value = "https://public-url.com/test.jpg"

        result = storage_service.move_between_buckets(old_path, new_is_public=True)

        assert "public-url" in result or "test.jpg" in result
