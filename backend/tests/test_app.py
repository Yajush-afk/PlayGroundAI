from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_healthcheck() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_openapi_documents_detail_error_shape() -> None:
    schema = client.get("/openapi.json").json()
    error_response = schema["components"]["schemas"]["ErrorResponse"]

    assert "detail" in error_response["properties"]
    assert "error" not in error_response["properties"]


def test_openapi_includes_debate_challenge_card_and_judge_profile() -> None:
    schema = client.get("/openapi.json").json()
    debate_request = schema["components"]["schemas"]["DebateTurnRequest"]
    judge_request = schema["components"]["schemas"]["JudgeRequest"]

    assert "challengeCardText" in debate_request["properties"]
    assert "judgeProfile" in judge_request["properties"]
