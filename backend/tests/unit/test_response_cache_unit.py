"""Unit tests for shared.response_cache."""
import time

import pytest

from shared.response_cache import TTLResponseCache


@pytest.mark.unit
def test_cache_set_and_get():
    cache = TTLResponseCache(default_ttl_seconds=5, max_entries=10)
    cache.set("k1", {"a": 1})
    assert cache.get("k1") == {"a": 1}


@pytest.mark.unit
def test_cache_expires():
    cache = TTLResponseCache(default_ttl_seconds=1, max_entries=10)
    cache.set("k1", "v1", ttl_seconds=1)
    time.sleep(1.1)
    assert cache.get("k1") is None


@pytest.mark.unit
def test_cache_stats_hit_rate():
    cache = TTLResponseCache(default_ttl_seconds=10, max_entries=10)
    cache.set("k1", "v1")
    cache.get("k1")
    cache.get("missing")
    stats = cache.stats()
    assert stats["hits"] == 1
    assert stats["misses"] == 1
    assert stats["hit_rate"] == 0.5


@pytest.mark.unit
def test_cache_build_key_is_stable():
    k1 = TTLResponseCache.build_key("GET", "/api/x", "a=1", "user1")
    k2 = TTLResponseCache.build_key("GET", "/api/x", "a=1", "user1")
    assert k1 == k2
