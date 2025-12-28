"""
Alert Service
Manages alert rules, de-duplication, escalation, and silencing
"""
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import uvicorn
import sys
import os

# Add shared module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'shared'))

from database import get_db
from models import Alert, AlertRule, User
from config import settings
from logging_config import setup_logging
from kafka_utils import KafkaProducerWrapper, KAFKA_TOPICS
from auth import require_authentication, require_roles
from tracing import setup_tracing
from metrics import setup_metrics
from sqlalchemy.orm import Session
import httpx
import httpx
import asyncio

# Setup logging
logger = setup_logging("alert-service")

app = FastAPI(title="OGIM Alert Service", version="1.0.0")

setup_tracing(app, "alert-service")
setup_metrics(app, "alert-service")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Kafka producer
alert_producer = None


class AlertCreate(BaseModel):
    alert_id: str
    timestamp: datetime
    severity: str  # critical, warning, info
    status: str  # open, acknowledged, resolved
    well_name: str
    sensor_id: str
    message: str
    rule_name: str


class AlertResponse(BaseModel):
    alert_id: str
    timestamp: datetime
    severity: str
    status: str
    well_name: str
    tag_id: Optional[str] = None
    message: str
    rule_name: str
    acknowledged_by_id: Optional[int] = None
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AlertRuleCreate(BaseModel):
    rule_id: str
    name: str
    description: str
    condition: str
    threshold: float
    severity: str
    enabled: bool = True


class AlertRuleResponse(BaseModel):
    rule_id: str
    name: str
    description: Optional[str] = None
    condition: str
    threshold: Optional[float] = None
    severity: str
    enabled: bool

    class Config:
        from_attributes = True


# Role dependencies
require_alert_read = require_authentication
require_alert_write = require_roles({"system_admin", "field_operator", "data_engineer"})
require_alert_admin = require_roles({"system_admin"})


@app.on_event("startup")
async def startup_event():
    """Initialize database and Kafka on startup"""
    global alert_producer
    logger.info("Starting alert service...")
    try:
        alert_producer = KafkaProducerWrapper(KAFKA_TOPICS["ALERTS"])
        logger.info("Alert service ready. Ensure database migrations are applied.")
    except Exception as e:
        logger.error(f"Failed to initialize alert service: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    if alert_producer:
        alert_producer.close()


@app.post("/alerts", status_code=201)
async def create_alert(
    alert: AlertCreate,
    db: Session = Depends(get_db),
    _: Dict[str, Any] = Depends(require_alert_write)
):
    """Create a new alert"""
    # De-duplication: check if similar alert exists
    existing = db.query(Alert).filter(
        Alert.well_name == alert.well_name,
        Alert.rule_name == alert.rule_name,
        Alert.status == "open"
    ).first()
    
    if existing:
        logger.info(f"Duplicate alert suppressed: {alert.alert_id}")
        return {"message": "Duplicate alert suppressed", "alert_id": existing.alert_id}
    
    # Create alert
    db_alert = Alert(
        alert_id=alert.alert_id,
        timestamp=alert.timestamp,
        severity=alert.severity,
        status=alert.status,
        well_name=alert.well_name,
        tag_id=alert.sensor_id,
        message=alert.message,
        rule_name=alert.rule_name
    )
    
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    
    # Publish to Kafka
    try:
        if alert_producer:
            alert_producer.send(alert.alert_id, alert.dict())
    except Exception as e:
        logger.error(f"Failed to publish alert to Kafka: {e}")
    
    # Auto-create work order for critical alerts if enabled (background task)
    if alert.severity == "critical" and settings.ERP_AUTO_CREATE_WORK_ORDERS:
        import asyncio
        async def create_work_order():
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{settings.ERP_SERVICE_URL}/work-orders/auto-create",
                        params={"alert_id": alert.alert_id, "erp_type": settings.ERP_DEFAULT_SYSTEM},
                        timeout=10.0
                    )
                    if response.status_code == 200:
                        logger.info(f"Auto-created work order for alert {alert.alert_id}")
            except Exception as e:
                logger.error(f"Failed to auto-create work order: {e}")
        
        # Run in background
        asyncio.create_task(create_work_order())
    
    logger.info(f"Alert created: {alert.alert_id}")
    return {"alert_id": alert.alert_id, "message": "Alert created"}


@app.get("/alerts")
async def list_alerts(
    well_name: Optional[str] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: Dict[str, Any] = Depends(require_alert_read)
):
    """List alerts with optional filtering"""
    query = db.query(Alert).order_by(Alert.timestamp.desc())
    
    if well_name:
        query = query.filter(Alert.well_name == well_name)
    if status:
        query = query.filter(Alert.status == status)
    if severity:
        query = query.filter(Alert.severity == severity)
    
    alerts = query.limit(limit).all()
    return {
        "alerts": [
            AlertResponse.model_validate(alert).model_dump()
            for alert in alerts
        ],
        "count": len(alerts)
    }


@app.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    claims: Dict[str, Any] = Depends(require_alert_write)
):
    """Acknowledge an alert"""
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    # Get user
    username = claims.get("sub")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    alert.status = "acknowledged"
    alert.acknowledged_by_id = user.id
    alert.acknowledged_at = datetime.utcnow()
    
    db.commit()
    logger.info(f"Alert acknowledged: {alert_id} by {username}")
    
    return {"message": "Alert acknowledged", "alert_id": alert_id}


@app.post("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    _: Dict[str, Any] = Depends(require_alert_admin)
):
    """Resolve an alert"""
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.status = "resolved"
    alert.resolved_at = datetime.utcnow()
    
    db.commit()
    logger.info(f"Alert resolved: {alert_id}")
    
    return {"message": "Alert resolved", "alert_id": alert_id}


@app.post("/alerts/{alert_id}/create-work-order")
async def create_work_order_from_alert(
    alert_id: str,
    erp_type: str = "sap",
    db: Session = Depends(get_db),
    _: Dict[str, Any] = Depends(require_alert_write)
):
    """Create work order from alert manually"""
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    # Check if work order already exists
    if alert.erp_work_order_id:
        return {
            "message": "Work order already exists for this alert",
            "work_order_id": alert.erp_work_order_id,
            "alert_id": alert_id
        }
    
    try:
        # Call ERP service to create work order
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.ERP_SERVICE_URL}/work-orders/auto-create",
                params={"alert_id": alert_id, "erp_type": erp_type},
                timeout=30.0
            )
            
            if response.status_code == 200:
                work_order_data = response.json()
                # Update alert with work order ID
                alert.erp_work_order_id = work_order_data.get("work_order_id")
                db.commit()
                
                logger.info(f"Created work order {work_order_data.get('work_order_id')} for alert {alert_id}")
                return {
                    "message": "Work order created successfully",
                    "work_order_id": work_order_data.get("work_order_id"),
                    "erp_system": work_order_data.get("erp_system"),
                    "status": work_order_data.get("status"),
                    "alert_id": alert_id
                }
            else:
                error_detail = response.text
                logger.error(f"Failed to create work order: {error_detail}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to create work order: {error_detail}"
                )
    except httpx.TimeoutException:
        logger.error("Timeout while creating work order")
        raise HTTPException(status_code=504, detail="ERP service timeout")
    except httpx.RequestError as e:
        logger.error(f"Error connecting to ERP service: {e}")
        raise HTTPException(status_code=503, detail=f"ERP service unavailable: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error creating work order: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create work order: {str(e)}")


@app.post("/rules")
async def create_rule(
    rule: AlertRuleCreate,
    db: Session = Depends(get_db),
    _: Dict[str, Any] = Depends(require_alert_admin)
):
    """Create an alert rule"""
    db_rule = AlertRule(**rule.dict())
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    
    logger.info(f"Alert rule created: {rule.rule_id}")
    return {"message": "Rule created", "rule_id": rule.rule_id}


@app.get("/rules")
async def list_rules(
    enabled: Optional[bool] = None,
    db: Session = Depends(get_db),
    _: Dict[str, Any] = Depends(require_alert_read)
):
    """List all alert rules"""
    query = db.query(AlertRule)
    
    if enabled is not None:
        query = query.filter(AlertRule.enabled == enabled)
    
    rules = query.all()
    return {
        "rules": [
            AlertRuleResponse.model_validate(rule).model_dump()
            for rule in rules
        ],
        "count": len(rules)
    }


@app.get("/health")
async def health(db: Session = Depends(get_db)):
    """Health check"""
    open_alerts = db.query(Alert).filter(Alert.status == "open").count()
    return {"status": "healthy", "open_alerts": open_alerts}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8004)
