"""
Pairing service for automatic session pairing generation.

Usage:
    from app.services.pairing import generate_pairings
    result = generate_pairings(session_id=uuid, supabase_client=client)
"""
from typing import List, Optional
from uuid import UUID
import logging

from app.services.pairing.validator import validate_session_for_pairing, can_generate_pairings
from app.services.pairing.matcher import create_pairings, PairingResult, WaitlistedMember

logger = logging.getLogger(__name__)


def get_session(session_id: UUID, supabase_client) -> Optional[dict]:
    """Fetch session from database"""
    response = supabase_client.from_("schedule_sessions").select("*").eq("id", str(session_id)).execute()
    if not response.data:
        return None
    return response.data[0]


def get_registered_members(session_id: UUID, supabase_client) -> List[dict]:
    """Get all registered members for a session"""
    response = supabase_client.from_("member_session_registrations").select("*").eq("session_id", str(session_id)).eq("status", "registered").execute()
    return response.data


def get_registered_learners(session_id: UUID, supabase_client) -> List[dict]:
    """Get all registered learners for a session"""
    response = supabase_client.from_("learner_session_registrations").select("*").eq("session_id", str(session_id)).eq("status", "registered").execute()
    return response.data


def get_learning_history(member_ids: List[UUID], learner_ids: List[UUID], supabase_client) -> List[dict]:
    """Get learning history for the given member-learner pairs"""
    if not member_ids or not learner_ids:
        return []
    
    member_ids_str = [str(mid) for mid in member_ids]
    learner_ids_str = [str(lid) for lid in learner_ids]
    
    # Get sessions for these members and learners
    response = supabase_client.from_("learning_records").select("*").in_("member_id", member_ids_str).in_("learner_id", learner_ids_str).execute()
    return response.data


def get_previous_session_pairs(session_id: UUID, supabase_client) -> List[tuple]:
    """Get member-learner pairs from the previous session"""
    # Get the session date of the current session
    session = get_session(session_id, supabase_client)
    if not session:
        return []
    
    current_date = session.get("date")
    if not current_date:
        return []
    
    # Find the previous session of the same class type
    class_type_id = session.get("class_type_id")
    prev_sessions = supabase_client.from_("schedule_sessions").select("id").eq("class_type_id", class_type_id).lt("date", current_date).order("date", desc=True).limit(1).execute()
    
    if not prev_sessions.data:
        return []
    
    prev_session_id = prev_sessions.data[0]["id"]
    
    # Get pairings from that session
    pairings = supabase_client.from_("session_pairings").select("member_id, learner_id").eq("session_id", str(prev_session_id)).execute()
    
    return [(p["member_id"], p["learner_id"]) for p in pairings.data]


def get_member_class_types(member_ids: List[UUID], supabase_client) -> dict:
    """Get class type IDs for members"""
    if not member_ids:
        return {}
    
    member_ids_str = [str(mid) for mid in member_ids]
    response = supabase_client.from_("member_class_types").select("member_id, class_type_id").in_("member_id", member_ids_str).execute()
    
    return {UUID(m["member_id"]): UUID(m["class_type_id"]) for m in response.data}


def get_learner_class_types(learner_ids: List[UUID], supabase_client) -> dict:
    """Get class type IDs for learners"""
    if not learner_ids:
        return {}
    
    learner_ids_str = [str(lid) for lid in learner_ids]
    response = supabase_client.from_("learner_class_types").select("learner_id, class_type_id").in_("learner_id", learner_ids_str).execute()
    
    return {UUID(l["learner_id"]): UUID(l["class_type_id"]) for l in response.data}


def create_session_pairings(pairings: List[dict], supabase_client) -> List[dict]:
    """Insert pairing records into the database"""
    if not pairings:
        return []
    
    response = supabase_client.from_("session_pairings").insert(pairings).execute()
    return response.data


def generate_pairings(session_id: UUID, supabase_client) -> PairingResult:
    """
    Generate pairings for a session.
    
    This is the main entry point for the pairing service.
    
    Args:
        session_id: UUID of the session to generate pairings for
        supabase_client: Supabase client instance
        
    Returns:
        PairingResult containing:
        - pairings: List of created pairing dicts
        - waitlisted_members: List of WaitlistedMember for members who couldn't be paired
        - unpaired_learners: List of learner UUIDs who couldn't be paired
    """
    from datetime import date
    
    # Get session
    session = get_session(session_id, supabase_client)
    if not session:
        logger.warning(f"Session {session_id} not found")
        return PairingResult(pairings=[], waitlisted_members=[], unpaired_learners=[])
    
    # Validate session can generate pairings
    if not can_generate_pairings(session):
        logger.warning(f"Session {session_id} cannot generate pairings: status={session.get('session_status')}, cancelled={session.get('is_cancelled')}")
        return PairingResult(pairings=[], waitlisted_members=[], unpaired_learners=[])
    
    # Get registered members and learners
    members = get_registered_members(session_id, supabase_client)
    learners = get_registered_learners(session_id, supabase_client)
    
    # Validate we have members and learners
    validation = validate_session_for_pairing(session, members, learners)
    if not validation.is_valid:
        logger.warning(f"Validation failed for session {session_id}: {validation.errors}")
        return PairingResult(
            pairings=[],
            waitlisted_members=[
                WaitlistedMember(UUID(m["member_id"]), err)
                for m in members
                for err in validation.errors
            ],
            unpaired_learners=[UUID(l["learner_id"]) for l in learners],
        )
    
    # Get member and learner IDs
    member_ids = [UUID(m["member_id"]) for m in members]
    learner_ids = [UUID(l["learner_id"]) for l in learners]
    
    # Get learning history
    history = get_learning_history(member_ids, learner_ids, supabase_client)
    
    # Get previous session pairs
    prev_pairs = get_previous_session_pairs(session_id, supabase_client)
    
    # Get class types
    member_class_types = get_member_class_types(member_ids, supabase_client)
    learner_class_types = get_learner_class_types(learner_ids, supabase_client)
    
    # Parse session date
    session_date = date.fromisoformat(session["date"])
    
    # Create pairings
    result = create_pairings(
        session_id=session_id,
        registered_members=members,
        registered_learners=learners,
        learning_history=history,
        previous_session_pairs=prev_pairs,
        member_class_types=member_class_types,
        learner_class_types=learner_class_types,
        session_date=session_date,
    )
    
    # Persist pairings to database
    if result.pairings:
        # Convert UUIDs to strings for Supabase
        pairings_for_db = [
            {
                "session_id": str(p["session_id"]),
                "member_id": str(p["member_id"]),
                "learner_id": str(p["learner_id"]),
                "pairing_type": p["pairing_type"],
                "auto_score": float(p["auto_score"]),
                "status": p["status"],
            }
            for p in result.pairings
        ]
        create_session_pairings(pairings_for_db, supabase_client)
    
    # Log waitlisted members for admin notification
    if result.waitlisted_members:
        logger.info(f"Waitlisted members for session {session_id}: {[str(w.member_id) for w in result.waitlisted_members]}")
    
    return result


# Exports
__all__ = ["generate_pairings", "PairingResult", "WaitlistedMember", "can_generate_pairings"]
