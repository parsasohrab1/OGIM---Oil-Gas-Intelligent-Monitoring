# 📚 مستندات OGIM

مرکز مستندات سیستم هوشمند نظارت و پایش میدان نفت و گاز

---

## 📖 فهرست مستندات

### 🚀 شروع کار

- **[README](README.md)** - راهنمای جامع پروژه (فارسی + English)
  - معرفی پروژه
  - ویژگی‌ها و قابلیت‌ها
  - تکنولوژی‌های استفاده شده
  - شروع سریع
  - مثال‌های کد
- **[REPO_STRUCTURE](REPO_STRUCTURE.md)** - ساختار پوشه‌ها و بخش‌های اصلی پروژه
- **[DEVELOPER_GUIDE](DEVELOPER_GUIDE.md)** - راهنمای توسعه‌دهنده و گردش کار

### ⚙️ نصب و راه‌اندازی

- **[INSTALLATION](INSTALLATION.md)** - راهنمای کامل نصب و راه‌اندازی
  - پیش‌نیازها
  - نصب با Docker Compose
  - نصب دستی (Development)
  - تنظیمات اولیه
  - عیب‌یابی
- **[CONFIGURATION](CONFIGURATION.md)** - پروفایل‌های dev/prod و مدیریت Secret ها

### 🏗️ معماری

- **[ARCHITECTURE](ARCHITECTURE.md)** - معماری سیستم
  - نمای کلی معماری
  - لایه‌های سیستم
  - میکروسرویس‌ها
  - جریان داده
  - مقیاس‌پذیری
  - امنیت

### 📊 داده و متغیرها

**فایل CSV:**
- **[variables_list.csv](../data/variables_list.csv)** - لیست کامل 65+ متغیر در فرمت CSV
  - دسته‌بندی متغیرها
  - واحدها و محدوده‌ها
  - نام‌های فارسی

**راهنمای تولید داده:**
- مراجعه کنید به: [data/README.md](../data/README.md)
- اسکریپت‌های تولید داده: [data/](../data/)
  - `advanced_data_generator.py` - 6 ماه، 1 ثانیه
  - `generate_sample_data.py` - 1 هفته، 1 دقیقه

### 🖥️ Frontend

- **[frontend/web/README.md](../frontend/web/README.md)** - راهنمای Frontend
  - نصب و راه‌اندازی
  - ساختار پروژه
  - توسعه
  - Build و Deploy

### 🛠️ Backend

**سرویس‌های Backend:**

1. **Auth Service** - احراز هویت و مجوزدهی
   - مسیر: `backend/auth-service/`
   - Port: 8001
   - API Docs: http://localhost:8001/docs

2. **Data Ingestion Service** - دریافت داده
   - مسیر: `backend/data-ingestion-service/`
   - Port: 8002
   - API Docs: http://localhost:8002/docs

3. **ML Inference Service** - استنتاج ML
   - مسیر: `backend/ml-inference-service/`
   - Port: 8004
   - API Docs: http://localhost:8004/docs

4. **Alert Service** - مدیریت هشدارها
   - مسیر: `backend/alert-service/`
   - Port: 8003
   - API Docs: http://localhost:8003/docs

5. **Command & Control Service** - فرمان و کنترل
   - مسیر: `backend/command-control-service/`
   - Port: 8005
   - API Docs: http://localhost:8005/docs

6. **Tag Catalog Service** - کاتالوگ تگ‌ها
   - مسیر: `backend/tag-catalog-service/`
   - Port: 8006
   - API Docs: http://localhost:8006/docs

**Shared Modules:**
- مسیر: `backend/shared/`
- شامل: Database, Models, Security, Config, Logging

**Stream Processing:**
- مسیر: `backend/flink-jobs/`
- Apache Flink jobs برای پردازش real-time

**Testing:**
- مسیر: `backend/tests/`
- اجرا: `pytest backend/tests/`

---

## 📚 مستندات بر اساس موضوع

### برای توسعه‌دهندگان

1. **شروع سریع:** [README.md](README.md)
2. **نصب محیط Development:** [INSTALLATION.md](INSTALLATION.md)
3. **معماری سیستم:** [ARCHITECTURE.md](ARCHITECTURE.md)
4. **Frontend Development:** [../frontend/web/README.md](../frontend/web/README.md)
5. **Backend Development:** مراجعه به `backend/*/main.py`
6. **Testing:** `backend/tests/`

### برای DevOps

1. **Docker Setup:** `docker-compose.dev.yml`
2. **Kubernetes Deployment:** `infrastructure/kubernetes/`
3. **CI/CD:** `.github/workflows/backend-ci.yml`, [`CI_CD.md`](CI_CD.md)
4. **Monitoring & Metrics:** [`OBSERVABILITY.md`](OBSERVABILITY.md), rules: `infrastructure/prometheus/rules/`
5. **Logging:** [`LOGGING.md`](LOGGING.md)
6. **Tracing:** [`TRACING.md`](TRACING.md)
7. **Security Checklist:** [`SECURITY_CHECKLIST.md`](SECURITY_CHECKLIST.md)
8. **ML Operations:** [`ML_OPERATIONS.md`](ML_OPERATIONS.md)

### برای Data Engineers

1. **Data Generation:** [../data/README.md](../data/README.md)
2. **Variables List:** [../data/variables_list.csv](../data/variables_list.csv)
3. **Flink Jobs:** `backend/flink-jobs/`
4. **ML Models:** `backend/ml-inference-service/mlflow_integration.py`

### برای مدیران پروژه

1. **Project Overview:** [README.md](README.md)
2. **System Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)
3. **Rollout & Handoff:** [`HANDOFF.md`](HANDOFF.md)

---

## 🔗 لینک‌های سریع

### API Documentation
- **API Gateway:** http://localhost:8000/docs
- **Auth Service:** http://localhost:8001/docs
- **Data Ingestion:** http://localhost:8002/docs
- **Alert Service:** http://localhost:8003/docs
- **ML Inference:** http://localhost:8004/docs

### رابط کاربری
- **Web Portal:** http://localhost:3000
- **MLflow UI:** http://localhost:5000

### پایگاه داده
- **PostgreSQL:** localhost:5432
- **TimescaleDB:** localhost:5433
- **Redis:** localhost:6379

### Message Bus
- **Kafka:** localhost:9092
- **Zookeeper:** localhost:2181

---

## 📊 ساختار پروژه

```
OGIM---Oil-Gas-Intelligent-Monitoring/
├── docs/                          # 📚 این پوشه
│   ├── README.md                  # راهنمای جامع پروژه
│   ├── INSTALLATION.md            # راهنمای نصب
│   ├── ARCHITECTURE.md            # معماری سیستم
│   └── INDEX.md                   # این فایل
│
├── backend/                       # 🔧 Backend Services
│   ├── shared/                    # ماژول‌های مشترک
│   ├── auth-service/
│   ├── data-ingestion-service/
│   ├── ml-inference-service/
│   ├── alert-service/
│   ├── command-control-service/
│   ├── tag-catalog-service/
│   ├── reporting-service/
│   ├── digital-twin-service/
│   ├── flink-jobs/
│   └── tests/
│
├── frontend/                      # 🎨 Frontend
│   └── web/                       # React Web Portal
│
├── data/                          # 📊 Data & Scripts
│   ├── advanced_data_generator.py
│   ├── generate_sample_data.py
│   ├── variables_list.csv
│   └── README.md
│
├── infrastructure/                # 🐳 Infrastructure
│   ├── docker/
│   │   └── docker-compose.dev.yml
│   └── kubernetes/
│
├── scripts/                       # 📜 Utility Scripts
│   ├── setup_dev.sh
│   ├── setup_dev.ps1
│   ├── run_tests.sh
│   └── deploy_production.sh
│
└── README.md                      # Main README
```

---

## 🎓 آموزش‌های گام به گام

### 1️⃣ اولین بار استفاده می‌کنید؟

1. **خواندن:** [README.md](README.md)
2. **نصب:** [INSTALLATION.md](INSTALLATION.md)
3. **تست:** اجرای `generate_sample_data.py`
4. **اکسپلور:** باز کردن Web Portal

### 2️⃣ می‌خواهید توسعه بدهید؟

1. **معماری:** [ARCHITECTURE.md](ARCHITECTURE.md)
2. **Backend:** `backend/shared/README.md` (if exists)
3. **Frontend:** [../frontend/web/README.md](../frontend/web/README.md)
4. **Testing:** `pytest backend/tests/`

### 3️⃣ می‌خواهید Deploy کنید؟

1. **Docker:** `docker-compose -f docker-compose.dev.yml up`
2. **Kubernetes:** `kubectl apply -f infrastructure/kubernetes/`
3. **Configuration & Secrets:** [`CONFIGURATION.md`](CONFIGURATION.md)
4. **Production Handoff:** [`HANDOFF.md`](HANDOFF.md)

---

## 🆘 دریافت کمک

### مشکل فنی دارید؟
1. **عیب‌یابی:** [INSTALLATION.md#troubleshooting](INSTALLATION.md)
2. **Issues:** [GitHub Issues](https://github.com/parsasohrab1/OGIM---Oil-Gas-Intelligent-Monitoring/issues)
3. **API Docs:** http://localhost:8000/docs

### سوال دارید؟
1. **README:** [README.md](README.md)
2. **GitHub Discussions:** (if enabled)
3. **Email:** مشخص شده در LICENSE

---

## 📝 مشارکت

برای مشارکت در پروژه:

1. Fork کنید
2. Feature branch بسازید
3. Commit کنید
4. Pull Request بزنید

جزئیات در [README.md#contributing](README.md)

---

## 📄 لایسنس

MIT License - مراجعه کنید به LICENSE file

---

## 🔄 به‌روزرسانی‌ها

- **v1.0.0** (نوامبر 2025): اولین نسخه
  - معماری میکروسرویس کامل
  - 65+ متغیر شبیه‌سازی
  - ML Integration با MLflow
  - Stream Processing با Flink
  - React Web Portal

---

<div align="center">

**🛢️ OGIM - Oil & Gas Intelligent Monitoring**

Made with ❤️ for the Oil & Gas Industry

[GitHub](https://github.com/parsasohrab1/OGIM---Oil-Gas-Intelligent-Monitoring) | [Issues](https://github.com/parsasohrab1/OGIM---Oil-Gas-Intelligent-Monitoring/issues)

</div>

