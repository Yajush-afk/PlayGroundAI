from __future__ import annotations

from uuid import uuid4

from starlette.middleware.base import BaseHTTPMiddleware


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):  # type: ignore[override]
        request_id = request.headers.get("x-request-id", str(uuid4()))
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["x-request-id"] = request_id
        return response
