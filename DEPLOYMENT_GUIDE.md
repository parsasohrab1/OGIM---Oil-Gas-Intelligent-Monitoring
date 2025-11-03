# 🚀 راهنمای کامل استقرار OGIM

این راهنما شامل دستورالعمل‌های کامل برای استقرار سیستم OGIM در محیط‌های مختلف است.

---

## 📋 فهرست مطالب

1. [توسعه محلی (Development)](#development)
2. [تست (Testing)](#testing)
3. [استقرار (Production Deployment)](#production)
4. [نظارت و نگهداری (Monitoring & Maintenance)](#monitoring)

---

## 🛠️ Development

### راه‌اندازی سریع با اسکریپت

#### Linux/Mac:
```bash
chmod +x scripts/setup_dev.sh
./scripts/setup_dev.sh
```

#### Windows:
```powershell
.\scripts\setup_dev.ps1
```

### راه‌اندازی دستی

#### 1. Clone و Configuration
```bash
git clone <repository-url>
cd OGIM---Oil-Gas-Intelligent-Monitoring

# تنظیم environment
cp .env.example .env
# ویرایش .env
```

#### 2. راه‌اندازی Infrastructure
```bash
docker-compose -f docker-compose.dev.yml up -d postgres timescaledb redis zookeeper kafka

# صبر برای آماده شدن
sleep 30
```

#### 3. Initialize Database
```bash
cd backend/shared
pip install -r requirements.txt
python init_db.py
```

#### 4. تولید داده نمونه
```bash
cd ../../scripts
pip install -r requirements.txt
python data_generator.py
```

#### 5. راه‌اندازی Backend Services
```bash
cd ..
docker-compose -f docker-compose.dev.yml up -d --build
```

#### 6. راه‌اندازی Frontend
```bash
cd frontend/web
npm install
npm run dev
```

### URLs توسعه

- **Frontend**: http://localhost:3000 یا http://localhost:5173
- **API Gateway**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **PostgreSQL**: localhost:5432
- **TimescaleDB**: localhost:5433
- **Redis**: localhost:6379
- **Kafka**: localhost:9092

### Users پیش‌فرض

| Username | Password | Role |
|----------|----------|------|
| admin | Admin@123 | System Admin |
| operator1 | Operator@123 | Field Operator |
| engineer1 | Engineer@123 | Data Engineer |
| viewer1 | Viewer@123 | Viewer |

---

## 🧪 Testing

### اجرای تمام تست‌ها

#### با اسکریپت:
```bash
chmod +x scripts/run_tests.sh
./scripts/run_tests.sh
```

#### دستی:
```bash
cd backend
pip install -r tests/requirements.txt
pytest tests/ -v --cov --cov-report=html
```

### تست‌های خاص

```bash
# فقط unit tests
pytest tests/ -v -m unit

# فقط integration tests
pytest tests/ -v -m integration

# تست یک سرویس خاص
pytest tests/test_auth_service.py -v

# با coverage
pytest tests/ --cov=. --cov-report=term-missing
```

### Integration Testing

```bash
# تست اتصال سرویس‌ها
python scripts/test_services.py

# تست End-to-End
cd tests/e2e
pytest test_user_workflow.py -v
```

### Performance Testing

```bash
# Load testing با Locust
pip install locust
locust -f tests/load/locustfile.py --host=http://localhost:8000
```

### مشاهده Coverage Report

```bash
# باز کردن HTML report
open backend/htmlcov/index.html  # Mac
xdg-open backend/htmlcov/index.html  # Linux
start backend/htmlcov/index.html  # Windows
```

---

## 🌐 Production Deployment

### پیش‌نیازهای Production

- ✅ Kubernetes Cluster (v1.24+)
- ✅ kubectl configured
- ✅ Helm 3+ (اختیاری)
- ✅ Container Registry access
- ✅ SSL Certificates
- ✅ Backup solution
- ✅ Monitoring stack

### مراحل استقرار

#### 1. آماده‌سازی Images

```bash
# Build backend images
for service in api-gateway auth-service data-ingestion-service \
  ml-inference-service alert-service reporting-service \
  command-control-service tag-catalog-service digital-twin-service; do
  
  docker build -t your-registry/ogim-${service}:latest \
    backend/${service}/
  
  docker push your-registry/ogim-${service}:latest
done

# Build frontend
cd frontend/web
npm run build
docker build -t your-registry/ogim-frontend:latest .
docker push your-registry/ogim-frontend:latest
```

#### 2. استقرار با اسکریپت

```bash
chmod +x scripts/deploy_production.sh
./scripts/deploy_production.sh
```

#### 3. استقرار دستی

```bash
# ایجاد namespace
kubectl create namespace ogim-prod

# ایجاد secrets
kubectl create secret generic postgres-secret \
  --from-literal=username=ogim_user \
  --from-literal=password=YOUR_SECURE_PASSWORD \
  -n ogim-prod

kubectl create secret generic app-secret \
  --from-literal=secret-key=YOUR_SECURE_SECRET_KEY \
  -n ogim-prod

# استقرار infrastructure
kubectl apply -f infrastructure/kubernetes/ -n ogim-prod

# بررسی وضعیت
kubectl get pods -n ogim-prod
kubectl get svc -n ogim-prod
```

#### 4. Configure Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ogim-ingress
  namespace: ogim-prod
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - ogim.yourdomain.com
    secretName: ogim-tls
  rules:
  - host: ogim.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 8000
```

```bash
kubectl apply -f ingress.yaml -n ogim-prod
```

### تنظیمات Production

#### Security Checklist

- [ ] تغییر تمام passwords و secrets
- [ ] فعال‌سازی SSL/TLS
- [ ] تنظیم Network Policies
- [ ] فعال‌سازی RBAC
- [ ] تنظیم Pod Security Policies
- [ ] Scan container images
- [ ] تنظیم backup برای databases
- [ ] فعال‌سازی audit logging
- [ ] محدود کردن CORS origins
- [ ] تنظیم rate limiting

#### Environment Variables (Production)

```bash
# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/ogim
TIMESCALE_URL=postgresql://user:pass@timescale:5432/ogim_tsdb

# Security
SECRET_KEY=<SECURE-RANDOM-KEY-64-CHARS>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15

# CORS (محدود به domain واقعی)
CORS_ORIGINS=["https://ogim.yourdomain.com"]

# Kafka
KAFKA_BOOTSTRAP_SERVERS=kafka-cluster:9092

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json

# Performance
WORKERS=4
MAX_CONNECTIONS=100
```

### Scaling

```bash
# Scale API Gateway
kubectl scale deployment api-gateway --replicas=5 -n ogim-prod

# Autoscaling
kubectl autoscale deployment api-gateway \
  --cpu-percent=70 \
  --min=2 \
  --max=10 \
  -n ogim-prod

# Scale database (با احتیاط!)
# برای PostgreSQL از replication استفاده کنید
```

---

## 📊 Monitoring & Maintenance

### Health Checks

```bash
# Check all services
kubectl get pods -n ogim-prod

# Check specific service
kubectl describe pod <pod-name> -n ogim-prod

# Check service health endpoints
curl http://localhost:8000/health
curl http://localhost:8001/health
# ... برای سایر سرویس‌ها
```

### Logs

```bash
# تمام logs
kubectl logs -f deployment/api-gateway -n ogim-prod

# با فیلتر
kubectl logs deployment/api-gateway -n ogim-prod | grep ERROR

# Logs چند pod
kubectl logs -f -l app=api-gateway -n ogim-prod

# Save logs to file
kubectl logs deployment/api-gateway -n ogim-prod > api-gateway.log
```

### Monitoring با Prometheus & Grafana

```bash
# نصب Prometheus Operator
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring

# ServiceMonitor برای OGIM
kubectl apply -f monitoring/service-monitor.yaml
```

### Backup

```bash
# Backup PostgreSQL
kubectl exec -n ogim-prod postgres-0 -- \
  pg_dump -U ogim_user ogim > backup-$(date +%Y%m%d).sql

# Backup TimescaleDB
kubectl exec -n ogim-prod timescaledb-0 -- \
  pg_dump -U ogim_user ogim_tsdb > tsdb-backup-$(date +%Y%m%d).sql

# Backup to S3/Minio
kubectl apply -f backup/cronjob.yaml
```

### Database Maintenance

```bash
# Vacuum database
kubectl exec -n ogim-prod postgres-0 -- \
  psql -U ogim_user -d ogim -c "VACUUM ANALYZE;"

# Reindex
kubectl exec -n ogim-prod postgres-0 -- \
  psql -U ogim_user -d ogim -c "REINDEX DATABASE ogim;"

# Check size
kubectl exec -n ogim-prod postgres-0 -- \
  psql -U ogim_user -d ogim -c "SELECT pg_size_pretty(pg_database_size('ogim'));"
```

### Updates & Upgrades

```bash
# Update image
kubectl set image deployment/api-gateway \
  api-gateway=your-registry/ogim-api-gateway:v2.0 \
  -n ogim-prod

# Rollout status
kubectl rollout status deployment/api-gateway -n ogim-prod

# Rollback if needed
kubectl rollout undo deployment/api-gateway -n ogim-prod

# Rolling update with zero downtime
kubectl apply -f updated-deployment.yaml
```

---

## 🔧 Troubleshooting

### مشکلات رایج

#### 1. Database Connection Error
```bash
# بررسی وضعیت database
kubectl get pods -l app=postgres -n ogim-prod

# بررسی logs
kubectl logs postgres-0 -n ogim-prod

# تست اتصال
kubectl exec -it postgres-0 -n ogim-prod -- \
  psql -U ogim_user -d ogim
```

#### 2. Service Not Responding
```bash
# بررسی pod health
kubectl describe pod <pod-name> -n ogim-prod

# بررسی events
kubectl get events -n ogim-prod --sort-by='.lastTimestamp'

# Restart pod
kubectl delete pod <pod-name> -n ogim-prod
```

#### 3. Out of Memory
```bash
# بررسی resource usage
kubectl top pods -n ogim-prod

# افزایش memory limit
kubectl set resources deployment api-gateway \
  --limits=memory=1Gi \
  -n ogim-prod
```

### Debug Mode

```bash
# فعال‌سازی debug logging
kubectl set env deployment/api-gateway LOG_LEVEL=DEBUG -n ogim-prod

# Shell به pod
kubectl exec -it api-gateway-xxx -n ogim-prod -- /bin/bash

# Port forward برای debug
kubectl port-forward svc/api-gateway 8000:8000 -n ogim-prod
```

---

## 📞 پشتیبانی

برای مشکلات و سوالات:

1. بررسی [CHANGELOG.md](CHANGELOG.md) برای تغییرات اخیر
2. بررسی [Issues](https://github.com/your-repo/issues) در GitHub
3. مشاهده logs سیستم
4. تماس با تیم پشتیبانی

---

## 📚 منابع اضافی

- [QUICKSTART_UPDATED.md](QUICKSTART_UPDATED.md) - راهنمای شروع سریع
- [IMPROVEMENTS_SUMMARY.md](IMPROVEMENTS_SUMMARY.md) - خلاصه بهبودها
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - معماری سیستم
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Documentation](https://docs.docker.com/)

---

**نسخه:** 2.0.0  
**آخرین به‌روزرسانی:** نوامبر 2025

