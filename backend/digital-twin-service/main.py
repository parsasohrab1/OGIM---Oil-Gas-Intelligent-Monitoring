"""
Digital Twin Service
Hosts engineering calculations and process simulations
"""
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict, Optional
from datetime import datetime
import time
import uvicorn
import sys
import os

from prometheus_client import Counter, Histogram

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "shared"))

from logging_config import setup_logging  # type: ignore
from metrics import setup_metrics  # type: ignore
from tracing import setup_tracing  # type: ignore

logger = setup_logging("digital-twin-service")
app = FastAPI(title="OGIM Digital Twin Service", version="1.0.0")
setup_metrics(app, "digital-twin-service")
setup_tracing(app, "digital-twin-service")

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


@app.get("/health")
async def health():
    """Health check"""
    return {"status": "healthy", "total_simulations": len(simulations_db)}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8008)

