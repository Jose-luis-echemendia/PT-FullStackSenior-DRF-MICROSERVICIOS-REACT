import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def clear_cache():
    """Isolate tests from each other's cached responses (LocMemCache persists
    across the process, so a stale entry would otherwise leak between tests)."""
    cache.clear()
    yield
    cache.clear()
