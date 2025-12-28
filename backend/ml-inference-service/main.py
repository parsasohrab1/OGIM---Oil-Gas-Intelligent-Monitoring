"""
ML Inference Service
Provides low-latency model inference for anomaly detection and failure prediction
"""
import os
import sys
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add shared module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'shared'))

from config import settings
from logging_config import setup_logging
from shared.auth import require_roles
from metrics import setup_metrics
from tracing import setup_tracing
from rul_model import rul_model_manager

try:
    from prometheus_client import Counter, Histogram

    METRICS_ENABLED = True
    INFERENCE_REQUESTS = Counter(
        "ml_inference_requests_total",
        "Total inference requests",
        ["model_type"],
    )
    INFERENCE_ERRORS = Counter(
        "ml_inference_errors_total",
        "Total inference errors",
        ["model_type", "reason"],
    )
    INFERENCE_LATENCY = Histogram(
        "ml_inference_latency_seconds",
        "Inference latency in seconds",
        ["model_type"],
    )
except ImportError:  # pragma: no cover - dependency optional at runtime
    METRICS_ENABLED = False
    INFERENCE_REQUESTS = INFERENCE_ERRORS = INFERENCE_LATENCY = None  # type: ignore

# Setup logging
logger = setup_logging("ml-inference-service")

# Import MLflow integration
try:
    from mlflow_integration import get_mlflow_manager

    MLFLOW_AVAILABLE = True
except ImportError:
    logger.warning("MLflow not available, using mock models")
    MLFLOW_AVAILABLE = False

app = FastAPI(title="OGIM ML Inference Service", version="1.0.0")
setup_metrics(app, "ml-inference-service")
setup_tracing(app, "ml-inference-service")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure model storage path is aligned with shared settings
os.environ.setdefault("MODEL_STORAGE_PATH", settings.MODEL_STORAGE_PATH)

# MLflow manager
mlflow_manager = None
MODEL_TYPE_TO_REGISTRY = {
    "anomaly_detection": "anomaly-detection",
    "failure_prediction": "failure-prediction",
    "time_series_forecast": "time-series-forecast",
}


class InferenceRequest(BaseModel):
    sensor_id: str
    features: Dict[str, float]
    model_type: str = "anomaly_detection"  # or "failure_prediction"


class InferenceResponse(BaseModel):
    sensor_id: str
    model_type: str
    prediction: float
    probability: float
    anomaly_score: Optional[float] = None
    failure_probability: Optional[float] = None
    timestamp: datetime


class TimeSeriesForecastRequest(BaseModel):
    sensor_id: str
    historical_data: List[float]
    forecast_steps: int = 1


class TimeSeriesForecastResponse(BaseModel):
    sensor_id: str
    predictions: List[float]
    forecast_steps: int
    sequence_length: int
    confidence: float
    timestamp: datetime


@app.on_event("startup")
async def startup_event():
    """Initialize MLflow manager on startup"""
    global mlflow_manager
    logger.info("Starting ML inference service...")
    
    if MLFLOW_AVAILABLE:
        try:
            mlflow_manager = get_mlflow_manager(
                model_path=settings.MODEL_STORAGE_PATH,
                tracking_uri=settings.MLFLOW_TRACKING_URI,
            )
            load_results = mlflow_manager.load_registered_models()
            logger.info("Model load results: %s", load_results)
        except Exception as e:
            logger.error(f"Failed to initialize MLflow: {e}")
            logger.warning("Falling back to mock models")


# Mock ML models (fallback if MLflow unavailable)
def mock_anomaly_detection(features: Dict[str, float]) -> Dict[str, float]:
    """Mock anomaly detection model"""
    anomaly_score = 0.0
    for value in features.values():
        if value > 100 or value < -100:
            anomaly_score += 0.3
        elif abs(value) > 50:
            anomaly_score += 0.1
    
    anomaly_score = min(1.0, anomaly_score)
    is_anomaly = 1.0 if anomaly_score > 0.5 else 0.0
    
    return {
        "prediction": is_anomaly,
        "anomaly_score": anomaly_score,
        "probability": anomaly_score
    }


def mock_failure_prediction(features: Dict[str, float]) -> Dict[str, float]:
    """Mock failure prediction model"""
    failure_prob = 0.0
    for value in features.values():
        if value > 200:
            failure_prob += 0.2
        elif value > 150:
            failure_prob += 0.1
    
    failure_prob = min(1.0, failure_prob)
    
    return {
        "prediction": failure_prob,
        "failure_probability": failure_prob,
        "probability": failure_prob
    }


@app.post("/infer", response_model=InferenceResponse)
async def infer(request: InferenceRequest):
    """Perform model inference"""
    start_time = None
    if METRICS_ENABLED:
        INFERENCE_REQUESTS.labels(request.model_type).inc()
        start_time = time.perf_counter()

    try:
        # Use MLflow models if available, otherwise fallback to mock
        if MLFLOW_AVAILABLE and mlflow_manager:
            if request.model_type == "anomaly_detection":
                result = mlflow_manager.predict_anomaly(request.features)
            elif request.model_type == "failure_prediction":
                result = mlflow_manager.predict_failure(request.features)
            elif request.model_type == "time_series_forecast":
                raise HTTPException(
                    status_code=400,
                    detail="Use /forecast endpoint for time series predictions"
                )
            else:
                raise HTTPException(status_code=400, detail=f"Unknown model type: {request.model_type}")
        else:
            # Fallback to mock models
            if request.model_type == "anomaly_detection":
                result = mock_anomaly_detection(request.features)
            elif request.model_type == "failure_prediction":
                result = mock_failure_prediction(request.features)
            elif request.model_type == "time_series_forecast":
                raise HTTPException(
                    status_code=400,
                    detail="Use /forecast endpoint for time series predictions"
                )
            else:
                raise HTTPException(status_code=400, detail=f"Unknown model type: {request.model_type}")
        
        logger.info(f"Inference completed for {request.sensor_id}")
        
        return InferenceResponse(
            sensor_id=request.sensor_id,
            model_type=request.model_type,
            prediction=result["prediction"],
            probability=result["probability"],
            anomaly_score=result.get("anomaly_score"),
            failure_probability=result.get("failure_probability"),
            timestamp=datetime.utcnow()
        )
    except RuntimeError as exc:
        logger.warning("Inference unavailable for %s: %s", request.model_type, exc)
        if METRICS_ENABLED:
            INFERENCE_ERRORS.labels(request.model_type, "unavailable").inc()
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as e:
        logger.error(f"Inference error: {e}")
        if METRICS_ENABLED:
            INFERENCE_ERRORS.labels(request.model_type, type(e).__name__).inc()
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")
    finally:
        if METRICS_ENABLED and start_time is not None:
            duration = time.perf_counter() - start_time
            INFERENCE_LATENCY.labels(request.model_type).observe(duration)


@app.post("/batch_infer")
async def batch_infer(requests: List[InferenceRequest]):
    """Batch inference for multiple sensors"""
    results = []
    for req in requests:
        try:
            response = await infer(req)
            results.append(response.dict())
        except Exception as e:
            results.append({"error": str(e), "sensor_id": req.sensor_id})
    return {"results": results}


@app.post("/forecast", response_model=TimeSeriesForecastResponse)
async def forecast_time_series(request: TimeSeriesForecastRequest):
    """Perform time series forecasting using LSTM model"""
    start_time = None
    if METRICS_ENABLED:
        INFERENCE_REQUESTS.labels("time_series_forecast").inc()
        start_time = time.perf_counter()

    try:
        if not (MLFLOW_AVAILABLE and mlflow_manager):
            raise HTTPException(
                status_code=503,
                detail="MLflow integration not available for time series forecasting"
            )

        result = mlflow_manager.predict_time_series(
            historical_data=request.historical_data,
            forecast_steps=request.forecast_steps
        )

        logger.info(f"Time series forecast completed for {request.sensor_id}")

        return TimeSeriesForecastResponse(
            sensor_id=request.sensor_id,
            predictions=result["predictions"],
            forecast_steps=result["forecast_steps"],
            sequence_length=result["sequence_length"],
            confidence=result["confidence"],
            timestamp=datetime.utcnow()
        )
    except ValueError as e:
        logger.warning("Invalid input for time series forecast: %s", e)
        if METRICS_ENABLED:
            INFERENCE_ERRORS.labels("time_series_forecast", "invalid_input").inc()
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        logger.warning("Time series forecast unavailable: %s", e)
        if METRICS_ENABLED:
            INFERENCE_ERRORS.labels("time_series_forecast", "unavailable").inc()
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Time series forecast error: {e}")
        if METRICS_ENABLED:
            INFERENCE_ERRORS.labels("time_series_forecast", type(e).__name__).inc()
        raise HTTPException(status_code=500, detail=f"Forecast error: {str(e)}")
    finally:
        if METRICS_ENABLED and start_time is not None:
            duration = time.perf_counter() - start_time
            INFERENCE_LATENCY.labels("time_series_forecast").observe(duration)


@app.get("/models")
async def list_models():
    """List available models"""
    if not (MLFLOW_AVAILABLE and mlflow_manager):
        return {
            "models": [
                {
                    "type": "anomaly_detection",
                    "registry": None,
                    "loaded": False,
                    "status": "mock",
                },
                {
                    "type": "failure_prediction",
                    "registry": None,
                    "loaded": False,
                    "status": "mock",
                },
                {
                    "type": "time_series_forecast",
                    "registry": None,
                    "loaded": False,
                    "status": "mock",
                },
            ]
        }

    models = []
    for model_type, registry_name in MODEL_TYPE_TO_REGISTRY.items():
        info = mlflow_manager.get_model_info(registry_name)
        models.append(
            {
                "type": model_type,
                "registry": registry_name,
                "loaded": model_type in mlflow_manager.models,
                "status": "ready" if info else "missing",
                "info": info,
            }
        )

    return {"models": models}


@app.post("/models/{model_type}/train")
async def train_model(
    model_type: str,
    _: Dict[str, Any] = Depends(require_roles({"system_admin"})),
):
    """Trigger model training on demand."""
    if not (MLFLOW_AVAILABLE and mlflow_manager):
        raise HTTPException(status_code=503, detail="MLflow integration not available")

    if model_type == "anomaly_detection":
        mlflow_manager.train_anomaly_detection_model()
        mlflow_manager.load_model(MODEL_TYPE_TO_REGISTRY[model_type])
    elif model_type == "failure_prediction":
        mlflow_manager.train_failure_prediction_model()
        mlflow_manager.load_model(MODEL_TYPE_TO_REGISTRY[model_type])
    elif model_type == "time_series_forecast":
        mlflow_manager.train_time_series_model()
        mlflow_manager.load_model(MODEL_TYPE_TO_REGISTRY[model_type])
    else:
        raise HTTPException(status_code=400, detail=f"Unknown model type: {model_type}")

    return {"message": f"{model_type} model training started"}


@app.post("/models/reload")
async def reload_models(
    _: Dict[str, Any] = Depends(require_roles({"system_admin"})),
):
    """Reload registered models from MLflow."""
    if not (MLFLOW_AVAILABLE and mlflow_manager):
        raise HTTPException(status_code=503, detail="MLflow integration not available")

    results = mlflow_manager.load_registered_models()
    return {"loaded": results}


@app.get("/health")
async def health():
    """Health check"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)

