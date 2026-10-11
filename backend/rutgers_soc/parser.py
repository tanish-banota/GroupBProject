"""Validation and conversion of SOC source objects into stable records."""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass
from typing import Any

from .errors import SocResponseError


@dataclass(frozen=True)
class CourseRecord:
    id: str
    course_string: str | None
    subject_code: str | None
    course_number: str | None
    title: str | None
    expanded_title: str | None
    campus_code: str | None
    credits: Any
    description: str | None
    raw_source: dict[str, Any]


@dataclass(frozen=True)
class SectionRecord:
    id: str
    course_id: str
    registration_index: str
    section_number: str | None
    open_status: bool | None
    open_status_text: str | None
    listed_open: bool | None
    instructors: list[dict[str, Any]]
    raw_source: dict[str, Any]


@dataclass(frozen=True)
class MeetingTimeRecord:
    id: str
    section_id: str
    meeting_day: str | None
    start_time_military: str | None
    end_time_military: str | None
    campus_location: str | None
    building_code: str | None
    room_number: str | None
    meeting_mode_code: str | None
    meeting_mode_description: str | None
    raw_source: dict[str, Any]


def _text(value: Any) -> str | None:
    return value if isinstance(value, str) else None


def _stable_hash(value: dict[str, Any]) -> str:
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()[:16]


def validate_courses(payload: Any) -> list[dict[str, Any]]:
    if not isinstance(payload, list):
        raise SocResponseError("courses.json must be a JSON array of course objects")
    if not all(isinstance(course, dict) for course in payload):
        raise SocResponseError("courses.json contains a non-object course record")
    return payload


def parse_courses(
    payload: Any, *, year: str, term: str, campus: str, open_indexes: set[str] | None = None
) -> tuple[list[CourseRecord], list[SectionRecord], list[MeetingTimeRecord]]:
    """Parse validated source data without discarding unmapped source fields."""
    courses: list[CourseRecord] = []
    sections: list[SectionRecord] = []
    meetings: list[MeetingTimeRecord] = []
    scope = f"{year}:{term}:{campus}"

    for course in validate_courses(payload):
        course_string = _text(course.get("courseString"))
        course_key = course_string or _stable_hash(course)
        course_id = f"rutgers-soc:course:{scope}:{course_key}"
        courses.append(CourseRecord(
            id=course_id, course_string=course_string, subject_code=_text(course.get("subject")),
            course_number=_text(course.get("courseNumber")), title=_text(course.get("title")),
            expanded_title=_text(course.get("expandedTitle")), campus_code=_text(course.get("campusCode")),
            credits=course.get("credits"), description=_text(course.get("courseDescription")), raw_source=course,
        ))

        source_sections = course.get("sections", [])
        if source_sections is None:
            source_sections = []
        if not isinstance(source_sections, list):
            raise SocResponseError(f"Course {course_key} has a non-array 'sections' field")
        for section in source_sections:
            if not isinstance(section, dict):
                raise SocResponseError(f"Course {course_key} contains a non-object section")
            registration_index = _text(section.get("index"))
            if not registration_index:
                # There is no documented substitute identifier. Preserve it in raw_source but do not invent one.
                raise SocResponseError(f"Course {course_key} has a section without string 'index'")
            section_id = f"rutgers-soc:section:{scope}:{registration_index}"
            instructors = section.get("instructors", [])
            if not isinstance(instructors, list):
                instructors = []
            sections.append(SectionRecord(
                id=section_id, course_id=course_id, registration_index=registration_index,
                section_number=_text(section.get("number")), open_status=section.get("openStatus")
                if isinstance(section.get("openStatus"), bool) else None,
                open_status_text=_text(section.get("openStatusText")),
                listed_open=(registration_index in open_indexes) if open_indexes is not None else None,
                instructors=instructors, raw_source=section,
            ))
            source_meetings = section.get("meetingTimes", [])
            if source_meetings is None:
                source_meetings = []
            if not isinstance(source_meetings, list):
                raise SocResponseError(f"Section {registration_index} has a non-array 'meetingTimes' field")
            for meeting in source_meetings:
                if not isinstance(meeting, dict):
                    raise SocResponseError(f"Section {registration_index} contains a non-object meeting time")
                meetings.append(MeetingTimeRecord(
                    id=f"rutgers-soc:meeting:{scope}:{registration_index}:{_stable_hash(meeting)}",
                    section_id=section_id, meeting_day=_text(meeting.get("meetingDay")),
                    start_time_military=_text(meeting.get("startTimeMilitary")),
                    end_time_military=_text(meeting.get("endTimeMilitary")),
                    campus_location=_text(meeting.get("campusLocation")),
                    building_code=_text(meeting.get("buildingCode")), room_number=_text(meeting.get("roomNumber")),
                    meeting_mode_code=_text(meeting.get("meetingModeCode")),
                    meeting_mode_description=_text(meeting.get("meetingModeDesc")), raw_source=meeting,
                ))
    return courses, sections, meetings


def records_as_dicts(records: list[Any]) -> list[dict[str, Any]]:
    return [asdict(record) for record in records]
