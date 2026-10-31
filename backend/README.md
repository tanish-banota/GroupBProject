# Rutgers SOC data collector

This backend contains a small Python-only collector for Rutgers' public Schedule of Classes API and a FastAPI application that serves its JSON exports.

## Install and run

The collector requires Python 3.10+ and uses only the standard library. From `backend`:

```powershell
python -m unittest discover -s tests -v
python -m rutgers_soc 2026 9 NB --output-dir .\soc_output
```

If using the project-local Windows runtime installed in `.python`, substitute `\.python\python.exe` for `python` in those commands.

The numbers above are examples, not embedded collector defaults. The command fetches each endpoint at most once. `--no-open-sections` skips the optional availability request.

## Application API

From the repository root, install dependencies, run the collector first, and start the API:

```sh
cd backend
python -m pip install -r requirements.txt
python -m rutgers_soc 2026 9 NB --output-dir soc_output
python -m uvicorn api:app --reload
```

The API reads JSON on each request from `backend/soc_output` by default. Set
`SOC_OUTPUT_DIR` to use another local directory (relative paths resolve from the
server's working directory), for example:

```sh
SOC_OUTPUT_DIR=/path/to/exports python -m uvicorn api:app --reload
```

Example URLs:

- `http://localhost:8000/health`
- `http://localhost:8000/metadata`
- `http://localhost:8000/subjects`
- `http://localhost:8000/courses`
- `http://localhost:8000/courses?subject=198&search=computer`
- `http://localhost:8000/courses?subject=198&limit=50&offset=0`
- `http://localhost:8000/courses/rutgers-soc:course:2026:9:NB:01:198:111`
- `http://localhost:8000/courses/rutgers-soc:course:2026:9:NB:01:198:111/sections`
- `http://localhost:8000/sections/rutgers-soc:section:2026:9:NB:12345`

Use an actual course ID from `/courses`. Subject matching is exact and
case-insensitive; search matches substrings in `course_string`, `title`, or
`expanded_title`. Apply `limit` (1–500) and `offset` (0 or greater) after filtering
to page through the course array; omitting them returns all courses. `/subjects`
returns sorted subject codes. `/metadata` returns the export scope and collection
time. Sections include a `meeting_times` array joined by section ID, both in the
course sections list and the single-section endpoint.
Unknown courses or sections return 404; missing required export files return 503 with a
message to collect the data first. CORS allows `http://localhost:5173` only.

Run the API and collector tests from `backend` after installing dependencies:

```sh
python -m unittest discover -s tests -v
```

## Output

The output directory contains:

- `metadata.json` — requested `year`, `term`, and `campus`; UTC collection time; endpoint URLs; and availability limitations.
- `courses.json` — course records with stable `rutgers-soc:course:<year>:<term>:<campus>:<courseString>` IDs.
- `sections.json` — section records keyed by stable registration-index IDs. `registration_index` is the SOC section `index` field.
- `meeting_times.json` — meeting records keyed by a stable hash of the source meeting object, rather than its position in the array.

Each record includes `raw_source`. This retains source fields that are not mapped into a named, verified field and makes later schema improvements non-destructive.
An empty course response is exported as empty arrays and called out in `metadata.json` so it is not mistaken for a successful populated collection.

## API observations and limitations

The collector validates that `courses.json` is an array of course objects with nested `sections` and `meetingTimes`; it is the authoritative source for the exported course and section details. For the verified example parameters, `openSections.json` was an array of registration-index strings. When that shape is received, `sections.json` adds `listed_open`; this is an annotation only. If that endpoint cannot be fetched or changes shape, course/section export continues and `metadata.json` records the limitation.

Fields such as SOC `openStatus`, `meetingModeCode`, `campusLocation`, `coreCodes`, and registration-index semantics are preserved as source data. Except for the observed nesting and `index` identifier, this project intentionally does not claim meanings for fields not independently documented by Rutgers.
