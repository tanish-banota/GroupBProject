import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from api import app


class ApiTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.output_dir = Path(temporary.name)
        environment = patch.dict(os.environ, {"SOC_OUTPUT_DIR": temporary.name})
        environment.start()
        self.addCleanup(environment.stop)
        self.client = TestClient(app)
        self.addCleanup(self.client.close)
        self.courses = [
            {"id": "rutgers-soc:course:2026:9:NB:01:198:111", "subject_code": "198",
             "course_string": "01:198:111", "title": "Computer Science", "expanded_title": None},
            {"id": "other", "subject_code": "AbC", "course_string": "01:ABC:101",
             "title": None, "expanded_title": "Introduction to Art"},
            {"id": "empty", "subject_code": None, "course_string": None,
             "title": None, "expanded_title": None},
        ]
        self.write("courses.json", self.courses)
        self.write("sections.json", [
            {"id": "section-1", "course_id": self.courses[0]["id"], "raw_source": {"preserved": True}},
            {"id": "section-2", "course_id": self.courses[0]["id"]},
            {"id": "unrelated", "course_id": "other"},
        ])
        self.write("meeting_times.json", [
            {"id": "meeting-1", "section_id": "section-1", "meeting_day": "M"},
            {"id": "meeting-2", "section_id": "section-1", "meeting_day": "W"},
            {"id": "unrelated", "section_id": "unrelated"},
        ])

    def write(self, filename, records):
        (self.output_dir / filename).write_text(json.dumps(records), encoding="utf-8")

    def test_health_without_data(self):
        (self.output_dir / "courses.json").unlink()
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_course_filtering(self):
        self.assertEqual(self.client.get("/courses").json(), self.courses)
        for params, expected in [
            ({"subject": "abc"}, [self.courses[1]]),
            ({"subject": "19"}, []),
            ({"search": "COMPUTER"}, [self.courses[0]]),
            ({"search": "to ART"}, [self.courses[1]]),
            ({"search": "198:111"}, [self.courses[0]]),
            ({"subject": "198", "search": "art"}, []),
            ({"search": "missing"}, []),
        ]:
            with self.subTest(params=params):
                response = self.client.get("/courses", params=params)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json(), expected)

    def test_course_detail_and_sections(self):
        url = f"/courses/{self.courses[0]['id']}"
        self.assertEqual(self.client.get(url).json(), self.courses[0])
        response = self.client.get(url + "/sections")
        self.assertEqual(response.status_code, 200)
        sections = response.json()
        self.assertEqual([section["id"] for section in sections], ["section-1", "section-2"])
        self.assertEqual([meeting["id"] for meeting in sections[0]["meeting_times"]],
                         ["meeting-1", "meeting-2"])
        self.assertEqual(sections[0]["raw_source"], {"preserved": True})
        self.assertEqual(sections[1]["meeting_times"], [])
        self.assertEqual(self.client.get("/courses/empty/sections").json(), [])

    def test_not_found(self):
        for url in ("/courses/missing", "/courses/missing/sections"):
            self.assertEqual(self.client.get(url).status_code, 404)

    def test_missing_data(self):
        for filename, urls in [
            ("courses.json", ["/courses", "/courses/empty", "/courses/empty/sections"]),
            ("sections.json", ["/courses/empty/sections"]),
            ("meeting_times.json", ["/courses/empty/sections"]),
        ]:
            path = self.output_dir / filename
            original = path.read_text(encoding="utf-8")
            path.unlink()
            for url in urls:
                with self.subTest(filename=filename, url=url):
                    response = self.client.get(url)
                    self.assertEqual(response.status_code, 503)
                    self.assertIn(filename, response.json()["detail"])
                    self.assertIn("collector", response.json()["detail"])
            path.write_text(original, encoding="utf-8")

    def test_reads_updated_exports(self):
        self.write("courses.json", [])
        self.assertEqual(self.client.get("/courses").json(), [])

    def test_cors(self):
        for origin, allowed in [("http://localhost:5173", True), ("http://localhost:3000", False)]:
            response = self.client.get("/health", headers={"Origin": origin})
            self.assertEqual(response.headers.get("access-control-allow-origin"),
                             origin if allowed else None)
