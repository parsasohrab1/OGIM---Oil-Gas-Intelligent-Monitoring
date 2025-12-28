"""
Remote Operations Service
Setpoint adjustments, Equipment start/stop, Valve control, Emergency shutdown
"""
import asyncio
import json
import os
import sys
import time
from datetime import datetime
from typing import Any, Dict, List, Optional
from enum import Enum

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# Add backend directory to path
backend_dir = os.path.join(os.path.dirname(__file__), '..')
sys.path.insert(0, backend_dir)

from shared.config import settings
from shared.logging_config import setup_logging
from shared.metrics import setup_metrics
from shared.tracing import setup_tracing
from shared.auth import require_authentication, require_roles
from shared.database import get_db
from shared.models import Command, User, AuditLog
from sqlalchemy.orm import Session
from shared.secure_command_workflow import secure_command_workflow

# Setup logging
logger = setup_logging("remote-operations-service")

app = FastAPI(title="OGIM Remote Operations Service", version="1.0.0")
setup_metrics(app, "remote-operations-service")
setup_tracing(app, "remote-operations-service")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class OperationType(str, Enum):
    """Remote operation types"""
    SETPOINT_ADJUSTMENT = "setpoint_adjustment"
    EQUIPMENT_START = "equipment_start"
    EQUIPMENT_STOP = "equipment_stop"
    VALVE_OPEN = "valve_open"
    VALVE_CLOSE = "valve_close"
    VALVE_POSITION = "valve_position"
    EMERGENCY_SHUTDOWN = "emergency_shutdown"
    PUMP_SPEED = "pump_speed"
    COMPRESSOR_LOAD = "compressor_load"


class SetpointRequest(BaseModel):
    """Setpoint adjustment request"""
    well_name: str
    equipment_id: str
    parameter_name: str  # pressure, temperature, flow_rate, etc.
    target_value: float
    ramp_rate: Optional[float] = None  # Rate of change per second
    requires_approval: bool = True


class EquipmentControlRequest(BaseModel):
    """Equipment start/stop request"""
    well_name: str
    equipment_id: str
    equipment_type: str  # pump, compressor, motor, etc.
    operation: str  # start, stop, restart
    requires_approval: bool = True


class ValveControlRequest(BaseModel):
    """Valve control request"""
    well_name: str
    valve_id: str
    operation: str  # open, close, set_position
    position: Optional[float] = None  # 0.0 to 1.0 for set_position
    requires_approval: bool = True


class EmergencyShutdownRequest(BaseModel):
    """Emergency shutdown request"""
    well_name: Optional[str] = None  # None for site-wide shutdown
    equipment_id: Optional[str] = None
    shutdown_type: str = "immediate"  # immediate, controlled, partial
    reason: str
    requires_approval: bool = False  # Emergency shutdowns may bypass approval


class OperationResponse(BaseModel):
    """Operation response"""
    operation_id: str
    operation_type: str
    status: str  # pending, approved, executing, completed, failed
    command_id: Optional[str] = None
    message: str
    timestamp: datetime


class OperationStatus(BaseModel):
    """Operation status"""
    operation_id: str
    status: str
    progress: float  # 0.0 to 1.0
    current_value: Optional[float] = None
    target_value: Optional[float] = None
    estimated_completion: Optional[datetime] = None
    error_message: Optional[str] = None


@app.post("/setpoint/adjust", response_model=OperationResponse)
async def adjust_setpoint(
    request: SetpointRequest,
    db: Session = Depends(get_db),
    claims: Dict[str, Any] = Depends(require_authentication)
):
    """Adjust setpoint for equipment parameter"""
    user_id = claims.get("sub", "unknown")
    operation_id = f"SETPOINT-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
    
    # Create command through secure workflow
    if request.requires_approval:
        # Use secure command workflow
        secure_result = await secure_command_workflow.initiate_command(
            command_id=operation_id,
            command_type="setpoint_adjustment",
            parameters={
                "parameter_name": request.parameter_name,
                "target_value": request.target_value,
                "ramp_rate": request.ramp_rate
            },
            requested_by=user_id,
            well_name=request.well_name,
            equipment_id=request.equipment_id
        )
        
        return OperationResponse(
            operation_id=operation_id,
            operation_type=OperationType.SETPOINT_ADJUSTMENT.value,
            status="pending",
            command_id=operation_id,
            message="Setpoint adjustment requested. Awaiting approval.",
            timestamp=datetime.utcnow()
        )
    else:
        # Direct execution (for non-critical operations)
        command_id = f"CMD-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
        
        user = db.query(User).filter(User.username == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        db_command = Command(
            command_id=command_id,
            timestamp=datetime.utcnow(),
            well_name=request.well_name,
            equipment_id=request.equipment_id,
            command_type="setpoint_adjustment",
            parameters={
                "parameter_name": request.parameter_name,
                "target_value": request.target_value,
                "ramp_rate": request.ramp_rate
            },
            status="executing",
            requested_by_id=user.id,
            requires_two_factor=False
        )
        
        db.add(db_command)
        db.commit()
        
        logger.info(f"Setpoint adjustment executed: {operation_id}")
        
        return OperationResponse(
            operation_id=operation_id,
            operation_type=OperationType.SETPOINT_ADJUSTMENT.value,
            status="executing",
            command_id=command_id,
            message="Setpoint adjustment in progress",
            timestamp=datetime.utcnow()
        )


@app.post("/equipment/control", response_model=OperationResponse)
async def control_equipment(
    request: EquipmentControlRequest,
    db: Session = Depends(get_db),
    claims: Dict[str, Any] = Depends(require_authentication)
):
    """Start/stop equipment"""
    user_id = claims.get("sub", "unknown")
    operation_id = f"EQ-{request.operation.upper()}-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
    
    # Create command
    command_id = f"CMD-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
    
    user = db.query(User).filter(User.username == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_command = Command(
        command_id=command_id,
        timestamp=datetime.utcnow(),
        well_name=request.well_name,
        equipment_id=request.equipment_id,
        command_type=f"equipment_{request.operation}",
        parameters={
            "equipment_type": request.equipment_type,
            "operation": request.operation
        },
        status="pending" if request.requires_approval else "executing",
        requested_by_id=user.id,
        requires_two_factor=request.requires_approval
    )
    
    db.add(db_command)
    db.commit()
    
    return OperationResponse(
        operation_id=operation_id,
        operation_type=f"equipment_{request.operation}",
        status="pending" if request.requires_approval else "executing",
        command_id=command_id,
        message=f"Equipment {request.operation} requested",
        timestamp=datetime.utcnow()
    )


@app.post("/valve/control", response_model=OperationResponse)
async def control_valve(
    request: ValveControlRequest,
    db: Session = Depends(get_db),
    claims: Dict[str, Any] = Depends(require_authentication)
):
    """Control valve operations"""
    user_id = claims.get("sub", "unknown")
    operation_id = f"VALVE-{request.operation.upper()}-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
    
    command_id = f"CMD-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
    
    user = db.query(User).filter(User.username == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    parameters = {
        "operation": request.operation
    }
    if request.position is not None:
        parameters["position"] = request.position
    
    db_command = Command(
        command_id=command_id,
        timestamp=datetime.utcnow(),
        well_name=request.well_name,
        equipment_id=request.valve_id,
        command_type="valve_control",
        parameters=parameters,
        status="pending" if request.requires_approval else "executing",
        requested_by_id=user.id,
        requires_two_factor=request.requires_approval
    )
    
    db.add(db_command)
    db.commit()
    
    return OperationResponse(
        operation_id=operation_id,
        operation_type=f"valve_{request.operation}",
        status="pending" if request.requires_approval else "executing",
        command_id=command_id,
        message=f"Valve {request.operation} requested",
        timestamp=datetime.utcnow()
    )


@app.post("/emergency/shutdown", response_model=OperationResponse)
async def emergency_shutdown(
    request: EmergencyShutdownRequest,
    db: Session = Depends(get_db),
    claims: Dict[str, Any] = Depends(require_roles({"system_admin", "field_operator"}))
):
    """Emergency shutdown procedure"""
    user_id = claims.get("sub", "unknown")
    operation_id = f"ESD-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
    
    # Emergency shutdown bypasses normal approval
    command_id = f"CMD-ESD-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
    
    user = db.query(User).filter(User.username == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create emergency shutdown command
    db_command = Command(
        command_id=command_id,
        timestamp=datetime.utcnow(),
        well_name=request.well_name or "SITE-WIDE",
        equipment_id=request.equipment_id or "ALL",
        command_type="emergency_shutdown",
        parameters={
            "shutdown_type": request.shutdown_type,
            "reason": request.reason
        },
        status="executing",  # Emergency shutdown executes immediately
        requested_by_id=user.id,
        requires_two_factor=False,  # Bypass 2FA for emergencies
        critical=True
    )
    
    db.add(db_command)
    
    # Create audit log
    audit = AuditLog(
        timestamp=datetime.utcnow(),
        user_id=user.id,
        action="emergency_shutdown",
        resource_type="command",
        resource_id=command_id,
        details={
            "shutdown_type": request.shutdown_type,
            "reason": request.reason,
            "well_name": request.well_name,
            "equipment_id": request.equipment_id
        },
        status="success"
    )
    db.add(audit)
    
    db.commit()
    
    logger.critical(f"EMERGENCY SHUTDOWN INITIATED: {operation_id} by {user_id}")
    
    return OperationResponse(
        operation_id=operation_id,
        operation_type=OperationType.EMERGENCY_SHUTDOWN.value,
        status="executing",
        command_id=command_id,
        message=f"Emergency shutdown initiated: {request.reason}",
        timestamp=datetime.utcnow()
    )


@app.get("/operation/{operation_id}/status", response_model=OperationStatus)
async def get_operation_status(
    operation_id: str,
    db: Session = Depends(get_db),
    _: Dict[str, Any] = Depends(require_authentication)
):
    """Get status of a remote operation"""
    # Find command by operation_id or command_id
    command = db.query(Command).filter(
        (Command.command_id == operation_id) | 
        (Command.command_id.like(f"%{operation_id}%"))
    ).first()
    
    if not command:
        raise HTTPException(status_code=404, detail="Operation not found")
    
    # Calculate progress based on status
    progress_map = {
        "pending": 0.0,
        "approved": 0.3,
        "executing": 0.7,
        "executed": 1.0,
        "rejected": 0.0,
        "failed": 0.0
    }
    
    progress = progress_map.get(command.status, 0.0)
    
    return OperationStatus(
        operation_id=operation_id,
        status=command.status,
        progress=progress,
        current_value=None,  # Would be fetched from equipment
        target_value=command.parameters.get("target_value") if isinstance(command.parameters, dict) else None,
        estimated_completion=None,
        error_message=None
    )


@app.get("/health")
async def health():
    """Health check"""
    return {
        "status": "healthy",
        "service": "remote-operations"
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8012)

