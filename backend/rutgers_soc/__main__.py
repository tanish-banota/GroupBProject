"""Command-line interface for the SOC collector."""

from __future__ import annotations

import argparse
import sys

from .collector import collect_schedule, write_collection
from .errors import SocCollectorError


def main() -> int:
    parser = argparse.ArgumentParser(description="Collect public Rutgers Schedule of Classes data.")
    parser.add_argument("year", help="SOC year, for example 2026")
    parser.add_argument("term", help="SOC term code, for example 9")
    parser.add_argument("campus", help="Campus code, for example NB")
    parser.add_argument("--output-dir", default="soc_output", help="Directory for JSON output")
    parser.add_argument("--no-open-sections", action="store_true", help="Skip optional availability annotation")
    parser.add_argument("--timeout", type=float, default=30.0, help="HTTP timeout in seconds")
    args = parser.parse_args()
    try:
        collection = collect_schedule(args.year, args.term, args.campus, include_open_sections=not args.no_open_sections, timeout=args.timeout)
        destination = write_collection(collection, args.output_dir)
    except (SocCollectorError, ValueError) as exc:
        parser.error(str(exc))
    print(f"Wrote {len(collection['courses'])} courses, {len(collection['sections'])} sections, and {len(collection['meeting_times'])} meeting times to {destination}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
