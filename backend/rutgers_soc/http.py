"""HTTP transport for Rutgers SOC."""

from __future__ import annotations

import gzip
import json
import time
from typing import Any, Callable
from urllib.error import HTTPError, URLError
from urllib.request import Request, build_opener

from .errors import SocRequestError, SocResponseError

USER_AGENT = "RutgersSOCCollector/1.0 (public schedule data collector)"


def fetch_json(
    url: str,
    *,
    timeout: float = 30.0,
    retries: int = 2,
    opener: Callable[..., Any] | None = None,
    sleep: Callable[[float], None] = time.sleep,
) -> Any:
    """Fetch and decode JSON, retrying only transient request failures."""
    if timeout <= 0:
        raise ValueError("timeout must be greater than zero")
    if retries < 0:
        raise ValueError("retries cannot be negative")

    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept-Encoding": "gzip"})
    open_request = opener or build_opener().open
    last_error: Exception | None = None

    for attempt in range(retries + 1):
        try:
            with open_request(request, timeout=timeout) as response:
                payload = response.read()
                # SOC currently serves compressed payloads. The magic-byte check also
                # handles intermediaries that omit the Content-Encoding header.
                if response.headers.get("Content-Encoding", "").lower() == "gzip" or payload.startswith(b"\x1f\x8b"):
                    payload = gzip.decompress(payload)
                try:
                    return json.loads(payload.decode("utf-8"))
                except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                    raise SocResponseError(f"Malformed JSON from {url}: {exc}") from exc
        except HTTPError as exc:
            last_error = exc
            retryable = exc.code == 429 or 500 <= exc.code <= 599
            detail = f"HTTP {exc.code}"
        except (URLError, TimeoutError, OSError) as exc:
            last_error = exc
            retryable = True
            detail = str(exc.reason) if isinstance(exc, URLError) else str(exc)

        if not retryable or attempt == retries:
            raise SocRequestError(
                f"Unable to fetch {url} after {attempt + 1} attempt(s): {detail}"
            ) from last_error
        sleep(0.5 * (2**attempt))

    raise AssertionError("unreachable")
