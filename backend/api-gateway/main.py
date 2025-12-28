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
from advanced_rate_limiter import get_rate_limiter, RateLimitConfig
from mtls_manager import get_mtls_manager

app = FastAPI(
    title="OGIM API Gateway",
    description="API Gateway for Oil & Gas Intelligent Monitoring System",
    version="1.0.0"
)

setup_metrics(app, "api-gateway")
setup_tracing(app, "api-gateway", instrument_httpx=True)

# Initialize rate limiter
rate_limiter = get_rate_limiter(redis_url=settings.RATE_LIMIT_REDIS_URL)

# Initialize mTLS manager
mtls_manager = get_mtls_manager(
    cert_dir=settings.MTLS_CERT_DIR,
    ca_cert_path=settings.MTLS_CA_CERT_PATH,
    client_cert_path=settings.MTLS_CLIENT_CERT_PATH,
    client_key_path=settings.MTLS_CLIENT_KEY_PATH
)

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
# Use localhost for local development, service names for Docker
import os
SERVICE_HOST = os.getenv("SERVICE_HOST", "localhost")  # Default to localhost for local dev

SERVICES = {
    "auth": f"http://{SERVICE_HOST}:8001",
    "data-ingestion": f"http://{SERVICE_HOST}:8002",
    "ml-inference": f"http://{SERVICE_HOST}:8003",
    "alert": f"http://{SERVICE_HOST}:8004",
    "reporting": f"http://{SERVICE_HOST}:8005",
    "command-control": f"http://{SERVICE_HOST}:8006",
    "tag-catalog": f"http://{SERVICE_HOST}:8007",
    "digital-twin": f"http://{SERVICE_HOST}:8008",
    "edge-computing": f"http://{SERVICE_HOST}:8009",
    "erp-integration": f"http://{SERVICE_HOST}:8010",
    "dvr": f"http://{SERVICE_HOST}:8011",
    "remote-operations": f"http://{SERVICE_HOST}:8012",
    "data-variables": f"http://{SERVICE_HOST}:8013",
    "storage-optimization": f"http://{SERVICE_HOST}:8014",
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
    "dvr": {"system_admin", "data_engineer"},
    "remote-operations": {"system_admin", "field_operator"},
    "data-variables": {"system_admin", "data_engineer", "field_operator"},
    "storage-optimization": {"system_admin", "data_engineer"},
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


async def check_rate_limit(request: Request, service_name: str):
    """Check rate limit for request"""
    if not settings.RATE_LIMIT_ENABLED:
        return True
    
    # Get client identifier
    client_ip = request.client.host if request.client else "unknown"
    
    # Get user identifier if authenticated
    user_id = None
    user_role = None
    if hasattr(request.state, 'user'):
        user_id = request.state.user.get("sub")
        user_role = request.state.user.get("role")
    
    # Use user ID if available, otherwise IP
    identifier = user_id or client_ip
    
    # Get rate limit configuration
    limit_config = RateLimitConfig.get_limit(service_name, user_role)
    
    # Check rate limit
    allowed, info = await rate_limiter.check_rate_limit(
        identifier=identifier,
        endpoint=service_name,
        max_requests=limit_config["max_requests"],
        window_seconds=limit_config["window_seconds"],
        strategy=settings.RATE_LIMIT_STRATEGY
    )
    
    if not allowed:
        logger.warning(
            f"Rate limit exceeded: identifier={identifier}, "
            f"service={service_name}, limit={limit_config}"
        )
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later.",
            headers={
                "X-RateLimit-Limit": str(limit_config["max_requests"]),
                "X-RateLimit-Remaining": str(info.get("remaining", 0)),
                "X-RateLimit-Reset": str(info.get("reset", 0)),
                "Retry-After": str(limit_config["window_seconds"])
            }
        )
    
    # Add rate limit headers to response
    request.state.rate_limit_info = info
    return True


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
    token: str = Depends(authenticate_request),
    _: bool = Depends(lambda r, s=service_name: check_rate_limit(r, s))
):
    """Proxy requests to backend services"""
    if service_name not in SERVICES:
        raise HTTPException(status_code=404, detail=f"Service {service_name} not found")
    
    # Determine protocol (https if mTLS enabled, otherwise http)
    protocol = "https" if (settings.MTLS_ENABLED and mtls_manager.mtls_enabled) else "http"
    base_url = SERVICES[service_name].replace("http://", "").replace("https://", "")
    service_url = f"{protocol}://{base_url}"
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
    
    # Get mTLS configuration if enabled
    client_kwargs = {}
    if settings.MTLS_ENABLED and mtls_manager.mtls_enabled:
        client_kwargs = mtls_manager.get_httpx_client_kwargs(
            verify=settings.MTLS_VERIFY_SERVER
        )
    
    try:
        async with httpx.AsyncClient(**client_kwargs) as client:
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

    # Add rate limit headers to response
    response_headers = {}
    if hasattr(request.state, 'rate_limit_info'):
        info = request.state.rate_limit_info
        response_headers.update({
            "X-RateLimit-Limit": str(info.get("limit", 0)),
            "X-RateLimit-Remaining": str(info.get("remaining", 0)),
            "X-RateLimit-Reset": str(info.get("reset", 0))
        })
    
    if isinstance(response_body, (dict, list)):
        return JSONResponse(
            status_code=response.status_code,
            content=response_body,
            headers=response_headers
        )

    return Response(
        content=response_body or "",
        status_code=response.status_code,
        media_type=content_type or "text/plain",
        headers=response_headers
    )


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

