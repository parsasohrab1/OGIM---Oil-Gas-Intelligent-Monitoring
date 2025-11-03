# راهنمای نصب Frontend

## پیش‌نیازها

برای اجرای فرانت‌اند تحت وب، نیاز به نصب Node.js دارید:

### نصب Node.js

1. به آدرس https://nodejs.org/ بروید
2. نسخه LTS را دانلود کنید (توصیه: v18 یا بالاتر)
3. فایل نصب‌کننده را اجرا کنید
4. در طول نصب، گزینه "Add to PATH" را فعال کنید

### بررسی نصب

بعد از نصب، ترمینال را بسته و دوباره باز کنید، سپس:

```powershell
node --version
npm --version
```

باید نسخه Node.js و npm نمایش داده شود.

## نصب Dependencies

بعد از نصب Node.js:

```powershell
cd frontend\web
npm install
```

این دستور تمام پکیج‌های لازم را نصب می‌کند:
- React 18
- TypeScript
- Vite
- React Router
- Recharts (برای نمودارها)
- و سایر dependencies

## اجرای پروژه

```powershell
npm run dev
```

پورتال وب در http://localhost:3000 در دسترس خواهد بود.

## Build برای Production

```powershell
npm run build
```

فایل‌های build شده در پوشه `dist` ایجاد می‌شوند.

## عیب‌یابی

### مشکل: npm پیدا نمی‌شود
- ترمینال را بسته و دوباره باز کنید
- مطمئن شوید Node.js نصب شده است
- مسیر Node.js به PATH اضافه شده باشد

### مشکل: خطای نصب
- حذف پوشه `node_modules` و فایل `package-lock.json`
- اجرای مجدد `npm install`

