"""Event schemas"""
from typing import Optional
from uuid import UUID
from pydantic import BaseModel
from app.schemas.base import DateString, TimeString


class EventBase(BaseModel):
    title: str
    event_type_id: UUID
    date: DateString
    start_time: TimeString
    end_time: TimeString
    venue: str
    max_capacity: Optional[int] = None
    actual_attendees: Optional[int] = None
    host_member_id: UUID
    report_id: Optional[UUID] = None


class Event(EventBase):
    id: Optional[UUID] = None


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    title: Optional[str] = None
    event_type_id: Optional[UUID] = None
    date: Optional[DateString] = None
    start_time: Optional[TimeString] = None
    end_time: Optional[TimeString] = None
    venue: Optional[str] = None
    max_capacity: Optional[int] = None
    actual_attendees: Optional[int] = None
    host_member_id: Optional[UUID] = None
    report_id: Optional[UUID] = None
