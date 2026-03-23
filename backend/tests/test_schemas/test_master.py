"""Tests for master.py - MasterItem schemas"""
import pytest
from uuid import uuid4


class TestMasterItem:
    """MasterItem should have group_key, label, value, order, is_active"""
    
    def test_valid_master_item(self):
        from app.schemas.master import MasterItem, MasterItemResponse
        item = MasterItem(
            group_key="news_category",
            label="活動報告",
            value="activity_report",
            order=1,
            is_active=True
        )
        assert item.group_key == "news_category"
        assert item.label == "活動報告"
        assert item.value == "activity_report"
        assert item.order == 1
        assert item.is_active is True
    
    def test_master_item_with_id(self):
        from app.schemas.master import MasterItem, MasterItemResponse
        from uuid import UUID
        item_id = uuid4()
        item = MasterItem(
            id=item_id,
            group_key="event_type",
            label="故郷を語ろう",
            value="hometown",
            order=1,
            is_active=True
        )
        assert item.id == item_id
        assert isinstance(item.id, UUID)
    
    def test_master_item_response(self):
        from app.schemas.master import MasterItemResponse
        item = MasterItemResponse(
            id=str(uuid4()),
            group_key="cancel_case",
            label="祝日",
            value="holiday",
            order=1,
            is_active=True
        )
        assert hasattr(item, "id")
        assert item.group_key == "cancel_case"
    
    def test_invalid_group_key(self):
        from app.schemas.master import MasterItem
        with pytest.raises(ValueError):
            MasterItem(
                group_key="invalid_group",  # Not in allowed values
                label="Test",
                value="test",
                order=1,
                is_active=True
            )
