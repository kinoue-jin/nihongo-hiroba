"""Fixtures for pairing tests"""
import pytest
from uuid import uuid4
from datetime import date, datetime, timedelta
from decimal import Decimal


@pytest.fixture
def class_type_monday():
    """Monday class type master item"""
    return {
        "id": uuid4(),
        "group_key": "class_type",
        "label": "Mond月 Class",
        "value": "monday",
        "order": 1,
        "is_active": True,
    }


@pytest.fixture
def class_type_saturday():
    """Saturday class type master item"""
    return {
        "id": uuid4(),
        "group_key": "class_type",
        "label": "Saturday Class",
        "value": "saturday",
        "order": 2,
        "is_active": True,
    }


@pytest.fixture
def pairing_test_session(class_type_monday):
    """A ScheduleSession with status='open'"""
    return {
        "id": uuid4(),
        "class_type_id": class_type_monday["id"],
        "date": "2026-03-23",
        "start_time": "10:00",
        "end_time": "12:00",
        "venue": "Community Center",
        "is_cancelled": False,
        "session_status": "open",
    }


@pytest.fixture
def pairing_test_members(class_type_monday):
    """3 test members"""
    member_ids = [uuid4(), uuid4(), uuid4()]
    return [
        {
            "id": member_ids[0],
            "name": "Tanaka Teacher",
            "role_id": uuid4(),
            "email": "tanaka@example.com",
            "is_active": True,
            "class_type_id": class_type_monday["id"],
        },
        {
            "id": member_ids[1],
            "name": "Yamada Teacher",
            "role_id": uuid4(),
            "email": "yamada@example.com",
            "is_active": True,
            "class_type_id": class_type_monday["id"],
        },
        {
            "id": member_ids[2],
            "name": "Suzuki Teacher",
            "role_id": uuid4(),
            "email": "suzuki@example.com",
            "is_active": True,
            "class_type_id": class_type_monday["id"],
        },
    ]


@pytest.fixture
def pairing_test_learners(class_type_monday):
    """3 test learners"""
    learner_ids = [uuid4(), uuid4(), uuid4()]
    return [
        {
            "id": learner_ids[0],
            "nickname": "Ken",
            "origin_country": "USA",
            "arrived_japan": "2025-01-15",
            "joined_at": "2025-02-01",
            "japanese_level": "N3",
            "is_public": True,
            "class_type_id": class_type_monday["id"],
        },
        {
            "id": learner_ids[1],
            "nickname": "Maria",
            "origin_country": "Brazil",
            "arrived_japan": "2025-03-20",
            "joined_at": "2025-04-01",
            "japanese_level": "N4",
            "is_public": True,
            "class_type_id": class_type_monday["id"],
        },
        {
            "id": learner_ids[2],
            "nickname": "Li",
            "origin_country": "China",
            "arrived_japan": "2025-06-10",
            "joined_at": "2025-07-01",
            "japanese_level": "N5",
            "is_public": True,
            "class_type_id": class_type_monday["id"],
        },
    ]


@pytest.fixture
def pairing_learning_history(pairing_test_members, pairing_test_learners):
    """
    Learning history:
    - Member[0] paired with Learner[0] 3 times in the past
    - Member[1] paired with Learner[1] 1 time recently (within 1 month)
    """
    member0_id = pairing_test_members[0]["id"]
    member1_id = pairing_test_members[1]["id"]
    learner0_id = pairing_test_learners[0]["id"]
    learner1_id = pairing_test_learners[1]["id"]

    today = date.today()

    return [
        # Member[0] - Learner[0]: 3 past sessions (old)
        {
            "id": uuid4(),
            "member_id": member0_id,
            "learner_id": learner0_id,
            "session_date": (today - timedelta(days=90)).isoformat(),
            "attended": True,
        },
        {
            "id": uuid4(),
            "member_id": member0_id,
            "learner_id": learner0_id,
            "session_date": (today - timedelta(days=60)).isoformat(),
            "attended": True,
        },
        {
            "id": uuid4(),
            "member_id": member0_id,
            "learner_id": learner0_id,
            "session_date": (today - timedelta(days=30)).isoformat(),
            "attended": True,
        },
        # Member[1] - Learner[1]: 1 recent session (within 1 month)
        {
            "id": uuid4(),
            "member_id": member1_id,
            "learner_id": learner1_id,
            "session_date": (today - timedelta(days=15)).isoformat(),
            "attended": True,
        },
    ]


@pytest.fixture
def member_registrations(pairing_test_session, pairing_test_members):
    """Member registrations for the test session"""
    session_id = pairing_test_session["id"]
    return [
        {
            "id": uuid4(),
            "session_id": session_id,
            "member_id": m["id"],
            "registered_at": datetime.utcnow().isoformat(),
            "status": "registered",
        }
        for m in pairing_test_members
    ]


@pytest.fixture
def learner_registrations(pairing_test_session, pairing_test_learners):
    """Learner registrations for the test session"""
    session_id = pairing_test_session["id"]
    return [
        {
            "id": uuid4(),
            "session_id": session_id,
            "learner_id": l["id"],
            "registered_at": datetime.utcnow().isoformat(),
            "status": "registered",
        }
        for l in pairing_test_learners
    ]
