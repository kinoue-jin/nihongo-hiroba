"""Admin router for system-wide operations"""
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel

from app.dependencies import (
    get_current_user,
    get_supabase_admin_client,
    require_admin,
    require_staff,
    TokenPayload,
)
from app.middleware.rate_limit import limiter, GENERAL_RATE_LIMIT, ROLE_CHANGE_RATE_LIMIT

router = APIRouter()


class SystemStatsResponse(BaseModel):
    total_members: int
    active_members: int
    total_learners: int
    active_learners: int
    total_sessions: int
    total_events: int
    total_media: int


@router.get("/stats", response_model=SystemStatsResponse)
@limiter.limit(GENERAL_RATE_LIMIT)
async def get_system_stats(
    request: Request,
    user: TokenPayload = Depends(require_staff),
):
    """Get system-wide statistics (staff only)"""
    supabase = get_supabase_admin_client()

    stats = {}

    # Count members
    response = supabase.from_("members").select("id", count="exact").execute()
    stats["total_members"] = response.count if hasattr(response, 'count') else len(response.data)

    # Count active members
    response = supabase.from_("members").select("id", count="exact").eq("is_active", True).execute()
    stats["active_members"] = response.count if hasattr(response, 'count') else len(response.data)

    # Count learners
    response = supabase.from_("learners").select("id", count="exact").execute()
    stats["total_learners"] = response.count if hasattr(response, 'count') else len(response.data)

    # Count active learners (invitation_status = 'active')
    response = supabase.from_("learners").select("id", count="exact").eq("invitation_status", "active").execute()
    stats["active_learners"] = response.count if hasattr(response, 'count') else len(response.data)

    # Count sessions
    response = supabase.from_("schedule_sessions").select("id", count="exact").execute()
    stats["total_sessions"] = response.count if hasattr(response, 'count') else len(response.data)

    # Count events
    response = supabase.from_("events").select("id", count="exact").execute()
    stats["total_events"] = response.count if hasattr(response, 'count') else len(response.data)

    # Count media
    response = supabase.from_("media").select("id", count="exact").execute()
    stats["total_media"] = response.count if hasattr(response, 'count') else len(response.data)

    return stats


@router.get("/users", response_model=List[dict])
@limiter.limit(GENERAL_RATE_LIMIT)
async def list_users(
    request: Request,
    user: TokenPayload = Depends(require_admin),
):
    """
    List all users with their roles (admin only).

    This endpoint returns aggregated user data from members and learners tables.
    """
    supabase = get_supabase_admin_client()

    # Get all members
    members_response = supabase.from_("members").select("id, email, name, admin_role, is_active, supabase_user_id").execute()
    members = [
        {
            "id": m["id"],
            "email": m["email"],
            "name": m["name"],
            "role": "admin" if m["admin_role"] else "staff",
            "is_active": m["is_active"],
            "supabase_user_id": m["supabase_user_id"],
            "type": "member",
        }
        for m in members_response.data
    ]

    # Get all learners
    learners_response = supabase.from_("learners").select("id, email, nickname, invitation_status, supabase_user_id").execute()
    learners = [
        {
            "id": l["id"],
            "email": l["email"],
            "name": l["nickname"],
            "role": "learner",
            "is_active": l["invitation_status"] == "active",
            "supabase_user_id": l["supabase_user_id"],
            "type": "learner",
        }
        for l in learners_response.data
    ]

    return members + learners


@router.post("/users/{user_id}/role", response_model=dict)
@limiter.limit(ROLE_CHANGE_RATE_LIMIT)
async def update_user_role(
    request: Request,
    user_id: UUID,
    role_data: dict,
    admin_user: TokenPayload = Depends(require_admin),
):
    """
    Update a user's role (admin only).

    Note: This only updates the role in our members table.
    Actual Supabase Auth role management requires admin API.
    """
    supabase = get_supabase_admin_client()

    new_role = role_data.get("role")
    if new_role not in ("staff", "admin"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'staff' or 'admin'",
        )

    # Check if it's a member
    response = supabase.from_("members").select("id, admin_role").eq("id", str(user_id)).execute()

    if response.data:
        # Update member
        is_admin = new_role == "admin"
        update_response = supabase.from_("members").update({"admin_role": is_admin}).eq("id", str(user_id)).execute()
        return update_response.data[0] if update_response.data else {}

    # Check if it's a learner
    response = supabase.from_("learners").select("id").eq("id", str(user_id)).execute()
    if response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change role of a learner. Learners always have 'learner' role.",
        )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="User not found",
    )


# Impersonate endpoint removed for security reasons.
# User impersonation poses significant security risks including privilege escalation.
