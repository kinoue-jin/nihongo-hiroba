"""Schedule Sessions router"""
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel

from app.dependencies import (
    get_current_user,
    get_supabase_client,
    get_supabase_admin_client,
    require_staff,
    TokenPayload,
)
from app.schemas.session import (
    ScheduleSession,
    SessionCreate,
    SessionUpdate,
    LearningRecord,
    LearningRecordCreate,
    SESSION_STATUS_TRANSITIONS,
)
from app.middleware.rate_limit import limiter, GENERAL_RATE_LIMIT

router = APIRouter()


class SessionResponse(BaseModel):
    id: str
    class_type_id: str
    date: str
    start_time: str
    end_time: str
    venue: str
    is_cancelled: bool
    cancel_case_id: Optional[str]
    cancel_reason: Optional[str]
    note: Optional[str]
    session_status: str


class LearningRecordResponse(BaseModel):
    id: str
    session_id: str
    member_id: str
    learner_id: str
    study_content: Optional[str]
    learner_level: Optional[str]
    attended: bool
    absence_reason: Optional[str]
    note: Optional[str]


@router.get("/", response_model=List[SessionResponse])
@limiter.limit(GENERAL_RATE_LIMIT)
async def list_sessions(
    request: Request,
    class_type_id: Optional[UUID] = None,
    date: Optional[str] = None,
    session_status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """List schedule sessions (public endpoint)"""
    supabase = get_supabase_client()

    query = supabase.from_("schedule_sessions").select("*")

    if class_type_id:
        query = query.eq("class_type_id", str(class_type_id))
    if date:
        query = query.eq("date", date)
    if session_status:
        query = query.eq("session_status", session_status)

    query = query.order("date", desc=True).range(offset, offset + limit - 1)

    response = query.execute()
    return response.data


@router.get("/{session_id}", response_model=SessionResponse)
@limiter.limit(GENERAL_RATE_LIMIT)
async def get_session(request: Request, session_id: UUID):
    """Get a single session by ID (public)"""
    supabase = get_supabase_client()

    response = supabase.from_("schedule_sessions").select("*").eq("id", str(session_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    return response.data[0]


@router.post("/", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(GENERAL_RATE_LIMIT)
async def create_session(
    request: Request,
    session_data: SessionCreate,
    user: TokenPayload = Depends(require_staff),
):
    """Create a new schedule session (staff only)"""
    supabase = get_supabase_admin_client()

    session_dict = session_data.model_dump()
    session_dict["class_type_id"] = str(session_dict["class_type_id"])

    # Validate session_status if provided
    if session_dict.get("session_status"):
        if session_dict["session_status"] not in SESSION_STATUS_TRANSITIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid session_status. Must be one of {list(SESSION_STATUS_TRANSITIONS.keys())}",
            )

    response = supabase.from_("schedule_sessions").insert(session_dict).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create session",
        )

    return response.data[0]


@router.put("/{session_id}", response_model=SessionResponse)
@limiter.limit(GENERAL_RATE_LIMIT)
async def update_session(
    request: Request,
    session_id: UUID,
    session_data: SessionUpdate,
    user: TokenPayload = Depends(require_staff),
):
    """Update a schedule session (staff only)"""
    supabase = get_supabase_admin_client()

    update_dict = {k: v for k, v in session_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    # Validate session_status transition
    if "session_status" in update_dict:
        current = supabase.from_("schedule_sessions").select("session_status").eq("id", str(session_id)).execute()
        if current.data:
            current_status = current.data[0]["session_status"]
            new_status = update_dict["session_status"]
            allowed = SESSION_STATUS_TRANSITIONS.get(current_status, [])
            if new_status not in allowed:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status transition from '{current_status}' to '{new_status}'. Allowed: {allowed}",
                )

    response = supabase.from_("schedule_sessions").update(update_dict).eq("id", str(session_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    return response.data[0]


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(GENERAL_RATE_LIMIT)
async def delete_session(
    request: Request,
    session_id: UUID,
    user: TokenPayload = Depends(require_staff),
):
    """Delete a schedule session (staff only)"""
    supabase = get_supabase_admin_client()

    response = supabase.from_("schedule_sessions").delete().eq("id", str(session_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )


# Learning Records endpoints

@router.get("/{session_id}/records", response_model=List[LearningRecordResponse])
@limiter.limit(GENERAL_RATE_LIMIT)
async def list_learning_records(
    request: Request,
    session_id: UUID,
    user: TokenPayload = Depends(get_current_user),
):
    """
    List learning records for a session (staff only).

    Access is controlled by RLS policies - staff can only access records
    they are authorized to view based on the session's relationship to them.
    """
    supabase = get_supabase_client()

    # Check if user has staff access
    user_role = user.app_metadata.get("role", "")
    if user_role not in ("staff", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff access required",
        )

    # Verify the session exists and user has access via RLS
    # RLS policies enforce that staff can only access records for sessions
    # they are authorized to view
    response = supabase.from_("learning_records").select("*").eq("session_id", str(session_id)).execute()
    return response.data


@router.post("/{session_id}/records", response_model=LearningRecordResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(GENERAL_RATE_LIMIT)
async def create_learning_record(
    request: Request,
    session_id: UUID,
    record_data: LearningRecordCreate,
    user: TokenPayload = Depends(require_staff),
):
    """Create a learning record (staff only)"""
    supabase = get_supabase_admin_client()

    record_dict = record_data.model_dump()
    record_dict["session_id"] = str(session_id)
    record_dict["member_id"] = str(record_dict["member_id"])
    record_dict["learner_id"] = str(record_dict["learner_id"])

    # Validate attended consistency using Pydantic model
    try:
        record = LearningRecord(**record_dict)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    response = supabase.from_("learning_records").insert(record_dict).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create learning record",
        )

    return response.data[0]


# Generate pairings STUB - actual implementation is Agent E's job
@router.post("/{session_id}/generate-pairings", status_code=status.HTTP_501_NOT_IMPLEMENTED)
@limiter.limit(GENERAL_RATE_LIMIT)
async def generate_pairings_stub(
    request: Request,
    session_id: UUID,
    user: TokenPayload = Depends(require_staff),
):
    """
    Generate pairings for a session.

    STUB - This endpoint is not yet implemented.
    Actual pairing logic will be implemented by Agent E.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Pairing generation not yet implemented. This will be handled by Agent E.",
    )
