import gzip
import json
import unittest
from pathlib import Path
from urllib.error import HTTPError

from rutgers_soc.collector import build_url, collect_schedule
from rutgers_soc.errors import SocRequestError, SocResponseError
from rutgers_soc.http import fetch_json

FIXTURE = Path(__file__).parent / "fixtures" / "courses.json"


class ParserTests(unittest.TestCase):
    def test_collects_nested_records_and_preserves_raw_fields(self):
        payload = json.loads(FIXTURE.read_text(encoding="utf-8"))
        def fake_fetch(url, **kwargs):
            return ["12345"] if "openSections" in url else payload
        result = collect_schedule(2026, 9, "nb", fetcher=fake_fetch)
        self.assertEqual(result["courses"][0]["id"], "rutgers-soc:course:2026:9:NB:01:198:111")
        self.assertEqual(result["sections"][0]["registration_index"], "12345")
        self.assertTrue(result["sections"][0]["listed_open"])
        self.assertEqual(result["meeting_times"][0]["raw_source"]["unknownMeetingField"], 7)
        self.assertTrue(result["courses"][0]["raw_source"]["unknownCourseField"]["preserved"])

    def test_open_section_failure_keeps_course_data(self):
        payload = json.loads(FIXTURE.read_text(encoding="utf-8"))
        def fake_fetch(url, **kwargs):
            if "openSections" in url:
                raise SocRequestError("service unavailable")
            return payload
        result = collect_schedule("2026", "9", "NB", fetcher=fake_fetch)
        self.assertEqual(len(result["sections"]), 1)
        self.assertIsNone(result["sections"][0]["listed_open"])
        self.assertIn("service unavailable", result["metadata"]["source"]["availability"]["limitation"])

    def test_rejects_invalid_open_section_shape(self):
        payload = json.loads(FIXTURE.read_text(encoding="utf-8"))
        def fake_fetch(url, **kwargs): return {"unexpected": True} if "openSections" in url else payload
        result = collect_schedule(2026, 9, "NB", fetcher=fake_fetch)
        self.assertFalse(result["metadata"]["source"]["availability"]["available"])

    def test_url_is_parameterized(self):
        self.assertEqual(build_url("courses.json", "2025", "1", "nk"), "https://classes.rutgers.edu/soc/api/courses.json?year=2025&term=1&campus=NK")

    def test_empty_courses_has_a_metadata_warning(self):
        result = collect_schedule(2026, 9, "NB", include_open_sections=False, fetcher=lambda *args, **kwargs: [])
        self.assertIn("returned no courses", result["metadata"]["warnings"][0])


class HttpTests(unittest.TestCase):
    def test_malformed_json_has_useful_error(self):
        class Response:
            headers = {}
            def read(self): return b"not json"
            def __enter__(self): return self
            def __exit__(self, *args): return False
        with self.assertRaises(SocResponseError):
            fetch_json("https://example.invalid", opener=lambda *args, **kwargs: Response())

    def test_http_error_is_reported_without_retry_for_404(self):
        def fail(*args, **kwargs):
            raise HTTPError("https://example.invalid", 404, "Not found", {}, None)
        with self.assertRaisesRegex(SocRequestError, "HTTP 404"):
            fetch_json("https://example.invalid", opener=fail, retries=2, sleep=lambda _: None)

    def test_gzip_json_is_decoded(self):
        class Response:
            headers = {"Content-Encoding": "gzip"}
            def read(self): return gzip.compress(b'{"ok": true}')
            def __enter__(self): return self
            def __exit__(self, *args): return False
        self.assertEqual(fetch_json("https://example.invalid", opener=lambda *args, **kwargs: Response()), {"ok": True})


if __name__ == "__main__":
    unittest.main()
