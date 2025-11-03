# 📊 OGIM Data Directory

این پوشه برای ذخیره داده‌های تولید شده توسط data generators استفاده می‌شود.

## 📁 محتویات

این پوشه شامل داده‌های تولید شده برای 4 چاه می‌باشد:

### داده‌های نمونه (1 هفته) ✅ موجود
- `PROD-001_sample_1week.json` - داده JSON چاه تولیدی 1 (~20 MB)
- `PROD-001_sample_1week.csv` - داده CSV چاه تولیدی 1 (~4 MB)
- `PROD-002_sample_1week.json` - داده JSON چاه تولیدی 2 (~20 MB)
- `PROD-002_sample_1week.csv` - داده CSV چاه تولیدی 2 (~4 MB)
- `DEV-001_sample_1week.json` - داده JSON چاه توسعه‌ای (~20 MB)
- `DEV-001_sample_1week.csv` - داده CSV چاه توسعه‌ای (~4 MB)
- `OBS-001_sample_1week.json` - داده JSON چاه مشاهده‌ای (~20 MB)
- `OBS-001_sample_1week.csv` - داده CSV چاه مشاهده‌ای (~4 MB)

**مجموع حجم نمونه:** ~81 MB (JSON) + ~17 MB (CSV) = ~98 MB

### داده‌های کامل (6 ماه) - برای تولید
برای تولید داده‌های 6 ماهه با تایم لپس 1 ثانیه:
```bash
python scripts/advanced_data_generator.py
```

فایل‌های خروجی (compressed):
- `PROD-001_6months_data.jsonl.gz`
- `PROD-002_6months_data.jsonl.gz`
- `DEV-001_6months_data.jsonl.gz`
- `OBS-001_6months_data.jsonl.gz`

**حجم تخمینی:** ~12-15 GB (compressed)

## 🚀 تولید داده

### داده نمونه (سریع - ✅ اجرا شده)
```bash
python scripts/generate_sample_data.py
```
- مدت: 1 هفته
- تایم لپس: 1 دقیقه
- رکورد: 10,080 × 4 چاه = 40,320 رکورد
- زمان: ~3-5 دقیقه

### داده کامل (طبق SRS)
```bash
python scripts/advanced_data_generator.py
```
- مدت: 6 ماه (180 روز)
- تایم لپس: 1 ثانیه
- رکورد: 15,552,000 × 4 چاه = 62,208,000 رکورد
- زمان: ~4-8 ساعت
- حجم: ~12-15 GB

## 📖 مستندات

برای اطلاعات کامل، نگاه کنید به:
- [DATA_GENERATION_GUIDE.md](../DATA_GENERATION_GUIDE.md) - راهنمای کامل تولید داده
- [VARIABLES_LIST.md](../VARIABLES_LIST.md) - لیست 65+ متغیر

## 📊 آمار داده‌های موجود

### چاه PROD-001 (تولیدی)
- نرخ تولید پایه: 800-1500 bbl/day
- فشار پایه: 2000-3500 psi
- Water cut: 10-95% (افزایش تدریجی)

### چاه PROD-002 (تولیدی)
- نرخ تولید پایه: 800-1500 bbl/day
- فشار پایه: 2000-3500 psi
- Water cut: 10-95% (افزایش تدریجی)

### چاه DEV-001 (توسعه‌ای)
- نرخ تولید پایه: 500-1000 bbl/day
- فشار پایه: 1500-3000 psi
- در حال تست و توسعه

### چاه OBS-001 (مشاهده‌ای)
- بدون تولید (monitoring only)
- فشار پایه: 1000-2500 psi
- فقط monitoring فشار و سطح

## ⚠️ توجه

- ⚠️ فایل‌های بزرگ داده از Git ignore شده‌اند (*.json, *.csv, *.gz)
- ✅ فقط README.md در Git commit می‌شود
- 🗜️ فایل‌های 6 ماهه با gzip فشرده شده‌اند
- 💾 حجم کل (full): ~12-15 GB

## 🔍 نحوه خواندن داده‌ها

### Python
```python
import json

# Read JSON
with open('PROD-001_sample_1week.json', 'r') as f:
    data = json.load(f)
    print(f"Total records: {len(data)}")
    print(f"First record: {data[0]}")
```

### Pandas
```python
import pandas as pd

# Read CSV
df = pd.read_csv('PROD-001_sample_1week.csv')
print(df.head())
print(df.describe())

# Time series analysis
df['timestamp'] = pd.to_datetime(df['timestamp'])
df.set_index('timestamp', inplace=True)
daily_prod = df['oil_flow_rate'].resample('D').mean()
```

### Compressed files
```python
import gzip
import json

# Read compressed 6-month data
with gzip.open('PROD-001_6months_data.jsonl.gz', 'rt') as f:
    for line in f:
        record = json.loads(line)
        print(record)
        break
```

---

**نسخه:** 1.0  
**تاریخ:** نوامبر 2025  
**وضعیت:** ✅ داده‌های نمونه تولید شده

