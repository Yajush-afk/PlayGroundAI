from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.api.dependencies import get_debate_service, get_usage_service, resolve_debate_id, resolve_session_id, throttle_request
from app.domain.schemas import DebateTurnRequest, ErrorResponse
from app.providers.base import ProviderAuthError, ProviderRateLimitError, ProviderResponseError, ProviderTimeoutError
from app.services.debate_service import DebateService
from app.services.usage_service import SessionUsageService, UsagePolicyError

router = APIRouter(prefix="/api", tags=["debate"])


@router.post(
    "/debate",
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}, 429: {"model": ErrorResponse}, 502: {"model": ErrorResponse}, 504: {"model": ErrorResponse}},
)
async def debate_turn(
    request: Request,
    payload: DebateTurnRequest,
    _: None = Depends(throttle_request),
    service: DebateService = Depends(get_debate_service),
    usage_service: SessionUsageService = Depends(get_usage_service),
):
    debate_id = resolve_debate_id(request)
    if not debate_id:
        raise HTTPException(status_code=400, detail="Missing x-playground-debate-id header")

    try:
        await usage_service.enforce_debate_policy(
            session_id=resolve_session_id(request),
            debate_id=debate_id,
            payload=payload,
        )
    except UsagePolicyError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    try:
        stream_handle = await service.start_turn_stream(payload)
    except ProviderAuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except ProviderRateLimitError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    except ProviderTimeoutError as exc:
        raise HTTPException(status_code=504, detail=str(exc)) from exc
    except ProviderResponseError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    async def iterator():
        try:
            async for chunk in stream_handle.aiter_bytes():
                yield chunk
        finally:
            await stream_handle.aclose()

    return StreamingResponse(
        iterator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
