from __future__ import annotations

import random
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from app.core.config import Settings
from app.domain.league_schemas import AdminGameType, AdminRunMatchResponse, GameType, LeagueStateResponse, LeagueStatus
from app.providers.base import ProviderRateLimitError
from app.repositories.league import LeagueRepository
from app.services.match_runner import MatchRunner
from app.services.quota_service import QuotaService


class LeagueService:
    def __init__(self, settings: Settings, repository: LeagueRepository, quota_service: QuotaService, match_runner: MatchRunner) -> None:
        self.settings = settings
        self.repository = repository
        self.quota_service = quota_service
        self.match_runner = match_runner

    async def get_state(self) -> LeagueStateResponse:
        season = await self.repository.get_active_season()
        season_id = season["id"] if season else None
        latest_matches = await self.repository.get_latest_matches(limit=8)
        leaderboard = await self.repository.get_leaderboard(season_id=season_id, game_type=None)
        return LeagueStateResponse(
            season=season,
            leaderboard=leaderboard,
            latestMatches=latest_matches,
            leagueStatus=LeagueStatus(
                generationEnabled=self.settings.official_league_enabled,
                coolingDown=False,
                pausedUntil=None,
                nextRecommendedRunAt=None,
            ),
        )

    async def list_matches(self, *, game_type: GameType | None, limit: int) -> list[dict]:
        return await self.repository.get_latest_matches(limit=limit, game_type=game_type)

    async def get_match_detail(self, match_id: str) -> dict | None:
        return await self.repository.get_match_detail(match_id)

    async def get_leaderboard(self, *, season_id: str | None, game_type: GameType | None) -> list[dict]:
        return await self.repository.get_leaderboard(season_id=season_id, game_type=game_type)

    async def run_official_match(self, *, game_type: AdminGameType, dry_run: bool) -> AdminRunMatchResponse:
        selected_game = await self._select_game(game_type)
        estimated_requests = self.match_runner.estimate_requests(selected_game)
        quota = await self.quota_service.can_run_official_match(
            estimated_requests=estimated_requests,
            provider=self.settings.official_participant_provider,
            model=self.settings.official_participant_model_fast,
        )
        if not quota.allowed:
            return AdminRunMatchResponse(
                status="skipped",
                reason=quota.reason,
                gameType=selected_game,
                estimatedRequests=estimated_requests,
                pausedUntil=quota.paused_until,
            )

        if dry_run:
            return AdminRunMatchResponse(status="skipped", reason="Dry run passed.", gameType=selected_game, estimatedRequests=estimated_requests)

        lock_owner = str(uuid4())
        lock_until = (datetime.now(UTC) + timedelta(minutes=15)).isoformat()
        acquired = await self.repository.acquire_lock("official_match_generation", lock_owner, lock_until)
        if not acquired:
            return AdminRunMatchResponse(
                status="skipped",
                reason="Official match generation is already running.",
                gameType=selected_game,
                estimatedRequests=estimated_requests,
            )

        match_id: str | None = None
        try:
            season = await self.repository.get_active_season()
            if not season:
                return AdminRunMatchResponse(status="skipped", reason="No active season exists.", gameType=selected_game)

            created = await self.repository.create_match(
                {
                    "season_id": season["id"],
                    "league_type": "official",
                    "game_type": selected_game,
                    "status": "running",
                    "prompt": "pending",
                    "participant_model": self.settings.official_participant_model_fast,
                    "judge_model": self.settings.official_judge_model,
                    "total_estimated_requests": estimated_requests,
                    "started_at": datetime.now(UTC).isoformat(),
                }
            )
            match_id = created["id"]

            artifact = await self.match_runner.run(selected_game, prompt_index=await self.repository.count_todays_official_matches())
            await self.repository.update_match(
                match_id,
                {
                    "status": "completed",
                    "prompt": artifact.prompt,
                    "topic": artifact.topic,
                    "winner": artifact.judge_result.winner,
                    "summary": artifact.judge_result.summary,
                    "completed_at": datetime.now(UTC).isoformat(),
                },
            )
            await self.repository.insert_rounds(
                [
                    {
                        "match_id": match_id,
                        "round_index": 1,
                        "round_type": selected_game,
                        "pair_key": None,
                        "prompt": artifact.prompt,
                        "entries": [entry.model_dump(mode="json") for entry in artifact.entries],
                        "judge_result": artifact.judge_result.model_dump(by_alias=True, mode="json"),
                    }
                ]
            )

            participant_rows = []
            for evaluation in artifact.judge_result.evaluations:
                points = evaluation.points_awarded + evaluation.bonus_points
                participant_rows.append(
                    {
                        "match_id": match_id,
                        "persona_name": evaluation.persona,
                        "seed": 0,
                        "final_rank": evaluation.rank,
                        "total_score": evaluation.total_score,
                        "points_awarded": evaluation.points_awarded,
                        "bonus_points": evaluation.bonus_points,
                    }
                )
                await self.repository.update_leaderboard(
                    season_id=season["id"],
                    persona_name=evaluation.persona,
                    game_type=selected_game,
                    points=points,
                    score=evaluation.total_score,
                    won=evaluation.persona == artifact.judge_result.winner,
                )
                await self.repository.update_leaderboard(
                    season_id=season["id"],
                    persona_name=evaluation.persona,
                    game_type="overall",
                    points=points,
                    score=evaluation.total_score,
                    won=evaluation.persona == artifact.judge_result.winner,
                )
            await self.repository.insert_participants(participant_rows)
            await self.quota_service.record_requests(
                provider=self.settings.official_participant_provider,
                model=self.settings.official_participant_model_fast,
                request_count=estimated_requests,
            )
            return AdminRunMatchResponse(status="completed", matchId=match_id, gameType=selected_game, estimatedRequests=estimated_requests)
        except ProviderRateLimitError:
            paused_until = await self.quota_service.pause_provider(
                provider=self.settings.official_participant_provider,
                model=self.settings.official_participant_model_fast,
            )
            if match_id:
                await self.repository.update_match(match_id, {"status": "failed", "failure_reason": "Provider rate limit", "completed_at": datetime.now(UTC).isoformat()})
            return AdminRunMatchResponse(
                status="skipped",
                reason="Provider rate limit reached.",
                matchId=match_id,
                gameType=selected_game,
                estimatedRequests=estimated_requests,
                pausedUntil=paused_until,
            )
        except Exception as exc:
            if match_id:
                await self.repository.update_match(match_id, {"status": "failed", "failure_reason": str(exc), "completed_at": datetime.now(UTC).isoformat()})
            raise
        finally:
            await self.repository.release_lock("official_match_generation", lock_owner)

    async def _select_game(self, requested: AdminGameType) -> GameType:
        if requested != "auto":
            return requested
        return random.choices(["debate", "joke", "scenario"], weights=[40, 40, 20], k=1)[0]
