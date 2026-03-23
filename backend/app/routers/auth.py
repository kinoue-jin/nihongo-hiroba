"""Authentication router"""
import jwt
import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel

from app.dependencies import (
    get_current_user,
    get_supabase_admin_client,
    TokenPayload,
    get_client_ip,
)
from app.middleware.rate_limit import limiter, LOGIN_RATE_LIMIT

router = APIRouter()

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise ValueError("JWT_SECRET environment variable is not set")
JWT_ALGORITHM = "HS256"
JWT_AUDIENCE = "authenticated"


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


def create_access_token(user_id: str, role: str, email: str) -> tuple[str, int]:
    """Create a JWT access token"""
    expires_in = 3600  # 1 hour
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "app_metadata": {"role": role},
        "aud": JWT_AUDIENCE,
        "exp": datetime.utcnow() + timedelta(seconds=expires_in),
        "iat": datetime.utcnow(),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token, expires_in


@router.post("/login", response_model=LoginResponse)
@limiter.limit(LOGIN_RATE_LIMIT)
async def login(request: Request, login_data: LoginRequest):
    """
    Login endpoint - authenticates user and returns JWT token.

    Uses Supabase Auth to verify password credentials.
    """
    supabase = get_supabase_admin_client()

    try:
        # Verify password using Supabase Auth
        auth_response = supabase.auth.sign_in_with_password(
            email=login_data.email,
            password=login_data.password,
        )

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )

        # Get user metadata from auth response
        supabase_user_id = auth_response.user.id
        id_token = auth_response.session.access_token

        # Try to find the user in our members table by supabase_user_id
        response = supabase.from_("members").select("*").eq("supabase_user_id", supabase_user_id).execute()
        if response.data:
            user = response.data[0]
            role = "admin" if user.get("admin_role") else "staff"
            user_id = str(user["id"])
            # Verify email matches
            verified_email = user.get("email")
        else:
            # Check learners table
            response = supabase.from_("learners").select("*").eq("supabase_user_id", supabase_user_id).execute()
            if response.data:
                user = response.data[0]
                role = "learner"
                user_id = str(user["id"])
                # Verify email matches
                verified_email = user.get("email")
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found in system",
                )

        # Use verified email from database, not from request
        token, expires_in = create_access_token(user_id, role, verified_email)

        return LoginResponse(
            access_token=token,
            expires_in=expires_in,
            user={
                "id": user_id,
                "email": verified_email,
                "role": role,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
        )


@router.get("/me", response_model=dict)
async def get_me(user: TokenPayload = Depends(get_current_user)):
    """Get current user info from JWT token"""
    return {
        "id": user.sub,
        "role": user.role,
        "email": getattr(user, "email", None),
    }


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(user: TokenPayload = Depends(get_current_user)):
    """Refresh the access token"""
    token, expires_in = create_access_token(user.sub, user.role, getattr(user, "email", ""))
    return TokenResponse(
        access_token=token,
        expires_in=expires_in,
    )
