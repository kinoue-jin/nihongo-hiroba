"""News schemas"""
from typing import Optional
from uuid import UUID
from pydantic import BaseModel
from app.schemas.base import DateTimeString


class NewsBase(BaseModel):
    title: str
    body: str
    category_id: UUID
    published_at: DateTimeString
    author: UUID
    is_published: bool = False


class News(NewsBase):
    id: Optional[UUID] = None


class NewsCreate(NewsBase):
    pass


class NewsUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    category_id: Optional[UUID] = None
    published_at: Optional[DateTimeString] = None
    author: Optional[UUID] = None
    is_published: Optional[bool] = None
