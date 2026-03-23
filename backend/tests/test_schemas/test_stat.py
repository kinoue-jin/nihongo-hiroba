"""Tests for stat.py - Stat schemas"""
import pytest
from uuid import uuid4


class TestStatSchema:
    """Stat schemas"""
    
    def test_stat_with_all_fields(self):
        from app.schemas.stat import Stat, StatCreate
        stat_id = str(uuid4())
        class_type_id = str(uuid4())
        
        stat = Stat(
            id=stat_id,
            period_start="2026-01-01",
            period_end="2026-01-31",
            granularity="monthly",
            class_type_id=class_type_id,
            total_sessions=10,
            total_attendees=50,
            breakdown={"monday": 5, "saturday": 5},
            is_manual_override=False,
            manual_note=None
        )
        assert stat.total_sessions == 10
        assert stat.granularity == "monthly"
    
    def test_stat_create(self):
        from app.schemas.stat import StatCreate
        class_type_id = str(uuid4())
        
        stat = StatCreate(
            period_start="2026-02-01",
            period_end="2026-02-28",
            granularity="monthly",
            class_type_id=class_type_id,
            total_sessions=8,
            total_attendees=40,
            breakdown={"monday": 4, "saturday": 4}
        )
        assert stat.total_sessions == 8
    
    def test_granularity_validation(self):
        from app.schemas.stat import Stat
        class_type_id = str(uuid4())
        
        # Valid granularities
        for g in ["monthly", "yearly"]:
            stat = Stat(
                period_start="2026-01-01",
                period_end="2026-01-31",
                granularity=g,
                class_type_id=class_type_id,
                total_sessions=10,
                total_attendees=50,
                breakdown={}
            )
            assert stat.granularity == g
        
        # Invalid granularity
        with pytest.raises(ValueError):
            Stat(
                period_start="2026-01-01",
                period_end="2026-01-31",
                granularity="weekly",  # Invalid
                class_type_id=class_type_id,
                total_sessions=10,
                total_attendees=50,
                breakdown={}
            )
