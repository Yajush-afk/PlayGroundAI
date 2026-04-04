from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request

from app.api.dependencies import get_judge_service, get_usage_service, resolve_debate_id, resolve_session_id, throttle_request
from app.domain.schemas import ErrorResponse, JudgeRequest, JudgeScoresResponse
from app.providers.base import (
    ProviderAuthError,
    ProviderRateLimitError,
    ProviderResponseError,
    ProviderTimeoutError,
    ProviderValidationError,
)
from app.services.judge_service import JudgeService
from app.services.usage_service import SessionUsageService, UsagePolicyError

router = APIRouter(prefix="/api", tags=["judge"])


@router.post(
    "/judge",
    response_model=JudgeScoresResponse,
    response_model_by_alias=True,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}, 429: {"model": ErrorResponse}, 502: {"model": ErrorResponse}, 504: {"model": ErrorResponse}},
)
async def judge_debate(
    request: Request,
    payload: JudgeRequest,
    _: None = Depends(throttle_request),
    service: JudgeService = Depends(get_judge_service),
    usage_service: SessionUsageService = Depends(get_usage_service),
):
    debate_id = resolve_debate_id(request)
    if not debate_id:
        raise HTTPException(status_code=400, detail="Missing x-playground-debate-id header")

    try:
        await usage_service.enforce_judge_policy(
            session_id=resolve_session_id(request),
            debate_id=debate_id,
            payload=payload,
        )
    except UsagePolicyError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    try:
        result = await service.judge_debate(payload)
    except ProviderAuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except ProviderRateLimitError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    except ProviderTimeoutError as exc:
        raise HTTPException(status_code=504, detail=str(exc)) from exc
    except (ProviderResponseError, ProviderValidationError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return result.model_dump(by_alias=True)
