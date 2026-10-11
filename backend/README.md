# Rutgers SOC data collector

This is a small Python-only collector for Rutgers' public Schedule of Classes API. It does not write to a database or expose an application API.

## Install and run

Python 3.10+ is sufficient; there are no third-party dependencies. From `backend`:

```powershell
python -m unittest discover -s tests -v
python -m rutgers_soc 2026 9 NB --output-dir .\soc_output
```

If using the project-local Windows runtime installed in `.python`, substitute `\.python\python.exe` for `python` in those commands.

The numbers above are examples, not embedded collector defaults. The command fetches each endpoint at most once. `--no-open-sections` skips the optional availability request.

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
