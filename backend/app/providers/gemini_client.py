from __future__ import annotations

import json
from typing import Any

import httpx
from pydantic import ValidationError

from app.domain.schemas import JudgeScoresResponse
from app.providers.base import (
    ProviderAuthError,
    ProviderResponseError,
    ProviderTimeoutError,
    ProviderValidationError,
    map_provider_error,
)


class GeminiClient:
    def __init__(self, api_key: str | None, timeout_seconds: float, http_client: httpx.AsyncClient | None = None) -> None:
        self.api_key = api_key
        self.timeout_seconds = timeout_seconds
        self.http_client = http_client
        self.model = "gemini-2.5-flash"

    @property
    def url(self) -> str:
        return f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"

    async def generate_judgment(self, prompt: str) -> JudgeScoresResponse:
        if not self.api_key:
            raise ProviderAuthError("Missing GOOGLE_AI_API_KEY")

        initial_text = await self._request_text(prompt)
        try:
            return self._validate_candidate(initial_text)
        except ProviderValidationError:
            repair_prompt = self._build_repair_prompt(prompt, initial_text)
            repaired_text = await self._request_text(repair_prompt)
            return self._validate_candidate(repaired_text)

    async def _request_text(self, prompt: str) -> str:
        owns_client = self.http_client is None
        client = self.http_client or httpx.AsyncClient(timeout=httpx.Timeout(self.timeout_seconds, connect=10.0))

        try:
            response = await client.post(
                self.url,
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.3,
                        "responseMimeType": "application/json",
                    },
                },
            )
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError("Gemini request timed out") from exc
        finally:
            if owns_client:
                await client.aclose()

        if response.status_code >= 400:
            raise map_provider_error(response.status_code, response.text)

        data = response.json()
        candidate_text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text")
        if not candidate_text:
            raise ProviderResponseError("No text returned from Gemini")
        return candidate_text

    def _validate_candidate(self, candidate_text: str) -> JudgeScoresResponse:
        json_payload = self._extract_json(candidate_text)
        try:
            return JudgeScoresResponse.model_validate_json(json_payload)
        except ValidationError as exc:
            raise ProviderValidationError(f"Gemini returned invalid judgment schema: {exc}") from exc

    def _extract_json(self, candidate_text: str) -> str:
        stripped = candidate_text.strip()
        if stripped.startswith("{") and stripped.endswith("}"):
            return stripped

        start = stripped.find("{")
        end = stripped.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise ProviderValidationError("Gemini response did not contain a valid JSON object")
        return stripped[start : end + 1]

    def _build_repair_prompt(self, original_prompt: str, invalid_response: str) -> str:
        return (
            f"{original_prompt}\n\n"
            "The previous response was not valid for the required JSON schema. "
            "Return ONLY valid JSON matching the schema. Do not add commentary.\n\n"
            f"Invalid response:\n{invalid_response}"
        )
