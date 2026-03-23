"""Score calculation for pairings"""
from datetime import date, timedelta
from decimal import Decimal
from typing import List, Dict, Tuple
from uuid import UUID


def calculate_pair_score(
    member_id: UUID,
    learner_id: UUID,
    learning_history: List[Dict],
    previous_session_pairs: List[Tuple[UUID, UUID]],
    member_class_type_id: UUID,
    learner_class_type_id: UUID,
    current_session_date: date,
) -> Decimal:
    """
    Calculate pairing score for a member-learner pair.
    
    Scoring rules:
    - +10 points per past pairing
    - +5 points if within last 3 months
    - +3 points if classType matches
    - -5 points if same pair in previous session
    - First-time pair: score = 0
    """
    score = Decimal("0")

    # Filter history for this pair
    pair_history = [
        h for h in learning_history
        if h["member_id"] == member_id and h["learner_id"] == learner_id
    ]

    # -5 if same pair in previous session (always applies)
    if (member_id, learner_id) in previous_session_pairs:
        score -= Decimal("5")

    # First-time pair: only previous penalty applies
    if not pair_history:
        return score

    # +10 per past pairing
    past_pairing_count = len(pair_history)
    score += past_pairing_count * Decimal("10")

    # +5 if within last 3 months (recent pairing)
    three_months_ago = current_session_date - timedelta(days=90)
    recent_count = sum(
        1 for h in pair_history
        if date.fromisoformat(h["session_date"]) >= three_months_ago
    )
    score += recent_count * Decimal("5")

    # +3 if classType matches
    if member_class_type_id == learner_class_type_id:
        score += Decimal("3")

    return score


def build_score_matrix(
    member_ids: List[UUID],
    learner_ids: List[UUID],
    learning_history: List[Dict],
    previous_session_pairs: List[Tuple[UUID, UUID]],
    member_class_types: Dict[UUID, UUID],
    learner_class_types: Dict[UUID, UUID],
    current_session_date: date,
) -> Dict[Tuple[UUID, UUID], Decimal]:
    """
    Build a score matrix for all member-learner pairs.
    
    Returns dict mapping (member_id, learner_id) -> score
    """
    matrix = {}
    for member_id in member_ids:
        for learner_id in learner_ids:
            member_class_type = member_class_types.get(member_id)
            learner_class_type = learner_class_types.get(learner_id)
            
            # If we don't have class type info, default to not matching
            class_type_match = member_class_type == learner_class_type if (member_class_type and learner_class_type) else False
            
            matrix[(member_id, learner_id)] = calculate_pair_score(
                member_id=member_id,
                learner_id=learner_id,
                learning_history=learning_history,
                previous_session_pairs=previous_session_pairs,
                member_class_type_id=member_class_type or UUID("00000000-0000-0000-0000-000000000000"),
                learner_class_type_id=learner_class_type or UUID("00000000-0000-0000-0000-000000000000"),
                current_session_date=current_session_date,
            )
    return matrix
