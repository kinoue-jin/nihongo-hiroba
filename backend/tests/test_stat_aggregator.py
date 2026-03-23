"""Tests for stat aggregator service"""
import pytest
from unittest.mock import patch, MagicMock
from uuid import uuid4
from datetime import date


def create_mock_query(data=None, error=None):
    """Create a fresh mock query with chainable methods"""
    query = MagicMock()
    query.execute = MagicMock(return_value=MagicMock(data=data or [], error=error))
    query.select = MagicMock(return_value=query)
    query.eq = MagicMock(return_value=query)
    query.gte = MagicMock(return_value=query)
    query.lte = MagicMock(return_value=query)
    query.in_ = MagicMock(return_value=query)
    return query


class MockSupabaseClient:
    """Mock Supabase client that returns consistent mock queries"""
    def __init__(self):
        self._schedule_sessions = create_mock_query()
        self._learning_records = create_mock_query()
        self._session_pairings = create_mock_query()
        self._member_registrations = create_mock_query()
        self._learner_registrations = create_mock_query()
        self._master_items = create_mock_query()

    def from_(self, table_name):
        if table_name == "schedule_sessions":
            return self._schedule_sessions
        elif table_name == "learning_records":
            return self._learning_records
        elif table_name == "session_pairings":
            return self._session_pairings
        elif table_name == "member_session_registrations":
            return self._member_registrations
        elif table_name == "learner_session_registrations":
            return self._learner_registrations
        elif table_name == "master_items":
            return self._master_items
        return create_mock_query()


@pytest.fixture
def mock_supabase():
    """Mock Supabase client"""
    return MockSupabaseClient()


@pytest.fixture
def stat_aggregator(mock_supabase):
    """Create StatAggregatorService with mocked client"""
    from app.services.stat_aggregator import StatAggregatorService
    return StatAggregatorService(mock_supabase)


class TestAggregateSessionStats:
    """Tests for aggregate_session_stats method"""

    def test_aggregate_with_sessions(self, stat_aggregator, mock_supabase):
        """Test aggregation with actual sessions"""
        class_type_id = str(uuid4())

        # Mock sessions
        mock_supabase.from_("schedule_sessions").select("*").eq().gte().lte().execute.return_value = MagicMock(
            data=[
                {"id": str(uuid4()), "session_status": "completed", "date": "2026-01-15"},
                {"id": str(uuid4()), "session_status": "confirmed", "date": "2026-01-22"},
            ]
        )

        # Mock learning records
        record_id1 = str(uuid4())
        record_id2 = str(uuid4())
        mock_supabase.from_("learning_records").select("*").in_().eq().execute.return_value = MagicMock(
            data=[
                {"id": record_id1, "member_id": str(uuid4()), "learner_id": str(uuid4()), "attended": True},
                {"id": record_id2, "member_id": str(uuid4()), "learner_id": str(uuid4()), "attended": True},
            ]
        )

        result = stat_aggregator.aggregate_session_stats(
            class_type_id=class_type_id,
            period_start="2026-01-01",
            period_end="2026-01-31",
            granularity="monthly",
        )

        assert result["total_sessions"] == 2
        assert result["total_attendees"] == 2
        assert result["granularity"] == "monthly"
        assert "by_status" in result["breakdown"]

    def test_aggregate_no_sessions(self, stat_aggregator, mock_supabase):
        """Test aggregation with no sessions"""
        class_type_id = str(uuid4())

        mock_supabase.from_("schedule_sessions").select("*").eq().gte().lte().execute.return_value = MagicMock(
            data=[]
        )

        result = stat_aggregator.aggregate_session_stats(
            class_type_id=class_type_id,
            period_start="2026-01-01",
            period_end="2026-01-31",
        )

        assert result["total_sessions"] == 0
        assert result["total_attendees"] == 0


class TestAggregateMonthlyStats:
    """Tests for aggregate_monthly_stats method"""

    def test_aggregate_monthly_all_class_types(self, stat_aggregator, mock_supabase):
        """Test monthly aggregation for all class types"""
        class_type_id1 = str(uuid4())
        class_type_id2 = str(uuid4())

        # Mock master items
        mock_supabase.from_("master_items").select("*").eq().eq().execute.return_value = MagicMock(
            data=[
                {"id": class_type_id1, "group_key": "class_type", "value": "monday"},
                {"id": class_type_id2, "group_key": "class_type", "value": "saturday"},
            ]
        )

        # Mock sessions for each class type
        mock_supabase.from_("schedule_sessions").select("*").eq().gte().lte().execute.return_value = MagicMock(
            data=[{"id": str(uuid4()), "session_status": "completed"}]
        )

        mock_supabase.from_("learning_records").select("*").in_().eq().execute.return_value = MagicMock(
            data=[{"id": str(uuid4()), "attended": True}]
        )

        result = stat_aggregator.aggregate_monthly_stats(year=2026, month=1)

        assert len(result) == 2

    def test_aggregate_monthly_specific_class_type(self, stat_aggregator, mock_supabase):
        """Test monthly aggregation for specific class type"""
        class_type_id = str(uuid4())

        mock_supabase.from_("master_items").select("*").eq().eq().eq().execute.return_value = MagicMock(
            data=[{"id": class_type_id, "group_key": "class_type", "value": "monday"}]
        )

        mock_supabase.from_("schedule_sessions").select("*").eq().gte().lte().execute.return_value = MagicMock(
            data=[]
        )

        result = stat_aggregator.aggregate_monthly_stats(year=2026, month=1, class_type_id=class_type_id)

        assert len(result) == 1
        assert result[0]["class_type_id"] == class_type_id


class TestAggregateYearlyStats:
    """Tests for aggregate_yearly_stats method"""

    def test_aggregate_yearly(self, stat_aggregator, mock_supabase):
        """Test yearly aggregation"""
        class_type_id = str(uuid4())

        mock_supabase.from_("master_items").select("*").eq().eq().execute.return_value = MagicMock(
            data=[{"id": class_type_id, "group_key": "class_type", "value": "monday"}]
        )

        mock_supabase.from_("schedule_sessions").select("*").eq().gte().lte().execute.return_value = MagicMock(
            data=[]
        )

        result = stat_aggregator.aggregate_yearly_stats(year=2026)

        assert len(result) == 1
        assert result[0]["granularity"] == "yearly"
        assert result[0]["period_start"] == "2026-01-01"
        assert result[0]["period_end"] == "2026-12-31"


class TestGetSessionAttendanceDetail:
    """Tests for get_session_attendance_detail method"""

    def test_get_session_detail(self, stat_aggregator, mock_supabase):
        """Test getting detailed attendance for a session"""
        session_id = str(uuid4())

        # Mock session
        mock_supabase.from_("schedule_sessions").select("*").eq().execute.return_value = MagicMock(
            data=[{"id": session_id, "session_status": "completed"}]
        )

        # Mock learning records
        mock_supabase.from_("learning_records").select("*").eq().execute.return_value = MagicMock(
            data=[
                {"id": str(uuid4()), "attended": True},
                {"id": str(uuid4()), "attended": False, "absence_reason": "sick"},
            ]
        )

        # Mock pairings
        mock_supabase.from_("session_pairings").select("*").eq().execute.return_value = MagicMock(
            data=[{"id": str(uuid4())}]
        )

        # Mock registrations
        mock_supabase.from_("member_session_registrations").select("*").eq().execute.return_value = MagicMock(
            data=[{"id": str(uuid4())}]
        )

        mock_supabase.from_("learner_session_registrations").select("*").eq().execute.return_value = MagicMock(
            data=[{"id": str(uuid4())}]
        )

        result = stat_aggregator.get_session_attendance_detail(uuid4())

        assert result["total_pairings"] == 1
        assert result["total_attended"] == 1
        assert result["total_absent"] == 1
        assert len(result["absent_records"]) == 1

    def test_get_session_not_found(self, stat_aggregator, mock_supabase):
        """Test getting detail for non-existent session"""
        mock_supabase.from_("schedule_sessions").select("*").eq().execute.return_value = MagicMock(
            data=[]
        )

        with pytest.raises(ValueError, match="Session not found"):
            stat_aggregator.get_session_attendance_detail(uuid4())
