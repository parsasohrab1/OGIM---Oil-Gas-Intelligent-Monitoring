# راهنمای نصب و راه‌اندازی نسخه تحت وب

این راهنما فقط برای اجرای نسخه **تحت وب** است. بخش موبایل حذف شده است.

## پیش‌نیازها

### 1. Docker Desktop
- دانلود از: https://www.docker.com/products/docker-desktop
- برای اجرای سرویس‌های بک‌اند

### 2. Node.js و npm
- دانلود از: https://nodejs.org/
- نسخه توصیه شده: v18 یا بالاتر
- بعد از نصب، ترمینال را بسته و دوباره باز کنید

### 3. Python 3.11+
- برای تولید داده‌های نمونه و تست
- دانلود از: https://www.python.org/

## مراحل نصب

### مرحله 1: تولید داده‌های نمونه

```powershell
python scripts/data_generator.py
```

### مرحله 2: راه‌اندازی سرویس‌های بک‌اند

```powershell
.\scripts\start_backend.ps1
```

یا دستی:

```powershell
cd infrastructure\docker
docker-compose up -d
```

### مرحله 3: نصب Dependencies فرانت‌اند

**مهم:** ابتدا مطمئن شوید Node.js نصب شده است:

```powershell
node --version
npm --version
```

اگر دستورات بالا کار نمی‌کنند:
1. Node.js را از https://nodejs.org/ نصب کنید
2. ترمینال را بسته و دوباره باز کنید

**سپس:**

```powershell
cd frontend\web
npm install
```

این فرآیند ممکن است چند دقیقه طول بکشد. در پایان باید پیام موفقیت آمیز نمایش داده شود.

### مرحله 4: اجرای فرانت‌اند

```powershell
cd frontend\web
npm run dev
```

پورتال وب در http://localhost:3000 در دسترس است.

## دسترسی به سیستم

### پورتال وب
- آدرس: http://localhost:3000
- شامل Dashboard، Alerts، Wells، Reports

### API Gateway
- آدرس: http://localhost:8000
- مستندات API: http://localhost:8000/docs

### سرویس‌های دیگر
- Auth Service: http://localhost:8001/docs
- Data Ingestion: http://localhost:8002/docs
- ML Inference: http://localhost:8003/docs
- Alert Service: http://localhost:8004/docs
- Reporting: http://localhost:8005/docs
- Command Control: http://localhost:8006/docs
- Tag Catalog: http://localhost:8007/docs
- Digital Twin: http://localhost:8008/docs

## تست سیستم

### تست Backend Services
```powershell
python scripts/test_services.py
```

### تست Frontend
- مرورگر را باز کنید
- به http://localhost:3000 بروید
- Dashboard باید نمایش داده شود

## عیب‌یابی

### npm پیدا نمی‌شود
- Node.js را نصب کنید
- ترمینال را بسته و دوباره باز کنید
- مسیر Node.js را به PATH اضافه کنید

### خطای npm install
```powershell
cd frontend\web
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```

### سرویس‌های بک‌اند کار نمی‌کنند
```powershell
cd infrastructure\docker
docker-compose logs
docker-compose ps
```

### پورت 3000 در حال استفاده است
- برنامه دیگری که از پورت 3000 استفاده می‌کند را ببندید
- یا در `vite.config.ts` پورت را تغییر دهید

## ساختار Frontend

```
frontend/web/
├── src/
│   ├── components/    # کامپوننت‌های مشترک
│   ├── pages/        # صفحات اصلی
│   ├── App.tsx       # کامپوننت اصلی
│   └── main.tsx      # نقطه ورود
├── package.json      # Dependencies
└── vite.config.ts     # تنظیمات Vite
```

## نکات مهم

- ✅ فقط نسخه تحت وب پشتیبانی می‌شود
- ✅ بخش موبایل حذف شده است
- ✅ تمام قابلیت‌ها از طریق پورتال وب در دسترس است
- ✅ سیستم کاملاً Responsive است و روی موبایل هم کار می‌کند

