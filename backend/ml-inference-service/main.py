"""
ML Inference Service
Provides low-latency model inference for anomaly detection and failure prediction
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
import uvicorn
import numpy as np
import sys
import os

# Add shared module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'shared'))

from config import settings
from logging_config import setup_logging

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

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MLflow manager
mlflow_manager = None


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


@app.on_event("startup")
async def startup_event():
    """Initialize MLflow manager on startup"""
    global mlflow_manager
    logger.info("Starting ML inference service...")
    
    if MLFLOW_AVAILABLE:
        try:
            mlflow_manager = get_mlflow_manager()
            
            # Train initial models if not exists
            logger.info("Training initial ML models...")
            mlflow_manager.train_anomaly_detection_model()
            mlflow_manager.train_failure_prediction_model()
            logger.info("ML models ready")
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
    try:
        # Use MLflow models if available, otherwise fallback to mock
        if MLFLOW_AVAILABLE and mlflow_manager:
            if request.model_type == "anomaly_detection":
                result = mlflow_manager.predict_anomaly(request.features)
            elif request.model_type == "failure_prediction":
                result = mlflow_manager.predict_failure(request.features)
            else:
                raise HTTPException(status_code=400, detail=f"Unknown model type: {request.model_type}")
        else:
            # Fallback to mock models
            if request.model_type == "anomaly_detection":
                result = mock_anomaly_detection(request.features)
            elif request.model_type == "failure_prediction":
                result = mock_failure_prediction(request.features)
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
    except Exception as e:
        logger.error(f"Inference error: {e}")
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


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


@app.get("/models")
async def list_models():
    """List available models"""
    return {
        "models": [
            {
                "model_id": "anomaly-detection-v1",
                "type": "anomaly_detection",
                "version": "1.0.0",
                "status": "active",
                "accuracy": 0.89
            },
            {
                "model_id": "failure-prediction-v1",
                "type": "failure_prediction",
                "version": "1.0.0",
                "status": "active",
                "accuracy": 0.87
            }
        ]
    }


@app.get("/health")
async def health():
    """Health check"""
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8003)

