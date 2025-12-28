"""
API Gateway Service
Single entry point for all UI and API requests
"""
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from fastapi.responses import JSONResponse, Response
import httpx
import uvicorn
from typing import Optional
import logging
import os
import sys

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add shared module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'shared'))

from config import settings
from security import decode_token
from metrics import setup_metrics
from tracing import setup_tracing

app = FastAPI(
    title="OGIM API Gateway",
    description="API Gateway for Oil & Gas Intelligent Monitoring System",
    version="1.0.0"
)

setup_metrics(app, "api-gateway")
setup_tracing(app, "api-gateway", instrument_httpx=True)
# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
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
    "edge-computing": "http://edge-computing-service:8009",
    "erp-integration": "http://erp-integration-service:8010",
}

SERVICE_ROLE_REQUIREMENTS = {
    "data-ingestion": {"system_admin", "data_engineer"},
    "ml-inference": {"system_admin", "data_engineer", "field_operator"},
    "alert": {"system_admin", "field_operator", "data_engineer"},
    "reporting": {"system_admin", "data_engineer"},
    "command-control": {"system_admin"},
    "tag-catalog": {"system_admin", "data_engineer"},
    "digital-twin": {"system_admin", "data_engineer"},
    "edge-computing": {"system_admin", "data_engineer", "field_operator"},
    "erp-integration": {"system_admin", "data_engineer"},
}


async def authenticate_request(request: Request):
    """Validate authentication token"""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing authorization token")

    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization scheme")

    token = auth_header.split(" ", 1)[1].strip()

    try:
        payload = decode_token(token)
    except ValueError as exc:
        logger.warning("Token validation failed: %s", exc)
        raise HTTPException(status_code=401, detail=str(exc))

    request.state.user = payload
    return payload


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
    
    required_roles = SERVICE_ROLE_REQUIREMENTS.get(service_name)
    if required_roles:
        payload = request.state.user
        role = payload.get("role")
        if not role:
            raise HTTPException(status_code=401, detail="Token missing role information")
        if role not in required_roles:
            logger.warning(
                "Forbidden: user=%s role=%s service=%s path=%s",
                payload.get("sub"),
                role,
                service_name,
                path,
            )
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
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
    except httpx.TimeoutException:
        logger.error("Timeout while proxying request to %s", service_name)
        raise HTTPException(status_code=504, detail=f"Service {service_name} timed out")
    except httpx.RequestError as e:
        logger.error("Error proxying to %s: %s", service_name, e)
        raise HTTPException(status_code=502, detail=f"Service {service_name} unavailable")

    content_type = response.headers.get("content-type", "")
    response_body: Optional[object]

    if "application/json" in content_type:
        try:
            response_body = response.json()
        except ValueError:
            response_body = response.text
    else:
        response_body = response.text

    if response.is_error:
        detail = response_body if isinstance(response_body, (dict, list)) else {"message": response_body}
        raise HTTPException(status_code=response.status_code, detail=detail)

    if isinstance(response_body, (dict, list)):
        return JSONResponse(status_code=response.status_code, content=response_body)

    return Response(
        content=response_body or "",
        status_code=response.status_code,
        media_type=content_type or "text/plain"
    )


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

