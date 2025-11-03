# راهنمای سریع نصب و اجرا

## ⚠️ توجه
**این پروژه فقط نسخه تحت وب دارد. بخش موبایل حذف شده است.**

## پیش‌نیازها

### 1. Node.js (ضروری برای Frontend)
- **نصب:** https://nodejs.org/
- نسخه توصیه شده: v18 یا بالاتر
- بعد از نصب، ترمینال را بسته و دوباره باز کنید
- برای راهنمای کامل: [INSTALL_NODEJS.md](INSTALL_NODEJS.md)

### 2. Docker Desktop (برای Backend)
- دانلود: https://www.docker.com/products/docker-desktop

### 3. Python 3.11+ (برای تولید داده)
- دانلود: https://www.python.org/

## مراحل نصب سریع

### مرحله 1: نصب Node.js
```powershell
# بررسی نصب
node --version
npm --version

# اگر کار نمی‌کند، Node.js را نصب کنید
# راهنما: INSTALL_NODEJS.md
```

### مرحله 2: تولید داده نمونه
```powershell
python scripts/data_generator.py
```

### مرحله 3: راه‌اندازی Backend
```powershell
.\scripts\start_backend.ps1
```

### مرحله 4: نصب Frontend Dependencies
```powershell
cd frontend\web
npm install
```

**مهم:** اگر npm پیدا نمی‌شود، Node.js را نصب کنید و ترمینال را دوباره باز کنید.

### مرحله 5: اجرای Frontend
```powershell
npm run dev
```

پورتال وب در http://localhost:3000 باز می‌شود.

## مستندات بیشتر

- [INSTALL_NODEJS.md](INSTALL_NODEJS.md) - راهنمای کامل نصب Node.js
- [SETUP_WEB.md](SETUP_WEB.md) - راهنمای کامل نصب نسخه وب
- [SETUP.md](SETUP.md) - راهنمای کامل عمومی
- [frontend/web/INSTALL.md](frontend/web/INSTALL.md) - راهنمای Frontend

## عیب‌یابی سریع

### npm پیدا نمی‌شود
1. Node.js را نصب کنید: https://nodejs.org/
2. ترمینال را بسته و دوباره باز کنید
3. `node --version` را تست کنید

### npm install خطا می‌دهد
```powershell
cd frontend\web
Remove-Item -Recurse -Force node_modules
npm install
```

### Backend کار نمی‌کند
```powershell
cd infrastructure\docker
docker-compose logs
```

