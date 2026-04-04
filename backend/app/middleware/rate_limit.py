from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque


class InMemoryRateLimiter:
    def __init__(self, max_requests: int, window_seconds: int) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def allow(self, key: str) -> bool:
        now = time.monotonic()
        async with self._lock:
            bucket = self._events[key]
            while bucket and now - bucket[0] > self.window_seconds:
                bucket.popleft()

            if len(bucket) >= self.max_requests:
                return False

            bucket.append(now)
            return True
