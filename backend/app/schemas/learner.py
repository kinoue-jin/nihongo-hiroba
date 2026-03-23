"""Learner schemas"""
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field
from app.schemas.base import DateString


INVITATION_STATUSES = ["pending", "invited", "active", "expired"]


class LearnerBase(BaseModel):
    nickname: str
    origin_country: str
    arrived_japan: DateString
    joined_at: DateString
    japanese_level: Optional[str] = None
    self_intro: Optional[str] = None
    is_public: bool = False
    profile_media_id: Optional[UUID] = None


class Learner(LearnerBase):
    id: Optional[UUID] = None
    supabase_user_id: Optional[UUID] = None
    email: str
    invitation_status: str = "pending"
    
    def __init__(self, **data):
        if "invitation_status" in data:
            if data["invitation_status"] not in INVITATION_STATUSES:
                raise ValueError(f"invitation_status must be one of {INVITATION_STATUSES}")
        super().__init__(**data)


class LearnerCreate(LearnerBase):
    email: str
    supabase_user_id: Optional[UUID] = None
    invitation_status: str = "pending"


class LearnerUpdate(BaseModel):
    """Allowed fields for staff updating a learner"""
    nickname: Optional[str] = None
    origin_country: Optional[str] = None
    arrived_japan: Optional[DateString] = None
    joined_at: Optional[DateString] = None
    japanese_level: Optional[str] = None
    self_intro: Optional[str] = None
    is_public: Optional[bool] = None
    profile_media_id: Optional[UUID] = None


class LearnerAdminUpdate(BaseModel):
    """Fields that only admins can update"""
    invitation_status: Optional[str] = None
    supabase_user_id: Optional[UUID] = None


class PublicLearnerResponse(BaseModel):
    """Public learner info - excludes email and supabase_user_id"""
    id: UUID
    nickname: str
    origin_country: str
    arrived_japan: DateString
    japanese_level: Optional[str] = None
    self_intro: Optional[str] = None
    profile_media_id: Optional[UUID] = None
