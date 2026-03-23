"""Tests for story.py - HometownStory schemas"""
import pytest
from uuid import uuid4


class TestHometownStorySchema:
    """HometownStory schemas"""
    
    def test_hometown_story_with_all_fields(self):
        from app.schemas.story import HometownStory, HometownStoryCreate
        story_id = str(uuid4())
        event_id = str(uuid4())
        
        story = HometownStory(
            id=story_id,
            speaker_name="田中太郎",
            origin_city="São Paulo",
            origin_country="Brazil",
            arrived_japan="2020-04-01",
            joined_at="2020-05-01",
            content="私の故郷について話します",
            topics=["食文化", "観光"],
            event_id=event_id
        )
        assert story.speaker_name == "田中太郎"
        assert story.topics == ["食文化", "観光"]
    
    def test_hometown_story_create(self):
        from app.schemas.story import HometownStoryCreate
        event_id = str(uuid4())
        
        story = HometownStoryCreate(
            speaker_name="鈴木花子",
            origin_city="Hanoi",
            origin_country="Vietnam",
            arrived_japan="2019-09-01",
            joined_at="2019-10-01",
            content="私の故郷について",
            topics=["四季", "伝統"],
            event_id=event_id
        )
        assert story.speaker_name == "鈴木花子"
