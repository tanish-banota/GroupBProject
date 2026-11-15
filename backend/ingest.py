"""Ingest Rutgers SOC course, offering, professor, and prerequisite data into Supabase."""

from __future__ import annotations

import html
import os
import re
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from supabase import Client, create_client

from prerequisites import PrerequisiteRule, check_eligibility
from rutgers_soc.collector import collect_schedule

# Target CS (198) + core Math prerequisites (640) first; set to None to ingest all subjects.
TARGET_SUBJECTS: set[str] | None = {"198", "640"}

# Match the enum value in public.course_rules.rule_type.
PREREQ_RULE_TYPE = "PREREQ"

TERM_NAMES = {"0": "Winter", "1": "Spring", "7": "Summer", "9": "Fall"}
COURSE_CODE_RE = re.compile(r"\b(\d{2}:\d{3}:\d{3})\b")


def get_supabase() -> Client:
    load_dotenv(Path(__file__).parent / ".env")
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def clean_html(raw: str | None) -> str:
    if not raw:
        return ""
    text = re.sub(r"<[^>]+>", " ", html.unescape(raw))
    return re.sub(r"\s+", " ", text).strip()


def parse_prereq_notes(raw_notes: str | None) -> tuple[PrerequisiteRule | None, str | None]:
    """Convert Rutgers SOC preReqNotes HTML into prerequisites.py JSON tree format."""
    cleaned = clean_html(raw_notes)
    if not cleaned:
        return {}, None  # Empty dict = verified no prerequisites in prerequisites.py

    # Split top-level AND clauses (semicolons or ' AND '), then OR alternatives (' OR ' or '/')
    and_chunks = [c.strip() for c in re.split(r";|\bAND\b", cleaned, flags=re.IGNORECASE) if c.strip()]
    and_nodes: list[PrerequisiteRule] = []

    for chunk in and_chunks:
        codes = list(dict.fromkeys(COURSE_CODE_RE.findall(chunk)))
        if not codes:
            continue
        if len(codes) == 1:
            and_nodes.append({"type": "course", "course": codes[0]})
        elif re.search(r"\bOR\b|/", chunk, flags=re.IGNORECASE):
            and_nodes.append({
                "type": "or",
                "requirements": [{"type": "course", "course": code} for code in codes],
            })
        else:
            for code in codes:
                and_nodes.append({"type": "course", "course": code})

    if not and_nodes:
        # Text existed (e.g., "Permission of instructor") without standard 01:198:111 codes
        return None, cleaned

    rule: PrerequisiteRule = (
        and_nodes[0] if len(and_nodes) == 1 else {"type": "and", "requirements": and_nodes}
    )
    # Validate generated tree using validator in prerequisites.py
    check_eligibility(rule, [])
    return rule, cleaned


def infer_level(course_number: str | None) -> str:
    if course_number and course_number.isdigit():
        return f"{int(course_number) // 100 * 100}-level"
    return "undergraduate"


def parse_credits(raw_credits: Any) -> int:
    try:
        return int(float(raw_credits)) if raw_credits is not None else 0
    except (TypeError, ValueError):
        return 0


def sync_term_to_supabase(
    year: str = "2026",
    term: str = "9",
    campus: str = "NB",
    subjects: set[str] | None = TARGET_SUBJECTS,
) -> None:
    sb = get_supabase()
    semester_label = f"{TERM_NAMES.get(str(term), term)} {year}"
    print(f"Collecting Rutgers SOC data for {semester_label} ({campus})...")

    collection = collect_schedule(year=year, term=term, campus=campus)
    all_courses = collection["courses"]
    if subjects:
        all_courses = [c for c in all_courses if c.get("subject_code") in subjects]

    target_soc_course_ids = {c["id"] for c in all_courses}
    sections = [s for s in collection["sections"] if s["course_id"] in target_soc_course_ids]
    meetings_by_section: dict[str, list[dict[str, Any]]] = {}
    for m in collection["meeting_times"]:
        meetings_by_section.setdefault(m["section_id"], []).append({
            "day": m["meeting_day"],
            "start_time": m["start_time_military"],
            "end_time": m["end_time_military"],
            "campus": m["campus_location"],
            "building": m["building_code"],
            "room": m["room_number"],
            "mode": m["meeting_mode_description"],
        })

    # 1. Load existing courses so we preserve UUIDs and merge term_offerings
    existing_courses = {
        row["course_code"]: row
        for row in sb.table("courses").select("id, course_code, term_offerings").limit(10000).execute().data
    }

    course_rows: list[dict[str, Any]] = []
    parsed_rules_by_code: dict[str, tuple[PrerequisiteRule | None, str | None, str]] = {}

    for c in all_courses:
        raw = c["raw_source"]
        course_code = c["course_string"] or f"01:{c['subject_code']}:{c['course_number']}"
        prev_terms = (existing_courses.get(course_code) or {}).get("term_offerings") or []
        merged_terms = sorted(set(prev_terms) | {semester_label})

        dept_info = raw.get("subjectDescription") or f"Subject {c['subject_code']}"
        course_rows.append({
            "course_code": course_code,
            "subject_code": c["subject_code"] or "",
            "title": c["expanded_title"] or c["title"] or course_code,
            "credits": parse_credits(c["credits"]),
            "department": dept_info,
            "level": infer_level(c["course_number"]),
            "term_offerings": merged_terms,
            "description": clean_html(c["description"]),
        })

        rule_tree, text_span = parse_prereq_notes(raw.get("preReqNotes"))
        source_url = (
            f"https://classes.rutgers.edu/soc/#course?subject={c['subject_code']}"
            f"&semester={term}{year}&campus={campus}&mode=U"
        )
        parsed_rules_by_code[course_code] = (rule_tree, text_span, source_url)

    # Insert new courses and update existing ones
    to_insert = [r for r in course_rows if r["course_code"] not in existing_courses]
    to_update = [r for r in course_rows if r["course_code"] in existing_courses]

    if to_insert:
        sb.table("courses").insert(to_insert).execute()
    for row in to_update:
        sb.table("courses").update(row).eq("course_code", row["course_code"]).execute()

    # Refresh course_code -> UUID map
    code_to_uuid = {
        row["course_code"]: row["id"]
        for row in sb.table("courses").select("id, course_code").limit(10000).execute().data
    }
    soc_id_to_uuid = {
        c["id"]: code_to_uuid[c["course_string"] or f"01:{c['subject_code']}:{c['course_number']}"]
        for c in all_courses
        if (c["course_string"] or f"01:{c['subject_code']}:{c['course_number']}") in code_to_uuid
    }

    # 2. Sync course_rules (prerequisites)
    existing_rules = {
        row["course_id"]: row["id"]
        for row in sb.table("course_rules").select("id, course_id").limit(10000).execute().data
    }
    for course_code, (rule_tree, text_span, source_url) in parsed_rules_by_code.items():
        course_uuid = code_to_uuid.get(course_code)
        if not course_uuid or rule_tree is None:
            continue
        payload = {
            "course_id": course_uuid,
            "rule_type": PREREQ_RULE_TYPE,
            "expression_json": rule_tree,
            "source_url": source_url,
            "text_span": text_span,
        }
        if course_uuid in existing_rules:
            sb.table("course_rules").update(payload).eq("id", existing_rules[course_uuid]).execute()
        else:
            sb.table("course_rules").insert(payload).execute()

    # 3. Sync professors
    existing_profs = {
        row["name"]: row["id"]
        for row in sb.table("professors").select("id, name").limit(10000).execute().data
    }
    new_prof_names: set[str] = set()
    for s in sections:
        for inst in s["instructors"]:
            name = (inst.get("name") or "").strip()
            if name and name not in existing_profs:
                new_prof_names.add(name)

    if new_prof_names:
        inserted = sb.table("professors").insert([{"name": n} for n in sorted(new_prof_names)]).execute().data
        for row in inserted:
            existing_profs[row["name"]] = row["id"]

    # 4. Sync course_offerings via native upsert on (semester, index_number)
    offerings_by_index: dict[str, dict[str, Any]] = {}
    for s in sections:
        course_uuid = soc_id_to_uuid.get(s["course_id"])
        if not course_uuid:
            continue
        first_prof_name = (s["instructors"][0].get("name") or "").strip() if s["instructors"] else ""
        prof_uuid = existing_profs.get(first_prof_name)
        offerings_by_index[s["registration_index"]] = {
            "course_id": course_uuid,
            "semester": semester_label,
            "index_number": s["registration_index"],
            "section": s["section_number"],
            "professor_id": prof_uuid,
            "meeting_times": meetings_by_section.get(s["id"], []),
        }

    if offerings_by_index:
        sb.table("course_offerings").upsert(
            list(offerings_by_index.values()),
            on_conflict="semester,index_number",
        ).execute()

    print(
        f"Done! Synced {len(course_rows)} courses, {len(parsed_rules_by_code)} prerequisite checks, "
        f"and {len(sections)} offerings for {semester_label}."
    )


if __name__ == "__main__":
    # Run Fall 2026 (term 9) and Spring 2026 (term 1) for New Brunswick (NB)
    sync_term_to_supabase(year="2026", term="9", campus="NB")
    sync_term_to_supabase(year="2026", term="1", campus="NB")