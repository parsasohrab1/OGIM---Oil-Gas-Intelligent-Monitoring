# Deployment Guide

## Prerequisites

- Docker and Docker Compose
- Kubernetes cluster (for production)
- Python 3.11+
- Node.js 18+ (for frontend)

## Local Development

### 1. Generate Sample Data

```bash
cd scripts
python data_generator.py
```

### 2. Start Backend Services

```bash
cd infrastructure/docker
docker-compose up -d
```

### 3. Start Frontend

```bash
cd frontend/web
npm install
npm run dev
```

## Production Deployment

### Kubernetes Deployment

```bash
kubectl apply -f infrastructure/kubernetes/
```

## Configuration

Set environment variables for each service:
- Database connection strings
- Kafka broker addresses
- Authentication secrets
- External service endpoints

