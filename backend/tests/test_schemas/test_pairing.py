"""Tests for pairing.py - SessionPairing schemas"""
import pytest
from uuid import uuid4
from decimal import Decimal


class TestSessionPairingSchema:
    """SessionPairing with auto_score required when pairing_type='auto'"""
    
    def test_pairing_auto_requires_score(self):
        from app.schemas.pairing import SessionPairing, SessionPairingCreate
        pairing_id = str(uuid4())
        session_id = str(uuid4())
        member_id = str(uuid4())
        learner_id = str(uuid4())
        
        # pairing_type='auto' requires auto_score
        pairing = SessionPairing(
            id=pairing_id,
            session_id=session_id,
            member_id=member_id,
            learner_id=learner_id,
            pairing_type="auto",
            auto_score=Decimal("8.5"),
            status="proposed"
        )
        assert pairing.pairing_type == "auto"
        assert pairing.auto_score == Decimal("8.5")
    
    def test_pairing_manual_does_not_require_score(self):
        from app.schemas.pairing import SessionPairing
        session_id = str(uuid4())
        member_id = str(uuid4())
        learner_id = str(uuid4())
        
        # pairing_type='manual' does NOT require auto_score
        pairing = SessionPairing(
            session_id=session_id,
            member_id=member_id,
            learner_id=learner_id,
            pairing_type="manual",
            auto_score=None,
            status="proposed"
        )
        assert pairing.pairing_type == "manual"
        assert pairing.auto_score is None
    
    def test_pairing_auto_without_score_raises_error(self):
        from app.schemas.pairing import SessionPairing
        from pydantic import ValidationError
        session_id = str(uuid4())
        member_id = str(uuid4())
        learner_id = str(uuid4())
        
        # pairing_type='auto' WITHOUT auto_score should fail
        with pytest.raises(ValidationError):
            SessionPairing(
                session_id=session_id,
                member_id=member_id,
                learner_id=learner_id,
                pairing_type="auto",
                auto_score=None,  # Missing - should fail
                status="proposed"
            )
    
    def test_pairing_create(self):
        from app.schemas.pairing import SessionPairingCreate
        session_id = str(uuid4())
        member_id = str(uuid4())
        learner_id = str(uuid4())
        
        pairing = SessionPairingCreate(
            session_id=session_id,
            member_id=member_id,
            learner_id=learner_id,
            pairing_type="auto",
            auto_score=Decimal("7.0"),
            status="proposed"
        )
        assert pairing.pairing_type == "auto"
    
    def test_pairing_statuses(self):
        from app.schemas.pairing import SessionPairing
        session_id = str(uuid4())
        member_id = str(uuid4())
        learner_id = str(uuid4())
        
        for status in ["proposed", "confirmed", "cancelled"]:
            pairing = SessionPairing(
                session_id=session_id,
                member_id=member_id,
                learner_id=learner_id,
                pairing_type="manual",
                status=status
            )
            assert pairing.status == status
        
        # Invalid status
        with pytest.raises(ValueError):
            SessionPairing(
                session_id=session_id,
                member_id=member_id,
                learner_id=learner_id,
                pairing_type="manual",
                status="invalid"
            )
