"""Public entry point and JSON export for Rutgers SOC collection."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable
from urllib.parse import urlencode

from .errors import SocRequestError, SocResponseError
from .http import fetch_json
from .parser import parse_courses, records_as_dicts

BASE_URL = "https://classes.rutgers.edu/soc/api"


def build_url(endpoint: str, year: str | int, term: str | int, campus: str) -> str:
    if endpoint not in {"courses.json", "openSections.json"}:
        raise ValueError(f"Unsupported SOC endpoint: {endpoint}")
    parameters = {"year": str(year), "term": str(term), "campus": str(campus).upper()}
    if not all(parameters.values()):
        raise ValueError("year, term, and campus must all be non-empty")
    return f"{BASE_URL}/{endpoint}?{urlencode(parameters)}"


def _open_indexes(payload: Any) -> set[str]:
    if not isinstance(payload, list) or not all(isinstance(value, str) for value in payload):
        raise SocResponseError("openSections.json was not an array of registration-index strings")
    return set(payload)


def collect_schedule(
    year: str | int,
    term: str | int,
    campus: str,
    *,
    include_open_sections: bool = True,
    timeout: float = 30.0,
    fetcher: Callable[..., Any] = fetch_json,
) -> dict[str, Any]:
    """Fetch one SOC course response and, if possible, its open-section annotation."""
    normalized = {"year": str(year), "term": str(term), "campus": str(campus).upper()}
    courses_url = build_url("courses.json", **normalized)
    courses_payload = fetcher(courses_url, timeout=timeout)
    availability: dict[str, Any] = {"requested": include_open_sections, "available": False, "limitation": None}
    open_indexes: set[str] | None = None
    if include_open_sections:
        try:
            open_indexes = _open_indexes(fetcher(build_url("openSections.json", **normalized), timeout=timeout))
            availability.update({"available": True, "open_registration_indexes": len(open_indexes)})
        except (SocRequestError, SocResponseError) as exc:
            availability["limitation"] = str(exc)

    courses, sections, meetings = parse_courses(courses_payload, **normalized, open_indexes=open_indexes)
    warnings: list[str] = []
    if not courses:
        warnings.append(
            "courses.json returned no courses for the requested parameters; verify the year, term, and campus."
        )
    return {
        "metadata": {"requested_parameters": normalized, "collected_at": datetime.now(timezone.utc).isoformat(),
                     "source": {"courses_url": courses_url, "availability": availability}, "warnings": warnings},
        "courses": records_as_dicts(courses), "sections": records_as_dicts(sections),
        "meeting_times": records_as_dicts(meetings),
    }


def write_collection(collection: dict[str, Any], output_dir: str | Path) -> Path:
    """Write separated upsert-friendly record files and collection metadata."""
    destination = Path(output_dir)
    destination.mkdir(parents=True, exist_ok=True)
    for name, value in (("metadata.json", collection["metadata"]), ("courses.json", collection["courses"]),
                        ("sections.json", collection["sections"]), ("meeting_times.json", collection["meeting_times"])):
        (destination / name).write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return destination
