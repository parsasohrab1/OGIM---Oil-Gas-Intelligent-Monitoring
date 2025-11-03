"""
Reporting Service
Generates periodic and on-demand analytical reports
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import uvicorn

app = FastAPI(title="OGIM Reporting Service", version="1.0.0")


class ReportRequest(BaseModel):
    report_type: str  # daily, weekly, monthly, custom
    well_name: Optional[str] = None
    start_date: datetime
    end_date: datetime
    metrics: List[str] = []


class Report(BaseModel):
    report_id: str
    report_type: str
    generated_at: datetime
    period_start: datetime
    period_end: datetime
    well_name: Optional[str]
    metrics: dict


reports_db = []


@app.post("/reports/generate")
async def generate_report(request: ReportRequest):
    """Generate a new report"""
    report_id = f"RPT-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    
    # Mock report generation
    report = {
        "report_id": report_id,
        "report_type": request.report_type,
        "generated_at": datetime.now().isoformat(),
        "period_start": request.start_date.isoformat(),
        "period_end": request.end_date.isoformat(),
        "well_name": request.well_name,
        "metrics": {
            "total_production": 12500.5,
            "average_pressure": 350.2,
            "average_temperature": 85.3,
            "alerts_count": 12,
            "downtime_hours": 2.5,
        }
    }
    
    reports_db.append(report)
    return report


@app.get("/reports")
async def list_reports(well_name: Optional[str] = None, limit: int = 50):
    """List reports"""
    filtered = reports_db
    if well_name:
        filtered = [r for r in filtered if r.get("well_name") == well_name]
    return {"reports": filtered[-limit:], "count": len(filtered)}


@app.get("/reports/{report_id}")
async def get_report(report_id: str):
    """Get report by ID"""
    report = next((r for r in reports_db if r["report_id"] == report_id), None)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@app.get("/health")
async def health():
    """Health check"""
    return {"status": "healthy", "total_reports": len(reports_db)}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8005)

