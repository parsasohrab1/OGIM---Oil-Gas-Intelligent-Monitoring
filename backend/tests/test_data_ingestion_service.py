import os
import sys
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "data-ingestion-service"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app, require_ingest_read, require_ingest_admin, kafka_producer, opcua_client  # type: ignore
from shared.database import get_db, get_timescale_db
from shared.models import Tag


def override_get_db(test_db):
    def _override():
        try:
            yield test_db
        finally:
            pass

    return _override


def override_get_tsdb(test_db):
    def _override():
        try:
            yield test_db
        finally:
            pass

    return _override


@pytest.fixture
def client(test_db, test_user, admin_user, monkeypatch):
    app.dependency_overrides[get_db] = override_get_db(test_db)
    app.dependency_overrides[get_timescale_db] = override_get_tsdb(test_db)
    app.dependency_overrides[require_ingest_read] = lambda: {"sub": test_user.username, "role": test_user.role}
    app.dependency_overrides[require_ingest_admin] = lambda: {"sub": admin_user.username, "role": admin_user.role}
    monkeypatch.setattr("main.kafka_producer", None)
    monkeypatch.setattr("main.opcua_client", None)
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def sample_tag(test_db):
    tag = Tag(
        tag_id="WELL-1-pressure",
        well_name="WELL-1",
        equipment_type="pump",
        sensor_type="pressure",
        unit="psi",
        valid_range_min=0.0,
        valid_range_max=500.0,
        status="active",
    )
    test_db.add(tag)
    test_db.commit()
    return tag


def test_ingest_valid_record(client, sample_tag):
    payload = {
        "source": "test-source",
        "records": [
            {
                "timestamp": datetime.utcnow().isoformat(),
                "well_name": sample_tag.well_name,
                "equipment_type": sample_tag.equipment_type,
                "sensor_type": sample_tag.sensor_type,
                "value": 120.5,
                "unit": sample_tag.unit,
                "sensor_id": sample_tag.tag_id,
                "data_quality": "good",
            }
        ],
    }

    response = client.post("/ingest", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["records_ingested"] == 1


def test_ingest_invalid_range(client, sample_tag):
    payload = {
        "source": "test-source",
        "records": [
            {
                "timestamp": datetime.utcnow().isoformat(),
                "well_name": sample_tag.well_name,
                "equipment_type": sample_tag.equipment_type,
                "sensor_type": sample_tag.sensor_type,
                "value": 1000.0,
                "unit": sample_tag.unit,
                "sensor_id": sample_tag.tag_id,
                "data_quality": "good",
            }
        ],
    }

    response = client.post("/ingest", json=payload)
    assert response.status_code == 422
