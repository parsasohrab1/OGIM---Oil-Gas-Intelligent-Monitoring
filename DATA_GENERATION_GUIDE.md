# 📊 راهنمای تولید داده OGIM

## 📋 خلاصه

این پروژه شامل data generators پیشرفته برای تولید داده‌های واقع‌گرایانه میدان نفت و گاز است.

---

## 🏭 انواع چاه‌ها

| نام چاه | نوع | توضیحات |
|---------|-----|---------|
| **PROD-001** | Production | چاه تولیدی 1 - نرخ تولید بالا |
| **PROD-002** | Production | چاه تولیدی 2 - تولید متوسط |
| **DEV-001** | Development | چاه توسعه‌ای - در حال تست و توسعه |
| **OBS-001** | Observation | چاه مشاهده‌ای - فقط monitoring |

---

## 📊 متغیرهای تولید شده (65+ متغیر)

### دسته‌بندی متغیرها:

1. **فشار (6 متغیر)**
   - Wellhead Pressure, Tubing Pressure, Casing Pressure
   - Separator Pressure, Line Pressure, Bottom Hole Pressure

2. **دما (5 متغیر)**
   - Wellhead Temperature, Separator Temperature
   - Line Temperature, Motor Temperature, Bearing Temperature

3. **جریان (5 متغیر)**
   - Oil Flow Rate, Gas Flow Rate, Water Flow Rate
   - Total Liquid Rate, Injection Rate

4. **ترکیب (5 متغیر)**
   - Oil Cut, Water Cut, GOR, BS&W, API Gravity

5. **پمپ (6 متغیر)**
   - Pump Speed, Pump Frequency, Motor Current/Voltage
   - Power Consumption, Pump Efficiency

6. **لرزش (4 متغیر)**
   - Vibration X/Y/Z axes, Overall Vibration

7. **شیرها (4 متغیر)**
   - Choke/Wing/Master Valve Position, Safety Valve Status

8. **سطح (4 متغیر)**
   - Separator Oil/Water Level, Tank Level, Fluid Level

9. **کیفیت (5 متغیر)**
   - H2S Content, CO2 Content, Salt Content
   - Viscosity, Density

10. **محیطی (4 متغیر)**
    - Ambient Temperature/Pressure, Humidity, Wind Speed

11. **الکتریکی (8 متغیر)**
    - Phase A/B/C Voltage and Current
    - Power Factor, Frequency

12. **عملکرد (5 متغیر)**
    - Production Rate, Cumulative Production
    - Uptime, Efficiency, Run Time

13. **وضعیت (4 متغیر)**
    - Well Status, Pump Status
    - Alarm Status, Production Mode

برای لیست کامل، نگاه کنید به: [VARIABLES_LIST.md](VARIABLES_LIST.md)

---

## 🚀 نحوه استفاده

### 1️⃣ تولید داده نمونه (سریع - برای تست)

**مشخصات:**
- مدت: 1 هفته
- تایم لپس: 1 دقیقه
- حجم: ~50 MB برای 4 چاه
- زمان تولید: ~2-5 دقیقه

```bash
cd OGIM---Oil-Gas-Intelligent-Monitoring
python scripts/generate_sample_data.py
```

**خروجی:**
```
data/
├── PROD-001_sample_1week.json
├── PROD-001_sample_1week.csv
├── PROD-002_sample_1week.json
├── PROD-002_sample_1week.csv
├── DEV-001_sample_1week.json
├── DEV-001_sample_1week.csv
├── OBS-001_sample_1week.json
└── OBS-001_sample_1week.csv
```

### 2️⃣ تولید داده کامل 6 ماهه (طبق درخواست SRS)

**مشخصات:**
- مدت: 6 ماه (180 روز)
- تایم لپس: 1 ثانیه
- حجم: ~10-15 GB برای 4 چاه (compressed)
- تعداد رکورد: 62,208,000 رکورد (4 چاه × 15,552,000)
- زمان تولید: ~4-8 ساعت

```bash
cd OGIM---Oil-Gas-Intelligent-Monitoring
python scripts/advanced_data_generator.py
```

**خروجی (compressed with gzip):**
```
data/
├── PROD-001_6months_data.jsonl.gz
├── PROD-002_6months_data.jsonl.gz
├── DEV-001_6months_data.jsonl.gz
└── OBS-001_6months_data.jsonl.gz
```

---

## 📖 نحوه خواندن داده‌ها

### Python

```python
import json
import gzip

# Read compressed 6-month data
with gzip.open('data/PROD-001_6months_data.jsonl.gz', 'rt') as f:
    for line in f:
        record = json.loads(line)
        print(record['timestamp'], record['oil_flow_rate'])
        break

# Read sample data (uncompressed)
with open('data/PROD-001_sample_1week.json', 'r') as f:
    data = json.load(f)
    print(f"Total records: {len(data)}")
    print(f"First record: {data[0]}")
```

### Pandas

```python
import pandas as pd
import gzip
import json

# Read into DataFrame
records = []
with gzip.open('data/PROD-001_6months_data.jsonl.gz', 'rt') as f:
    for line in f:
        records.append(json.loads(line))

df = pd.DataFrame(records)
print(df.head())
print(df.describe())

# Or read CSV directly
df_csv = pd.read_csv('data/PROD-001_sample_1week.csv')
```

### Command Line (decompress)

```bash
# Decompress a file
gzip -d data/PROD-001_6months_data.jsonl.gz

# View first 10 lines
gzip -dc data/PROD-001_6months_data.jsonl.gz | head -10

# Count records
gzip -dc data/PROD-001_6months_data.jsonl.gz | wc -l
```

---

## 🎯 ویژگی‌های شبیه‌سازی

### رفتارهای واقع‌گرایانه

1. **کاهش تولید (Production Decline)**
   - Exponential decline rate
   - متفاوت برای هر نوع چاه

2. **چرخه‌های زمانی (Temporal Cycles)**
   - Daily cycle (تغییرات ساعتی)
   - Weekly cycle (تفاوت آخر هفته)

3. **افزایش Water Cut**
   - Gradual increase over time
   - واقع‌گرایانه برای چاه‌های نفتی

4. **تعمیرات دوره‌ای (Maintenance)**
   - Scheduled maintenance هر 30 روز
   - Random shutdowns (نادر)

5. **فرسودگی تجهیزات (Equipment Wear)**
   - افزایش لرزش با گذشت زمان
   - کاهش راندمان پمپ

6. **شناسایی ناهنجاری (Anomaly Detection)**
   - فشار خارج از محدوده
   - لرزش بیش از حد
   - کاهش ناگهانی تولید

7. **متغیرهای محیطی**
   - Daily temperature cycle
   - Random weather variations

---

## 🔢 آمار داده‌ها

### داده نمونه (1 هفته)

```
Duration:       7 days
Time Step:      60 seconds (1 minute)
Records/Well:   10,080
Total Records:  40,320 (4 wells)
File Size:      ~50 MB (JSON + CSV)
Generation:     ~3 minutes
```

### داده کامل (6 ماه)

```
Duration:       180 days
Time Step:      1 second
Records/Well:   15,552,000
Total Records:  62,208,000 (4 wells)
File Size:      ~12 GB (compressed)
Generation:     ~6 hours
```

---

## 📁 ساختار فایل خروجی

### JSON Format (.json / .jsonl)

```json
{
  "timestamp": "2024-05-01T00:00:00",
  "well_name": "PROD-001",
  "well_type": "production",
  "wellhead_pressure": 3245.67,
  "tubing_pressure": 3083.39,
  "oil_flow_rate": 1234.56,
  "gas_flow_rate": 1.8567,
  "water_cut": 12.34,
  ...
}
```

### CSV Format (.csv)

```
timestamp,well_name,well_type,wellhead_pressure,tubing_pressure,...
2024-05-01T00:00:00,PROD-001,production,3245.67,3083.39,...
2024-05-01T00:00:01,PROD-001,production,3246.12,3084.01,...
```

---

## 🛠️ تنظیمات پیشرفته

### تغییر پارامترها

در فایل `advanced_data_generator.py`:

```python
# Duration
DURATION_DAYS = 180  # تغییر به دلخواه

# Time step
TIME_STEP_SECONDS = 1  # 1 second, 60 seconds, etc.

# Well types (اضافه کردن چاه‌های بیشتر)
WELL_TYPES = {
    "PROD-001": "production",
    "PROD-002": "production",
    "PROD-003": "production",  # چاه جدید
    "DEV-001": "development",
    "OBS-001": "observation"
}

# Base production rates
class WellSimulator:
    def __init__(self, well_name: str, well_type: str):
        if well_type == "production":
            self.base_oil_rate = random.uniform(800, 1500)  # تغییر محدوده
```

---

## 💡 نکات مهم

1. **حجم داده**: داده‌های 6 ماهه بسیار حجیم هستند (~12 GB)
2. **زمان تولید**: تولید داده‌های کامل چند ساعت زمان می‌برد
3. **حافظه**: برای خواندن داده‌های کامل از streaming استفاده کنید
4. **فشرده‌سازی**: فایل‌های بزرگ با gzip فشرده شده‌اند
5. **Format**: JSONL (JSON Lines) برای streaming بهتر است

---

## 🔍 مثال‌های تحلیل

### تحلیل تولید روزانه

```python
import pandas as pd
import matplotlib.pyplot as plt

# Load data
df = pd.read_csv('data/PROD-001_sample_1week.csv')
df['timestamp'] = pd.to_datetime(df['timestamp'])
df.set_index('timestamp', inplace=True)

# Daily production
daily_prod = df['oil_flow_rate'].resample('D').mean()
daily_prod.plot(title='Daily Oil Production')
plt.show()
```

### شناسایی ناهنجاری

```python
# Find anomalies
anomalies = df[df['anomaly_flag'] == True]
print(f"Total anomalies: {len(anomalies)}")
print(anomalies[['timestamp', 'well_name', 'alarm_status', 'wellhead_pressure']])
```

---

## 📞 پشتیبانی

برای سوالات یا مشکلات:
- مستندات: [README_DEPLOYMENT.md](README_DEPLOYMENT.md)
- متغیرها: [VARIABLES_LIST.md](VARIABLES_LIST.md)
- Issues: GitHub Issues

---

**نسخه:** 1.0  
**تاریخ:** نوامبر 2025  
**سازگار با:** OGIM SRS v1.0

