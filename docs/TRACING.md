# Tracing با OpenTelemetry

این راهنما نحوه‌ی فعال‌سازی و مشاهده‌ی Traceهای end-to-end بین سرویس‌های OGIM را توضیح می‌دهد.

## وابستگی‌ها

در هر سرویس پکیج‌های زیر نصب شده‌اند:

- `opentelemetry-sdk`
- `opentelemetry-exporter-otlp`
- `opentelemetry-instrumentation-fastapi`
- `opentelemetry-instrumentation-httpx` (برای API Gateway)
- `opentelemetry-instrumentation-requests`

ماژول مشترک `backend/shared/tracing.py` تابع `setup_tracing` را فراهم می‌کند که در تمام سرویس‌ها فراخوانی شده است.

## تنظیمات محیطی

برای ارسال spanها به OTLP (Jaeger، Tempo یا Collector)، متغیرهای زیر را تنظیم کنید:

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
# اختیاری: مشاهده همزمان در لاگ‌ها
export OTEL_TRACING_CONSOLE=true
```

اگر `OTEL_TRACING_CONSOLE=true` باشد، علاوه بر ارسال به endpoint، spanها در stdout نیز چاپ می‌شوند.

## اجرای Jaeger (نمونه Docker Compose)

```yaml
services:
  jaeger:
    image: jaegertracing/all-in-one:1.45
    ports:
      - "16686:16686"   # UI
      - "4317:4317"     # OTLP gRPC
```

سرویس‌های OGIM را با متغیر `OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317` اجرا کنید، سپس در UI جگر (`http://localhost:16686`) با `service=api-gateway` یا سایر سرویس‌ها traceها را ببینید.

## جریان end-to-end

1. **API Gateway**: با `setup_tracing(... instrument_httpx=True)` درخواست‌های ورودی را trace و هنگام فراخوانی سرویس‌های پایین‌دستی context را از طریق HTTPX منتقل می‌کند.
2. **سرویس‌های داخلی**: `setup_tracing(app, "<service>")` برای هر سرویس اجرا شده است؛ context در header `traceparent` دریافت می‌شود و span جدید ایجاد می‌کند.
3. **سرویس‌های دارای خروجی HTTP یا DB**: instrumentation درخواست‌های خروجی (مثل کتابخانه `requests`) را trace می‌کند.

## نکات عملیاتی

- نام سرویس، نسخه و environment به عنوان attribute در span قرار می‌گیرد (`service.name`, `deployment.environment`).
- برای افزودن metadata بیشتر (مثلاً شناسه فرمان)، از `trace.get_current_span().set_attribute(...)` در کد استفاده کنید.
- در صورت نیاز به propagation سفارشی (مثلاً Kafka)، باید پیام‌ها را با header `traceparent` ارسال کنید.

## تست سریع

1. اجرای Jaeger (یا OTEL Collector) طبق نمونه بالا.
2. اجرای سرویس‌ها با متغیر endpoint.
3. ارسال درخواست نمونه به API Gateway (`/api/alert/alerts`).
4. در Jaeger UI trace را بررسی کنید؛ باید حداقل دو span (gateway + سرویس داخلی) دیده شود.

با این تنظیم، تیم می‌تواند latency مسیر کامل هر درخواست را مشاهده و bottleneck‌ها را شناسایی کند.*** End Patch

