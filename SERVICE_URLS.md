# آدرس‌های سرویس‌های OGIM

این فایل شامل تمام آدرس‌های سرویس‌های OGIM برای دسترسی و تست است.

## 🌐 Frontend

| محیط | آدرس | توضیحات |
|------|------|---------|
| Development | http://localhost:3000 | Vite Dev Server (پورت پیش‌فرض) |
| Development (Vite) | http://localhost:5173 | Vite Dev Server (پورت جایگزین) |
| Production | http://localhost:3000 | Build شده |

## 🔌 Backend Services

### API Gateway (نقطه ورود اصلی)

| آدرس | توضیحات |
|------|---------|
| http://localhost:8000 | API Gateway اصلی |
| http://localhost:8000/docs | Swagger UI Documentation |
| http://localhost:8000/redoc | ReDoc Documentation |
| http://localhost:8000/health | Health Check |

### Microservices

| سرویس | پورت | آدرس Base | Health Check | توضیحات |
|-------|------|-----------|--------------|---------|
| **Auth Service** | 8001 | http://localhost:8001 | http://localhost:8001/health | احراز هویت و مدیریت کاربران |
| **Data Ingestion** | 8002 | http://localhost:8002 | http://localhost:8002/health | دریافت داده از سنسورها |
| **ML Inference** | 8003 | http://localhost:8003 | http://localhost:8003/health | مدل‌های ML و پیش‌بینی |
| **Alert Service** | 8004 | http://localhost:8004 | http://localhost:8004/health | مدیریت هشدارها |
| **Reporting** | 8005 | http://localhost:8005 | http://localhost:8005/health | گزارش‌گیری |
| **Command Control** | 8006 | http://localhost:8006 | http://localhost:8006/health | کنترل و فرمان‌ها |
| **Tag Catalog** | 8007 | http://localhost:8007 | http://localhost:8007/health | کاتالوگ تگ‌ها |
| **Digital Twin** | 8008 | http://localhost:8008 | http://localhost:8008/health | شبیه‌سازی و 3D BIM |
| **Edge Computing** | 8009 | http://localhost:8009 | http://localhost:8009/health | پردازش لبه |
| **ERP Integration** | 8010 | http://localhost:8010 | http://localhost:8010/health | یکپارچگی ERP |

## 🗄️ Infrastructure Services

| سرویس | پورت | آدرس | توضیحات |
|-------|------|------|---------|
| **PostgreSQL** | 5432 | localhost:5432 | دیتابیس اصلی (ogim) |
| **TimescaleDB** | 5433 | localhost:5433 | دیتابیس سری زمانی (ogim_tsdb) |
| **Redis** | 6379 | localhost:6379 | Cache و Session Management |
| **Kafka** | 9092 | localhost:9092 | Message Broker |
| **Zookeeper** | 2181 | localhost:2181 | Kafka Coordination |

## 📡 API Endpoints

### Authentication

```
POST   /api/auth/register      - ثبت‌نام کاربر جدید
POST   /api/auth/login          - ورود به سیستم
POST   /api/auth/refresh        - تازه‌سازی Token
POST   /api/auth/logout         - خروج از سیستم
GET    /api/auth/me             - اطلاعات کاربر فعلی
```

### Data Ingestion

```
POST   /api/data-ingestion/ingest           - ارسال داده سنسور
POST   /api/data-ingestion/stream/opcua     - Stream از OPC UA
POST   /api/data-ingestion/stream/modbus    - Stream از Modbus
GET    /api/data-ingestion/sensor-health    - سلامت سنسورها
GET    /api/data-ingestion/edge-stream/stats - آمار Edge-to-Stream
```

### ML Inference

```
POST   /api/ml-inference/infer              - Inference مدل
POST   /api/ml-inference/forecast           - پیش‌بینی سری زمانی
POST   /api/ml-inference/rul/predict        - پیش‌بینی RUL
GET    /api/ml-inference/models             - لیست مدل‌ها
POST   /api/ml-inference/models/{type}/train - آموزش مدل
```

### Alerts

```
GET    /api/alert/alerts                    - لیست هشدارها
POST   /api/alert/alerts                    - ایجاد هشدار
POST   /api/alert/alerts/{id}/acknowledge   - تایید هشدار
POST   /api/alert/alerts/{id}/resolve       - حل هشدار
GET    /api/alert/rules                     - قوانین هشدار
```

### Command Control

```
POST   /api/command-control/commands        - ایجاد فرمان
POST   /api/command-control/commands/secure - ایجاد فرمان امن
POST   /api/command-control/commands/{id}/approve - تایید فرمان
POST   /api/command-control/commands/{id}/execute - اجرای فرمان
GET    /api/command-control/commands       - لیست فرمان‌ها
```

### Digital Twin

```
POST   /api/digital-twin/simulate          - اجرای شبیه‌سازی
GET    /api/digital-twin/simulations       - لیست شبیه‌سازی‌ها
GET    /api/digital-twin/bim3d/scene/{well} - صحنه 3D BIM
GET    /api/digital-twin/bim3d/model/{id}/state - وضعیت مدل 3D
```

### Reporting

```
GET    /api/reporting/reports              - لیست گزارش‌ها
POST   /api/reporting/reports              - ایجاد گزارش
GET    /api/reporting/reports/{id}         - دریافت گزارش
GET    /api/reporting/reports/{id}/download - دانلود گزارش
```

## 🔐 Credentials پیش‌فرض

### کاربران پیش‌فرض

| Username | Password | Role |
|----------|----------|------|
| admin | Admin@123 | system_admin |
| operator1 | Operator@123 | field_operator |
| engineer1 | Engineer@123 | data_engineer |
| viewer1 | Viewer@123 | viewer |

### Database Credentials

```
Database: ogim
Username: ogim_user
Password: ogim_password

TimescaleDB: ogim_tsdb
Username: ogim_user
Password: ogim_password
```

## 🧪 تست سریع

### بررسی سلامت سرویس‌ها

```bash
# API Gateway
curl http://localhost:8000/health

# سایر سرویس‌ها
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health
curl http://localhost:8004/health
curl http://localhost:8005/health
curl http://localhost:8006/health
curl http://localhost:8007/health
curl http://localhost:8008/health
```

### تست احراز هویت

```bash
# ورود
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}'
```

### تست Data Ingestion

```bash
# ارسال داده (نیاز به Token)
curl -X POST http://localhost:8000/api/data-ingestion/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "source": "test",
    "records": [{
      "timestamp": "2025-12-15T10:00:00Z",
      "well_name": "WELL-001",
      "equipment_type": "pump",
      "sensor_type": "pressure",
      "value": 450.5,
      "unit": "bar",
      "sensor_id": "TAG-001",
      "data_quality": "good"
    }]
  }'
```

---

**نکته**: تمام آدرس‌ها برای محیط Development هستند. برای Production، آدرس‌ها باید تغییر کنند.

