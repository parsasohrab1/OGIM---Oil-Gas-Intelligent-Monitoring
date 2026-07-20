"""
Tests for alert service
"""
import pytest
import sys
import os
from datetime import datetime
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "alert-service"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app, require_alert_read, require_alert_write, require_alert_admin
from shared.database import get_db
from shared.models import Alert, AlertRule


def override_get_db(test_db):
    """Override database dependency"""

    def _override():
        try:
            yield test_db
        finally:
            pass

    return _override


@pytest.fixture
def client(test_db):
    """Create test client"""
    app.dependency_overrides[get_db] = override_get_db(test_db)
    app.dependency_overrides[require_alert_read] = lambda: {
        "sub": "testuser",
        "role": "system_admin",
    }
    app.dependency_overrides[require_alert_write] = lambda: {
        "sub": "testuser",
        "role": "system_admin",
    }
    app.dependency_overrides[require_alert_admin] = lambda: {
        "sub": "testuser",
        "role": "system_admin",
    }
    return TestClient(app)


def test_create_alert(client):
    """Test creating an alert"""
    response = client.post(
        "/alerts",
        json={
            "alert_id": "TEST-ALERT-001",
            "timestamp": datetime.utcnow().isoformat(),
            "severity": "critical",
            "status": "open",
            "well_name": "WELL-A-001",
            "sensor_id": "WELL-A-001-pump-pressure",
            "message": "Pressure exceeded threshold",
            "rule_name": "pressure_high",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert "alert_id" in data


def test_list_alerts(client):
    """Test listing alerts"""
    response = client.get("/alerts")

    assert response.status_code == 200
    data = response.json()
    assert "alerts" in data
    assert "count" in data


def test_alert_correlation_groups(client):
    """Test correlation grouping endpoint"""
    now = datetime.utcnow().isoformat()
    client.post(
        "/alerts",
        json={
            "alert_id": "TEST-CORR-001",
            "timestamp": now,
            "severity": "warning",
            "status": "open",
            "well_name": "WELL-A-001",
            "sensor_id": "WELL-A-001-pump-pressure",
            "message": "Pressure high",
            "rule_name": "pressure_high",
        },
    )
    client.post(
        "/alerts",
        json={
            "alert_id": "TEST-CORR-002",
            "timestamp": now,
            "severity": "warning",
            "status": "open",
            "well_name": "WELL-A-001",
            "sensor_id": "WELL-A-001-pump-pressure",
            "message": "Pressure still high",
            "rule_name": "pressure_high",
        },
    )

    response = client.get("/alerts/correlations")
    assert response.status_code == 200
    data = response.json()
    assert "groups" in data
    assert data["count"] >= 1


def test_alert_rca_endpoint(client):
    """Test RCA generation endpoint"""
    alert_id = "TEST-RCA-001"
    response = client.post(
        "/alerts",
        json={
            "alert_id": alert_id,
            "timestamp": datetime.utcnow().isoformat(),
            "severity": "critical",
            "status": "open",
            "well_name": "WELL-B-001",
            "sensor_id": "WELL-B-001-valve-temp",
            "message": "Temperature exceeded threshold",
            "rule_name": "temperature_high",
        },
    )
    assert response.status_code == 201

    rca_response = client.post(f"/alerts/{alert_id}/rca", json={"lookback_minutes": 60})
    assert rca_response.status_code == 200
    rca_data = rca_response.json()
    assert rca_data["alert_id"] == alert_id
    assert "rca" in rca_data
    assert "suspected_root_cause" in rca_data["rca"]


def test_create_alert_rule(client):
    """Test creating an alert rule"""
    response = client.post(
        "/rules",
        json={
            "rule_id": "test-rule-001",
            "name": "Test Rule",
            "description": "Test alert rule",
            "condition": "threshold_high",
            "threshold": 450.0,
            "severity": "critical",
            "enabled": True,
        },
    )

    assert response.status_code == 200


def test_list_alert_rules(client):
    """Test listing alert rules"""
    response = client.get("/rules")

    assert response.status_code == 200
    data = response.json()
    assert "rules" in data
