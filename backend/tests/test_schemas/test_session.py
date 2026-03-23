"""Tests for session.py - ScheduleSession and LearningRecord schemas"""
import pytest
from uuid import uuid4


SESSION_STATUS_TRANSITIONS = {
    "open": ["pairing", "cancelled"],
    "pairing": ["confirmed", "cancelled"],
    "confirmed": ["completed", "open"],
    "completed": [],
    "cancelled": [],
}


class TestScheduleSession:
    """ScheduleSession schemas with status transitions"""
    
    def test_session_with_all_fields(self):
        from app.schemas.session import ScheduleSession, SessionCreate, SessionUpdate
        session_id = str(uuid4())
        class_type_id = str(uuid4())
        
        session = ScheduleSession(
            id=session_id,
            class_type_id=class_type_id,
            date="2026-04-15",
            start_time="14:00",
            end_time="16:00",
            venue="公民館",
            is_cancelled=False,
            cancel_case_id=None,
            cancel_reason=None,
            note=None,
            session_status="open"
        )
        assert session.session_status == "open"
        assert session.is_cancelled is False
    
    def test_session_create(self):
        from app.schemas.session import SessionCreate
        class_type_id = str(uuid4())
        
        session = SessionCreate(
            class_type_id=class_type_id,
            date="2026-04-15",
            start_time="14:00",
            end_time="16:00",
            venue="公民館"
        )
        assert session.session_status == "open"
    
    def test_valid_status_transitions(self):
        from app.schemas.session import ScheduleSession
        class_type_id = str(uuid4())
        
        # Test all valid transitions
        for current_status, valid_next in SESSION_STATUS_TRANSITIONS.items():
            for next_status in valid_next:
                session = ScheduleSession(
                    class_type_id=class_type_id,
                    date="2026-04-15",
                    start_time="14:00",
                    end_time="16:00",
                    venue="公民館",
                    session_status=next_status
                )
                assert session.session_status == next_status


class TestLearningRecord:
    """LearningRecord with attended=False validation"""
    
    def test_learning_record_attended_true(self):
        from app.schemas.session import LearningRecord, LearningRecordCreate
        session_id = str(uuid4())
        member_id = str(uuid4())
        learner_id = str(uuid4())
        
        record = LearningRecord(
            session_id=session_id,
            member_id=member_id,
            learner_id=learner_id,
            study_content="日本語勉強",
            learner_level="N3",
            attended=True,
            absence_reason=None,
            note=None
        )
        assert record.attended is True
        assert record.study_content == "日本語勉強"
    
    def test_learning_record_attended_false_requires_absence_reason(self):
        from app.schemas.session import LearningRecord
        from pydantic import ValidationError
        session_id = str(uuid4())
        member_id = str(uuid4())
        learner_id = str(uuid4())
        
        # attended=False should require absence_reason
        # and study_content/learner_level should be None
        with pytest.raises(ValidationError):
            LearningRecord(
                session_id=session_id,
                member_id=member_id,
                learner_id=learner_id,
                attended=False,
                absence_reason=None  # Required when attended=False
            )
    
    def test_learning_record_attended_false_with_absence_reason(self):
        from app.schemas.session import LearningRecord
        session_id = str(uuid4())
        member_id = str(uuid4())
        learner_id = str(uuid4())
        
        record = LearningRecord(
            session_id=session_id,
            member_id=member_id,
            learner_id=learner_id,
            attended=False,
            absence_reason="病気のため",
            study_content=None,
            learner_level=None
        )
        assert record.attended is False
        assert record.absence_reason == "病気のため"
    
    def test_learning_record_create(self):
        from app.schemas.session import LearningRecordCreate
        session_id = str(uuid4())
        member_id = str(uuid4())
        learner_id = str(uuid4())
        
        record = LearningRecordCreate(
            session_id=session_id,
            member_id=member_id,
            learner_id=learner_id,
            attended=True
        )
        assert record.attended is True
