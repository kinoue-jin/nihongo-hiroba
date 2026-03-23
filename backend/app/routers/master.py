"""Master items router"""
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
from app.schemas.master import MasterItem, MasterItemResponse, ALLOWED_GROUP_KEYS
from app.middleware.rate_limit import limiter, GENERAL_RATE_LIMIT

router = APIRouter()


@router.get("/", response_model=List[MasterItemResponse])
@limiter.limit(GENERAL_RATE_LIMIT)
async def list_master_items(
    request: Request,
    group_key: Optional[str] = None,
    is_active: Optional[bool] = True,
    limit: int = 100,
    offset: int = 0,
):
    """
    List master items (public endpoint).

    Can filter by group_key and is_active status.
    """
    supabase = get_supabase_client()

    query = supabase.from_("master_items").select("*")

    if group_key:
        if group_key not in ALLOWED_GROUP_KEYS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid group_key. Must be one of {ALLOWED_GROUP_KEYS}",
            )
        query = query.eq("group_key", group_key)

    if is_active is not None:
        query = query.eq("is_active", is_active)

    query = query.order("order").range(offset, offset + limit - 1)

    response = query.execute()
    return response.data


@router.get("/{item_id}", response_model=MasterItemResponse)
@limiter.limit(GENERAL_RATE_LIMIT)
async def get_master_item(request: Request, item_id: UUID):
    """Get a single master item by ID (public)"""
    supabase = get_supabase_client()

    response = supabase.from_("master_items").select("*").eq("id", str(item_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Master item not found",
        )

    return response.data[0]


@router.post("/", response_model=MasterItemResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(GENERAL_RATE_LIMIT)
async def create_master_item(
    request: Request,
    item_data: MasterItem,
    user: TokenPayload = Depends(require_staff),
):
    """Create a new master item (staff only)"""
    supabase = get_supabase_admin_client()

    item_dict = item_data.model_dump()

    # Validate group_key
    if item_dict["group_key"] not in ALLOWED_GROUP_KEYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid group_key. Must be one of {ALLOWED_GROUP_KEYS}",
        )

    response = supabase.from_("master_items").insert(item_dict).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create master item",
        )

    return response.data[0]


@router.put("/{item_id}", response_model=MasterItemResponse)
@limiter.limit(GENERAL_RATE_LIMIT)
async def update_master_item(
    request: Request,
    item_id: UUID,
    item_data: dict,
    user: TokenPayload = Depends(require_staff),
):
    """Update a master item (staff only)"""
    supabase = get_supabase_admin_client()

    update_dict = {k: v for k, v in item_data.items() if v is not None}
    if not update_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    # Validate group_key if provided
    if "group_key" in update_dict and update_dict["group_key"] not in ALLOWED_GROUP_KEYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid group_key. Must be one of {ALLOWED_GROUP_KEYS}",
        )

    response = supabase.from_("master_items").update(update_dict).eq("id", str(item_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Master item not found",
        )

    return response.data[0]


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(GENERAL_RATE_LIMIT)
async def delete_master_item(
    request: Request,
    item_id: UUID,
    user: TokenPayload = Depends(require_staff),
):
    """Delete a master item (staff only)"""
    supabase = get_supabase_admin_client()

    response = supabase.from_("master_items").delete().eq("id", str(item_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Master item not found",
        )
