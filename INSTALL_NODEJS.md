# راهنمای نصب Node.js برای اجرای Frontend

## چرا Node.js نیاز است؟

Node.js برای اجرای فرانت‌اند تحت وب (React + TypeScript) و نصب dependencies با npm لازم است.

## مراحل نصب

### 1. دانلود Node.js

1. به آدرس https://nodejs.org/ بروید
2. روی دکمه **"Download Node.js (LTS)"** کلیک کنید
   - LTS = Long Term Support (نسخه پایدار)
   - نسخه توصیه شده: v18.x یا v20.x

### 2. نصب Node.js

1. فایل دانلود شده را اجرا کنید (`.msi` برای Windows)
2. مراحل نصب را طی کنید:
   - **مهم:** گزینه **"Add to PATH"** را فعال کنید
   - روی **"Next"** کلیک کنید تا نصب کامل شود
3. در پایان، روی **"Finish"** کلیک کنید

### 3. بررسی نصب

**مهم:** ترمینال/PowerShell را **بسته و دوباره باز کنید** تا تغییرات PATH اعمال شود.

سپس دستورات زیر را اجرا کنید:

```powershell
node --version
npm --version
```

باید چیزی شبیه این نمایش داده شود:
```
v18.17.0
9.6.7
```

اگر خطا می‌دهد:
- ترمینال را بسته و دوباره باز کنید
- مطمئن شوید Node.js نصب شده است
- مسیر نصب Node.js را به PATH اضافه کنید

### 4. نصب Dependencies Frontend

بعد از نصب موفق Node.js:

```powershell
cd frontend\web
npm install
```

این دستور تمام پکیج‌های لازم را دانلود و نصب می‌کند (ممکن است چند دقیقه طول بکشد).

### 5. اجرای Frontend

```powershell
npm run dev
```

پورتال وب در http://localhost:3000 باز می‌شود.

## عیب‌یابی

### مشکل: "node is not recognized"
- Node.js نصب نشده یا PATH تنظیم نشده
- ترمینال را بسته و دوباره باز کنید
- Node.js را دوباره نصب کنید

### مشکل: npm install خطا می‌دهد
```powershell
# حذف پوشه node_modules و lock file
cd frontend\web
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json

# نصب مجدد
npm install
```

### مشکل: پورت 3000 در حال استفاده است
در `vite.config.ts` پورت را تغییر دهید:
```typescript
server: {
  port: 3001,  // یا هر پورت دیگر
}
```

## لینک‌های مفید

- Node.js: https://nodejs.org/
- npm Documentation: https://docs.npmjs.com/
- Vite (Build Tool): https://vitejs.dev/

