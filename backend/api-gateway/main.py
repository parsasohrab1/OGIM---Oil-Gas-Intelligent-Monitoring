"""
API Gateway Service
Single entry point for all UI and API requests
"""
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
import httpx
import uvicorn
from typing import Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="OGIM API Gateway",
    description="API Gateway for Oil & Gas Intelligent Monitoring System",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# Service discovery (in production, use service mesh or discovery service)
SERVICES = {
    "auth": "http://auth-service:8001",
    "data-ingestion": "http://data-ingestion-service:8002",
    "ml-inference": "http://ml-inference-service:8003",
    "alert": "http://alert-service:8004",
    "reporting": "http://reporting-service:8005",
    "command-control": "http://command-control-service:8006",
    "tag-catalog": "http://tag-catalog-service:8007",
    "digital-twin": "http://digital-twin-service:8008",
}


async def authenticate_request(request: Request):
    """Validate authentication token"""
    # In production, validate JWT token with auth service
    token = request.headers.get("Authorization")
    if not token:
        raise HTTPException(status_code=401, detail="Missing authorization token")
    # TODO: Validate token with auth service
    return token


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "API Gateway",
        "status": "healthy",
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    """Health check"""
    return {"status": "healthy"}


@app.api_route("/api/{service_name}/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_request(
    service_name: str,
    path: str,
    request: Request,
    token: str = Depends(authenticate_request)
):
    """Proxy requests to backend services"""
    if service_name not in SERVICES:
        raise HTTPException(status_code=404, detail=f"Service {service_name} not found")
    
    service_url = SERVICES[service_name]
    target_url = f"{service_url}/{path}"
    
    # Forward query parameters
    params = dict(request.query_params)
    
    # Forward body for POST/PUT/PATCH
    body = None
    if request.method in ["POST", "PUT", "PATCH"]:
        body = await request.body()
    
    # Forward headers
    headers = dict(request.headers)
    headers.pop("host", None)
    headers.pop("content-length", None)
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=request.method,
                url=target_url,
                params=params,
                content=body,
                headers=headers,
                timeout=30.0
            )
            return response.json()
    except httpx.HTTPError as e:
        logger.error(f"Error proxying to {service_name}: {e}")
        raise HTTPException(status_code=502, detail=f"Service {service_name} unavailable")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

