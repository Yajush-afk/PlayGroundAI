from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.admin_league import router as admin_league_router
from app.api.routes.debate import router as debate_router
from app.api.routes.health import router as health_router
from app.api.routes.judge import router as judge_router
from app.api.routes.league import router as league_router
from app.core.config import get_settings
from app.middleware.request_id import RequestIdMiddleware

settings = get_settings()

app = FastAPI(title=settings.app_name, debug=settings.debug)
app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(debate_router)
app.include_router(judge_router)
app.include_router(league_router)
app.include_router(admin_league_router)
