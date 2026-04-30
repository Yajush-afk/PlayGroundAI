from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException

from app.api.dependencies import get_league_service
from app.core.config import get_settings
from app.domain.league_schemas import AdminRunMatchRequest, AdminRunMatchResponse
from app.providers.base import ProviderAuthError, ProviderResponseError, ProviderTimeoutError, ProviderValidationError
from app.services.league_service import LeagueService

router = APIRouter(prefix="/api/admin/league", tags=["admin-league"])


@router.post("/run-match", response_model=AdminRunMatchResponse, response_model_by_alias=True)
async def run_match(
    payload: AdminRunMatchRequest,
    x_admin_league_key: str | None = Header(default=None),
    service: LeagueService = Depends(get_league_service),
):
    settings = get_settings()
    if not settings.admin_league_key:
        raise HTTPException(status_code=503, detail="Admin league key is not configured")
    if x_admin_league_key != settings.admin_league_key:
        raise HTTPException(status_code=401, detail="Invalid admin league key")

    try:
        result = await service.run_official_match(game_type=payload.game_type, dry_run=payload.dry_run)
    except ProviderAuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except ProviderTimeoutError as exc:
        raise HTTPException(status_code=504, detail=str(exc)) from exc
    except (ProviderResponseError, ProviderValidationError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return result.model_dump(by_alias=True)
