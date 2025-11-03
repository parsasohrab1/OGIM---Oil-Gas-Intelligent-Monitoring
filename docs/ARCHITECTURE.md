# System Architecture

## Overview

The Oil & Gas Intelligent Monitoring (OGIM) system is a real-time monitoring and analytics platform designed for on-premise, air-gapped environments.

## Components

### Backend Services

1. **API Gateway** - Single entry point for all requests
2. **Auth Service** - Authentication and authorization
3. **Data Ingestion Service** - Handles sensor data ingestion
4. **ML Inference Service** - Real-time AI/ML predictions
5. **Alert Service** - Alert management and routing
6. **Reporting Service** - Report generation
7. **Command & Control Service** - Control command management
8. **Tag Catalog Service** - Tag metadata management
9. **Flink Jobs** - Stream processing

### Frontend

1. **Web Portal** - React + TypeScript web application

### Infrastructure

- **Kafka** - Message bus for streaming data
- **PostgreSQL** - Relational database
- **TimescaleDB** - Time-series database
- **Kubernetes** - Container orchestration

## Data Flow

1. Sensor data is ingested from SCADA/PLC via connectors
2. Raw data flows through Kafka to Flink for processing
3. Processed data is stored in TimescaleDB
4. ML models analyze data for anomalies and predictions
5. Alerts are generated and routed to users
6. Users interact via web portal

