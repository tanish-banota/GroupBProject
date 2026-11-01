import json
import unittest

from prerequisites import SAMPLE_RULE, check_eligibility


class PrerequisiteTests(unittest.TestCase):
    def test_unavailable_and_verified_empty_rules(self):
        unknown = check_eligibility(None, [])
        empty = check_eligibility({}, [])
        expected_keys = {
            "status", "rule", "satisfied_requirements", "missing_requirements", "explanation"
        }
        self.assertEqual(set(unknown), expected_keys)
        self.assertEqual(set(empty), expected_keys)
        self.assertEqual(unknown["status"], "unknown")
        self.assertIsNone(unknown["rule"])
        self.assertEqual(unknown["missing_requirements"], [])
        self.assertEqual(empty["status"], "eligible")
        self.assertEqual(empty["rule"], {"type": "empty", "satisfied": True})
        self.assertIn("verified", empty["explanation"])

    def test_course_and_minimum_grade(self):
        rule = {"type": "course", "course": "01:198:111", "min_grade": " b+ "}
        passing = check_eligibility(rule, [{"course": "01:198:111", "grade": " a- "}])
        self.assertEqual(passing["status"], "eligible")
        self.assertEqual(passing["rule"]["min_grade"], "B+")
        self.assertEqual(len(passing["satisfied_requirements"]), 1)
        for grade in ("B", None, "P", ""):
            with self.subTest(grade=grade):
                result = check_eligibility(rule, [{"course": "01:198:111", "grade": grade}])
                self.assertEqual(result["status"], "ineligible")
                self.assertEqual(result["missing_requirements"][0]["reason"],
                                 "minimum_grade_not_met")

        no_minimum = {"type": "course", "course": "01:198:111"}
        self.assertEqual(check_eligibility(no_minimum, [{"course": "01:198:111"}])["status"],
                         "eligible")
        self.assertEqual(check_eligibility(no_minimum, [{"course": "01:198:112"}])["status"],
                         "ineligible")

    def test_nested_and_or_results_and_explanation(self):
        result = check_eligibility(SAMPLE_RULE, [{"course": "DEMO:101", "grade": "C-"}])
        self.assertEqual(result["status"], "ineligible")
        self.assertEqual(
            [item["course"] for item in result["missing_requirements"]],
            ["DEMO:101", "DEMO:102", "DEMO:103", "DEMO:104"],
        )
        self.assertIn("any one of (DEMO:102; (DEMO:103 and DEMO:104))",
                      result["explanation"])
        self.assertFalse(result["rule"]["requirements"][1]["satisfied"])
        self.assertFalse(result["rule"]["requirements"][1]["requirements"][1]["satisfied"])
        json.dumps(result)

        eligible = check_eligibility(
            SAMPLE_RULE,
            [{"course": "DEMO:101", "grade": "C"}, {"course": "DEMO:102"}],
        )
        self.assertEqual(eligible["status"], "eligible")
        self.assertEqual(eligible["missing_requirements"], [])
        self.assertIn("Any one alternative", eligible["explanation"])

    def test_partial_and_branch_inside_or_stays_grouped(self):
        rule = {"type": "or", "requirements": [
            {"type": "and", "requirements": [
                {"type": "course", "course": "A"},
                {"type": "course", "course": "B"},
            ]},
            {"type": "course", "course": "C"},
        ]}
        result = check_eligibility(rule, [])
        self.assertEqual(result["status"], "ineligible")
        self.assertIn("any one of ((A and B); C)", result["explanation"])
        self.assertEqual(check_eligibility(rule, [{"course": "A"}])["status"], "ineligible")
        self.assertEqual(check_eligibility(rule, [{"course": "C"}])["status"], "eligible")

    def test_duplicate_entries_are_order_independent(self):
        rule = {"type": "course", "course": "X", "min_grade": "C+"}
        entries = [{"course": "X", "grade": "C"}, {"course": "X", "grade": "B-"}]
        self.assertEqual(check_eligibility(rule, entries),
                         check_eligibility(rule, list(reversed(entries))))
        self.assertEqual(check_eligibility(rule, entries)["status"], "eligible")

    def test_rejects_malformed_rules(self):
        malformed = [
            {"type": "and", "requirements": []},
            {"type": "or", "requirements": []},
            {"type": "and", "requirements": "X"},
            {"type": "or", "requirements": [{}]},
            {"type": "course"},
            {"type": "course", "course": None},
            {"type": "course", "course": ""},
            {"type": "course", "course": "X", "min_grade": None},
            {"type": "course", "course": "X", "min_grade": "P"},
            {"type": "course", "course": "X", "requirements": []},
            {"type": "and", "requirements": [{"type": "course", "course": "X"}],
             "min_grade": "C"},
            {"type": "unknown", "course": "X"},
        ]
        for rule in malformed:
            with self.subTest(rule=rule), self.assertRaises(ValueError):
                check_eligibility(rule, [])


if __name__ == "__main__":
    unittest.main()
