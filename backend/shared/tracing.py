"""
OpenTelemetry tracing helpers.
"""
import os
from typing import List

from fastapi import FastAPI

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter

from .config import settings
from .logging_config import setup_logging

logger = setup_logging("tracing")


def _build_exporter() -> List[BatchSpanProcessor]:
    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")
    use_console = os.getenv("OTEL_TRACING_CONSOLE", "false").lower() == "true"

    span_processors: List[BatchSpanProcessor] = []
    if endpoint:
        exporter = OTLPSpanExporter(endpoint=endpoint, insecure=True)
        span_processors.append(BatchSpanProcessor(exporter))
    if use_console or not span_processors:
        span_processors.append(BatchSpanProcessor(ConsoleSpanExporter()))

    return span_processors


def setup_tracing(
    app: FastAPI,
    service_name: str,
    *,
    instrument_httpx: bool = False,
    instrument_requests: bool = False,
) -> None:
    """
    Configure OpenTelemetry tracer for a FastAPI application.
    """
    resource = Resource.create(
        {
            "service.name": service_name,
            "service.version": settings.APP_VERSION,
            "deployment.environment": settings.ENVIRONMENT,
        }
    )

    provider = TracerProvider(resource=resource)
    for processor in _build_exporter():
        provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)

    FastAPIInstrumentor.instrument_app(app, tracer_provider=provider)

    if instrument_httpx:
        HTTPXClientInstrumentor().instrument()
    if instrument_requests:
        RequestsInstrumentor().instrument()

    logger.info(
        "Tracing configured for %s (endpoint=%s)",
        service_name,
        os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "console"),
    )

