# 📊 خلاصه سیستم تولید داده OGIM

## ✅ کارهای انجام شده

### 1️⃣ لیست کامل متغیرها (VARIABLES_LIST.md)
✅ **65+ متغیر** طبق SRS مستند شده‌اند:

| دسته | تعداد | شامل |
|------|-------|------|
| فشار | 6 | Wellhead, Tubing, Casing, Separator, Line, Bottom Hole |
| دما | 5 | Wellhead, Separator, Line, Motor, Bearing |
| جریان | 5 | Oil, Gas, Water, Total Liquid, Injection |
| ترکیب | 5 | Oil Cut, Water Cut, GOR, BS&W, API Gravity |
| پمپ | 6 | Speed, Frequency, Current, Voltage, Power, Efficiency |
| لرزش | 4 | X/Y/Z axes, Overall |
| شیر و ولو | 4 | Choke, Wing, Master, Safety Valve |
| سطح | 4 | Separator Oil/Water, Tank, Fluid |
| کیفیت | 5 | H2S, CO2, Salt, Viscosity, Density |
| محیطی | 4 | Temperature, Pressure, Humidity, Wind |
| الکتریکی | 8 | 3-Phase Voltage/Current, Power Factor, Frequency |
| عملکرد | 5 | Production Rate, Cumulative, Uptime, Efficiency, Run Time |
| وضعیت | 4 | Well, Pump, Alarm, Production Mode |

---

## 2️⃣ سیستم تولید داده پیشرفته

### 🏭 چاه‌های شبیه‌سازی شده

| نام چاه | نوع | مشخصات |
|---------|-----|--------|
| **PROD-001** | Production | نرخ: 800-1500 bbl/day، فشار: 2000-3500 psi |
| **PROD-002** | Production | نرخ: 800-1500 bbl/day، فشار: 2000-3500 psi |
| **DEV-001** | Development | نرخ: 500-1000 bbl/day، فشار: 1500-3000 psi |
| **OBS-001** | Observation | بدون تولید، فشار: 1000-2500 psi |

### 📁 فایل‌های تولید شده

#### ✅ داده نمونه (1 هفته) - موجود
```
data/
├── PROD-001_sample_1week.json    (20.36 MB)
├── PROD-001_sample_1week.csv     (4.33 MB)
├── PROD-002_sample_1week.json    (20.36 MB)
├── PROD-002_sample_1week.csv     (4.34 MB)
├── DEV-001_sample_1week.json     (20.31 MB)
├── DEV-001_sample_1week.csv      (4.29 MB)
├── OBS-001_sample_1week.json     (20.07 MB)
└── OBS-001_sample_1week.csv      (4.04 MB)

مجموع: ~98 MB
رکورد: 40,320 (10,080 × 4 چاه)
```

#### 📊 مشخصات داده نمونه
- **مدت:** 1 هفته (7 روز)
- **تایم لپس:** 1 دقیقه (60 ثانیه)
- **رکورد هر چاه:** 10,080
- **رکورد کل:** 40,320
- **حجم:** ~98 MB
- **زمان تولید:** ~3 دقیقه

---

## 3️⃣ سیستم تولید داده کامل (6 ماه)

### 📋 مشخصات طبق SRS

```python
Duration:           180 days (6 months)
Time Resolution:    1 second
Records per Well:   15,552,000
Total Records:      62,208,000 (4 wells)
Estimated Size:     ~12-15 GB (compressed)
Generation Time:    ~4-8 hours
Output Format:      JSONL.GZ (compressed)
```

### 🚀 دستور تولید
```bash
cd OGIM---Oil-Gas-Intelligent-Monitoring
python scripts/advanced_data_generator.py
```

### 📦 خروجی
```
data/
├── PROD-001_6months_data.jsonl.gz
├── PROD-002_6months_data.jsonl.gz
├── DEV-001_6months_data.jsonl.gz
└── OBS-001_6months_data.jsonl.gz
```

---

## 4️⃣ ویژگی‌های شبیه‌سازی

### 🎯 رفتارهای واقع‌گرایانه

✅ **کاهش تولید (Production Decline)**
- Exponential decline rate
- متفاوت برای هر نوع چاه

✅ **چرخه‌های زمانی**
- Daily cycle: تغییرات ساعتی (±10%)
- Weekly cycle: تفاوت آخر هفته (-5%)

✅ **افزایش Water Cut**
- از 10% به 95% به صورت تدریجی
- طی 6 ماه

✅ **تعمیرات دوره‌ای**
- Scheduled maintenance هر 30 روز
- Random shutdowns (احتمال پایین)

✅ **فرسودگی تجهیزات**
- افزایش لرزش: +0.1% روزانه
- کاهش بازده پمپ

✅ **شناسایی ناهنجاری**
- فشار خارج از محدوده (±20%)
- لرزش بیش از حد (>10 mm/s)
- کاهش ناگهانی تولید (>70%)

✅ **نویز واقع‌بینانه**
- Gaussian noise (σ=2%)
- متناسب با هر متغیر

---

## 5️⃣ فایل‌های مستندات

| فایل | توضیحات |
|------|---------|
| `VARIABLES_LIST.md` | لیست کامل 65+ متغیر با محدوده و واحد |
| `DATA_GENERATION_GUIDE.md` | راهنمای کامل تولید و استفاده |
| `data/README.md` | توضیحات پوشه data و فایل‌های موجود |
| `scripts/advanced_data_generator.py` | تولید 6 ماه داده (1 ثانیه) |
| `scripts/generate_sample_data.py` | تولید 1 هفته داده (1 دقیقه) |

---

## 6️⃣ نحوه استفاده

### خواندن داده نمونه
```python
import json
import pandas as pd

# JSON
with open('data/PROD-001_sample_1week.json', 'r') as f:
    data = json.load(f)
    print(f"Records: {len(data)}")

# CSV
df = pd.read_csv('data/PROD-001_sample_1week.csv')
print(df.head())
print(df.describe())

# Time series
df['timestamp'] = pd.to_datetime(df['timestamp'])
df.set_index('timestamp', inplace=True)
daily = df['oil_flow_rate'].resample('D').mean()
```

### خواندن داده کامل (compressed)
```python
import gzip
import json

# Streaming read
with gzip.open('data/PROD-001_6months_data.jsonl.gz', 'rt') as f:
    for line in f:
        record = json.loads(line)
        # Process record
        print(record['timestamp'], record['oil_flow_rate'])
        break
```

---

## 7️⃣ آمار و ارقام

### داده نمونه (موجود)
- ✅ تولید شده: 4 چاه × 1 هفته
- ✅ حجم: 98 MB
- ✅ رکورد: 40,320
- ✅ فرمت: JSON + CSV
- ✅ زمان: 3 دقیقه

### داده کامل (برای تولید)
- 📊 مدت: 6 ماه
- 📊 تایم لپس: 1 ثانیه
- 📊 رکورد: 62,208,000
- 📊 حجم: ~12-15 GB
- 📊 فرمت: JSONL.GZ
- 📊 زمان: 4-8 ساعت

---

## 8️⃣ وضعیت Repository

### ✅ Committed & Pushed

```bash
Commit: feat: Add comprehensive data generation system with 65+ variables
Hash:   e145bc2
Branch: main
Remote: origin/main (GitHub)
```

### 📂 فایل‌های اضافه شده به Git:
- ✅ VARIABLES_LIST.md
- ✅ DATA_GENERATION_GUIDE.md
- ✅ scripts/advanced_data_generator.py
- ✅ scripts/generate_sample_data.py
- ✅ data/README.md
- ✅ .gitignore (updated)

### 🚫 فایل‌های Ignored (حجم بالا):
- ❌ data/*.json
- ❌ data/*.csv
- ❌ data/*.jsonl
- ❌ data/*.gz

---

## 9️⃣ دستورات مهم

### تولید داده نمونه (سریع)
```bash
cd OGIM---Oil-Gas-Intelligent-Monitoring
python scripts/generate_sample_data.py
```

### تولید داده کامل (6 ماه)
```bash
cd OGIM---Oil-Gas-Intelligent-Monitoring
python scripts/advanced_data_generator.py
```

### بررسی فایل‌ها
```bash
ls -lh data/
# یا
Get-ChildItem data -Force
```

---

## 🔟 نکات مهم

1. ✅ **داده نمونه موجود است** - برای تست فوری
2. 📊 **داده کامل نیاز به تولید دارد** - 4-8 ساعت
3. 💾 **حجم داده کامل زیاد است** - ~12-15 GB
4. 🗜️ **فایل‌های کامل compressed هستند** - با gzip
5. 🚫 **فایل‌های بزرگ از Git ignore شده‌اند**
6. 📖 **مستندات کامل موجود است**

---

## 📞 پشتیبانی

- 📖 **راهنما:** DATA_GENERATION_GUIDE.md
- 📊 **متغیرها:** VARIABLES_LIST.md
- 📁 **داده:** data/README.md

---

**نسخه:** 1.0  
**تاریخ:** 3 نوامبر 2025  
**وضعیت:** ✅ کامل و در GitHub موجود  
**آخرین Push:** e145bc2 (main → origin/main)

