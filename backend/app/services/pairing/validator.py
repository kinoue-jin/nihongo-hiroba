"""Validation for pairing generation"""
from dataclasses import dataclass
from typing import List, Optional
from uuid import UUID


@dataclass
class ValidationResult:
    """Result of pairing validation"""
    is_valid: bool
    errors: List[str]
    
    @classmethod
    def success(cls) -> "ValidationResult":
        return cls(is_valid=True, errors=[])
    
    @classmethod
    def failure(cls, errors: List[str]) -> "ValidationResult":
        return cls(is_valid=False, errors=errors)


def validate_session_for_pairing(
    session: dict,
    members: List[dict],
    learners: List[dict],
) -> ValidationResult:
    """
    Validate that a session can generate pairings.
    
    Rules:
    - session_status must be 'open'
    - Cancelled sessions are excluded
    - Member count must be > 0
    - Learner count must be > 0
    """
    errors = []
    
    # Check session status
    session_status = session.get("session_status", "")
    if session_status != "open":
        errors.append(f"Session status must be 'open', got '{session_status}'")
    
    # Check cancelled
    if session.get("is_cancelled", False):
        errors.append("Cancelled sessions cannot generate pairings")
    
    # Check member count
    if len(members) == 0:
        errors.append("At least one registered member is required")
    
    # Check learner count
    if len(learners) == 0:
        errors.append("At least one registered learner is required")
    
    if errors:
        return ValidationResult.failure(errors)
    
    return ValidationResult.success()


def can_generate_pairings(session: dict) -> bool:
    """Quick check if pairings can be generated for a session"""
    result = validate_session_for_pairing(
        session=session,
        members=[{"id": "dummy"}],  # Pass dummy to satisfy member count check
        learners=[{"id": "dummy"}],  # Pass dummy to satisfy learner count check
    )
    # Override member/learner errors for quick check
    return session.get("session_status") == "open" and not session.get("is_cancelled", False)
