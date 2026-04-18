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
