# Observability – Prometheus & Grafana

این راهنما نحوه‌ی جمع‌آوری متریک‌ها و ساخت داشبورد برای سرویس‌های OGIM را توضیح می‌دهد.

## 1. اجزای پیشنهادی

- **Prometheus**: جمع‌آوری متریک از سرویس‌ها (`/metrics`).
- **Grafana**: نمایش داشبورد، تعریف هشدار.
- (اختیاری) **Alertmanager**: مدیریت هشدارهای Prometheus.

نمونه docker-compose (خلاصه):

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
```

## 2. پیکربندی Prometheus

در `infrastructure/prometheus/prometheus.yml` (نمونه):

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: ogim-services
    static_configs:
      - targets:
          - alert-service:8004
          - command-control-service:8006
          - data-ingestion-service:8002
          - tag-catalog-service:8007
          - auth-service:8001
          - ml-inference-service:8003
          - api-gateway:8000
```

هر سرویس FastAPI اکنون مسیر `/metrics` را ارائه می‌دهد. در صورت عدم نصب `prometheus-client`، سرویس خطای 503 برمی‌گرداند.

## 3. متریک‌های موجود

### عمومی (همه سرویس‌ها)
- `service_requests_total{service,method,status}`
- `service_request_errors_total{service,method,status}`
- `service_request_latency_seconds{service,method,path}`

### اختصاصی ML Inference
- `ml_inference_requests_total{model_type}`
- `ml_inference_errors_total{model_type,reason}`
- `ml_inference_latency_seconds{model_type}`

## 4. داشبورد پایه Grafana

پنل‌های پیشنهادی:
- **Latency (p95/p99)**: از `histogram_quantile` روی `service_request_latency_seconds`.
- **Error Rate**: درصد درخواست‌های `status>=500`.
- **Request Volume**: نمودار تجمعی `service_requests_total`.
- **Inference Performance** (پیشرفته): latency/خطا بر اساس `model_type`.

نمونه کوئری Latency:
```promql
histogram_quantile(0.95, sum(rate(service_request_latency_seconds_bucket{service="api-gateway"}[5m])) by (le))
```

## 5. هشدارها
- **خطای زیاد**: اگر `rate(service_request_errors_total[5m]) > 0.01` برای سرویسی خاص.
- **Latency بالا**: `histogram_quantile(0.99, ...) > 2s`.
- **ورود ناموفق مکرر**: قابل استفاده از لاگ‌های audit (integration با Alertmanager / SIEM).

## 6. Tracing (OpenTelemetry)
- تمام سرویس‌ها با `setup_tracing` پیکربندی شده‌اند؛ برای فعال‌سازی، متغیر `OTEL_EXPORTER_OTLP_ENDPOINT` را تنظیم کنید.
- نمونه تنظیمات و استقرار Jaeger در [`docs/TRACING.md`](TRACING.md) موجود است.
- API Gateway به صورت خودکار context را به سرویس‌های پایین‌دست منتقل می‌کند.

## 7. Logging ساخت‌یافته
- خروجی لاگ همه سرویس‌ها JSON است (فایل `shared/logging_config.py`). فیلدهایی مانند `service`، `environment`، `correlation_id` و جزئیات exception به طور پیش‌فرض ثبت می‌شوند.
- برای ارسال لاگ‌ها به Loki یا ELK، به [`docs/LOGGING.md`](LOGGING.md) مراجعه کنید و نمونه پیکربندی `infrastructure/logging/promtail-config.yaml` را به کار ببرید.
- توصیه می‌شود در Grafana/Kibana داشبوردی بسازید که لاگ‌ها را براساس `service` و `level` فیلتر کند.

## 8. CI/CD و مستندسازی
- در pipeline استقرار، پس از deploy سرویس‌ها، Prometheus/Grafana را reload کنید (یا از Kubernetes ServiceMonitor استفاده کنید).
- آدرس و نحوه دسترسی داشبوردها و ابزار tracing را در Runbook عملیاتی ثبت کنید.
- برای تیم Ops، سقف‌های هشدار (threshold) و اقدامات پاسخ را در Runbook اضافه کنید.

با این ساختار می‌توانید روند سلامت سرویس‌ها را رصد و هشدارهای اولیه را مدیریت کنید.

