"""CulturalLecture schemas"""
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel


class CulturalLectureBase(BaseModel):
    title: str
    event_id: UUID
    countries: List[str]


class CulturalLecture(CulturalLectureBase):
    id: Optional[UUID] = None


class CulturalLectureCreate(CulturalLectureBase):
    pass
