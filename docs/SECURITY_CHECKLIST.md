# Security Checklist

## Pre-Deployment
- [ ] همه SECRET ها از طریق Secret Manager تزریق شده‌اند (بدون مقادیر پیش‌فرض).
- [ ] کلید JWT (`SECRET_KEY`) حداقل 32 کاراکتر و تصادفی است.
- [ ] آدرس‌های CORS فقط دامنه‌های معتبر را شامل می‌شود.
- [ ] مهاجرت‌های پایگاه داده روی staging اجرا و تأیید شده‌اند.
- [ ] Role/RBAC برای سرویس‌ها مطابق با `docs/SECURITY_ROLES.md` بررسی شده است.

## Runtime
- [ ] Rate limiting روی `/token` و سایر ورودی‌های حساس فعال است.
- [ ] Logging ساخت‌یافته (JSON) به سیستم مرکزی ارسال می‌شود.
- [ ] Tracing و metrics فعال و در داشبوردها قابل مشاهده است.
- [ ] هشدارهای امنیتی (مثلاً لاگین ناموفق مکرر) در SIEM یا Prometheus تعریف شده‌اند.

## Post-Deployment
- [ ] حساب‌های پیش‌فرض حذف یا غیرفعال شده‌اند.
- [ ] دسترسی‌ها در گیت‌وی و سرویس‌ها تست شده (کاربر غیرمجاز دسترسی ندارد).
- [ ] نسخه‌های dependency ها بررسی و بسته‌های آسیب‌پذیر به‌روزرسانی شده‌اند.
- [ ] نسخه پشتیبان و برنامه بازیابی (DRP) تست شده است.

## Periodic Review
- [ ] Penetration test (هر ۶ ماه یا پس از نسخه‌ی بزرگ) – ابزار پیشنهادی: OWASP ZAP یا همکاری با تیم امنیت.
- [ ] RBAC audit (مقایسه نقش‌ها با `docs/SECURITY_ROLES.md` و حذف نقش‌های زائد)
- [ ] بررسی سلامت pipeline داده (نرخ خطای ingest، mismatch سنسور) – alert rule: `infrastructure/prometheus/rules/data-quality.yml`
- [ ] بازبینی هشدارهای Prometheus/Grafana و به‌روزرسانی آستانه‌ها
