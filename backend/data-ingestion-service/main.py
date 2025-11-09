"""
Data Ingestion Service
Manages connectors, schema validation, and DLQ handling
"""
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uvicorn
import sys
import os
import asyncio

from prometheus_client import Counter

# Add shared module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'shared'))

from database import get_timescale_db, get_db
from models import SensorData, Tag
from config import settings
from logging_config import setup_logging
from kafka_utils import KafkaProducerWrapper, KafkaConsumerWrapper, KAFKA_TOPICS
from opcua_client import OPCUAClient
from auth import require_authentication, require_roles
from metrics import setup_metrics
from tracing import setup_tracing
from sqlalchemy.orm import Session

# Setup logging
logger = setup_logging("data-ingestion-service")

app = FastAPI(title="OGIM Data Ingestion Service", version="1.0.0")

setup_tracing(app, "data-ingestion-service", instrument_requests=True)
setup_metrics(app, "data-ingestion-service")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Kafka producer
kafka_producer = None
opcua_client = None

VALIDATION_SUCCESS = Counter(
    "ingest_validation_success_total",
    "Successful records ingested",
    ["source"],
)
VALIDATION_FAILURE = Counter(
    "ingest_validation_failure_total",
    "Records rejected during ingestion",
    ["source", "reason"],
)

def _record_validation(source: str, success: bool, reason: str = ""):
    if success:
        VALIDATION_SUCCESS.labels(source=source).inc()
    else:
        VALIDATION_FAILURE.labels(source=source, reason=reason or "unknown").inc()


class SensorDataModel(BaseModel):
    timestamp: datetime
    well_name: str
    equipment_type: str
    sensor_type: str
    value: float
    unit: str
    sensor_id: str
    data_quality: Optional[str] = "good"


class IngestRequest(BaseModel):
    records: List[SensorDataModel]
    source: str = Field(..., description="Data source identifier")


class IngestResponse(BaseModel):
    status: str
    records_ingested: int
    source: str


# Role dependencies
require_ingest_read = require_roles({"system_admin", "data_engineer"})
require_ingest_admin = require_roles({"system_admin"})


class ConnectorConfig(BaseModel):
    connector_id: str
    connector_type: str  # opcua, modbus, kafka
    config: dict


@app.on_event("startup")
async def startup_event():
    """Initialize database and Kafka on startup"""
    global kafka_producer, opcua_client
    logger.info("Starting data ingestion service...")
    try:
        kafka_producer = KafkaProducerWrapper(KAFKA_TOPICS["RAW_SENSOR_DATA"])
        
        # Initialize OPC-UA client if configured
        if settings.OPCUA_SERVER_URL:
            opcua_client = OPCUAClient()
            opcua_client.connect()
        
        logger.info("Data ingestion service ready. Ensure TimescaleDB migrations are applied.")
    except Exception as e:
        logger.error(f"Failed to initialize data ingestion service: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    if kafka_producer:
        kafka_producer.close()
    if opcua_client:
        opcua_client.disconnect()


@app.post("/ingest")
async def ingest_data(
    request: IngestRequest,
    background_tasks: BackgroundTasks,
    tsdb: Session = Depends(get_timescale_db),
    meta_db: Session = Depends(get_db),
    _: Dict[str, Any] = Depends(require_ingest_read)
) -> IngestResponse:
    """Ingest sensor data"""
    try:
        validated_records = []

        # Load tag metadata once
        sensor_ids = {r.sensor_id for r in request.records}
        tags = {
            tag.tag_id: tag
            for tag in meta_db.query(Tag).filter(Tag.tag_id.in_(sensor_ids)).all()
        }

        for record in request.records:
            tag = tags.get(record.sensor_id)
            if not tag:
                _record_validation(request.source, False, "missing_tag")
                raise HTTPException(
                    status_code=422,
                    detail=f"Unknown sensor_id '{record.sensor_id}'"
                )

            # Validate types
            if record.sensor_type != tag.sensor_type:
                _record_validation(request.source, False, "sensor_type_mismatch")
                raise HTTPException(
                    status_code=422,
                    detail=f"Sensor type mismatch for {record.sensor_id}"
                )

            if record.unit != tag.unit:
                _record_validation(request.source, False, "unit_mismatch")
                raise HTTPException(
                    status_code=422,
                    detail=f"Unit mismatch for {record.sensor_id}"
                )

            if tag.valid_range_min is not None and record.value < tag.valid_range_min:
                _record_validation(request.source, False, "below_range")
                raise HTTPException(
                    status_code=422,
                    detail=f"Value below valid range for {record.sensor_id}"
                )

            if tag.valid_range_max is not None and record.value > tag.valid_range_max:
                _record_validation(request.source, False, "above_range")
                raise HTTPException(
                    status_code=422,
                    detail=f"Value above valid range for {record.sensor_id}"
                )

            if record.data_quality and record.data_quality not in {"good", "bad", "uncertain"}:
                _record_validation(request.source, False, "bad_quality")
                raise HTTPException(
                    status_code=422,
                    detail=f"Invalid data_quality for {record.sensor_id}"
                )

            db_record = SensorData(
                timestamp=record.timestamp,
                tag_id=record.sensor_id,
                value=record.value,
                data_quality=record.data_quality
            )
            tsdb.add(db_record)
            validated_records.append(record.dict())
            _record_validation(request.source, True)

        tsdb.commit()
        
        # Publish to Kafka in background
        if kafka_producer and validated_records:
            background_tasks.add_task(
                publish_to_kafka,
                validated_records,
                request.source
            )
        
        logger.info(f"Ingested {len(validated_records)} records from {request.source}")
        
        return IngestResponse(
            status="success",
            records_ingested=len(validated_records),
            source=request.source
        )
    except Exception as e:
        logger.error(f"Ingestion error: {e}")
        raise HTTPException(status_code=400, detail=f"Validation error: {str(e)}")


def publish_to_kafka(records: List[dict], source: str):
    """Publish records to Kafka"""
    try:
        for record in records:
            kafka_producer.send(record["sensor_id"], record)
        kafka_producer.flush()
        logger.info(f"Published {len(records)} records to Kafka")
    except Exception as e:
        logger.error(f"Failed to publish to Kafka: {e}")


@app.get("/connectors")
async def list_connectors(
    _: Dict[str, Any] = Depends(require_ingest_admin)
):
    """List all connectors"""
    connectors = []
    
    # OPC-UA connector
    if opcua_client:
        connectors.append({
            "connector_id": "opcua-connector-1",
            "type": "OPC-UA",
            "status": "running" if opcua_client.connected else "stopped",
            "last_update": datetime.utcnow().isoformat(),
        })
    
    return {"connectors": connectors}


@app.post("/connectors/{connector_id}/start")
async def start_connector(
    connector_id: str,
    _: Dict[str, Any] = Depends(require_ingest_admin)
):
    """Start a connector"""
    if connector_id.startswith("opcua") and opcua_client:
        success = opcua_client.connect()
        if success:
            return {"message": f"Connector {connector_id} started"}
        else:
            raise HTTPException(status_code=500, detail="Failed to start connector")
    
    raise HTTPException(status_code=404, detail="Connector not found")


@app.post("/connectors/{connector_id}/stop")
async def stop_connector(
    connector_id: str,
    _: Dict[str, Any] = Depends(require_ingest_admin)
):
    """Stop a connector"""
    if connector_id.startswith("opcua") and opcua_client:
        opcua_client.disconnect()
        return {"message": f"Connector {connector_id} stopped"}
    
    raise HTTPException(status_code=404, detail="Connector not found")


@app.get("/opcua/nodes")
async def list_opcua_nodes(
    _: Dict[str, Any] = Depends(require_ingest_admin)
):
    """List available OPC-UA nodes"""
    if not opcua_client or not opcua_client.connected:
        raise HTTPException(status_code=503, detail="OPC-UA client not connected")
    
    nodes = opcua_client.browse_nodes()
    return {"nodes": nodes, "count": len(nodes)}


@app.post("/opcua/read")
async def read_opcua_node(
    node_id: str,
    _: Dict[str, Any] = Depends(require_ingest_admin)
):
    """Read OPC-UA node value"""
    if not opcua_client or not opcua_client.connected:
        raise HTTPException(status_code=503, detail="OPC-UA client not connected")
    
    value = opcua_client.read_node(node_id)
    if value is None:
        raise HTTPException(status_code=404, detail="Failed to read node")
    
    return {"node_id": node_id, "value": value, "timestamp": datetime.utcnow().isoformat()}


@app.post("/opcua/write")
async def write_opcua_node(
    node_id: str,
    value: float,
    _: Dict[str, Any] = Depends(require_ingest_admin)
):
    """Write value to OPC-UA node"""
    if not opcua_client or not opcua_client.connected:
        raise HTTPException(status_code=503, detail="OPC-UA client not connected")
    
    success = opcua_client.write_node(node_id, value)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to write node")
    
    return {"message": "Value written successfully", "node_id": node_id, "value": value}


@app.get("/health")
async def health(tsdb: Session = Depends(get_timescale_db)):
    """Health check"""
    records_count = tsdb.query(SensorData).count()
    return {
        "status": "healthy",
        "records_in_db": records_count,
        "kafka_connected": kafka_producer is not None,
        "opcua_connected": opcua_client.connected if opcua_client else False
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)
