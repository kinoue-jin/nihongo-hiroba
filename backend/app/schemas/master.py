"""MasterItem schemas"""
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


ALLOWED_GROUP_KEYS = {
    "news_category", "event_type", "cancel_case",
    "member_role", "media_role", "class_type"
}


class MasterItemBase(BaseModel):
    group_key: str = Field(..., description="Category group key")
    label: str
    value: str
    order: int
    is_active: bool = True
    
    def __init__(self, **data):
        if "group_key" in data and data["group_key"] not in ALLOWED_GROUP_KEYS:
            raise ValueError(f"group_key must be one of {ALLOWED_GROUP_KEYS}")
        super().__init__(**data)


class MasterItem(MasterItemBase):
    id: Optional[UUID] = None


class MasterItemResponse(MasterItemBase):
    id: UUID
