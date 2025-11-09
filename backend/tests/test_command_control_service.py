import os
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "command-control-service"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app, require_command_read, require_command_admin  # type: ignore
from shared.database import get_db


def override_get_db(test_db):
    def _override():
        try:
            yield test_db
        finally:
            pass

    return _override


@pytest.fixture
def client(test_db, test_user, admin_user, monkeypatch):
    app.dependency_overrides[get_db] = override_get_db(test_db)
    app.dependency_overrides[require_command_read] = lambda: {"sub": test_user.username, "role": test_user.role}
    app.dependency_overrides[require_command_admin] = lambda: {"sub": admin_user.username, "role": admin_user.role}
    monkeypatch.setattr("main.command_producer", None)
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


def test_create_command(client, test_user):
    payload = {
        "well_name": "WELL-1",
        "equipment_id": "PUMP-1",
        "command_type": "start_pump",
        "parameters": {"speed": 1200},
        "requested_by": test_user.username,
        "requires_two_factor": False,
    }

    response = client.post("/commands", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "pending"
    assert "command_id" in data


def test_approve_and_execute_command(client, test_user):
    payload = {
        "well_name": "WELL-2",
        "equipment_id": "VALVE-1",
        "command_type": "open_valve",
        "parameters": {"percent": 50},
        "requested_by": test_user.username,
    }

    create_resp = client.post("/commands", json=payload)
    command_id = create_resp.json()["command_id"]

    approve_resp = client.post(f"/commands/{command_id}/approve")
    assert approve_resp.status_code == 200
    assert approve_resp.json()["status"] == "approved"

    execute_resp = client.post(f"/commands/{command_id}/execute")
    assert execute_resp.status_code == 200
    assert execute_resp.json()["status"] == "executed"
