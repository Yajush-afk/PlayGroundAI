from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_judge_service, throttle_request
from app.domain.schemas import ErrorResponse, JudgeRequest, JudgeScoresResponse
from app.providers.base import (
    ProviderAuthError,
    ProviderRateLimitError,
    ProviderResponseError,
    ProviderTimeoutError,
    ProviderValidationError,
)
from app.services.judge_service import JudgeService

router = APIRouter(prefix="/api", tags=["judge"])


@router.post(
    "/judge",
    response_model=JudgeScoresResponse,
    response_model_by_alias=True,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}, 429: {"model": ErrorResponse}, 502: {"model": ErrorResponse}, 504: {"model": ErrorResponse}},
)
async def judge_debate(
    payload: JudgeRequest,
    _: None = Depends(throttle_request),
    service: JudgeService = Depends(get_judge_service),
):
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
