"""SessionPairing schemas with auto_score validation"""
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, model_validator
from decimal import Decimal


PAIRING_TYPES = ["auto", "manual"]
PAIRING_STATUSES = ["proposed", "confirmed", "cancelled"]


class SessionPairingBase(BaseModel):
    session_id: UUID
    member_id: UUID
    learner_id: UUID
    pairing_type: str
    auto_score: Optional[Decimal] = None
    status: str = "proposed"
    confirmed_by: Optional[UUID] = None
    confirmed_at: Optional[str] = None
    note: Optional[str] = None


class SessionPairing(SessionPairingBase):
    id: Optional[UUID] = None
    
    @model_validator(mode="after")
    def validate_pairing_type_consistency(self):
        if self.pairing_type not in PAIRING_TYPES:
            raise ValueError(f"pairing_type must be one of {PAIRING_TYPES}")
        
        if self.pairing_type == "auto" and self.auto_score is None:
            raise ValueError("auto_score is required when pairing_type is 'auto'")
        
        return self
    
    @model_validator(mode="after")
    def validate_status(self):
        if self.status not in PAIRING_STATUSES:
            raise ValueError(f"status must be one of {PAIRING_STATUSES}")
        return self


class SessionPairingCreate(SessionPairingBase):
    pass
