"""Minimal HTTP access to the Rutgers SOC collector's JSON exports."""

import json
import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET"],
)


def load_records(filename: str) -> list[dict[str, Any]]:
    output_dir = Path(os.environ.get("SOC_OUTPUT_DIR", Path(__file__).parent / "soc_output"))
    try:
        records = json.loads((output_dir / filename).read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail=f"Missing {filename}. Run the Rutgers SOC collector first, or check SOC_OUTPUT_DIR.",
        ) from None
    except (OSError, ValueError):
        raise HTTPException(status_code=503, detail=f"Cannot read {filename} as JSON.") from None
    if not isinstance(records, list) or not all(isinstance(record, dict) for record in records):
        raise HTTPException(status_code=503, detail=f"{filename} must contain an array of records.")
    return records


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/courses")
def courses(subject: str | None = None, search: str | None = None) -> list[dict[str, Any]]:
    records = load_records("courses.json")
    if subject is not None:
        records = [
            record for record in records
            if (record.get("subject_code") or "").casefold() == subject.casefold()
        ]
    if search is not None:
        records = [
            record for record in records
            if any(search.casefold() in (record.get(field) or "").casefold()
                   for field in ("course_string", "title", "expanded_title"))
        ]
    return records


@app.get("/courses/{course_id}")
def course(course_id: str) -> dict[str, Any]:
    for record in load_records("courses.json"):
        if record.get("id") == course_id:
            return record
    raise HTTPException(status_code=404, detail="Course not found.")


@app.get("/courses/{course_id}/sections")
def sections(course_id: str) -> list[dict[str, Any]]:
    course(course_id)
    section_records = load_records("sections.json")
    meeting_records = load_records("meeting_times.json")
    return [
        {**section, "meeting_times": [meeting for meeting in meeting_records
                                     if meeting.get("section_id") == section["id"]]}
        for section in section_records if section.get("course_id") == course_id
    ]
