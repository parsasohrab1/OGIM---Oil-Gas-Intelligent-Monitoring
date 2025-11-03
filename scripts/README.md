# Scripts

## Data Generator

The `data_generator.py` script generates sample data for testing and development.

### Usage

```bash
python scripts/data_generator.py
```

### Generated Data

The script creates the following files in the `data/` directory:

- **sensor_data.json/csv** - Time series sensor readings
- **kafka_sample_messages.json** - Sample Kafka messages
- **tag_catalog.json/csv** - Tag metadata catalog
- **sample_alerts.json/csv** - Sample alert records
- **sample_control_commands.json/csv** - Sample control commands

### Configuration

Edit the script to customize:
- Number of records
- Time range
- Anomaly rate
- Sensor types and ranges
- Well names and equipment

