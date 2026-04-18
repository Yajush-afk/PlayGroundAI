import pytest

from app.core.config import Settings
from app.domain.schemas import DebateTurnRequest, JudgeRequest
from app.services.usage_service import SessionUsageService, UsagePolicyError


def build_settings(**overrides) -> Settings:
    defaults = dict(
        groq_api_key="test",
        google_ai_api_key="test",
        anonymous_max_rounds=3,
        anonymous_debates_per_window=2,
        anonymous_debate_window_seconds=1800,
        anonymous_debates_per_day=5,
        anonymous_judges_per_day=1,
        anonymous_max_active_debates=1,
        active_debate_ttl_seconds=3600,
    )
    defaults.update(overrides)
    return Settings(**defaults)


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
        await service.reserve_debate_policy("session-1", "debate-1", payload)
    except UsagePolicyError as exc:
        assert exc.status_code == 403
    else:
        assert False, "Expected rounds above cap to be rejected"


@pytest.mark.asyncio
async def test_failed_debate_start_does_not_consume_allowance_or_leave_active_state() -> None:
    service = SessionUsageService(build_settings(anonymous_debates_per_window=1, anonymous_debates_per_day=1))
    payload = DebateTurnRequest.model_validate(
        {
            "topic": "topic",
            "persona": "Aria",
            "currentRound": 1,
            "totalRounds": 3,
            "history": [],
        }
    )

    reservation = await service.reserve_debate_policy("session-1", "debate-1", payload)
    await service.finalize_debate_policy(reservation, success=False)

    follow_up = await service.reserve_debate_policy("session-1", "debate-2", payload)
    await service.finalize_debate_policy(follow_up, success=True)

    try:
        await service.reserve_debate_policy("session-1", "debate-3", payload)
    except UsagePolicyError as exc:
        assert "debate limit" in exc.message.lower()
    else:
        assert False, "Expected a successful debate start to consume the only debate allowance"


@pytest.mark.asyncio
async def test_failed_final_turn_does_not_clear_active_debate() -> None:
    service = SessionUsageService(build_settings())
    opening_payload = DebateTurnRequest.model_validate(
        {
            "topic": "topic",
            "persona": "Aria",
            "currentRound": 1,
            "totalRounds": 3,
            "history": [],
        }
    )
    final_turn_payload = DebateTurnRequest.model_validate(
        {
            "topic": "topic",
            "persona": "Rex",
            "currentRound": 3,
            "totalRounds": 3,
            "history": [
                {"persona": "Aria", "text": "opening", "round": 1},
            ],
        }
    )

    opening = await service.reserve_debate_policy("session-1", "debate-1", opening_payload)
    await service.finalize_debate_policy(opening, success=True)
    final_turn = await service.reserve_debate_policy("session-1", "debate-1", final_turn_payload)
    await service.finalize_debate_policy(final_turn, success=False)

    try:
        await service.reserve_debate_policy("session-1", "debate-2", opening_payload)
    except UsagePolicyError as exc:
        assert "Finish your current debate" in exc.message
    else:
        assert False, "Expected a failed final turn to keep the original debate active"


@pytest.mark.asyncio
async def test_failed_judge_does_not_consume_daily_allowance() -> None:
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

    failed = await service.reserve_judge_policy("session-1", "debate-1", payload)
    await service.finalize_judge_policy(failed, success=False)
    successful = await service.reserve_judge_policy("session-1", "debate-1", payload)
    await service.finalize_judge_policy(successful, success=True)

    try:
        await service.reserve_judge_policy("session-1", "debate-1", payload)
    except UsagePolicyError as exc:
        assert "judge limit" in exc.message.lower()
    else:
        assert False, "Expected judge daily cap to block repeated judging"
