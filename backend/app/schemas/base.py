"""
Base types for the nihongo-hiroba API.
"""
import re
from datetime import date, time, datetime
from typing import Annotated
from pydantic import BaseModel, AfterValidator


def _validate_date_string(v: str) -> str:
    """Validate YYYY-MM-DD format"""
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
        raise ValueError("Date must be in YYYY-MM-DD format")
    # Validate it's a real date
    try:
        year, month, day = map(int, v.split("-"))
        date(year, month, day)
    except ValueError:
        raise ValueError("Invalid date")
    return v


def _validate_time_string(v: str) -> str:
    """Validate HH:MM format"""
    if not re.match(r"^\d{2}:\d{2}$", v):
        raise ValueError("Time must be in HH:MM format")
    try:
        hour, minute = map(int, v.split(":"))
        time(hour, minute)
    except ValueError:
        raise ValueError("Invalid time")
    return v


def _validate_datetime_string(v: str) -> str:
    """Validate YYYY-MM-DDTHH:MM:SS format"""
    if not re.match(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$", v):
        raise ValueError("DateTime must be in YYYY-MM-DDTHH:MM:SS format")
    try:
        datetime.fromisoformat(v)
    except ValueError:
        raise ValueError("Invalid datetime")
    return v


DateString = Annotated[str, AfterValidator(_validate_date_string)]
TimeString = Annotated[str, AfterValidator(_validate_time_string)]
DateTimeString = Annotated[str, AfterValidator(_validate_datetime_string)]
