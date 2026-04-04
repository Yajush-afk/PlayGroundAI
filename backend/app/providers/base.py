from __future__ import annotations

from dataclasses import dataclass

import httpx


class ProviderError(Exception):
    """Base provider exception."""


class ProviderAuthError(ProviderError):
    pass


class ProviderRateLimitError(ProviderError):
    pass


class ProviderTimeoutError(ProviderError):
    pass


class ProviderResponseError(ProviderError):
    pass


class ProviderValidationError(ProviderError):
    pass


@dataclass
class StreamHandle:
    response: httpx.Response
    client: httpx.AsyncClient | None = None

    async def aiter_bytes(self):
        async for chunk in self.response.aiter_bytes():
            if chunk:
                yield chunk

    async def aclose(self) -> None:
        await self.response.aclose()
        if self.client is not None:
            await self.client.aclose()


def map_provider_error(status_code: int, detail: str) -> ProviderError:
    if status_code in {401, 403}:
        return ProviderAuthError(detail)
    if status_code == 429:
        return ProviderRateLimitError(detail)
    return ProviderResponseError(detail)
