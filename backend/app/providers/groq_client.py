from __future__ import annotations

from typing import Any

import httpx

from app.providers.base import ProviderAuthError, ProviderTimeoutError, StreamHandle, map_provider_error


class GroqClient:
    def __init__(self, api_key: str | None, timeout_seconds: float, http_client: httpx.AsyncClient | None = None) -> None:
        self.api_key = api_key
        self.timeout_seconds = timeout_seconds
        self.http_client = http_client
        self.url = "https://api.groq.com/openai/v1/chat/completions"

    async def open_chat_completion_stream(
        self,
        *,
        model: str,
        messages: list[dict[str, str]],
        temperature: float,
        max_tokens: int,
    ) -> StreamHandle:
        if not self.api_key:
            raise ProviderAuthError("Missing GROQ_API_KEY")

        client = self.http_client or httpx.AsyncClient(timeout=httpx.Timeout(self.timeout_seconds, connect=10.0))
        owns_client = self.http_client is None

        try:
            request = client.build_request(
                "POST",
                self.url,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}",
                },
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "stream": True,
                },
            )
            response = await client.send(request, stream=True)
        except httpx.TimeoutException as exc:
            if owns_client:
                await client.aclose()
            raise ProviderTimeoutError("Groq request timed out") from exc

        if response.status_code >= 400:
            detail = (await response.aread()).decode("utf-8", errors="replace")
            await response.aclose()
            if owns_client:
                await client.aclose()
            raise map_provider_error(response.status_code, detail)

        return StreamHandle(response=response, client=client if owns_client else None)

    async def generate_chat_completion_text(
        self,
        *,
        model: str,
        messages: list[dict[str, str]],
        temperature: float,
        max_tokens: int,
    ) -> str:
        if not self.api_key:
            raise ProviderAuthError("Missing GROQ_API_KEY")

        client = self.http_client or httpx.AsyncClient(timeout=httpx.Timeout(self.timeout_seconds, connect=10.0))
        owns_client = self.http_client is None

        try:
            response = await client.post(
                self.url,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}",
                },
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "stream": False,
                },
            )
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError("Groq request timed out") from exc
        finally:
            if owns_client:
                await client.aclose()

        if response.status_code >= 400:
            raise map_provider_error(response.status_code, response.text)

        data: dict[str, Any] = response.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content")
        if not content:
            raise ProviderResponseError("No text returned from Groq")
        return str(content).strip()
