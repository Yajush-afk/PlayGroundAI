from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.dependencies import get_league_service
from app.api.routes.admin_league import router as admin_league_router
from app.api.routes.debate import router as debate_router
from app.api.routes.health import router as health_router
from app.api.routes.judge import router as judge_router
from app.api.routes.league import router as league_router
from app.core.config import get_settings
from app.middleware.request_id import RequestIdMiddleware
from app.services.league_auto_runner import LeagueAutoRunner

settings = get_settings()
league_auto_runner: LeagueAutoRunner | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global league_auto_runner
    if settings.official_auto_run_enabled:
        league_auto_runner = LeagueAutoRunner(settings=settings, league_service=get_league_service())
        league_auto_runner.start()

    try:
        yield
    finally:
        if league_auto_runner is not None:
            await league_auto_runner.stop()


app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)
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
