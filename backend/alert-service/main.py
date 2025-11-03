"""
Alert Service
Manages alert rules, de-duplication, escalation, and silencing
"""
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uvicorn
import sys
import os

# Add shared module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'shared'))

from database import get_db, init_db
from models import Alert, AlertRule, User
from config import settings
from logging_config import setup_logging
from kafka_utils import KafkaProducerWrapper, KAFKA_TOPICS
from sqlalchemy.orm import Session

# Setup logging
logger = setup_logging("alert-service")

app = FastAPI(title="OGIM Alert Service", version="1.0.0")

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


class AlertRuleCreate(BaseModel):
    rule_id: str
    name: str
    description: str
    condition: str
    threshold: float
    severity: str
    enabled: bool = True


@app.on_event("startup")
async def startup_event():
    """Initialize database and Kafka on startup"""
    global alert_producer
    logger.info("Starting alert service...")
    try:
        init_db()
        alert_producer = KafkaProducerWrapper(KAFKA_TOPICS["ALERTS"])
        logger.info("Alert service initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize alert service: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    if alert_producer:
        alert_producer.close()


@app.post("/alerts", status_code=201)
async def create_alert(alert: AlertCreate, db: Session = Depends(get_db)):
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
    
    logger.info(f"Alert created: {alert.alert_id}")
    return {"alert_id": alert.alert_id, "message": "Alert created"}


@app.get("/alerts")
async def list_alerts(
    well_name: Optional[str] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
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
    return {"alerts": alerts, "count": len(alerts)}


@app.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    acknowledged_by: str,
    db: Session = Depends(get_db)
):
    """Acknowledge an alert"""
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    # Get user
    user = db.query(User).filter(User.username == acknowledged_by).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    alert.status = "acknowledged"
    alert.acknowledged_by_id = user.id
    alert.acknowledged_at = datetime.utcnow()
    
    db.commit()
    logger.info(f"Alert acknowledged: {alert_id} by {acknowledged_by}")
    
    return {"message": "Alert acknowledged", "alert_id": alert_id}


@app.post("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str, db: Session = Depends(get_db)):
    """Resolve an alert"""
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.status = "resolved"
    alert.resolved_at = datetime.utcnow()
    
    db.commit()
    logger.info(f"Alert resolved: {alert_id}")
    
    return {"message": "Alert resolved", "alert_id": alert_id}


@app.post("/rules")
async def create_rule(rule: AlertRuleCreate, db: Session = Depends(get_db)):
    """Create an alert rule"""
    db_rule = AlertRule(**rule.dict())
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    
    logger.info(f"Alert rule created: {rule.rule_id}")
    return {"message": "Rule created", "rule_id": rule.rule_id}


@app.get("/rules")
async def list_rules(enabled: Optional[bool] = None, db: Session = Depends(get_db)):
    """List all alert rules"""
    query = db.query(AlertRule)
    
    if enabled is not None:
        query = query.filter(AlertRule.enabled == enabled)
    
    rules = query.all()
    return {"rules": rules, "count": len(rules)}


@app.get("/health")
async def health(db: Session = Depends(get_db)):
    """Health check"""
    open_alerts = db.query(Alert).filter(Alert.status == "open").count()
    return {"status": "healthy", "open_alerts": open_alerts}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8004)
