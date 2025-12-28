import os
import sys
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "reporting-service"))

from main import app, reports_db  # type: ignore


@pytest.fixture(autouse=True)
def clear_reports_db():
    reports_db.clear()
    yield
    reports_db.clear()


@pytest.fixture
def client():
    return TestClient(app)


def test_generate_report(client):
    payload = {
        "report_type": "daily",
        "well_name": "WELL-1",
        "start_date": (datetime.utcnow() - timedelta(days=1)).isoformat(),
        "end_date": datetime.utcnow().isoformat(),
        "metrics": ["total_production", "average_pressure"],
    }

    response = client.post("/reports/generate", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["report_type"] == "daily"
    assert data["well_name"] == "WELL-1"
    assert "report_id" in data


def test_list_reports(client):
    # seed two reports
    for idx in range(2):
        payload = {
            "report_type": "weekly",
            "start_date": (datetime.utcnow() - timedelta(days=7)).isoformat(),
            "end_date": datetime.utcnow().isoformat(),
            "metrics": [],
        }
        if idx == 0:
            payload["well_name"] = "WELL-A"
        client.post("/reports/generate", json=payload)

    response = client.get("/reports")
    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 2
    assert len(body["reports"]) == 2


def test_get_report_by_id(client):
    payload = {
        "report_type": "monthly",
        "start_date": (datetime.utcnow() - timedelta(days=30)).isoformat(),
        "end_date": datetime.utcnow().isoformat(),
        "metrics": [],
    }
    create_resp = client.post("/reports/generate", json=payload)
    report_id = create_resp.json()["report_id"]

    response = client.get(f"/reports/{report_id}")
    assert response.status_code == 200
    assert response.json()["report_id"] == report_id
