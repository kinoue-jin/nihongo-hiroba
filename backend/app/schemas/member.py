"""Member schemas"""
from typing import Optional
from uuid import UUID
from pydantic import BaseModel
from app.schemas.base import DateString


class MemberBase(BaseModel):
    name: str
    role_id: UUID
    contact: Optional[str] = None
    joined_at: Optional[DateString] = None
    is_active: bool = True
    profile_media_id: Optional[UUID] = None


class Member(MemberBase):
    id: Optional[UUID] = None
    supabase_user_id: UUID
    email: str
    admin_role: bool = False


class MemberCreate(MemberBase):
    supabase_user_id: UUID
    email: str
    admin_role: bool = False


class MemberUpdate(BaseModel):
    name: Optional[str] = None
    role_id: Optional[UUID] = None
    contact: Optional[str] = None
    joined_at: Optional[DateString] = None
    is_active: Optional[bool] = None
    profile_media_id: Optional[UUID] = None
    admin_role: Optional[bool] = None


class PublicMemberResponse(BaseModel):
    """Public member info - excludes email and supabase_user_id"""
    id: UUID
    name: str
    role_id: UUID
    is_active: bool
    profile_media_id: Optional[UUID] = None
