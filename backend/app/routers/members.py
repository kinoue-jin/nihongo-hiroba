"""Members router"""
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
from app.schemas.member import Member, MemberCreate, MemberUpdate, PublicMemberResponse
from app.middleware.rate_limit import limiter, GENERAL_RATE_LIMIT

router = APIRouter()


@router.get("/", response_model=List[PublicMemberResponse])
@limiter.limit(GENERAL_RATE_LIMIT)
async def list_public_members(
    request: Request,
    limit: int = 50,
    offset: int = 0,
):
    """List active public members (public endpoint - only returns public info)"""
    supabase = get_supabase_client()

    response = supabase.from_("public_members").select("*").range(offset, offset + limit - 1).execute()

    return response.data


@router.get("/{member_id}", response_model=PublicMemberResponse)
@limiter.limit(GENERAL_RATE_LIMIT)
async def get_public_member(request: Request, member_id: UUID):
    """Get a single public member by ID (public - only returns public info)"""
    supabase = get_supabase_client()

    response = supabase.from_("public_members").select("*").eq("id", str(member_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found or not public",
        )

    return response.data[0]


# Staff-only endpoints below

@router.get("/internal/all", response_model=List[dict])
@limiter.limit(GENERAL_RATE_LIMIT)
async def list_all_members(
    request: Request,
    user: TokenPayload = Depends(require_staff),
    is_active: Optional[bool] = None,
    limit: int = 50,
    offset: int = 0,
):
    """List all members with full details (staff only)"""
    supabase = get_supabase_admin_client()

    query = supabase.from_("members").select("*")

    if is_active is not None:
        query = query.eq("is_active", is_active)

    query = query.range(offset, offset + limit - 1)

    response = query.execute()
    return response.data


@router.get("/internal/{member_id}", response_model=dict)
@limiter.limit(GENERAL_RATE_LIMIT)
async def get_member_internal(
    request: Request,
    member_id: UUID,
    user: TokenPayload = Depends(require_staff),
):
    """Get a member by ID with full details (staff only)"""
    supabase = get_supabase_admin_client()

    response = supabase.from_("members").select("*").eq("id", str(member_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )

    return response.data[0]


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
@limiter.limit(GENERAL_RATE_LIMIT)
async def create_member(
    request: Request,
    member_data: MemberCreate,
    user: TokenPayload = Depends(require_staff),
):
    """Create a new member (staff only)"""
    supabase = get_supabase_admin_client()

    member_dict = member_data.model_dump()
    member_dict["role_id"] = str(member_dict["role_id"])
    member_dict["supabase_user_id"] = str(member_dict["supabase_user_id"])

    response = supabase.from_("members").insert(member_dict).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create member",
        )

    return response.data[0]


@router.put("/{member_id}", response_model=dict)
@limiter.limit(GENERAL_RATE_LIMIT)
async def update_member(
    request: Request,
    member_id: UUID,
    member_data: MemberUpdate,
    user: TokenPayload = Depends(require_staff),
):
    """Update a member (staff only)"""
    supabase = get_supabase_admin_client()

    update_dict = {k: v for k, v in member_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    response = supabase.from_("members").update(update_dict).eq("id", str(member_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )

    return response.data[0]


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(GENERAL_RATE_LIMIT)
async def delete_member(
    request: Request,
    member_id: UUID,
    user: TokenPayload = Depends(require_staff),
):
    """Delete a member (staff only)"""
    supabase = get_supabase_admin_client()

    response = supabase.from_("members").delete().eq("id", str(member_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )
