import importlib.util
from pathlib import Path

import pytest
import httpx
from fastapi.testclient import TestClient


MODULE_PATH = Path(__file__).resolve().parents[1] / "api-gateway" / "main.py"
spec = importlib.util.spec_from_file_location("api_gateway", MODULE_PATH)
api_gateway = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(api_gateway)

client = TestClient(api_gateway.app)


@pytest.fixture(autouse=True)
def reset_state():
    # Ensure request state is clean between tests
    class DummyUpstreamClient:
        async def request(self, *args, **kwargs):
            return httpx.Response(status_code=200, json={"result": "ok"})

    api_gateway.upstream_client = DummyUpstreamClient()
    api_gateway.settings.RATE_LIMIT_ENABLED = False
    api_gateway.settings.ZERO_TRUST_ENFORCED = False
    api_gateway.settings.API_SECURITY_ENABLE_INPUT_HARDENING = True
    yield


def stub_async_client(monkeypatch, response=None, exception=None):
    class DummyUpstreamClient:
        async def request(self, *args, **kwargs):
            if exception:
                raise exception
            return response

    api_gateway.upstream_client = DummyUpstreamClient()


def stub_decode_token(monkeypatch, *, payload=None, error=None):
    def fake_decode(token: str):
        if error:
            raise error
        return payload or {"sub": "test-user", "role": "field_operator"}

    monkeypatch.setattr(api_gateway, "decode_token", fake_decode)


def auth_header(token: str = "valid-token"):
    return {"Authorization": f"Bearer {token}"}


def test_proxy_requires_authorization_header():
    response = client.get("/api/alert/alerts")
    assert response.status_code == 401
    assert response.json()["detail"] == "Missing authorization token"


def test_proxy_rejects_invalid_token(monkeypatch):
    stub_decode_token(monkeypatch, error=ValueError("Token has expired"))

    response = client.get("/api/alert/alerts", headers=auth_header())
    assert response.status_code == 401
    assert response.json()["detail"] == "Token has expired"


def test_proxy_success_json(monkeypatch):
    stub_decode_token(monkeypatch)

    response = client.get("/api/alert/alerts", headers=auth_header())
    assert response.status_code == 200
    assert response.json() == {"result": "ok"}
    assert response.headers["x-content-type-options"] == "nosniff"


def test_proxy_downstream_error_propagates_status(monkeypatch):
    stub_decode_token(monkeypatch)
    downstream_response = httpx.Response(status_code=404, json={"detail": "Not found"})
    stub_async_client(monkeypatch, response=downstream_response)

    response = client.get("/api/alert/alerts", headers=auth_header())
    assert response.status_code == 404
    assert response.json()["detail"] == {"detail": "Not found"}


def test_proxy_non_json_response(monkeypatch):
    stub_decode_token(monkeypatch)
    downstream_response = httpx.Response(
        status_code=200,
        content=b"plain-text",
        headers={"content-type": "text/plain"}
    )
    stub_async_client(monkeypatch, response=downstream_response)

    response = client.get("/api/alert/alerts", headers=auth_header())
    assert response.status_code == 200
    assert response.text == "plain-text"


def test_proxy_timeout_returns_gateway_timeout(monkeypatch):
    stub_decode_token(monkeypatch)
    stub_async_client(monkeypatch, exception=httpx.TimeoutException("Timeout"))

    response = client.get("/api/alert/alerts", headers=auth_header())
    assert response.status_code == 504
    assert response.json()["detail"] == "Service alert timed out"


def test_proxy_forbidden_for_insufficient_role(monkeypatch):
    api_gateway.settings.ZERO_TRUST_ENFORCED = True
    api_gateway.settings.ZERO_TRUST_ALLOWED_NETWORKS = ""
    stub_decode_token(monkeypatch, payload={"sub": "viewer", "role": "viewer"})
    response = client.get("/api/command-control/commands", headers=auth_header())
    assert response.status_code == 403
    assert response.json()["detail"] == "Not enough permissions"


def test_proxy_blocks_suspicious_query(monkeypatch):
    stub_decode_token(monkeypatch)
    response = client.get(
        "/api/alert/alerts?search=<script>alert(1)</script>",
        headers=auth_header(),
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Request contains blocked input patterns"


def test_proxy_blocks_malformed_json(monkeypatch):
    stub_decode_token(monkeypatch)
    response = client.post(
        "/api/alert/alerts",
        headers={**auth_header(), "Content-Type": "application/json"},
        content="{not-json",
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Malformed JSON payload"

