"""Tests for matcher"""
import pytest
from datetime import date
from decimal import Decimal
from uuid import uuid4

from app.services.pairing.matcher import (
    create_pairings,
    PairingResult,
    WaitlistedMember,
)


class TestCreatePairings:
    def test_equal_members_and_learners(self, pairing_test_session, pairing_test_members, pairing_test_learners):
        """Equal numbers should pair 1:1"""
        session_id = pairing_test_session["id"]
        
        # Add registered_at to members and learners
        members = [
            {**m, "registered_at": "2026-03-20T10:00:00"}
            for m in pairing_test_members
        ]
        learners = [
            {**l, "registered_at": "2026-03-20T10:00:00"}
            for l in pairing_test_learners
        ]
        
        result = create_pairings(
            session_id=session_id,
            registered_members=members,
            registered_learners=learners,
            learning_history=[],
            previous_session_pairs=[],
            member_class_types={m["id"]: m["class_type_id"] for m in pairing_test_members},
            learner_class_types={l["id"]: l["class_type_id"] for l in pairing_test_learners},
            session_date=date.today(),
        )
        
        # Should have exactly 3 pairings (3 members, 3 learners)
        assert len(result.pairings) == 3
        assert len(result.waitlisted_members) == 0
        assert len(result.unpaired_learners) == 0

    def test_more_learners_than_members_1n(
        self, pairing_test_session, pairing_test_members, pairing_test_learners
    ):
        """More learners than members: excess learners added to lowest-score member"""
        session_id = pairing_test_session["id"]
        
        # 3 members, but we only use 1
        members = [
            {**pairing_test_members[0], "registered_at": "2026-03-20T10:00:00"},
        ]
        learners = [
            {**l, "registered_at": "2026-03-20T10:00:00"}
            for l in pairing_test_learners  # 3 learners
        ]
        
        result = create_pairings(
            session_id=session_id,
            registered_members=members,
            registered_learners=learners,
            learning_history=[],
            previous_session_pairs=[],
            member_class_types={m["id"]: m["class_type_id"] for m in members},
            learner_class_types={l["id"]: l["class_type_id"] for l in learners},
            session_date=date.today(),
        )
        
        # All 3 learners should be paired with the 1 member (1:N)
        assert len(result.pairings) == 3
        assert len(result.unpaired_learners) == 0
        
        # All pairings should be with the same member
        member_ids = {p["member_id"] for p in result.pairings}
        assert len(member_ids) == 1
        assert list(member_ids)[0] == members[0]["id"]

    def test_more_members_than_learners_waitlist(
        self, pairing_test_session, pairing_test_members, pairing_test_learners
    ):
        """More members than learners: excess members waitlisted"""
        session_id = pairing_test_session["id"]
        
        # 3 learners, but we only use 1
        learners = [
            {**pairing_test_learners[0], "registered_at": "2026-03-20T10:00:00"},
        ]
        members = [
            {**m, "registered_at": "2026-03-20T10:00:00"}
            for m in pairing_test_members  # 3 members
        ]
        
        result = create_pairings(
            session_id=session_id,
            registered_members=members,
            registered_learners=learners,
            learning_history=[],
            previous_session_pairs=[],
            member_class_types={m["id"]: m["class_type_id"] for m in members},
            learner_class_types={l["id"]: l["class_type_id"] for l in learners},
            session_date=date.today(),
        )
        
        # Only 1 pairing should be created
        assert len(result.pairings) == 1
        
        # 2 members should be waitlisted
        assert len(result.waitlisted_members) == 2

    def test_no_members_returns_empty(self, pairing_test_session, pairing_test_learners):
        """No members returns empty pairings"""
        result = create_pairings(
            session_id=pairing_test_session["id"],
            registered_members=[],
            registered_learners=pairing_test_learners,
            learning_history=[],
            previous_session_pairs=[],
            member_class_types={},
            learner_class_types={l["id"]: l["class_type_id"] for l in pairing_test_learners},
            session_date=date.today(),
        )
        
        assert len(result.pairings) == 0
        assert len(result.unpaired_learners) == 0

    def test_no_learners_returns_empty(self, pairing_test_session, pairing_test_members):
        """No learners returns empty pairings with waitlisted members"""
        result = create_pairings(
            session_id=pairing_test_session["id"],
            registered_members=pairing_test_members,
            registered_learners=[],
            learning_history=[],
            previous_session_pairs=[],
            member_class_types={m["id"]: m["class_type_id"] for m in pairing_test_members},
            learner_class_types={},
            session_date=date.today(),
        )
        
        assert len(result.pairings) == 0
        # All members should be waitlisted
        assert len(result.waitlisted_members) == len(pairing_test_members)

    def test_pairing_type_is_auto(self, pairing_test_session, pairing_test_members, pairing_test_learners):
        """Pairing type should be 'auto'"""
        members = [{**m, "registered_at": "2026-03-20T10:00:00"} for m in pairing_test_members]
        learners = [{**l, "registered_at": "2026-03-20T10:00:00"} for l in pairing_test_learners]
        
        result = create_pairings(
            session_id=pairing_test_session["id"],
            registered_members=members,
            registered_learners=learners,
            learning_history=[],
            previous_session_pairs=[],
            member_class_types={m["id"]: m["class_type_id"] for m in members},
            learner_class_types={l["id"]: l["class_type_id"] for l in learners},
            session_date=date.today(),
        )
        
        for pairing in result.pairings:
            assert pairing["pairing_type"] == "auto"

    def test_status_is_proposed(self, pairing_test_session, pairing_test_members, pairing_test_learners):
        """Initial status should be 'proposed'"""
        members = [{**m, "registered_at": "2026-03-20T10:00:00"} for m in pairing_test_members]
        learners = [{**l, "registered_at": "2026-03-20T10:00:00"} for l in pairing_test_learners]
        
        result = create_pairings(
            session_id=pairing_test_session["id"],
            registered_members=members,
            registered_learners=learners,
            learning_history=[],
            previous_session_pairs=[],
            member_class_types={m["id"]: m["class_type_id"] for m in members},
            learner_class_types={l["id"]: l["class_type_id"] for l in learners},
            session_date=date.today(),
        )
        
        for pairing in result.pairings:
            assert pairing["status"] == "proposed"

    def test_high_score_pairs_first(self, pairing_test_session, pairing_test_members, pairing_test_learners):
        """Pairs with learning history should be prioritized"""
        member0 = pairing_test_members[0]
        learner0 = pairing_test_learners[0]
        session_id = pairing_test_session["id"]
        
        # Add history: member0-learner0 have been paired before
        history = [
            {
                "member_id": member0["id"],
                "learner_id": learner0["id"],
                "session_date": "2026-01-15",
                "attended": True,
            }
        ]
        
        members = [{**m, "registered_at": "2026-03-20T10:00:00"} for m in pairing_test_members]
        learners = [{**l, "registered_at": "2026-03-20T10:00:00"} for l in pairing_test_learners]
        
        result = create_pairings(
            session_id=session_id,
            registered_members=members,
            registered_learners=learners,
            learning_history=history,
            previous_session_pairs=[],
            member_class_types={m["id"]: m["class_type_id"] for m in members},
            learner_class_types={l["id"]: l["class_type_id"] for l in learners},
            session_date=date.today(),
        )
        
        # member0-learner0 should be paired (has history = higher score)
        member0_learner0_pairing = next(
            (p for p in result.pairings if p["member_id"] == member0["id"] and p["learner_id"] == learner0["id"]),
            None
        )
        assert member0_learner0_pairing is not None
        # Score should be positive (has history)
        assert member0_learner0_pairing["auto_score"] > 0
