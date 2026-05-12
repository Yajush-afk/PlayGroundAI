from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.dependencies import get_league_service
from app.domain.league_schemas import GameType, LeagueStateResponse
from app.services.league_service import LeagueService

router = APIRouter(prefix="/api", tags=["league"])


@router.get("/league/state", response_model=LeagueStateResponse, response_model_by_alias=True)
async def league_state(service: LeagueService = Depends(get_league_service)):
    return (await service.get_state()).model_dump(by_alias=True)


@router.get("/league/live")
async def league_live(service: LeagueService = Depends(get_league_service)):
    return (await service.get_live_state()).model_dump(by_alias=True)


@router.get("/matches")
async def list_matches(
    game_type: GameType | None = Query(default=None, alias="gameType"),
    limit: int = Query(default=10, ge=1, le=50),
    service: LeagueService = Depends(get_league_service),
):
    return await service.list_matches(game_type=game_type, limit=limit)


@router.get("/matches/{match_id}")
async def match_detail(match_id: str, service: LeagueService = Depends(get_league_service)):
    detail = await service.get_match_detail(match_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="Match not found")
    return detail


@router.get("/leaderboard")
async def leaderboard(
    season_id: str | None = Query(default=None, alias="seasonId"),
    game_type: GameType | None = Query(default=None, alias="gameType"),
    service: LeagueService = Depends(get_league_service),
):
    return await service.get_leaderboard(season_id=season_id, game_type=game_type)
