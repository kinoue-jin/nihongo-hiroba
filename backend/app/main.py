"""
Nihongo Hiroba FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import os

from app.middleware.rate_limit import limiter

# Import schemas to make them available
from app import schemas


app = FastAPI(
    title="Nihongo Hiroba API",
    description="Backend API for Nihongo Hiroba Japanese language learning platform",
    version="1.0.0",
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/")
async def root():
    return {"message": "Nihongo Hiroba API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


# Import and include routers
from app.routers import auth, news, events, sessions, learners, members, media, stats, master, admin

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(news.router, prefix="/news", tags=["news"])
app.include_router(events.router, prefix="/events", tags=["events"])
app.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
app.include_router(learners.router, prefix="/learners", tags=["learners"])
app.include_router(members.router, prefix="/members", tags=["members"])
app.include_router(media.router, prefix="/media", tags=["media"])
app.include_router(stats.router, prefix="/stats", tags=["stats"])
app.include_router(master.router, prefix="/master", tags=["master"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
