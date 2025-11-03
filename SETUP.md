# راهنمای نصب و راه‌اندازی

## پیش‌نیازها

### ضروری
- Docker Desktop (برای راه‌اندازی سرویس‌های بک‌اند)
- Python 3.11+ (برای تولید داده و تست)
- Node.js 18+ و npm (برای فرانت‌اند تحت وب)

### اختیاری
- Git (برای مدیریت کد)
- IDE مناسب (VS Code, PyCharm, etc.)

## نصب و راه‌اندازی

### مرحله 1: کلون یا دانلود پروژه

اگر پروژه را از Git کلون کرده‌اید:
```bash
git clone <repository-url>
cd OGIM---Oil-Gas-Intelligent-Monitoring
```

### مرحله 2: تولید داده‌های نمونه

```bash
python scripts/data_generator.py
```

این دستور فایل‌های زیر را در پوشه `data/` ایجاد می‌کند:
- `sensor_data.json/csv`
- `tag_catalog.json/csv`
- `sample_alerts.json/csv`
- `sample_control_commands.json/csv`
- `kafka_sample_messages.json`

### مرحله 3: راه‌اندازی سرویس‌های بک‌اند

#### با Docker Compose (توصیه می‌شود)

**Windows:**
```powershell
cd infrastructure/docker
docker-compose up -d
```

**Linux/Mac:**
```bash
cd infrastructure/docker
docker-compose up -d
```

یا با استفاده از اسکریپت:
```powershell
.\scripts\start_backend.ps1
```

این دستور سرویس‌های زیر را راه‌اندازی می‌کند:
- Kafka & Zookeeper
- PostgreSQL
- TimescaleDB
- API Gateway (پورت 8000)
- Auth Service (پورت 8001)
- Data Ingestion Service (پورت 8002)
- ML Inference Service (پورت 8003)
- Alert Service (پورت 8004)
- Reporting Service (پورت 8005)
- Command Control Service (پورت 8006)
- Tag Catalog Service (پورت 8007)
- Digital Twin Service (پورت 8008)

#### تست سلامت سرویس‌ها

```bash
python scripts/test_services.py
```

یا تست دستی:
```bash
curl http://localhost:8000/health
```

### مرحله 4: راه‌اندازی فرانت‌اند وب

```bash
cd frontend/web
npm install
npm run dev
```

یا با استفاده از اسکریپت:
```powershell
.\scripts\start_frontend.ps1
```

پورتال وب در http://localhost:3000 در دسترس خواهد بود.

## دسترسی به سرویس‌ها

### API Gateway
- URL: http://localhost:8000
- Health Check: http://localhost:8000/health
- Swagger UI: http://localhost:8000/docs

### سرویس‌های دیگر
- Auth Service: http://localhost:8001/docs
- Data Ingestion: http://localhost:8002/docs
- ML Inference: http://localhost:8003/docs
- Alert Service: http://localhost:8004/docs
- Reporting: http://localhost:8005/docs
- Command Control: http://localhost:8006/docs
- Tag Catalog: http://localhost:8007/docs
- Digital Twin: http://localhost:8008/docs

## تست سریع

### 1. تست API Gateway
```bash
curl http://localhost:8000/health
```

### 2. تست Auth Service
```bash
curl -X POST http://localhost:8001/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123"
```

### 3. تست Data Ingestion
```bash
curl -X POST http://localhost:8002/ingest \
  -H "Content-Type: application/json" \
  -d @data/sensor_data.json
```

## عیب‌یابی

### مشکل: Docker اجرا نمی‌شود
- مطمئن شوید Docker Desktop نصب و اجرا شده است
- دستور `docker ps` را برای تست اجرا کنید

### مشکل: سرویس‌ها پاسخ نمی‌دهند
```bash
# بررسی لاگ‌ها
docker-compose -f infrastructure/docker/docker-compose.yml logs

# بررسی وضعیت کانتینرها
docker-compose -f infrastructure/docker/docker-compose.yml ps
```

### مشکل: Frontend اجرا نمی‌شود
- مطمئن شوید Node.js نصب شده است: `node --version`
- پوشه `node_modules` را حذف کرده و دوباره نصب کنید:
  ```bash
  cd frontend/web
  rm -rf node_modules
  npm install
  ```

### مشکل: پورت در حال استفاده است
- پورت‌های 8000-8008 و 3000 باید آزاد باشند
- با `netstat -ano | findstr :8000` در Windows یا `lsof -i :8000` در Linux/Mac بررسی کنید

## توقف سرویس‌ها

```bash
cd infrastructure/docker
docker-compose down
```

برای حذف کامل داده‌ها:
```bash
docker-compose down -v
```

## مراحل بعدی

1. ✅ داده‌های نمونه را تولید کنید
2. ✅ سرویس‌های بک‌اند را راه‌اندازی کنید
3. ✅ فرانت‌اند را اجرا کنید
4. 📚 مستندات API را در `/docs` مطالعه کنید
5. 🔧 کانفیگ را در `.env.example` تنظیم کنید

