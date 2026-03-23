"""Tests for media.py - Media schemas with XOR validation"""
import pytest
from uuid import uuid4
from pydantic import ValidationError


class TestMediaSchema:
    """Media schemas with uploaded_by_member_id XOR uploaded_by_learner_id constraint"""

    def test_media_with_member_uploader(self):
        from app.schemas.media import Media
        media_id = uuid4()
        member_id = uuid4()

        media = Media(
            id=media_id,
            filename="test.jpg",
            url="https://storage.example.com/test.jpg",
            thumbnail_url="https://storage.example.com/test_thumb.jpg",
            mime_type="image/jpeg",
            size=1024,
            caption="テスト画像",
            credit="田中太郎",
            taken_at="2026-03-01",
            uploaded_at="2026-03-23T10:00:00",
            uploaded_by_member_id=member_id,
            uploaded_by_learner_id=None,
            is_public=True
        )
        assert media.uploaded_by_member_id == member_id
        assert media.uploaded_by_learner_id is None

    def test_media_with_learner_uploader(self):
        from app.schemas.media import Media
        media_id = uuid4()
        learner_id = uuid4()

        media = Media(
            id=media_id,
            filename="test.png",
            url="https://storage.example.com/test.png",
            mime_type="image/png",
            size=2048,
            uploaded_at="2026-03-23T10:00:00",
            uploaded_by_member_id=None,
            uploaded_by_learner_id=learner_id,
            is_public=False
        )
        assert media.uploaded_by_member_id is None
        assert media.uploaded_by_learner_id == learner_id

    def test_media_both_uploader_ids_raises_error(self):
        from app.schemas.media import Media
        member_id = uuid4()
        learner_id = uuid4()

        with pytest.raises(ValidationError):
            Media(
                filename="test.jpg",
                url="https://storage.example.com/test.jpg",
                mime_type="image/jpeg",
                size=1024,
                uploaded_at="2026-03-23T10:00:00",
                uploaded_by_member_id=member_id,
                uploaded_by_learner_id=learner_id,  # Both set - should fail
                is_public=True
            )

    def test_media_neither_uploader_id_raises_error(self):
        from app.schemas.media import Media

        with pytest.raises(ValidationError):
            Media(
                filename="test.jpg",
                url="https://storage.example.com/test.jpg",
                mime_type="image/jpeg",
                size=1024,
                uploaded_at="2026-03-23T10:00:00",
                uploaded_by_member_id=None,
                uploaded_by_learner_id=None,  # Neither set - should fail
                is_public=True
            )

    def test_media_create(self):
        from app.schemas.media import MediaCreate
        member_id = uuid4()

        media = MediaCreate(
            filename="new_image.jpg",
            url="https://storage.example.com/new_image.jpg",
            mime_type="image/jpeg",
            size=512,
            uploaded_at="2026-03-23T10:00:00",
            uploaded_by_member_id=member_id,
            is_public=True
        )
        assert media.filename == "new_image.jpg"

    def test_mime_type_validation(self):
        from app.schemas.media import Media

        valid_types = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
        for mime in valid_types:
            media = Media(
                filename="test.jpg",
                url="https://storage.example.com/test.jpg",
                mime_type=mime,
                size=1024,
                uploaded_at="2026-03-23T10:00:00",
                uploaded_by_member_id=uuid4(),
                is_public=True
            )
            assert media.mime_type == mime

        # Invalid mime type - should raise ValidationError
        with pytest.raises(ValidationError):
            Media(
                filename="test.exe",
                url="https://storage.example.com/test.exe",
                mime_type="application/executable",
                size=1024,
                uploaded_at="2026-03-23T10:00:00",
                uploaded_by_member_id=uuid4(),
                is_public=True
            )
