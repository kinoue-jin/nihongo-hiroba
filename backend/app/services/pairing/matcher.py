"""Matching algorithm for creating session pairings"""
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import List, Dict, Tuple, Optional
from uuid import UUID

from app.services.pairing.score import build_score_matrix


@dataclass
class PendingPairing:
    """A pairing that needs to be assigned"""
    member_id: UUID
    learner_id: UUID
    score: Decimal
    member_registered_at: str
    learner_registered_at: str


@dataclass
class WaitlistedMember:
    """A member who couldn't be paired"""
    member_id: UUID
    reason: str


@dataclass
class PairingResult:
    """Result of the matching process"""
    pairings: List[Dict]
    waitlisted_members: List[WaitlistedMember]
    unpaired_learners: List[UUID]


def create_pairings(
    session_id: UUID,
    registered_members: List[Dict],
    registered_learners: List[Dict],
    learning_history: List[Dict],
    previous_session_pairs: List[Tuple[UUID, UUID]],
    member_class_types: Dict[UUID, UUID],
    learner_class_types: Dict[UUID, UUID],
    session_date: date,
) -> PairingResult:
    """
    Create pairings for a session using the matching algorithm.
    
    Algorithm:
    1. Get registered members and learners from session
    2. Calculate all pair scores
    3. Sort by score desc, registeredAt asc
    4. Greedily assign 1:1 pairs
    5. If len(learners) > len(members), add excess to lowest-score member
    6. If len(members) > len(learners), those members get 'wait' status
    7. Create SessionPairing records
    """
    member_ids = [m["id"] for m in registered_members]
    learner_ids = [l["id"] for l in registered_learners]
    
    if not member_ids or not learner_ids:
        return PairingResult(
            pairings=[],
            waitlisted_members=[
                WaitlistedMember(m["id"], "No learners available")
                for m in registered_members
            ] if registered_members else [],
            unpaired_learners=[],
        )
    
    # Build score matrix
    score_matrix = build_score_matrix(
        member_ids=member_ids,
        learner_ids=learner_ids,
        learning_history=learning_history,
        previous_session_pairs=previous_session_pairs,
        member_class_types=member_class_types,
        learner_class_types=learner_class_types,
        current_session_date=session_date,
    )
    
    # Create pending pair list with scores
    pending_pairs: List[PendingPairing] = []
    for member in registered_members:
        for learner in registered_learners:
            pending_pairs.append(PendingPairing(
                member_id=member["id"],
                learner_id=learner["id"],
                score=score_matrix[(member["id"], learner["id"])],
                member_registered_at=member.get("registered_at", ""),
                learner_registered_at=learner.get("registered_at", ""),
            ))
    
    # Sort by score desc, then by learner registered_at asc (earlier registrations first)
    pending_pairs.sort(key=lambda p: (-p.score, p.learner_registered_at))
    
    # Greedy 1:1 assignment
    assigned_learners: set = set()
    assigned_members: set = set()
    pairings: List[Dict] = []
    
    for pair in pending_pairs:
        if pair.learner_id not in assigned_learners and pair.member_id not in assigned_members:
            pairings.append({
                "session_id": session_id,
                "member_id": pair.member_id,
                "learner_id": pair.learner_id,
                "pairing_type": "auto",
                "auto_score": pair.score,
                "status": "proposed",
            })
            assigned_learners.add(pair.learner_id)
            assigned_members.add(pair.member_id)
    
    # Handle excess learners: add to member with lowest total score
    unassigned_learners = [l["id"] for l in registered_learners if l["id"] not in assigned_learners]
    
    if unassigned_learners:
        # Calculate total score for each member
        member_total_scores: Dict[UUID, Decimal] = {}
        for pairing in pairings:
            mid = pairing["member_id"]
            member_total_scores[mid] = member_total_scores.get(mid, Decimal("0")) + pairing["auto_score"]
        
        # Find member with lowest total score
        if member_total_scores:
            lowest_member_id = min(member_total_scores, key=member_total_scores.get)
            
            # Add all unassigned learners to this member
            for learner_id in unassigned_learners:
                extra_score = score_matrix.get((lowest_member_id, learner_id), Decimal("0"))
                pairings.append({
                    "session_id": session_id,
                    "member_id": lowest_member_id,
                    "learner_id": learner_id,
                    "pairing_type": "auto",
                    "auto_score": extra_score,
                    "status": "proposed",
                })
            
            unassigned_learners = []
    
    # Handle excess members: waitlist
    unassigned_members = [m["id"] for m in registered_members if m["id"] not in assigned_members]
    waitlisted_members = [
        WaitlistedMember(member_id=m_id, reason="No learners available")
        for m_id in unassigned_members
    ]
    
    return PairingResult(
        pairings=pairings,
        waitlisted_members=waitlisted_members,
        unpaired_learners=unassigned_learners,
    )
