# 🚀 راهنمای شروع سریع - نسخه به‌روز

## پیش‌نیازها

- ✅ Docker Desktop
- ✅ Python 3.11+
- ✅ Node.js 18+
- ✅ Git

## مراحل راه‌اندازی

### گام 1: Clone و Setup

```bash
# Clone repository
git clone <repository-url>
cd OGIM---Oil-Gas-Intelligent-Monitoring

# تنظیم environment variables
cp .env.example .env
# ویرایش .env و تنظیم SECRET_KEY و سایر configs
```

### گام 2: راه‌اندازی Database

```bash
# راه‌اندازی PostgreSQL و TimescaleDB
cd infrastructure/docker
docker-compose up -d postgres timescaledb redis

# صبر کنید تا databases آماده شوند (30 ثانیه)
sleep 30

# Initialize database schema و users
cd ../../backend/shared
pip install -r requirements.txt
python init_db.py
```

**Users پیش‌فرض:**
- `admin` / `Admin@123` (System Admin)
- `operator1` / `Operator@123` (Field Operator)
- `engineer1` / `Engineer@123` (Data Engineer)
- `viewer1` / `Viewer@123` (Viewer)

### گام 3: راه‌اندازی Kafka

```bash
cd ../../infrastructure/docker
docker-compose up -d zookeeper kafka
```

### گام 4: راه‌اندازی Backend Services

#### Option A: با Docker Compose (پیشنهادی)

```bash
cd infrastructure/docker
docker-compose up -d
```

#### Option B: Manual (برای development)

```bash
# Terminal 1 - Auth Service
cd backend/auth-service
pip install -r requirements.txt
python main.py

# Terminal 2 - Tag Catalog
cd backend/tag-catalog-service
pip install -r requirements.txt
python main.py

# Terminal 3 - Alert Service
cd backend/alert-service
pip install -r requirements.txt
python main.py

# و الی آخر...
```

### گام 5: راه‌اندازی Frontend

```bash
cd frontend/web
npm install
npm run dev
```

Frontend در `http://localhost:3000` یا `http://localhost:5173` اجرا می‌شود.

### گام 6: تولید داده‌های نمونه

```bash
cd ../../scripts
pip install -r requirements.txt
python data_generator.py
```

### گام 7: تست سرویس‌ها

```bash
cd scripts
python test_services.py
```

---

## 🌐 URLs مهم

### Frontend
- **Web Portal:** http://localhost:3000

### Backend Services
- **API Gateway:** http://localhost:8000
- **API Docs (Swagger):** http://localhost:8000/docs
- **Auth Service:** http://localhost:8001/docs
- **Data Ingestion:** http://localhost:8002/docs
- **ML Inference:** http://localhost:8003/docs
- **Alert Service:** http://localhost:8004/docs
- **Reporting:** http://localhost:8005/docs
- **Command Control:** http://localhost:8006/docs
- **Tag Catalog:** http://localhost:8007/docs
- **Digital Twin:** http://localhost:8008/docs

### Infrastructure
- **PostgreSQL:** localhost:5432
- **TimescaleDB:** localhost:5433
- **Redis:** localhost:6379
- **Kafka:** localhost:9092

---

## 🧪 اجرای Tests

```bash
cd backend

# نصب test dependencies
pip install -r tests/requirements.txt

# اجرای تمام tests
pytest tests/ -v

# با coverage report
pytest tests/ -v --cov --cov-report=html

# فقط unit tests
pytest tests/ -v -m unit

# فقط integration tests
pytest tests/ -v -m integration
```

---

## 🔐 احراز هویت در API

### Login

```bash
curl -X POST http://localhost:8001/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=Admin@123"
```

Response:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

### استفاده از Token

```bash
curl http://localhost:8001/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 📊 مثال‌های API

### 1. ایجاد Tag

```bash
curl -X POST http://localhost:8007/tags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "tag_id": "WELL-A-001-pressure",
    "well_name": "WELL-A-001",
    "equipment_type": "pump",
    "sensor_type": "pressure",
    "unit": "psi",
    "valid_range_min": 0,
    "valid_range_max": 500,
    "critical_threshold_max": 450,
    "status": "active"
  }'
```

### 2. Ingest Sensor Data

```bash
curl -X POST http://localhost:8002/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "source": "test",
    "records": [
      {
        "timestamp": "2024-11-03T12:00:00Z",
        "well_name": "WELL-A-001",
        "equipment_type": "pump",
        "sensor_type": "pressure",
        "value": 325.5,
        "unit": "psi",
        "sensor_id": "WELL-A-001-pump-pressure"
      }
    ]
  }'
```

### 3. لیست Alerts

```bash
curl http://localhost:8004/alerts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. ایجاد Command

```bash
curl -X POST http://localhost:8006/commands \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "well_name": "WELL-A-001",
    "equipment_id": "PUMP-001",
    "command_type": "setpoint",
    "parameters": {"value": 350},
    "requested_by": "operator1",
    "requires_two_factor": true
  }'
```

---

## 🐛 عیب‌یابی

### Database Connection Error

```bash
# بررسی کنید که containers اجرا شوند
docker ps

# اگر postgres نیست، راه‌اندازی کنید
docker-compose up -d postgres

# لاگ‌ها را بررسی کنید
docker logs postgres
```

### Port Already in Use

```bash
# پیدا کردن process
lsof -i :8000

# Kill کردن process
kill -9 <PID>
```

### Frontend CORS Error

در `.env.development` یا `.env`:
```
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

---

## 🔄 توقف و پاکسازی

### توقف Services

```bash
# توقف همه containers
docker-compose down

# توقف و حذف volumes
docker-compose down -v
```

### پاکسازی Database

```bash
# حذف database files
docker-compose down -v
rm -rf postgres_data timescaledb_data
```

---

## 📝 نکات مهم

1. **SECRET_KEY:** حتماً در production تغییر دهید
2. **Passwords:** passwords پیش‌فرض را تغییر دهید
3. **CORS:** در production، origins را محدود کنید
4. **Ports:** مطمئن شوید ports available هستند
5. **Docker Memory:** حداقل 8GB RAM برای Docker تخصیص دهید

---

## 🆘 دریافت کمک

- **Logs:** `docker-compose logs -f <service-name>`
- **Health Check:** http://localhost:8000/health
- **API Docs:** http://localhost:8000/docs
- **Database:** pgAdmin یا DBeaver برای debug

---

## 🎉 موفق باشید!

حالا پروژه شما آماده است. برای اطلاعات بیشتر:
- [CHANGELOG.md](CHANGELOG.md) - تغییرات کامل
- [IMPROVEMENTS_SUMMARY.md](IMPROVEMENTS_SUMMARY.md) - خلاصه بهبودها
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - معماری سیستم

