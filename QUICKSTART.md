# Quick Start Guide

## پروژه OGIM - سیستم مانیتورینگ هوشمند نفت و گاز

این پروژه یک سیستم جامع مانیتورینگ و آنالیز به‌روز برای میادین نفت و گاز است که برای محیط‌های on-premise و air-gapped طراحی شده است.

## ساختار پروژه

### Backend Services (میکروسرویس‌های بک‌اند)

- **api-gateway** - دروازه API برای تمام درخواست‌ها
- **auth-service** - احراز هویت و مدیریت دسترسی
- **data-ingestion-service** - دریافت داده‌های سنسور
- **ml-inference-service** - پیش‌بینی‌های هوش مصنوعی
- **alert-service** - مدیریت هشدارها
- **reporting-service** - تولید گزارش‌ها
- **command-control-service** - کنترل تجهیزات
- **tag-catalog-service** - مدیریت متادیتای تگ‌ها
- **flink-jobs** - پردازش جریان داده

### Frontend (رابط کاربری)

- **frontend/web** - پورتال وب با React + TypeScript

### Infrastructure (زیرساخت)

- **infrastructure/docker** - کانفیگ Docker Compose
- **infrastructure/kubernetes** - مانیفست‌های Kubernetes

## شروع سریع

### 1. تولید داده‌های نمونه

```bash
python scripts/data_generator.py
```

این دستور فایل‌های زیر را در پوشه `data/` ایجاد می‌کند:
- `sensor_data.json/csv` - داده‌های سنسور
- `tag_catalog.json/csv` - کاتالوگ تگ‌ها
- `sample_alerts.json/csv` - هشدارهای نمونه
- `sample_control_commands.json/csv` - دستورات کنترل
- `kafka_sample_messages.json` - پیام‌های نمونه Kafka

### 2. راه‌اندازی سرویس‌های بک‌اند (با Docker)

```bash
cd infrastructure/docker
docker-compose up -d
```

سرویس‌ها در پورت‌های زیر در دسترس هستند:
- API Gateway: http://localhost:8000
- Auth Service: http://localhost:8001
- Data Ingestion: http://localhost:8002
- ML Inference: http://localhost:8003
- Alert Service: http://localhost:8004
- Reporting Service: http://localhost:8005
- Command Control: http://localhost:8006
- Tag Catalog: http://localhost:8007

### 3. راه‌اندازی فرانت‌اند وب

```bash
cd frontend/web
npm install
npm run dev
```

پورتال وب در http://localhost:3000 در دسترس است.

## مستندات

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - معماری سیستم
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - راهنمای استقرار
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - ساختار پروژه

## ویژگی‌ها

✅ مانیتورینگ به‌روز داده‌های سنسور  
✅ شناسایی ناهنجاری با هوش مصنوعی  
✅ پیش‌بینی خرابی تجهیزات  
✅ مدیریت هشدارها  
✅ کنترل تجهیزات با تایید دو عاملی  
✅ گزارش‌های تحلیلی  
✅ پورتال وب  

## نکات مهم

- تمام سرویس‌ها با FastAPI پیاده‌سازی شده‌اند
- داده‌های نمونه برای تست و توسعه آماده شده‌اند
- کانفیگ Docker Compose برای توسعه محلی آماده است
- مانیفست‌های Kubernetes برای استقرار production آماده است

