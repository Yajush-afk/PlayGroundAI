from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.api.dependencies import get_debate_service, throttle_request
from app.domain.schemas import DebateTurnRequest, ErrorResponse
from app.providers.base import ProviderAuthError, ProviderRateLimitError, ProviderResponseError, ProviderTimeoutError
from app.services.debate_service import DebateService

router = APIRouter(prefix="/api", tags=["debate"])


@router.post(
    "/debate",
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}, 429: {"model": ErrorResponse}, 502: {"model": ErrorResponse}, 504: {"model": ErrorResponse}},
)
async def debate_turn(
    payload: DebateTurnRequest,
    _: None = Depends(throttle_request),
    service: DebateService = Depends(get_debate_service),
):
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
