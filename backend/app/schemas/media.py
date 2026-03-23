"""Media schemas with XOR validation for uploaders"""
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, model_validator
from app.schemas.base import DateString, DateTimeString


ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"]


class MediaBase(BaseModel):
    filename: str
    url: str
    thumbnail_url: Optional[str] = None
    mime_type: str
    size: int
    caption: Optional[str] = None
    credit: Optional[str] = None
    taken_at: Optional[DateString] = None
    uploaded_at: DateTimeString
    uploaded_by_member_id: Optional[UUID] = None
    uploaded_by_learner_id: Optional[UUID] = None
    is_public: bool = False


class Media(MediaBase):
    id: Optional[UUID] = None
    
    @model_validator(mode="after")
    def validate_uploader_xor(self):
        """Either member OR learner must upload, not both, not neither"""
        has_member = self.uploaded_by_member_id is not None
        has_learner = self.uploaded_by_learner_id is not None
        
        if has_member and has_learner:
            raise ValueError("Cannot have both uploaded_by_member_id and uploaded_by_learner_id")
        if not has_member and not has_learner:
            raise ValueError("Either uploaded_by_member_id or uploaded_by_learner_id is required")
        
        return self
    
    @model_validator(mode="after")
    def validate_mime_type(self):
        if self.mime_type not in ALLOWED_MIME_TYPES:
            raise ValueError(f"mime_type must be one of {ALLOWED_MIME_TYPES}")
        return self


class MediaCreate(MediaBase):
    pass
