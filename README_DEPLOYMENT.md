# 🚀 راهنمای جامع توسعه، تست و استقرار OGIM

## 📋 خلاصه سریع

```bash
# 🛠️ توسعه محلی (یک دستور!)
./scripts/setup_dev.sh          # Linux/Mac
.\scripts\setup_dev.ps1          # Windows

# 🧪 اجرای تست‌ها
./scripts/run_tests.sh

# 🌐 استقرار Production
./scripts/deploy_production.sh
```

---

## 1️⃣ توسعه محلی (Development)

### گام به گام

#### مرحله 1: راه‌اندازی اولیه

```bash
# Clone repository
git clone <repository-url>
cd OGIM---Oil-Gas-Intelligent-Monitoring

# تنظیم environment
cp .env.example .env
```

#### مرحله 2: راه‌اندازی خودکار با اسکریپت

**Linux/Mac:**
```bash
chmod +x scripts/setup_dev.sh
./scripts/setup_dev.sh
```

**Windows:**
```powershell
.\scripts\setup_dev.ps1
```

این اسکریپت به طور خودکار:
- ✅ بررسی پیش‌نیازها (Docker, Python, Node.js)
- ✅ راه‌اندازی databases و infrastructure
- ✅ Initialize database با users پیش‌فرض
- ✅ تولید داده‌های نمونه
- ✅ Build و راه‌اندازی تمام backend services
- ✅ Health check تمام سرویس‌ها

#### مرحله 3: راه‌اندازی Frontend

```bash
cd frontend/web
npm install
npm run dev
```

Frontend در `http://localhost:3000` یا `http://localhost:5173` اجرا می‌شود.

### دسترسی به سیستم

| سرویس | URL | توضیحات |
|-------|-----|---------|
| **Frontend** | http://localhost:3000 | پورتال وب |
| **API Gateway** | http://localhost:8000 | ورودی اصلی API |
| **API Docs** | http://localhost:8000/docs | Swagger UI |
| **Auth Service** | http://localhost:8001/docs | سرویس احراز هویت |
| **Data Ingestion** | http://localhost:8002/docs | دریافت داده سنسور |
| **ML Inference** | http://localhost:8003/docs | مدل‌های ML |
| **Alert Service** | http://localhost:8004/docs | مدیریت هشدارها |
| **Reporting** | http://localhost:8005/docs | گزارش‌ها |
| **Command Control** | http://localhost:8006/docs | کنترل تجهیزات |
| **Tag Catalog** | http://localhost:8007/docs | کاتالوگ تگ‌ها |
| **Digital Twin** | http://localhost:8008/docs | شبیه‌سازی |

### Users پیش‌فرض

| Username | Password | نقش | دسترسی‌ها |
|----------|----------|-----|-----------|
| `admin` | `Admin@123` | System Admin | تمام دسترسی‌ها |
| `operator1` | `Operator@123` | Field Operator | مانیتورینگ، هشدارها، کنترل |
| `engineer1` | `Engineer@123` | Data Engineer | آنالیز، مدل‌ها، گزارش‌ها |
| `viewer1` | `Viewer@123` | Viewer | فقط مشاهده |

### مثال Login

```bash
# دریافت token
curl -X POST http://localhost:8001/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=Admin@123"

# استفاده از token
curl http://localhost:8001/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### دستورات مفید

```bash
# مشاهده logs تمام سرویس‌ها
docker-compose -f docker-compose.dev.yml logs -f

# مشاهده logs یک سرویس خاص
docker-compose -f docker-compose.dev.yml logs -f api-gateway

# Restart یک سرویس
docker-compose -f docker-compose.dev.yml restart auth-service

# توقف تمام سرویس‌ها
docker-compose -f docker-compose.dev.yml down

# توقف و حذف volumes (پاک کردن داده‌ها)
docker-compose -f docker-compose.dev.yml down -v

# Rebuild سرویس
docker-compose -f docker-compose.dev.yml up -d --build api-gateway
```

---

## 2️⃣ تست (Testing)

### اجرای سریع تمام تست‌ها

```bash
chmod +x scripts/run_tests.sh
./scripts/run_tests.sh
```

### تست‌های دستی

```bash
cd backend

# نصب dependencies
pip install -r tests/requirements.txt

# اجرای تمام تست‌ها
pytest tests/ -v

# با coverage report
pytest tests/ -v --cov --cov-report=html

# فقط unit tests
pytest tests/ -v -m unit

# فقط integration tests
pytest tests/ -v -m integration

# تست یک فایل خاص
pytest tests/test_auth_service.py -v

# تست یک تابع خاص
pytest tests/test_auth_service.py::test_login_success -v
```

### مشاهده Coverage Report

```bash
# باز کردن HTML report
open backend/htmlcov/index.html       # Mac
xdg-open backend/htmlcov/index.html   # Linux
start backend/htmlcov/index.html      # Windows
```

### تست Services (Health Check)

```bash
python scripts/test_services.py
```

خروجی مثال:
```
============================================================
OGIM Service Health Check
============================================================

✓ API Gateway: OK
✓ Auth Service: OK
✓ Data Ingestion Service: OK
✓ ML Inference Service: OK
✓ Alert Service: OK
✓ Reporting Service: OK
✓ Command Control Service: OK
✓ Tag Catalog Service: OK
✓ Digital Twin Service: OK

============================================================
Results: 9/9 services healthy
============================================================
All services are healthy! ✓
```

### Integration Testing

```bash
# تست workflow کامل
cd tests/integration
pytest test_complete_workflow.py -v

# تست API endpoints
pytest test_api_endpoints.py -v
```

### Performance Testing (اختیاری)

```bash
# نصب Locust
pip install locust

# اجرای load test
locust -f tests/load/locustfile.py --host=http://localhost:8000

# باز کردن Web UI در: http://localhost:8089
```

---

## 3️⃣ استقرار Production

### پیش‌نیازها

قبل از استقرار، مطمئن شوید که موارد زیر را دارید:

- [ ] Kubernetes Cluster (v1.24+)
- [ ] kubectl configured و متصل به cluster
- [ ] Container Registry (Docker Hub, ECR, GCR, یا Harbor)
- [ ] SSL Certificates
- [ ] Backup solution
- [ ] Monitoring stack (Prometheus/Grafana)

### مرحله 1: Build و Push Images

```bash
# تنظیم registry
export REGISTRY="your-registry.io/ogim"

# Build تمام backend services
for service in api-gateway auth-service data-ingestion-service \
  ml-inference-service alert-service reporting-service \
  command-control-service tag-catalog-service digital-twin-service; do
  
  echo "Building ${service}..."
  docker build -t ${REGISTRY}/${service}:latest backend/${service}/
  docker push ${REGISTRY}/${service}:latest
done

# Build frontend
cd frontend/web
npm run build
docker build -t ${REGISTRY}/frontend:latest .
docker push ${REGISTRY}/frontend:latest
```

### مرحله 2: استقرار خودکار

```bash
chmod +x scripts/deploy_production.sh
./scripts/deploy_production.sh
```

### مرحله 3: استقرار دستی

```bash
# ایجاد namespace
kubectl create namespace ogim-prod

# ایجاد secrets
kubectl create secret generic postgres-secret \
  --from-literal=username=ogim_user \
  --from-literal=password=$(openssl rand -base64 32) \
  -n ogim-prod

kubectl create secret generic timescale-secret \
  --from-literal=username=ogim_user \
  --from-literal=password=$(openssl rand -base64 32) \
  -n ogim-prod

kubectl create secret generic app-secret \
  --from-literal=secret-key=$(openssl rand -base64 48) \
  -n ogim-prod

# استقرار infrastructure
kubectl apply -f infrastructure/kubernetes/postgres-deployment.yaml -n ogim-prod
kubectl apply -f infrastructure/kubernetes/timescaledb-deployment.yaml -n ogim-prod
kubectl apply -f infrastructure/kubernetes/redis-deployment.yaml -n ogim-prod
kubectl apply -f infrastructure/kubernetes/kafka-deployment.yaml -n ogim-prod

# صبر برای آماده شدن databases
kubectl wait --for=condition=ready pod -l app=postgres -n ogim-prod --timeout=300s
kubectl wait --for=condition=ready pod -l app=timescaledb -n ogim-prod --timeout=300s

# استقرار backend services
kubectl apply -f infrastructure/kubernetes/api-gateway-deployment.yaml -n ogim-prod

# بررسی وضعیت
kubectl get pods -n ogim-prod
kubectl get svc -n ogim-prod
```

### مرحله 4: تنظیم Ingress (برای دسترسی خارجی)

```bash
# نصب NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml

# نصب cert-manager برای SSL
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# اعمال Ingress configuration
kubectl apply -f infrastructure/kubernetes/ingress.yaml -n ogim-prod
```

### مرحله 5: Initialize Database در Production

```bash
# Run initialization job
kubectl run db-init --image=python:3.11-slim \
  --restart=Never \
  --rm -it \
  -n ogim-prod \
  --command -- bash -c \
  "pip install sqlalchemy psycopg2-binary && python init_db.py"
```

### Verify Deployment

```bash
# بررسی pods
kubectl get pods -n ogim-prod

# بررسی services
kubectl get svc -n ogim-prod

# بررسی logs
kubectl logs -f deployment/api-gateway -n ogim-prod

# Port forward برای تست محلی
kubectl port-forward svc/api-gateway 8000:8000 -n ogim-prod
```

---

## 4️⃣ نظارت و نگهداری (Monitoring & Maintenance)

### نظارت با Prometheus & Grafana

```bash
# نصب kube-prometheus-stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace

# دسترسی به Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
# Username: admin, Password: prom-operator
```

### Backup Databases

```bash
# Backup PostgreSQL
kubectl exec -n ogim-prod postgres-0 -- \
  pg_dump -U ogim_user ogim > backup-$(date +%Y%m%d).sql

# Backup TimescaleDB
kubectl exec -n ogim-prod timescaledb-0 -- \
  pg_dump -U ogim_user ogim_tsdb > tsdb-backup-$(date +%Y%m%d).sql

# Upload به S3 (مثال)
aws s3 cp backup-$(date +%Y%m%d).sql s3://your-backup-bucket/
```

### Scaling

```bash
# Manual scaling
kubectl scale deployment api-gateway --replicas=5 -n ogim-prod

# Auto-scaling
kubectl autoscale deployment api-gateway \
  --cpu-percent=70 \
  --min=2 \
  --max=10 \
  -n ogim-prod

# بررسی HPA
kubectl get hpa -n ogim-prod
```

### Updates & Upgrades

```bash
# Rolling update
kubectl set image deployment/api-gateway \
  api-gateway=your-registry/ogim-api-gateway:v2.0 \
  -n ogim-prod

# بررسی rollout status
kubectl rollout status deployment/api-gateway -n ogim-prod

# Rollback در صورت مشکل
kubectl rollout undo deployment/api-gateway -n ogim-prod
```

---

## 🔧 عیب‌یابی (Troubleshooting)

### مشکلات Database

```bash
# بررسی وضعیت
kubectl get pods -l app=postgres -n ogim-prod

# بررسی logs
kubectl logs postgres-0 -n ogim-prod

# تست اتصال
kubectl exec -it postgres-0 -n ogim-prod -- \
  psql -U ogim_user -d ogim -c "\dt"
```

### مشکلات Service

```bash
# بررسی pod details
kubectl describe pod <pod-name> -n ogim-prod

# بررسی events
kubectl get events -n ogim-prod --sort-by='.lastTimestamp'

# Restart service
kubectl rollout restart deployment/api-gateway -n ogim-prod

# Shell به pod برای debug
kubectl exec -it <pod-name> -n ogim-prod -- /bin/bash
```

### مشکلات Network

```bash
# تست اتصال بین pods
kubectl run test-pod --image=busybox -it --rm -- \
  wget -O- http://api-gateway:8000/health

# بررسی DNS
kubectl run test-dns --image=busybox -it --rm -- \
  nslookup api-gateway.ogim-prod.svc.cluster.local
```

---

## 📊 Dashboard و Metrics

### Grafana Dashboards

دسترسی به Grafana: `http://localhost:3000` (بعد از port-forward)

Dashboards موجود:
- **System Overview**: نمای کلی سیستم
- **Service Performance**: عملکرد سرویس‌ها
- **Database Metrics**: metrics پایگاه داده
- **Alert Dashboard**: نمایش هشدارها

### Key Metrics

| Metric | توضیحات | Threshold |
|--------|---------|-----------|
| CPU Usage | استفاده CPU | < 70% |
| Memory Usage | استفاده حافظه | < 80% |
| Response Time | زمان پاسخ API | < 200ms |
| Error Rate | نرخ خطا | < 1% |
| Database Connections | اتصالات DB | < 80% pool |

---

## 📚 مستندات مرتبط

- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - راهنمای کامل استقرار
- [QUICKSTART_UPDATED.md](QUICKSTART_UPDATED.md) - شروع سریع
- [CHANGELOG.md](CHANGELOG.md) - تاریخچه تغییرات
- [IMPROVEMENTS_SUMMARY.md](IMPROVEMENTS_SUMMARY.md) - خلاصه بهبودها
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - معماری سیستم

---

## ✅ Checklist قبل از Production

### Security
- [ ] تغییر تمام passwords و secrets پیش‌فرض
- [ ] فعال‌سازی SSL/TLS
- [ ] تنظیم Network Policies
- [ ] فعال‌سازی RBAC
- [ ] محدود کردن CORS origins
- [ ] Scan container images برای vulnerabilities

### Infrastructure
- [ ] تنظیم backup خودکار
- [ ] تنظیم monitoring و alerting
- [ ] تنظیم log aggregation
- [ ] تنظیم resource limits
- [ ] تنظیم auto-scaling

### Testing
- [ ] اجرای تمام unit tests
- [ ] اجرای integration tests
- [ ] اجرای load tests
- [ ] تست disaster recovery
- [ ] تست rollback procedure

### Documentation
- [ ] مستند کردن configurations
- [ ] ایجاد runbook برای عملیات
- [ ] مستند کردن troubleshooting steps
- [ ] آموزش تیم

---

## 🎉 موفق باشید!

حالا سیستم OGIM شما آماده برای:
- ✅ **توسعه**: محیط کامل development
- ✅ **تست**: test suite جامع
- ✅ **استقرار**: production-ready deployment

برای سوالات و پشتیبانی:
- 📖 مستندات کامل در فایل‌های بالا
- 🐛 گزارش مشکلات در GitHub Issues
- 💬 تماس با تیم پشتیبانی

**نسخه:** 2.0.0  
**آخرین به‌روزرسانی:** نوامبر 2025

