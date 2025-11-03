"""
Command & Control Service
Manages command queue, two-factor approval, and status feedback
"""
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime
import uvicorn
import sys
import os

# Add shared module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'shared'))

from database import get_db, init_db
from models import Command, User, AuditLog
from config import settings
from logging_config import setup_logging
from kafka_utils import KafkaProducerWrapper, KAFKA_TOPICS
from sqlalchemy.orm import Session

# Setup logging
logger = setup_logging("command-control-service")

app = FastAPI(title="OGIM Command & Control Service", version="1.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Kafka producer
command_producer = None


class CommandRequest(BaseModel):
    well_name: str
    equipment_id: str
    command_type: str  # setpoint, open_valve, close_valve, start_pump, stop_pump
    parameters: Dict
    requested_by: str
    requires_two_factor: bool = True


@app.on_event("startup")
async def startup_event():
    """Initialize database and Kafka on startup"""
    global command_producer
    logger.info("Starting command control service...")
    try:
        init_db()
        command_producer = KafkaProducerWrapper(KAFKA_TOPICS["CONTROL_COMMANDS"])
        logger.info("Command control service initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize command control service: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    if command_producer:
        command_producer.close()


@app.post("/commands")
async def create_command(
    request: CommandRequest,
    db: Session = Depends(get_db)
):
    """Create a control command"""
    # Get user
    user = db.query(User).filter(User.username == request.requested_by).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    command_id = f"CMD-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}-{user.id}"
    
    # Create command
    db_command = Command(
        command_id=command_id,
        timestamp=datetime.utcnow(),
        well_name=request.well_name,
        equipment_id=request.equipment_id,
        command_type=request.command_type,
        parameters=request.parameters,
        status="pending",
        requested_by_id=user.id,
        requires_two_factor=request.requires_two_factor
    )
    
    db.add(db_command)
    
    # Create audit log
    audit = AuditLog(
        timestamp=datetime.utcnow(),
        user_id=user.id,
        action="create_command",
        resource_type="command",
        resource_id=command_id,
        details=request.dict(),
        status="success"
    )
    db.add(audit)
    
    db.commit()
    db.refresh(db_command)
    
    logger.info(f"Command created: {command_id} by {request.requested_by}")
    
    return {"command_id": command_id, "status": "pending", "message": "Command queued"}


@app.post("/commands/{command_id}/approve")
async def approve_command(
    command_id: str,
    approved_by: str,
    db: Session = Depends(get_db)
):
    """Approve a command (two-factor approval)"""
    # Get command
    command = db.query(Command).filter(Command.command_id == command_id).first()
    if not command:
        raise HTTPException(status_code=404, detail="Command not found")
    
    if command.status != "pending":
        raise HTTPException(status_code=400, detail=f"Command already {command.status}")
    
    # Get approver
    approver = db.query(User).filter(User.username == approved_by).first()
    if not approver:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if approver is different from requester (two-person rule)
    if command.requested_by_id == approver.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot approve own command (two-person rule)"
        )
    
    # Update command
    command.status = "approved"
    command.approved_by_id = approver.id
    
    # Create audit log
    audit = AuditLog(
        timestamp=datetime.utcnow(),
        user_id=approver.id,
        action="approve_command",
        resource_type="command",
        resource_id=command_id,
        details={"approved_by": approved_by},
        status="success"
    )
    db.add(audit)
    
    db.commit()
    
    logger.info(f"Command approved: {command_id} by {approved_by}")
    
    return {"command_id": command_id, "status": "approved"}


@app.post("/commands/{command_id}/execute")
async def execute_command(command_id: str, db: Session = Depends(get_db)):
    """Execute an approved command"""
    command = db.query(Command).filter(Command.command_id == command_id).first()
    if not command:
        raise HTTPException(status_code=404, detail="Command not found")
    
    if command.status != "approved":
        raise HTTPException(
            status_code=400,
            detail="Command must be approved before execution"
        )
    
    # Update status
    command.status = "executing"
    db.commit()
    
    # Publish to Kafka for SCADA connector to execute
    try:
        if command_producer:
            command_data = {
                "command_id": command.command_id,
                "well_name": command.well_name,
                "equipment_id": command.equipment_id,
                "command_type": command.command_type,
                "parameters": command.parameters
            }
            command_producer.send(command_id, command_data)
            command_producer.flush()
    except Exception as e:
        logger.error(f"Failed to publish command to Kafka: {e}")
        command.status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail="Failed to execute command")
    
    # Mark as executed (in production, wait for SCADA confirmation)
    command.status = "executed"
    command.executed_at = datetime.utcnow()
    command.execution_result = {"status": "success", "message": "Command sent to SCADA"}
    
    # Create audit log
    audit = AuditLog(
        timestamp=datetime.utcnow(),
        user_id=command.approved_by_id,
        action="execute_command",
        resource_type="command",
        resource_id=command_id,
        details={"execution_time": command.executed_at.isoformat()},
        status="success"
    )
    db.add(audit)
    
    db.commit()
    
    logger.info(f"Command executed: {command_id}")
    
    return {"command_id": command_id, "status": "executed"}


@app.get("/commands")
async def list_commands(
    well_name: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List commands"""
    query = db.query(Command).order_by(Command.timestamp.desc())
    
    if well_name:
        query = query.filter(Command.well_name == well_name)
    if status:
        query = query.filter(Command.status == status)
    
    commands = query.limit(limit).all()
    return {"commands": commands, "count": len(commands)}


@app.get("/commands/{command_id}")
async def get_command(command_id: str, db: Session = Depends(get_db)):
    """Get command by ID"""
    command = db.query(Command).filter(Command.command_id == command_id).first()
    if not command:
        raise HTTPException(status_code=404, detail="Command not found")
    return command


@app.get("/health")
async def health(db: Session = Depends(get_db)):
    """Health check"""
    pending = db.query(Command).filter(Command.status == "pending").count()
    return {"status": "healthy", "pending_commands": pending}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8006)
