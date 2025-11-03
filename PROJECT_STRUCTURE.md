# Project Structure

```
OGIM---Oil-Gas-Intelligent-Monitoring/
├── backend/
│   ├── api-gateway/           # API Gateway service
│   ├── auth-service/          # Authentication service
│   ├── data-ingestion-service/ # Data ingestion service
│   ├── ml-inference-service/  # ML inference service
│   ├── alert-service/         # Alert management service
│   ├── reporting-service/     # Reporting service
│   ├── command-control-service/ # Command & control service
│   ├── tag-catalog-service/   # Tag catalog service
│   ├── digital-twin-service/  # Digital twin service
│   └── flink-jobs/            # Apache Flink stream processing jobs
├── frontend/
│   └── web/                   # React web portal
├── data/                      # Generated sample data
├── infrastructure/
│   ├── docker/               # Docker Compose configurations
│   └── kubernetes/            # Kubernetes manifests
├── scripts/                   # Utility scripts
│   └── data_generator.py     # Sample data generator
├── docs/                     # Documentation
├── README.md                 # Main README
└── requirements.txt          # Python dependencies
```

## Key Files

- `scripts/data_generator.py` - Generates sample sensor data, alerts, and commands
- `infrastructure/docker/docker-compose.yml` - Local development setup
- `infrastructure/kubernetes/` - Production deployment manifests

