"""ScheduleSession and LearningRecord schemas"""
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, model_validator
from app.schemas.base import DateString, TimeString


SESSION_STATUS_TRANSITIONS = {
    "open": ["pairing", "cancelled"],
    "pairing": ["confirmed", "cancelled"],
    "confirmed": ["completed", "open"],
    "completed": [],
    "cancelled": [],
}

SESSION_STATUSES = list(SESSION_STATUS_TRANSITIONS.keys())


class ScheduleSessionBase(BaseModel):
    class_type_id: UUID
    date: DateString
    start_time: TimeString
    end_time: TimeString
    venue: str
    is_cancelled: bool = False
    cancel_case_id: Optional[UUID] = None
    cancel_reason: Optional[str] = None
    note: Optional[str] = None
    session_status: str = "open"


class ScheduleSession(ScheduleSessionBase):
    id: Optional[UUID] = None
    
    def __init__(self, **data):
        if "session_status" in data:
            if data["session_status"] not in SESSION_STATUSES:
                raise ValueError(f"session_status must be one of {SESSION_STATUSES}")
        super().__init__(**data)


class SessionCreate(ScheduleSessionBase):
    pass


class SessionUpdate(BaseModel):
    class_type_id: Optional[UUID] = None
    date: Optional[DateString] = None
    start_time: Optional[TimeString] = None
    end_time: Optional[TimeString] = None
    venue: Optional[str] = None
    is_cancelled: Optional[bool] = None
    cancel_case_id: Optional[UUID] = None
    cancel_reason: Optional[str] = None
    note: Optional[str] = None
    session_status: Optional[str] = None


class LearningRecordBase(BaseModel):
    session_id: UUID
    member_id: UUID
    learner_id: UUID
    study_content: Optional[str] = None
    learner_level: Optional[str] = None
    attended: bool = True
    absence_reason: Optional[str] = None
    note: Optional[str] = None


class LearningRecord(LearningRecordBase):
    id: Optional[UUID] = None
    
    @model_validator(mode="after")
    def validate_attended_consistency(self):
        if self.attended:
            # attended=True: absence_reason must be None
            if self.absence_reason is not None:
                raise ValueError("absence_reason must be null when attended=True")
        else:
            # attended=False: study_content and learner_level must be None
            # and absence_reason must be set
            if self.study_content is not None:
                raise ValueError("study_content must be null when attended=False")
            if self.learner_level is not None:
                raise ValueError("learner_level must be null when attended=False")
            if self.absence_reason is None:
                raise ValueError("absence_reason is required when attended=False")
        return self


class LearningRecordCreate(LearningRecordBase):
    pass
