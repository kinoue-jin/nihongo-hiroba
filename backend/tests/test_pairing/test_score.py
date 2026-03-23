"""Tests for score calculation"""
import pytest
from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

from app.services.pairing.score import calculate_pair_score, build_score_matrix


class TestCalculatePairScore:
    def test_first_time_pair_returns_zero(self, pairing_test_members, pairing_test_learners):
        """First-time pair should have score 0"""
        member = pairing_test_members[0]
        learner = pairing_test_learners[0]
        
        score = calculate_pair_score(
            member_id=member["id"],
            learner_id=learner["id"],
            learning_history=[],
            previous_session_pairs=[],
            member_class_type_id=member["class_type_id"],
            learner_class_type_id=learner["class_type_id"],
            current_session_date=date.today(),
        )
        
        assert score == Decimal("0")

    def test_past_pairing_adds_10_points(self, pairing_test_members, pairing_test_learners):
        """Each past pairing adds +10"""
        member = pairing_test_members[0]
        learner = pairing_test_learners[0]
        today = date.today()

        history = [
            {
                "member_id": member["id"],
                "learner_id": learner["id"],
                "session_date": (today - timedelta(days=120)).isoformat(),
                "attended": True,
            }
        ]

        score = calculate_pair_score(
            member_id=member["id"],
            learner_id=learner["id"],
            learning_history=history,
            previous_session_pairs=[],
            member_class_type_id=member["class_type_id"],
            learner_class_type_id=learner["class_type_id"],
            current_session_date=today,
        )

        # 1 past * 10 = 10, class type match = 3, 120 days ago not recent
        assert score == Decimal("13")

    def test_multiple_past_pairings(self, pairing_test_members, pairing_test_learners):
        """3 past pairings = +30, all recent within 3 months adds +15"""
        member = pairing_test_members[0]
        learner = pairing_test_learners[0]
        today = date.today()

        history = [
            {
                "member_id": member["id"],
                "learner_id": learner["id"],
                "session_date": (today - timedelta(days=d)).isoformat(),
                "attended": True,
            }
            for d in [30, 60, 90]
        ]

        score = calculate_pair_score(
            member_id=member["id"],
            learner_id=learner["id"],
            learning_history=history,
            previous_session_pairs=[],
            member_class_type_id=member["class_type_id"],
            learner_class_type_id=learner["class_type_id"],
            current_session_date=today,
        )

        # 3 past * 10 = 30, all 3 recent within 3mo * 5 = 15, class type = 3
        # Total = 48
        assert score == Decimal("48")

    def test_recent_pairing_within_3_months_adds_5(self, pairing_test_members, pairing_test_learners):
        """Recent pairing within 3 months adds +5"""
        member = pairing_test_members[0]
        learner = pairing_test_learners[0]
        today = date.today()
        
        # One old pairing + one recent
        history = [
            {
                "member_id": member["id"],
                "learner_id": learner["id"],
                "session_date": (today - timedelta(days=120)).isoformat(),
                "attended": True,
            },
            {
                "member_id": member["id"],
                "learner_id": learner["id"],
                "session_date": (today - timedelta(days=30)).isoformat(),
                "attended": True,
            },
        ]
        
        score = calculate_pair_score(
            member_id=member["id"],
            learner_id=learner["id"],
            learning_history=history,
            previous_session_pairs=[],
            member_class_type_id=member["class_type_id"],
            learner_class_type_id=learner["class_type_id"],
            current_session_date=today,
        )
        
        # 2 past * 10 = 20, 1 recent * 5 = 5, class type match = 3
        assert score == Decimal("28")

    def test_class_type_match_adds_3(self, pairing_test_members, pairing_test_learners):
        """Matching class type adds +3"""
        member = pairing_test_members[0]
        learner = pairing_test_learners[0]
        today = date.today()

        # Need some history for class type bonus to apply
        history = [
            {
                "member_id": member["id"],
                "learner_id": learner["id"],
                "session_date": (today - timedelta(days=120)).isoformat(),
                "attended": True,
            }
        ]

        score = calculate_pair_score(
            member_id=member["id"],
            learner_id=learner["id"],
            learning_history=history,
            previous_session_pairs=[],
            member_class_type_id=member["class_type_id"],
            learner_class_type_id=learner["class_type_id"],  # Same class type
            current_session_date=today,
        )

        # 1 past * 10 = 10, class type match = 3 (120 days ago not recent)
        assert score == Decimal("13")

    def test_class_type_mismatch_no_bonus(self, pairing_test_members, pairing_test_learners, class_type_saturday):
        """Different class types don't get the +3 bonus"""
        member = pairing_test_members[0]
        learner = pairing_test_learners[0]
        
        score = calculate_pair_score(
            member_id=member["id"],
            learner_id=learner["id"],
            learning_history=[],
            previous_session_pairs=[],
            member_class_type_id=member["class_type_id"],
            learner_class_type_id=class_type_saturday["id"],  # Different class type
            current_session_date=date.today(),
        )
        
        assert score == Decimal("0")

    def test_same_pair_in_previous_session_penalty(self, pairing_test_members, pairing_test_learners):
        """Same pair in previous session gets -5 penalty"""
        member = pairing_test_members[0]
        learner = pairing_test_learners[0]

        score = calculate_pair_score(
            member_id=member["id"],
            learner_id=learner["id"],
            learning_history=[],  # First time pairing
            previous_session_pairs=[(member["id"], learner["id"])],
            member_class_type_id=member["class_type_id"],
            learner_class_type_id=learner["class_type_id"],
            current_session_date=date.today(),
        )

        # First time with previous session pair: only penalty applies = -5
        assert score == Decimal("-5")

    def test_full_score_calculation(self, pairing_test_members, pairing_test_learners):
        """Test full scoring: 3 past + 1 recent + class type match - previous penalty"""
        member = pairing_test_members[0]
        learner = pairing_test_learners[0]
        today = date.today()
        
        history = [
            {
                "member_id": member["id"],
                "learner_id": learner["id"],
                "session_date": (today - timedelta(days=90)).isoformat(),
                "attended": True,
            },
            {
                "member_id": member["id"],
                "learner_id": learner["id"],
                "session_date": (today - timedelta(days=60)).isoformat(),
                "attended": True,
            },
            {
                "member_id": member["id"],
                "learner_id": learner["id"],
                "session_date": (today - timedelta(days=30)).isoformat(),
                "attended": True,
            },
        ]
        
        score = calculate_pair_score(
            member_id=member["id"],
            learner_id=learner["id"],
            learning_history=history,
            previous_session_pairs=[(member["id"], learner["id"])],
            member_class_type_id=member["class_type_id"],
            learner_class_type_id=learner["class_type_id"],
            current_session_date=today,
        )
        
        # 3 past * 10 = 30, 3 recent within 3mo * 5 = 15, class match = 3, prev = -5
        # Total = 43
        assert score == Decimal("43")


class TestBuildScoreMatrix:
    def test_builds_matrix_for_all_pairs(self, pairing_test_members, pairing_test_learners):
        """Matrix should contain all member-learner combinations"""
        member_ids = [m["id"] for m in pairing_test_members]
        learner_ids = [l["id"] for l in pairing_test_learners]
        member_class_types = {m["id"]: m["class_type_id"] for m in pairing_test_members}
        learner_class_types = {l["id"]: l["class_type_id"] for l in pairing_test_learners}
        
        matrix = build_score_matrix(
            member_ids=member_ids,
            learner_ids=learner_ids,
            learning_history=[],
            previous_session_pairs=[],
            member_class_types=member_class_types,
            learner_class_types=learner_class_types,
            current_session_date=date.today(),
        )
        
        # 3 members * 3 learners = 9 pairs
        assert len(matrix) == 9
        
        # Check all combinations exist
        for member_id in member_ids:
            for learner_id in learner_ids:
                assert (member_id, learner_id) in matrix

    def test_matrix_values_are_decimals(self, pairing_test_members, pairing_test_learners):
        """All matrix values should be Decimal"""
        member_ids = [m["id"] for m in pairing_test_members]
        learner_ids = [l["id"] for l in pairing_test_learners]
        member_class_types = {m["id"]: m["class_type_id"] for m in pairing_test_members}
        learner_class_types = {l["id"]: l["class_type_id"] for l in pairing_test_learners}
        
        matrix = build_score_matrix(
            member_ids=member_ids,
            learner_ids=learner_ids,
            learning_history=[],
            previous_session_pairs=[],
            member_class_types=member_class_types,
            learner_class_types=learner_class_types,
            current_session_date=date.today(),
        )
        
        for score in matrix.values():
            assert isinstance(score, Decimal)
