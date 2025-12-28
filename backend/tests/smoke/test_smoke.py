import os
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "auth-service"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "api-gateway"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "alert-service"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "reporting-service"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "digital-twin-service"))

from main import app as auth_app  # type: ignore
from backend.api-gateway.main import app as gateway_app  # type: ignore
from backend.alert-service.main import app as alert_app  # type: ignore
from backend.reporting-service.main import app as reporting_app  # type: ignore
from backend.digital-twin-service.main import app as twin_app  # type: ignore


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


@pytest.mark.smoke
def test_reporting_health():
    client = TestClient(reporting_app)
    resp = client.get("/health")
    assert resp.status_code == 200


@pytest.mark.smoke
def test_digital_twin_health():
    client = TestClient(twin_app)
    resp = client.get("/health")
    assert resp.status_code == 200
