"""Stat schemas"""
from typing import Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel
from app.schemas.base import DateString


GRANULARITIES = ["monthly", "yearly"]


class StatBase(BaseModel):
    period_start: DateString
    period_end: DateString
    granularity: str
    class_type_id: UUID
    total_sessions: int
    total_attendees: int
    breakdown: Dict[str, Any]
    is_manual_override: bool = False
    manual_note: Optional[str] = None
    
    def __init__(self, **data):
        if "granularity" in data and data["granularity"] not in GRANULARITIES:
            raise ValueError(f"granularity must be one of {GRANULARITIES}")
        super().__init__(**data)


class Stat(StatBase):
    id: Optional[UUID] = None


class StatCreate(StatBase):
    pass


class StatUpdate(BaseModel):
    """Allowed fields for updating stats - excludes id and computed fields"""
    period_start: Optional[DateString] = None
    period_end: Optional[DateString] = None
    granularity: Optional[str] = None
    class_type_id: Optional[UUID] = None
    total_sessions: Optional[int] = None
    total_attendees: Optional[int] = None
    breakdown: Optional[Dict[str, Any]] = None
    is_manual_override: Optional[bool] = None
    manual_note: Optional[str] = None

    def __init__(self, **data):
        if "granularity" in data and data["granularity"] is not None and data["granularity"] not in GRANULARITIES:
            raise ValueError(f"granularity must be one of {GRANULARITIES}")
        super().__init__(**data)
