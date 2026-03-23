"""Events router"""
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
from app.schemas.event import Event, EventCreate, EventUpdate
from app.middleware.rate_limit import limiter, GENERAL_RATE_LIMIT

router = APIRouter()


class EventResponse(BaseModel):
    id: str
    title: str
    event_type_id: str
    date: str
    start_time: str
    end_time: str
    venue: str
    max_capacity: Optional[int]
    actual_attendees: Optional[int]
    host_member_id: str
    report_id: Optional[str]


@router.get("/", response_model=List[EventResponse])
@limiter.limit(GENERAL_RATE_LIMIT)
async def list_events(
    request: Request,
    event_type_id: Optional[UUID] = None,
    date: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """List events (public endpoint)"""
    supabase = get_supabase_client()

    query = supabase.from_("events").select("*")

    if event_type_id:
        query = query.eq("event_type_id", str(event_type_id))
    if date:
        query = query.eq("date", date)

    query = query.order("date", desc=True).range(offset, offset + limit - 1)

    response = query.execute()
    return response.data


@router.get("/{event_id}", response_model=EventResponse)
@limiter.limit(GENERAL_RATE_LIMIT)
async def get_event(request: Request, event_id: UUID):
    """Get a single event by ID (public)"""
    supabase = get_supabase_client()

    response = supabase.from_("events").select("*").eq("id", str(event_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    return response.data[0]


# Staff-only endpoints below

@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(GENERAL_RATE_LIMIT)
async def create_event(
    request: Request,
    event_data: EventCreate,
    user: TokenPayload = Depends(require_staff),
):
    """Create a new event (staff only)"""
    supabase = get_supabase_admin_client()

    event_dict = event_data.model_dump()
    event_dict["event_type_id"] = str(event_dict["event_type_id"])
    event_dict["host_member_id"] = str(event_dict["host_member_id"])

    response = supabase.from_("events").insert(event_dict).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create event",
        )

    return response.data[0]


@router.put("/{event_id}", response_model=EventResponse)
@limiter.limit(GENERAL_RATE_LIMIT)
async def update_event(
    request: Request,
    event_id: UUID,
    event_data: EventUpdate,
    user: TokenPayload = Depends(require_staff),
):
    """Update an event (staff only)"""
    supabase = get_supabase_admin_client()

    update_dict = {k: v for k, v in event_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    response = supabase.from_("events").update(update_dict).eq("id", str(event_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    return response.data[0]


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(GENERAL_RATE_LIMIT)
async def delete_event(
    request: Request,
    event_id: UUID,
    user: TokenPayload = Depends(require_staff),
):
    """Delete an event (staff only)"""
    supabase = get_supabase_admin_client()

    response = supabase.from_("events").delete().eq("id", str(event_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )
