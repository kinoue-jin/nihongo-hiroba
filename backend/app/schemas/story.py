"""HometownStory schemas"""
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel
from app.schemas.base import DateString


class HometownStoryBase(BaseModel):
    speaker_name: str
    origin_city: str
    origin_country: str
    arrived_japan: DateString
    joined_at: DateString
    content: str
    topics: List[str]
    event_id: UUID


class HometownStory(HometownStoryBase):
    id: Optional[UUID] = None


class HometownStoryCreate(HometownStoryBase):
    pass
