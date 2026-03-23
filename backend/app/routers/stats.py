"""Stats router"""
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
from app.schemas.stat import Stat, StatCreate, StatUpdate
from app.middleware.rate_limit import limiter, GENERAL_RATE_LIMIT

router = APIRouter()


class StatResponse(BaseModel):
    id: str
    period_start: str
    period_end: str
    granularity: str
    class_type_id: str
    total_sessions: int
    total_attendees: int
    breakdown: dict
    is_manual_override: bool
    manual_note: Optional[str]


@router.get("/", response_model=List[StatResponse])
@limiter.limit(GENERAL_RATE_LIMIT)
async def list_stats(
    request: Request,
    class_type_id: Optional[UUID] = None,
    granularity: Optional[str] = None,
    period_start: Optional[str] = None,
    period_end: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """List stats (public endpoint)"""
    supabase = get_supabase_client()

    query = supabase.from_("stats").select("*")

    if class_type_id:
        query = query.eq("class_type_id", str(class_type_id))
    if granularity:
        query = query.eq("granularity", granularity)
    if period_start:
        query = query.gte("period_start", period_start)
    if period_end:
        query = query.lte("period_end", period_end)

    query = query.order("period_start", desc=True).range(offset, offset + limit - 1)

    response = query.execute()
    return response.data


@router.get("/{stat_id}", response_model=StatResponse)
@limiter.limit(GENERAL_RATE_LIMIT)
async def get_stat(request: Request, stat_id: UUID):
    """Get a single stat by ID (public)"""
    supabase = get_supabase_client()

    response = supabase.from_("stats").select("*").eq("id", str(stat_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stat not found",
        )

    return response.data[0]


@router.post("/", response_model=StatResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(GENERAL_RATE_LIMIT)
async def create_stat(
    request: Request,
    stat_data: StatCreate,
    user: TokenPayload = Depends(require_staff),
):
    """Create a new stat entry (staff only)"""
    supabase = get_supabase_admin_client()

    stat_dict = stat_data.model_dump()
    stat_dict["class_type_id"] = str(stat_dict["class_type_id"])

    response = supabase.from_("stats").insert(stat_dict).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create stat",
        )

    return response.data[0]


@router.put("/{stat_id}", response_model=StatResponse)
@limiter.limit(GENERAL_RATE_LIMIT)
async def update_stat(
    request: Request,
    stat_id: UUID,
    stat_data: StatUpdate,
    user: TokenPayload = Depends(require_staff),
):
    """
    Update a stat entry (staff only).

    Only allows updating specific fields to prevent mass assignment.
    Sensitive fields like is_manual_override require admin role.
    """
    supabase = get_supabase_admin_client()

    update_dict = {k: v for k, v in stat_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    # is_manual_override and manual_note can only be updated by admin
    user_role = user.app_metadata.get("role", "")
    if user_role != "admin":
        protected_fields = {"is_manual_override", "manual_note"}
        requested_protected = set(update_dict.keys()) & protected_fields
        if requested_protected:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admin can update is_manual_override or manual_note fields",
            )

    response = supabase.from_("stats").update(update_dict).eq("id", str(stat_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stat not found",
        )

    return response.data[0]


@router.delete("/{stat_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(GENERAL_RATE_LIMIT)
async def delete_stat(
    request: Request,
    stat_id: UUID,
    user: TokenPayload = Depends(require_staff),
):
    """Delete a stat entry (staff only)"""
    supabase = get_supabase_admin_client()

    response = supabase.from_("stats").delete().eq("id", str(stat_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stat not found",
        )
