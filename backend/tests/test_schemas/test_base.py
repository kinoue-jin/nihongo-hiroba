"""
Tests for base.py - Base types: DateString, TimeString, DateTimeString
"""
import pytest
from datetime import date, time, datetime
from pydantic import ValidationError, BaseModel
from app.schemas.base import DateString, TimeString, DateTimeString


class TestDateString:
    """DateString should be YYYY-MM-DD format"""

    def test_valid_date_string(self):
        class TestModel(BaseModel):
            date_field: DateString
        result = TestModel(date_field="2026-03-23")
        assert result.date_field == "2026-03-23"

    def test_date_string_accepts_string(self):
        class TestModel(BaseModel):
            date_field: DateString
        result = TestModel(date_field="2026-01-15")
        assert isinstance(result.date_field, str)

    def test_invalid_date_string_wrong_format(self):
        class TestModel(BaseModel):
            date_field: DateString
        with pytest.raises(ValidationError):
            TestModel(date_field="23-03-2026")  # DD-MM-YYYY - invalid

    def test_invalid_date_string_invalid_date(self):
        class TestModel(BaseModel):
            date_field: DateString
        with pytest.raises(ValidationError):
            TestModel(date_field="2026-02-30")  # Invalid date


class TestTimeString:
    """TimeString should be HH:MM format"""

    def test_valid_time_string(self):
        class TestModel(BaseModel):
            time_field: TimeString
        result = TestModel(time_field="14:30")
        assert result.time_field == "14:30"

    def test_time_string_accepts_string(self):
        class TestModel(BaseModel):
            time_field: TimeString
        result = TestModel(time_field="09:00")
        assert isinstance(result.time_field, str)

    def test_invalid_time_string_wrong_format(self):
        class TestModel(BaseModel):
            time_field: TimeString
        with pytest.raises(ValidationError):
            TestModel(time_field="2:30 PM")  # Invalid format

    def test_invalid_time_string_invalid_time(self):
        class TestModel(BaseModel):
            time_field: TimeString
        with pytest.raises(ValidationError):
            TestModel(time_field="25:00")  # Invalid time


class TestDateTimeString:
    """DateTimeString should be YYYY-MM-DDTHH:MM:SS format"""

    def test_valid_datetime_string(self):
        class TestModel(BaseModel):
            dt_field: DateTimeString
        result = TestModel(dt_field="2026-03-23T14:30:00")
        assert result.dt_field == "2026-03-23T14:30:00"

    def test_datetime_string_accepts_string(self):
        class TestModel(BaseModel):
            dt_field: DateTimeString
        result = TestModel(dt_field="2026-01-15T09:00:00")
        assert isinstance(result.dt_field, str)

    def test_invalid_datetime_string_wrong_format(self):
        class TestModel(BaseModel):
            dt_field: DateTimeString
        with pytest.raises(ValidationError):
            TestModel(dt_field="2026-03-23 14:30:00")  # Space instead of T

    def test_invalid_datetime_string_invalid_date(self):
        class TestModel(BaseModel):
            dt_field: DateTimeString
        with pytest.raises(ValidationError):
            TestModel(dt_field="2026-02-30T14:30:00")  # Invalid date
