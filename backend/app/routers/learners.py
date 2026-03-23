"""Learners router"""
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel

from app.dependencies import (
    get_current_user,
    get_supabase_client,
    get_supabase_admin_client,
    require_staff,
    require_admin,
    TokenPayload,
)
from app.schemas.learner import Learner, LearnerCreate, LearnerUpdate, LearnerAdminUpdate, PublicLearnerResponse
from app.middleware.rate_limit import limiter, GENERAL_RATE_LIMIT

router = APIRouter()


@router.get("/", response_model=List[PublicLearnerResponse])
@limiter.limit(GENERAL_RATE_LIMIT)
async def list_public_learners(
    request: Request,
    limit: int = 50,
    offset: int = 0,
):
    """List public learners (public endpoint - only returns public info)"""
    supabase = get_supabase_client()

    response = supabase.from_("public_learners").select("*").range(offset, offset + limit - 1).execute()

    return response.data


@router.get("/{learner_id}", response_model=PublicLearnerResponse)
@limiter.limit(GENERAL_RATE_LIMIT)
async def get_public_learner(request: Request, learner_id: UUID):
    """Get a single public learner by ID (public - only returns public info)"""
    supabase = get_supabase_client()

    response = supabase.from_("public_learners").select("*").eq("id", str(learner_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learner not found or not public",
        )

    return response.data[0]


# Staff-only endpoints below

@router.get("/internal/all", response_model=List[dict])
@limiter.limit(GENERAL_RATE_LIMIT)
async def list_all_learners(
    request: Request,
    user: TokenPayload = Depends(require_staff),
    invitation_status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """List all learners with full details (staff only)"""
    supabase = get_supabase_admin_client()

    query = supabase.from_("learners").select("*")

    if invitation_status:
        query = query.eq("invitation_status", invitation_status)

    query = query.range(offset, offset + limit - 1)

    response = query.execute()
    return response.data


@router.get("/internal/{learner_id}", response_model=dict)
@limiter.limit(GENERAL_RATE_LIMIT)
async def get_learner_internal(
    request: Request,
    learner_id: UUID,
    user: TokenPayload = Depends(require_staff),
):
    """Get a learner by ID with full details (staff only)"""
    supabase = get_supabase_admin_client()

    response = supabase.from_("learners").select("*").eq("id", str(learner_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learner not found",
        )

    return response.data[0]


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
@limiter.limit(GENERAL_RATE_LIMIT)
async def create_learner(
    request: Request,
    learner_data: LearnerCreate,
    user: TokenPayload = Depends(require_staff),
):
    """
    Create a new learner (staff only).

    Learners should be created with invitation_status='pending' and then
    the invitation flow should be initiated via the /internal/{learner_id}/invite endpoint.
    Direct creation with other statuses bypasses the invitation workflow.
    """
    supabase = get_supabase_admin_client()

    learner_dict = learner_data.model_dump()
    learner_dict["email"] = str(learner_dict["email"])

    # Validate invitation_status is pending (must go through invitation flow)
    if learner_dict.get("invitation_status") != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Learner must be created with invitation_status='pending'. Use the invitation flow.",
        )

    response = supabase.from_("learners").insert(learner_dict).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create learner",
        )

    return response.data[0]


@router.put("/{learner_id}", response_model=dict)
@limiter.limit(GENERAL_RATE_LIMIT)
async def update_learner(
    request: Request,
    learner_id: UUID,
    learner_data: LearnerUpdate,
    user: TokenPayload = Depends(require_staff),
):
    """
    Update a learner (staff only).

    Only allows updating non-sensitive fields. For sensitive fields
    like invitation_status, use the /admin endpoint.
    """
    supabase = get_supabase_admin_client()

    update_dict = {k: v for k, v in learner_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    response = supabase.from_("learners").update(update_dict).eq("id", str(learner_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learner not found",
        )

    return response.data[0]


@router.put("/{learner_id}/admin", response_model=dict)
@limiter.limit(GENERAL_RATE_LIMIT)
async def update_learner_admin(
    request: Request,
    learner_id: UUID,
    admin_data: LearnerAdminUpdate,
    user: TokenPayload = Depends(require_admin),
):
    """
    Update a learner - admin only for sensitive fields.

    Only allows updating sensitive fields: invitation_status, supabase_user_id.
    """
    supabase = get_supabase_admin_client()

    update_dict = {k: v for k, v in admin_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    # Validate invitation_status if provided
    if "invitation_status" in update_dict:
        from app.schemas.learner import INVITATION_STATUSES
        if update_dict["invitation_status"] not in INVITATION_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid invitation_status. Must be one of {INVITATION_STATUSES}",
            )

    response = supabase.from_("learners").update(update_dict).eq("id", str(learner_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learner not found",
        )

    return response.data[0]


@router.delete("/{learner_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(GENERAL_RATE_LIMIT)
async def delete_learner(
    request: Request,
    learner_id: UUID,
    user: TokenPayload = Depends(require_staff),
):
    """Delete a learner (staff only)"""
    supabase = get_supabase_admin_client()

    response = supabase.from_("learners").delete().eq("id", str(learner_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learner not found",
        )
