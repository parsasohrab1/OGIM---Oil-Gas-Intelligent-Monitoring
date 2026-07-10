"""Unit tests for SIEM buffer and threat detection."""
import pytest

from shared.threat_detection import SIEMEventLogger, ThreatDetector, siem_logger


@pytest.mark.unit
def test_siem_logger_buffers_events():
    logger = SIEMEventLogger()
    logger.emit("test_event", "high", {"ip": "127.0.0.1"})
    events = logger.recent_events(limit=5)
    assert len(events) == 1
    assert events[0]["event_type"] == "test_event"
    summary = logger.summary()
    assert summary["total_buffered"] == 1
    assert summary["by_severity"]["high"] == 1


@pytest.mark.unit
def test_siem_logger_filters_by_severity():
    logger = SIEMEventLogger()
    logger.emit("a", "low", {})
    logger.emit("b", "critical", {})
    critical = logger.recent_events(limit=10, severity="critical")
    assert len(critical) == 1
    assert critical[0]["severity"] == "critical"


@pytest.mark.unit
def test_threat_detector_high_rate_ip():
    detector = ThreatDetector()
    detector.max_ip_hits = 3
    risk = 0
    for _ in range(4):
        risk, reasons = detector.evaluate(
            ip="1.2.3.4", user=None, path="/api/x", method="GET", status_code=200
        )
    assert risk >= 45
    assert "high_request_rate_ip" in reasons


@pytest.mark.unit
def test_threat_detector_attack_pattern():
    detector = ThreatDetector()
    risk, reasons = detector.evaluate(
        ip="1.2.3.4",
        user=None,
        path="/api?q=1' OR 1=1--",
        method="GET",
        status_code=200,
        user_agent="sqlmap",
    )
    assert risk >= 60
    assert "known_attack_pattern" in reasons


@pytest.mark.unit
def test_global_siem_logger_has_summary():
    siem_logger.emit("unit_test", "medium", {"test": True})
    summary = siem_logger.summary()
    assert "total_buffered" in summary
