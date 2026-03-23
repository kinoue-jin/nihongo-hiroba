"""News router"""
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
from app.schemas.news import News, NewsCreate, NewsUpdate
from app.middleware.rate_limit import limiter, GENERAL_RATE_LIMIT

router = APIRouter()


class NewsResponse(BaseModel):
    id: str
    title: str
    body: str
    category_id: str
    published_at: str
    author: str
    is_published: bool


@router.get("/", response_model=List[NewsResponse])
@limiter.limit(GENERAL_RATE_LIMIT)
async def list_news(
    request: Request,
    is_published: Optional[bool] = True,
    category_id: Optional[UUID] = None,
    limit: int = 50,
    offset: int = 0,
):
    """List published news (public endpoint)"""
    supabase = get_supabase_client()

    query = supabase.from_("news").select("*").eq("is_published", is_published)

    if category_id:
        query = query.eq("category_id", str(category_id))

    query = query.order("published_at", desc=True).range(offset, offset + limit - 1)

    response = query.execute()

    return response.data


@router.get("/{news_id}", response_model=NewsResponse)
@limiter.limit(GENERAL_RATE_LIMIT)
async def get_news(request: Request, news_id: UUID):
    """Get a single news item by ID (public - only published)"""
    supabase = get_supabase_client()

    response = supabase.from_("news").select("*").eq("id", str(news_id)).eq("is_published", True).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="News not found",
        )

    return response.data[0]


# Staff-only endpoints below

@router.post("/", response_model=NewsResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(GENERAL_RATE_LIMIT)
async def create_news(
    request: Request,
    news_data: NewsCreate,
    user: TokenPayload = Depends(require_staff),
):
    """Create a new news item (staff only)"""
    supabase = get_supabase_admin_client()

    news_dict = news_data.model_dump()
    news_dict["category_id"] = str(news_dict["category_id"])
    news_dict["author"] = str(news_dict["author"])

    response = supabase.from_("news").insert(news_dict).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create news",
        )

    return response.data[0]


@router.put("/{news_id}", response_model=NewsResponse)
@limiter.limit(GENERAL_RATE_LIMIT)
async def update_news(
    request: Request,
    news_id: UUID,
    news_data: NewsUpdate,
    user: TokenPayload = Depends(require_staff),
):
    """Update a news item (staff only)"""
    supabase = get_supabase_admin_client()

    update_dict = {k: v for k, v in news_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    response = supabase.from_("news").update(update_dict).eq("id", str(news_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="News not found",
        )

    return response.data[0]


@router.delete("/{news_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(GENERAL_RATE_LIMIT)
async def delete_news(
    request: Request,
    news_id: UUID,
    user: TokenPayload = Depends(require_staff),
):
    """Delete a news item (staff only)"""
    supabase = get_supabase_admin_client()

    response = supabase.from_("news").delete().eq("id", str(news_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="News not found",
        )
