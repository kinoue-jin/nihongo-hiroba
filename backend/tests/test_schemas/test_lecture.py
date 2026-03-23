"""Tests for lecture.py - CulturalLecture schemas"""
import pytest
from uuid import uuid4


class TestCulturalLectureSchema:
    """CulturalLecture schemas"""
    
    def test_cultural_lecture_with_all_fields(self):
        from app.schemas.lecture import CulturalLecture, CulturalLectureCreate
        lecture_id = str(uuid4())
        event_id = str(uuid4())
        
        lecture = CulturalLecture(
            id=lecture_id,
            title="ブラジルの文化",
            event_id=event_id,
            countries=["Brazil", "Portugal"]
        )
        assert lecture.title == "ブラジルの文化"
        assert lecture.countries == ["Brazil", "Portugal"]
    
    def test_cultural_lecture_create(self):
        from app.schemas.lecture import CulturalLectureCreate
        event_id = str(uuid4())
        
        lecture = CulturalLectureCreate(
            title="ベトナム料理",
            event_id=event_id,
            countries=["Vietnam", "Thailand"]
        )
        assert lecture.title == "ベトナム料理"
