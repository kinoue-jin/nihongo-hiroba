"""FastAPI dependencies for authentication and Supabase client factory"""
import os
import jwt
from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise ValueError("JWT_SECRET environment variable is not set")

security = HTTPBearer(auto_error=False)


class TokenPayload:
    def __init__(
        self,
        sub: str,
        role: str,
        app_metadata: dict,
        aud: str,
    ):
        self.sub = sub
        self.role = role
        self.app_metadata = app_metadata
        self.aud = aud


def decode_token(token: str) -> TokenPayload:
    """Decode and validate JWT token"""
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return TokenPayload(
            sub=payload.get("sub", ""),
            role=payload.get("role", ""),
            app_metadata=payload.get("app_metadata", {}),
            aud=payload.get("aud", ""),
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {e}",
        )


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> TokenPayload:
    """Get current authenticated user from JWT token"""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return decode_token(credentials.credentials)


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[TokenPayload]:
    """Get current user if authenticated, None otherwise"""
    if credentials is None:
        return None
    return decode_token(credentials.credentials)


def require_role(required_roles: list[str]):
    """Dependency factory for role-based access control"""
    def role_checker(user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
        user_role = user.app_metadata.get("role", "")
        if user_role not in required_roles and user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user
    return role_checker


def require_admin(user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
    """Require admin role"""
    user_role = user.app_metadata.get("role", "")
    if user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


def require_staff(user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
    """Require staff or admin role"""
    user_role = user.app_metadata.get("role", "")
    if user_role not in ("staff", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff access required",
        )
    return user


def get_supabase_client() -> Client:
    """Get Supabase client with anon key (for general API operations)"""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase configuration missing",
        )
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


def get_supabase_admin_client() -> Client:
    """Get Supabase admin client with service role key (for privileged operations)"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase admin configuration missing",
        )
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def get_client_ip(request: Request) -> str:
    """Get client IP from request, handling X-Forwarded-For header"""
    trusted_proxies = os.getenv("TRUSTED_PROXIES", "").split(",")
    if trusted_proxies:
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            ips = [ip.strip() for ip in forwarded_for.split(",")]
            for ip in reversed(ips):
                if ip not in trusted_proxies:
                    return ip
    return request.client.host if request.client else "unknown"
