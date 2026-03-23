"""SlowAPI rate limiting middleware"""
import os
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse


def get_limiter() -> Limiter:
    """Create and configure rate limiter"""
    trusted_proxies_str = os.getenv("TRUSTED_PROXIES", "")
    if trusted_proxies_str:
        def get_real_ip(request: Request) -> str:
            forwarded_for = request.headers.get("X-Forwarded-For")
            if forwarded_for:
                trusted = [p.strip() for p in trusted_proxies_str.split(",") if p.strip()]
                ips = [ip.strip() for ip in forwarded_for.split(",")]
                for ip in reversed(ips):
                    if ip not in trusted:
                        return ip
            return get_remote_address(request)
        limiter = Limiter(key_func=get_real_ip)
    else:
        limiter = Limiter(key_func=get_remote_address)
    return limiter


limiter = get_limiter()


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Custom handler for rate limit exceeded errors"""
    return JSONResponse(
        status_code=429,
        content={
            "detail": f"Rate limit exceeded: {exc.detail}",
            "retry_after": getattr(exc, "retry_after", None),
        },
    )


# Rate limit constants
LOGIN_RATE_LIMIT = "5/minute"
INVITE_RATE_LIMIT = "10/hour"
UPLOAD_RATE_LIMIT = "20/hour"
GENERAL_RATE_LIMIT = "100/minute"
ROLE_CHANGE_RATE_LIMIT = "5/hour"
