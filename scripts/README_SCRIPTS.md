# راهنمای استفاده از اسکریپت‌ها

## اسکریپت‌های راه‌اندازی

### راه‌اندازی Backend (Windows PowerShell)
```powershell
.\scripts\start_backend.ps1
```

### راه‌اندازی Backend (Linux/Mac)
```bash
chmod +x scripts/start_backend.sh
./scripts/start_backend.sh
```

### راه‌اندازی Frontend (Windows PowerShell)
```powershell
.\scripts\start_frontend.ps1
```

### راه‌اندازی Frontend (Linux/Mac)
```bash
chmod +x scripts/start_frontend.sh
./scripts/start_frontend.sh
```

### تست سرویس‌ها
```bash
python scripts/test_services.py
```

## تولید داده نمونه

```bash
python scripts/data_generator.py
```

## دستورات مفید Docker

### مشاهده لاگ‌ها
```bash
docker-compose -f infrastructure/docker/docker-compose.yml logs -f
```

### توقف سرویس‌ها
```bash
docker-compose -f infrastructure/docker/docker-compose.yml down
```

### راه‌اندازی مجدد سرویس خاص
```bash
docker-compose -f infrastructure/docker/docker-compose.yml restart api-gateway
```

