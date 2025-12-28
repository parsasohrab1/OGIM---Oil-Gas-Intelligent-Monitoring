"""
Digital Twin Service
Hosts engineering calculations, process simulations, and 3D BIM models
"""
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional, List, Any
from datetime import datetime
import time
import uvicorn
import sys
import os
import json

from prometheus_client import Counter, Histogram

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "shared"))

from logging_config import setup_logging  # type: ignore
from metrics import setup_metrics  # type: ignore
from tracing import setup_tracing  # type: ignore
from config import settings
from auth import require_authentication
from database import get_timescale_db
from sqlalchemy.orm import Session

logger = setup_logging("digital-twin-service")
app = FastAPI(title="OGIM Digital Twin Service", version="1.0.0")
setup_metrics(app, "digital-twin-service")
setup_tracing(app, "digital-twin-service")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SIMULATION_RUNS = Counter(
    "digital_twin_simulations_total",
    "Number of simulations executed",
    ["simulation_type"],
)
SIMULATION_DURATION = Histogram(
    "digital_twin_simulation_duration_seconds",
    "Duration of simulation execution",
)


class SimulationRequest(BaseModel):
    well_name: str
    parameters: Dict[str, float]
    simulation_type: str  # production_optimization, pressure_analysis, etc.


class SimulationResponse(BaseModel):
    simulation_id: str
    well_name: str
    results: Dict[str, float]
    timestamp: datetime
    recommendations: Optional[list] = None


class BIM3DModel(BaseModel):
    """3D BIM Model representation"""
    model_id: str
    well_name: str
    equipment_id: str
    model_type: str  # "pump", "valve", "pipeline", "wellhead", etc.
    geometry: Dict[str, Any]  # 3D geometry data (vertices, faces, etc.)
    position: Dict[str, float]  # x, y, z coordinates
    rotation: Dict[str, float]  # rotation angles
    scale: Dict[str, float]  # scale factors
    metadata: Dict[str, Any]  # Additional metadata


class BIM3DState(BaseModel):
    """Real-time state of 3D BIM component"""
    model_id: str
    sensor_id: Optional[str] = None
    current_value: Optional[float] = None
    status: str  # "normal", "warning", "critical", "offline"
    color: str  # Color representation for visualization
    animation: Optional[str] = None  # Animation state
    timestamp: datetime


class BIM3DScene(BaseModel):
    """Complete 3D scene with all models and states"""
    scene_id: str
    well_name: str
    models: List[BIM3DModel]
    states: List[BIM3DState]
    camera_position: Optional[Dict[str, float]] = None
    timestamp: datetime


simulations_db = []


@app.post("/simulate", response_model=SimulationResponse)
async def run_simulation(request: SimulationRequest):
    """Run engineering simulation"""
    start = time.perf_counter()
    simulation_id = f"SIM-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

    results = {
        "optimal_flow_rate": 450.5,
        "predicted_pressure": 325.2,
        "efficiency": 0.92,
    }

    recommendations = [
        "Optimize pump speed to 85% for maximum efficiency",
        "Consider maintenance in next 30 days",
    ]

    simulation = SimulationResponse(
        simulation_id=simulation_id,
        well_name=request.well_name,
        results=results,
        timestamp=datetime.now(),
        recommendations=recommendations,
    )

    simulations_db.append(simulation.dict())
    duration = time.perf_counter() - start
    SIMULATION_RUNS.labels(simulation_type=request.simulation_type).inc()
    SIMULATION_DURATION.observe(duration)
    logger.info(
        "Simulation executed",
        extra={
            "simulation_id": simulation_id,
            "simulation_type": request.simulation_type,
            "duration": duration,
        },
    )
    return simulation


@app.get("/simulations")
async def list_simulations(well_name: Optional[str] = None):
    """List simulations"""
    filtered = simulations_db
    if well_name:
        filtered = [s for s in simulations_db if s.get("well_name") == well_name]
    return {"simulations": filtered, "count": len(filtered)}


# 3D BIM Endpoints
@app.post("/bim3d/models")
async def create_bim_model(
    model: BIM3DModel,
    _: Dict[str, Any] = Depends(require_authentication)
):
    """Create or update a 3D BIM model"""
    # In production, store in database
    # For now, return the model
    logger.info(f"Created 3D BIM model: {model.model_id} for {model.well_name}")
    return {"model_id": model.model_id, "status": "created"}


@app.get("/bim3d/scene/{well_name}")
async def get_bim_scene(
    well_name: str,
    db: Session = Depends(get_timescale_db),
    _: Dict[str, Any] = Depends(require_authentication)
):
    """Get complete 3D BIM scene for a well with real-time states"""
    # Fetch latest sensor data
    from models import SensorData, Tag
    
    # Get all tags for this well
    tags = db.query(Tag).filter(Tag.well_name == well_name).all()
    
    # Build 3D models from equipment
    models = []
    states = []
    
    for tag in tags:
        # Create model for equipment
        model = BIM3DModel(
            model_id=f"{tag.equipment_type}-{tag.tag_id}",
            well_name=well_name,
            equipment_id=tag.equipment_type,
            model_type=tag.equipment_type.lower(),
            geometry={
                "type": tag.equipment_type,
                "vertices": [],  # Would be loaded from BIM file
                "faces": []
            },
            position={"x": 0, "y": 0, "z": 0},  # Would be from BIM
            rotation={"x": 0, "y": 0, "z": 0},
            scale={"x": 1, "y": 1, "z": 1},
            metadata={
                "sensor_type": tag.sensor_type,
                "unit": tag.unit,
                "location": tag.location
            }
        )
        models.append(model)
        
        # Get latest sensor reading
        latest_data = db.query(SensorData).filter(
            SensorData.tag_id == tag.tag_id
        ).order_by(SensorData.timestamp.desc()).first()
        
        if latest_data:
            # Determine status and color
            value = latest_data.value
            status = "normal"
            color = "#00ff00"  # Green
            
            if tag.critical_threshold_max and value > tag.critical_threshold_max:
                status = "critical"
                color = "#ff0000"  # Red
            elif tag.warning_threshold_max and value > tag.warning_threshold_max:
                status = "warning"
                color = "#ffaa00"  # Orange
            elif tag.critical_threshold_min and value < tag.critical_threshold_min:
                status = "critical"
                color = "#ff0000"
            elif tag.warning_threshold_min and value < tag.warning_threshold_min:
                status = "warning"
                color = "#ffaa00"
            
            state = BIM3DState(
                model_id=model.model_id,
                sensor_id=tag.tag_id,
                current_value=value,
                status=status,
                color=color,
                animation="pulse" if status != "normal" else None,
                timestamp=latest_data.timestamp
            )
            states.append(state)
    
    scene = BIM3DScene(
        scene_id=f"scene-{well_name}",
        well_name=well_name,
        models=models,
        states=states,
        camera_position={"x": 0, "y": 10, "z": 20},
        timestamp=datetime.utcnow()
    )
    
    return scene


@app.get("/bim3d/model/{model_id}/state")
async def get_model_state(
    model_id: str,
    db: Session = Depends(get_timescale_db),
    _: Dict[str, Any] = Depends(require_authentication)
):
    """Get real-time state of a specific 3D model"""
    # Fetch latest state from sensor data
    from models import SensorData, Tag
    
    # Find tag by model_id (assuming model_id contains tag_id)
    tag = db.query(Tag).filter(Tag.tag_id.like(f"%{model_id}%")).first()
    
    if not tag:
        raise HTTPException(status_code=404, detail="Model not found")
    
    latest_data = db.query(SensorData).filter(
        SensorData.tag_id == tag.tag_id
    ).order_by(SensorData.timestamp.desc()).first()
    
    if not latest_data:
        raise HTTPException(status_code=404, detail="No sensor data available")
    
    # Determine status
    value = latest_data.value
    status = "normal"
    color = "#00ff00"
    
    if tag.critical_threshold_max and value > tag.critical_threshold_max:
        status = "critical"
        color = "#ff0000"
    elif tag.warning_threshold_max and value > tag.warning_threshold_max:
        status = "warning"
        color = "#ffaa00"
    
    state = BIM3DState(
        model_id=model_id,
        sensor_id=tag.tag_id,
        current_value=value,
        status=status,
        color=color,
        animation="pulse" if status != "normal" else None,
        timestamp=latest_data.timestamp
    )
    
    return state


@app.get("/health")
async def health():
    """Health check"""
    return {"status": "healthy", "total_simulations": len(simulations_db)}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8008)

