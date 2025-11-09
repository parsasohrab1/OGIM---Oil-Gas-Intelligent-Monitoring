import pytest
from fastapi.testclient import TestClient

from backend.auth-service.main import app as auth_app
from backend.api-gateway.main import app as gateway_app
from backend.alert-service.main import app as alert_app


@pytest.mark.smoke
def test_auth_health():
    client = TestClient(auth_app)
    resp = client.get("/health")
    assert resp.status_code == 200


@pytest.mark.smoke
def test_gateway_root():
    client = TestClient(gateway_app)
    resp = client.get("/")
    assert resp.status_code == 200


@pytest.mark.smoke
def test_alert_health():
    client = TestClient(alert_app)
    resp = client.get("/health")
    assert resp.status_code == 200
