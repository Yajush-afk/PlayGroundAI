import pytest

from app.core.config import Settings
from app.domain.schemas import DebateTurnRequest, JudgeRequest
from app.services.usage_service import SessionUsageService, UsagePolicyError


def build_settings(**overrides) -> Settings:
    return Settings(
        groq_api_key="test",
        google_ai_api_key="test",
        anonymous_max_rounds=3,
        anonymous_debates_per_window=2,
        anonymous_debate_window_seconds=1800,
        anonymous_debates_per_day=5,
        anonymous_judges_per_day=1,
        anonymous_max_active_debates=1,
        active_debate_ttl_seconds=3600,
        **overrides,
    )


@pytest.mark.asyncio
async def test_usage_service_rejects_rounds_above_anonymous_cap() -> None:
    service = SessionUsageService(build_settings())
    payload = DebateTurnRequest.model_validate(
        {
            "topic": "topic",
            "persona": "Aria",
            "currentRound": 1,
            "totalRounds": 5,
            "history": [],
        }
    )

    try:
        await service.enforce_debate_policy("session-1", "debate-1", payload)
    except UsagePolicyError as exc:
        assert exc.status_code == 403
    else:
        assert False, "Expected rounds above cap to be rejected"


@pytest.mark.asyncio
async def test_usage_service_rejects_second_active_debate() -> None:
    service = SessionUsageService(build_settings())
    payload = DebateTurnRequest.model_validate(
        {
            "topic": "topic",
            "persona": "Aria",
            "currentRound": 1,
            "totalRounds": 3,
            "history": [],
        }
    )

    await service.enforce_debate_policy("session-1", "debate-1", payload)

    try:
        await service.enforce_debate_policy("session-1", "debate-2", payload)
    except UsagePolicyError as exc:
        assert "Finish your current debate" in exc.message
    else:
        assert False, "Expected active debate cap to block a second debate"


@pytest.mark.asyncio
async def test_usage_service_rejects_judge_calls_past_daily_cap() -> None:
    service = SessionUsageService(build_settings())
    payload = JudgeRequest.model_validate(
        {
            "topic": "topic",
            "totalRounds": 3,
            "history": [
                {"round": 1, "persona": "Aria", "text": "hello"},
            ],
        }
    )

    await service.enforce_judge_policy("session-1", "debate-1", payload)

    try:
        await service.enforce_judge_policy("session-1", "debate-1", payload)
    except UsagePolicyError as exc:
        assert "judge limit" in exc.message.lower()
    else:
        assert False, "Expected judge daily cap to block repeated judging"
