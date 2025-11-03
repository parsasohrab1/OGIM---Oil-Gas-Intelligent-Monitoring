#!/usr/bin/env python3
"""
Initialize database schema and create initial data
"""
import sys
from sqlalchemy import text
from database import engine, timescale_engine, init_db, init_timescale_db, SessionLocal
from models import User, Tag, AlertRule
from security import get_password_hash
from datetime import datetime


def create_hypertables():
    """Create TimescaleDB hypertables"""
    with timescale_engine.connect() as conn:
        # Create hypertable for sensor_data
        conn.execute(text("""
            SELECT create_hypertable(
                'sensor_data', 
                'timestamp',
                if_not_exists => TRUE
            );
        """))
        conn.commit()
        print("✓ Created hypertable for sensor_data")


def create_initial_users(db):
    """Create initial admin and test users"""
    users = [
        User(
            username="admin",
            email="admin@ogim.local",
            hashed_password=get_password_hash("Admin@123"),
            role="system_admin",
            disabled=False,
            two_factor_enabled=False
        ),
        User(
            username="operator1",
            email="operator1@ogim.local",
            hashed_password=get_password_hash("Operator@123"),
            role="field_operator",
            disabled=False,
            two_factor_enabled=False
        ),
        User(
            username="engineer1",
            email="engineer1@ogim.local",
            hashed_password=get_password_hash("Engineer@123"),
            role="data_engineer",
            disabled=False,
            two_factor_enabled=False
        ),
        User(
            username="viewer1",
            email="viewer1@ogim.local",
            hashed_password=get_password_hash("Viewer@123"),
            role="viewer",
            disabled=False,
            two_factor_enabled=False
        ),
    ]
    
    for user in users:
        existing = db.query(User).filter(User.username == user.username).first()
        if not existing:
            db.add(user)
            print(f"✓ Created user: {user.username}")
    
    db.commit()


def create_sample_alert_rules(db):
    """Create sample alert rules"""
    rules = [
        AlertRule(
            rule_id="rule-pressure-high",
            name="High Pressure Alert",
            description="Alert when pressure exceeds critical threshold",
            condition="threshold_high",
            threshold=450.0,
            severity="critical",
            enabled=True
        ),
        AlertRule(
            rule_id="rule-temperature-high",
            name="High Temperature Alert",
            description="Alert when temperature exceeds warning threshold",
            condition="threshold_high",
            threshold=120.0,
            severity="warning",
            enabled=True
        ),
        AlertRule(
            rule_id="rule-anomaly",
            name="Anomaly Detection",
            description="Alert on ML-detected anomalies",
            condition="anomaly",
            threshold=0.7,
            severity="warning",
            enabled=True
        ),
    ]
    
    for rule in rules:
        existing = db.query(AlertRule).filter(AlertRule.rule_id == rule.rule_id).first()
        if not existing:
            db.add(rule)
            print(f"✓ Created alert rule: {rule.name}")
    
    db.commit()


def main():
    """Main initialization function"""
    print("=" * 60)
    print("Initializing OGIM Database")
    print("=" * 60)
    print()
    
    try:
        # Create all tables
        print("Creating tables...")
        init_db()
        init_timescale_db()
        print("✓ Tables created")
        print()
        
        # Create hypertables in TimescaleDB
        print("Creating hypertables...")
        create_hypertables()
        print()
        
        # Create initial data
        print("Creating initial data...")
        db = SessionLocal()
        
        try:
            create_initial_users(db)
            create_sample_alert_rules(db)
            print()
            print("=" * 60)
            print("Database initialization completed successfully!")
            print("=" * 60)
            print()
            print("Default Users:")
            print("  - admin / Admin@123 (System Admin)")
            print("  - operator1 / Operator@123 (Field Operator)")
            print("  - engineer1 / Engineer@123 (Data Engineer)")
            print("  - viewer1 / Viewer@123 (Viewer)")
            print()
        finally:
            db.close()
        
    except Exception as e:
        print(f"Error initializing database: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

