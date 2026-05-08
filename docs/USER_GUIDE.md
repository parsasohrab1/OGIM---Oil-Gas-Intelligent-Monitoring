# راهنمای کاربر OGIM (Updated)

این راهنما برای کاربر نهایی (اپراتور/مهندس) تهیه شده است.

## 1) شروع سریع

1. وارد پرتال شوید (`Dashboard`).
2. وضعیت اتصال Stream را بررسی کنید:
   - `WebSocket`
   - `SSE (fallback)`
   - `Polling fallback`
3. برای هشدارها به صفحه `Alerts` بروید.

## 2) مدیریت هشدارها

- مشاهده هشدارهای باز/حل‌شده
- تایید هشدار (`Acknowledge`)
- تحلیل همبستگی:
  - گروه‌بندی هشدارها در Correlation
- RCA:
  - اجرای تحلیل ریشه‌ای روی هشدار انتخابی

## 3) کیفیت داده و Lineage

صفحه `Data Quality`:
- شاخص‌ها:
  - `overall_score`, `completeness`, `validity`, `timeliness`, `consistency`
- نمایش lineage:
  - تعداد node/edge و اجزای مسیر داده
- گزارش خودکار:
  - `Generate Auto Report`

## 4) گزارش‌گیری پیشرفته و BI

صفحه `Reports`:
- Report Builder:
  - انتخاب `dimensions` و `measures`
  - اجرای گزارش سفارشی
- BI connectors:
  - metadata برای Power BI/Tableau

## 5) Workflow Automation

صفحه `Workflow`:
- ساخت workflow مرحله‌ای
- تعریف dependency بین stepها
- اجرای دستی (`Run Now`)
- مشاهده تاریخچه اجراها

## 6) Digital Twin / 3D / AR

- صفحه `3D Visualization`:
  - مشاهده چاه، تجهیزات، Risk Zone
- صفحه `AR Integration`:
  - payload واقعی AR overlay
  - اجرای سناریوی What-if و مشاهده KPIهای پیش‌بینی

## 7) اپ موبایل

`mobile/app`:
- Push Notification برای هشدارهای critical
- Offline mode:
  - cache داده‌ها
  - queue عملیات و sync بعد از اتصال

