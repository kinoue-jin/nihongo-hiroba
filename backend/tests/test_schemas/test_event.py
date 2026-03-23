"""Tests for event.py - Event schemas"""
import pytest
from uuid import uuid4


class TestEventSchema:
    """Event schemas"""
    
    def test_event_with_all_fields(self):
        from app.schemas.event import Event, EventCreate, EventUpdate
        event_id = str(uuid4())
        event_type_id = str(uuid4())
        host_member_id = str(uuid4())
        
        event = Event(
            id=event_id,
            title="故郷を語ろう",
            event_type_id=event_type_id,
            date="2026-04-15",
            start_time="14:00",
            end_time="16:00",
            venue="公民館",
            max_capacity=30,
            actual_attendees=25,
            host_member_id=host_member_id,
            report_id=None
        )
        assert event.title == "故郷を語ろう"
        assert event.actual_attendees == 25
    
    def test_event_create(self):
        from app.schemas.event import EventCreate
        event_type_id = str(uuid4())
        host_member_id = str(uuid4())
        
        event = EventCreate(
            title="文化講座",
            event_type_id=event_type_id,
            date="2026-05-01",
            start_time="10:00",
            end_time="12:00",
            venue="図書館",
            max_capacity=20,
            host_member_id=host_member_id
        )
        assert event.title == "文化講座"
        assert event.max_capacity == 20
    
    def test_event_update(self):
        from app.schemas.event import EventUpdate
        update = EventUpdate(title="更新タイトル", actual_attendees=30)
        assert update.title == "更新タイトル"
        assert update.actual_attendees == 30
