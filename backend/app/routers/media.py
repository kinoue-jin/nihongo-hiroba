"""Media router with file upload, sanitization and MIME validation"""
import uuid
import os
import mimetypes
from typing import Optional, List

try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Form
from pydantic import BaseModel

from app.dependencies import (
    get_current_user,
    get_supabase_client,
    get_supabase_admin_client,
    require_staff,
    TokenPayload,
)
from app.schemas.media import Media, MediaCreate, ALLOWED_MIME_TYPES
from app.middleware.rate_limit import limiter, UPLOAD_RATE_LIMIT, GENERAL_RATE_LIMIT
from app.services.storage import StorageService

router = APIRouter()

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "pdf"}


def sanitize_filename(original: str) -> str:
    """
    Sanitize uploaded filename to prevent security issues.

    Rules:
    - Only allow specific extensions
    - Generate UUID-based filename to prevent collisions and path traversal
    """
    ext = original.rsplit(".", 1)[-1].lower() if "." in original else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension not allowed. Allowed: {ALLOWED_EXTENSIONS}",
        )
    return f"{uuid.uuid4()}.{ext}"


def validate_mime_type(file_content: bytes, filename: Optional[str] = None) -> str:
    """
    Validate MIME type using python-magic.

    Checks the actual file content, not just the extension.
    Falls back to filename-based detection if python-magic is not available.
    """
    if MAGIC_AVAILABLE:
        actual_mime = magic.from_buffer(file_content, mime=True)
    else:
        # Fallback: determine MIME type from file extension
        if filename:
            mime_type, _ = mimetypes.guess_type(filename)
            actual_mime = mime_type or 'application/octet-stream'
        else:
            actual_mime = 'application/octet-stream'

    if actual_mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed: {ALLOWED_MIME_TYPES}, got: {actual_mime}",
        )
    return actual_mime


class MediaResponse(BaseModel):
    id: str
    filename: str
    url: str
    thumbnail_url: Optional[str]
    mime_type: str
    size: int
    caption: Optional[str]
    credit: Optional[str]
    taken_at: Optional[str]
    uploaded_at: str
    uploaded_by_member_id: Optional[str]
    uploaded_by_learner_id: Optional[str]
    is_public: bool


class PublicMediaResponse(BaseModel):
    """Public media info - excludes internal IDs"""
    filename: str
    url: str
    thumbnail_url: Optional[str]
    mime_type: str
    size: int
    caption: Optional[str]
    credit: Optional[str]
    taken_at: Optional[str]
    uploaded_at: str
    is_public: bool


class SignedUrlResponse(BaseModel):
    url: str
    expires_in: int = 3600


@router.get("/", response_model=List[PublicMediaResponse])
@limiter.limit(GENERAL_RATE_LIMIT)
async def list_media(
    request: Request,
    is_public: Optional[bool] = True,
    limit: int = 50,
    offset: int = 0,
):
    """List public media (public endpoint - excludes internal IDs)"""
    supabase = get_supabase_client()

    query = supabase.from_("media").select("filename,url,thumbnail_url,mime_type,size,caption,credit,taken_at,uploaded_at,is_public").eq("is_public", is_public)
    query = query.range(offset, offset + limit - 1)

    response = query.execute()
    return response.data


@router.get("/{media_id}", response_model=MediaResponse)
@limiter.limit(GENERAL_RATE_LIMIT)
async def get_media(request: Request, media_id: UUID):
    """Get a single media item by ID (public - only if is_public)"""
    supabase = get_supabase_client()

    response = supabase.from_("media").select("*").eq("id", str(media_id)).eq("is_public", True).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media not found or not public",
        )

    return response.data[0]


@router.get("/{media_id}/signed-url", response_model=SignedUrlResponse)
@limiter.limit(GENERAL_RATE_LIMIT)
async def get_signed_url(
    request: Request,
    media_id: UUID,
    user: TokenPayload = Depends(get_current_user),
):
    """
    Get a signed URL for private media (authenticated users only).

    Private media (is_public=false) requires a signed URL for access.
    Signed URLs expire after 1 hour.
    Only the uploader or staff/admin can access private media signed URLs.
    """
    supabase = get_supabase_client()

    response = supabase.from_("media").select("*").eq("id", str(media_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media not found",
        )

    media = response.data[0]

    if media["is_public"]:
        return SignedUrlResponse(url=media["url"], expires_in=31536000)  # 1 year for public

    # Check authorization - user must own the media or be staff/admin
    user_role = user.app_metadata.get("role", "")
    user_id = user.sub

    is_owner = (
        (media.get("uploaded_by_member_id") == user_id) or
        (media.get("uploaded_by_learner_id") == user_id)
    )
    is_staff_or_admin = user_role in ("staff", "admin")

    if not is_owner and not is_staff_or_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this media",
        )

    # For private media, generate signed URL
    storage_service = StorageService()
    signed_url = storage_service.generate_signed_url(media["url"])

    return SignedUrlResponse(url=signed_url, expires_in=3600)


@router.post("/", response_model=MediaResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(UPLOAD_RATE_LIMIT)
async def upload_media(
    request: Request,
    file: UploadFile = File(...),
    filename: str = Form(...),
    mime_type: str = Form(...),
    size: int = Form(...),
    is_public: bool = Form(False),
    caption: Optional[str] = Form(None),
    credit: Optional[str] = Form(None),
    taken_at: Optional[str] = Form(None),
    uploaded_by_member_id: Optional[UUID] = Form(None),
    uploaded_by_learner_id: Optional[UUID] = Form(None),
    user: TokenPayload = Depends(get_current_user),
):
    """
    Upload a media file with validation.

    - Validates MIME type using python-magic
    - Sanitizes filename
    - Stores in appropriate bucket (public/private)
    """
    # Read file content
    content = await file.read()

    # Validate MIME type against actual content
    validated_mime = validate_mime_type(content, filename)

    # Verify mime_type parameter matches actual content
    if mime_type != validated_mime:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"MIME type mismatch. Header claimed {mime_type}, but actual content is {validated_mime}",
        )

    # Verify file size
    if len(content) != size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Size mismatch. Header claimed {size}, but actual size is {len(content)}",
        )

    # Sanitize filename
    safe_filename = sanitize_filename(filename)

    # Determine uploader (XOR validation)
    has_member = uploaded_by_member_id is not None
    has_learner = uploaded_by_learner_id is not None

    if has_member and has_learner:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot specify both uploaded_by_member_id and uploaded_by_learner_id",
        )
    if not has_member and not has_learner:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either uploaded_by_member_id or uploaded_by_learner_id is required",
        )

    # Upload to storage
    storage_service = StorageService()
    url = storage_service.upload_file(content, safe_filename, mime_type, is_public)

    # Create database record
    supabase = get_supabase_admin_client()

    media_data = {
        "filename": safe_filename,
        "url": url,
        "mime_type": mime_type,
        "size": size,
        "is_public": is_public,
        "uploaded_at": __import__("datetime").datetime.utcnow().isoformat(),
    }

    if caption:
        media_data["caption"] = caption
    if credit:
        media_data["credit"] = credit
    if taken_at:
        media_data["taken_at"] = taken_at
    if uploaded_by_member_id:
        media_data["uploaded_by_member_id"] = str(uploaded_by_member_id)
    if uploaded_by_learner_id:
        media_data["uploaded_by_learner_id"] = str(uploaded_by_learner_id)

    response = supabase.from_("media").insert(media_data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create media record",
        )

    return response.data[0]


@router.delete("/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(GENERAL_RATE_LIMIT)
async def delete_media(
    request: Request,
    media_id: UUID,
    user: TokenPayload = Depends(require_staff),
):
    """Delete a media item (staff only)"""
    supabase = get_supabase_admin_client()

    # Get media to delete file from storage
    response = supabase.from_("media").select("*").eq("id", str(media_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media not found",
        )

    # Delete from storage
    storage_service = StorageService()
    storage_service.delete_file(response.data[0]["url"])

    # Delete database record
    supabase.from_("media").delete().eq("id", str(media_id)).execute()
