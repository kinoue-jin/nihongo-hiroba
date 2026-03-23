"""Tests for validator"""
import pytest
from uuid import uuid4

from app.services.pairing.validator import (
    validate_session_for_pairing,
    can_generate_pairings,
    ValidationResult,
)


class TestValidateSessionForPairing:
    def test_open_session_with_members_and_learners_succeeds(
        self, pairing_test_session, pairing_test_members, pairing_test_learners
    ):
        """Valid session with registered members/learners passes validation"""
        result = validate_session_for_pairing(
            session=pairing_test_session,
            members=pairing_test_members,
            learners=pairing_test_learners,
        )
        
        assert result.is_valid
        assert result.errors == []

    def test_member_zero_fails(self, pairing_test_session, pairing_test_learners):
        """Zero members fails validation"""
        result = validate_session_for_pairing(
            session=pairing_test_session,
            members=[],
            learners=pairing_test_learners,
        )
        
        assert not result.is_valid
        assert "At least one registered member is required" in result.errors

    def test_learner_zero_fails(self, pairing_test_session, pairing_test_members):
        """Zero learners fails validation"""
        result = validate_session_for_pairing(
            session=pairing_test_session,
            members=pairing_test_members,
            learners=[],
        )
        
        assert not result.is_valid
        assert "At least one registered learner is required" in result.errors

    def test_cancelled_session_fails(self, pairing_test_members, pairing_test_learners):
        """Cancelled session fails validation"""
        session = {
            "id": uuid4(),
            "session_status": "open",
            "is_cancelled": True,
        }
        
        result = validate_session_for_pairing(
            session=session,
            members=pairing_test_members,
            learners=pairing_test_learners,
        )
        
        assert not result.is_valid
        assert "Cancelled sessions cannot generate pairings" in result.errors

    def test_generate_pairings_rejected_when_status_not_open(
        self, pairing_test_members, pairing_test_learners
    ):
        """Status != 'open' is rejected"""
        session = {
            "id": uuid4(),
            "session_status": "pairing",
            "is_cancelled": False,
        }
        
        result = validate_session_for_pairing(
            session=session,
            members=pairing_test_members,
            learners=pairing_test_learners,
        )
        
        assert not result.is_valid
        assert any("Session status must be 'open'" in err for err in result.errors)

    def test_generate_pairings_allowed_when_status_is_open(
        self, pairing_test_session, pairing_test_members, pairing_test_learners
    ):
        """Status == 'open' is allowed"""
        result = validate_session_for_pairing(
            session=pairing_test_session,
            members=pairing_test_members,
            learners=pairing_test_learners,
        )
        
        assert result.is_valid


class TestCanGeneratePairings:
    def test_open_session_returns_true(self, pairing_test_session):
        """Open session can generate pairings"""
        assert can_generate_pairings(pairing_test_session) is True

    def test_cancelled_session_returns_false(self, pairing_test_session):
        """Cancelled session cannot generate pairings"""
        session = {**pairing_test_session, "is_cancelled": True}
        assert can_generate_pairings(session) is False

    def test_pairing_status_returns_false(self, pairing_test_session):
        """'pairing' status cannot generate new pairings"""
        session = {**pairing_test_session, "session_status": "pairing"}
        assert can_generate_pairings(session) is False

    def test_confirmed_status_returns_false(self, pairing_test_session):
        """'confirmed' status cannot generate new pairings"""
        session = {**pairing_test_session, "session_status": "confirmed"}
        assert can_generate_pairings(session) is False


class TestValidationResult:
    def test_success_has_no_errors(self):
        """Success result has empty errors"""
        result = ValidationResult.success()
        assert result.is_valid
        assert result.errors == []

    def test_failure_has_errors(self):
        """Failure result has error messages"""
        errors = ["Error 1", "Error 2"]
        result = ValidationResult.failure(errors)
        assert not result.is_valid
        assert result.errors == errors
