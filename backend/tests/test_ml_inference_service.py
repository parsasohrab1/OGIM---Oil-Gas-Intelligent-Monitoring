"""Tests for ML versioning/drift endpoints (without loading TensorFlow)."""
import importlib.util
import os
import sys
import types
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

MODULE_PATH = Path(__file__).resolve().parents[1] / "ml-inference-service" / "main.py"
sys.path.insert(0, str(MODULE_PATH.parent))

# Stub heavy optional deps before loading ml-inference main
sys.modules.setdefault("tensorflow", MagicMock())
sys.modules.setdefault(
    "rul_model",
    types.SimpleNamespace(rul_model_manager=MagicMock()),
)
sys.modules.setdefault(
    "advanced_lstm_model",
    types.SimpleNamespace(AdvancedLSTMModel=MagicMock(), get_well_model=MagicMock()),
)

from shared import auth as shared_auth


spec = importlib.util.spec_from_file_location("ml_inference_service", MODULE_PATH)
ml_service = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(ml_service)

client = TestClient(ml_service.app)


class StubMlflowManager:
    def list_model_versions(self, registry_name: str, limit: int = 20):
        return [
            {
                "version": 1,
                "stage": "Production",
                "metrics": {"f1": 0.91},
                "registry": registry_name,
            }
        ][:limit]

    def set_feature_baseline(self, model_key: str, features):
        return {
            "feature_names": ["pressure", "temperature"],
            "means": {"pressure": 100.0, "temperature": 50.0},
            "stds": {"pressure": 10.0, "temperature": 5.0},
            "sample_size": len(features),
        }

    def detect_feature_drift(self, model_key: str, features, threshold: float = 0.5):
        return {
            "model_key": model_key,
            "threshold": threshold,
            "drift_detected": True,
            "aggregate_score": 2.4,
            "feature_scores": {"pressure": 3.1, "temperature": 1.7},
        }


@pytest.fixture(autouse=True)
def enable_mlflow_stub():
    ml_service.MLFLOW_AVAILABLE = True
    ml_service.mlflow_manager = StubMlflowManager()
    shared_auth.decode_token = lambda token: {"sub": "admin", "role": "system_admin"}
    yield
    ml_service.app.dependency_overrides.clear()


def auth_header():
    return {"Authorization": "Bearer test-token"}


def test_list_model_versions():
    response = client.get("/models/anomaly_detection/versions", headers=auth_header())
    assert response.status_code == 200
    body = response.json()
    assert body["model_type"] == "anomaly_detection"
    assert body["versions"][0]["version"] == 1


def test_drift_baseline_accepts_single_dict():
    response = client.post(
        "/models/anomaly_detection/drift/baseline",
        json={"features": {"pressure": 110, "temperature": 55}},
        headers=auth_header(),
    )
    assert response.status_code == 200
    assert response.json()["baseline"]["sample_size"] == 1


def test_drift_detect_accepts_single_dict():
    client.post(
        "/models/anomaly_detection/drift/baseline",
        json={"features": {"pressure": 100, "temperature": 50}},
        headers=auth_header(),
    )
    response = client.post(
        "/models/anomaly_detection/drift/detect",
        json={"features": {"pressure": 140, "temperature": 65}, "threshold": 1.5},
        headers=auth_header(),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["drift_detected"] is True
    assert "feature_scores" in body
