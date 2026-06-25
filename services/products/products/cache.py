"""Versioned caching for the product catalog.

A single counter (``products:version``) namespaces every cache key. Invalidation
just bumps that counter, so all previously cached pages become unreachable in
O(1) — no key scanning — and orphaned entries lapse via their TTL. The version
key itself never expires, so a fresh namespace can never collide with stale
entries from an old one.
"""

from __future__ import annotations

from django.core.cache import cache

VERSION_KEY = "products:version"
CACHE_TTL = 300  # seconds; defensive backstop if an invalidation is ever missed


def cache_version() -> int:
    """Return the current catalog cache version, seeding it on first use."""
    cache.add(VERSION_KEY, 1, timeout=None)
    return cache.get(VERSION_KEY, 1)


def list_cache_key(request) -> str:
    """Key for a product list response, namespaced by the full querystring
    (page, page_size, filters, search, ordering)."""
    return f"products:list:v{cache_version()}:{request.GET.urlencode()}"


def detail_cache_key(pk) -> str:
    """Key for a single product detail response."""
    return f"products:detail:v{cache_version()}:{pk}"


def invalidate_products() -> None:
    """Bump the catalog version so every cached page is superseded at once."""
    cache.add(VERSION_KEY, 1, timeout=None)
    try:
        cache.incr(VERSION_KEY)
    except ValueError:
        # Key vanished between add and incr (e.g. eviction); reseed ahead.
        cache.set(VERSION_KEY, cache_version() + 1, timeout=None)
