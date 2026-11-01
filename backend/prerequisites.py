"""JSON-compatible course prerequisite rules and eligibility checks.

A rule is one of these dictionaries:

* Course: {"type": "course", "course": "01:198:111"}
  An optional "min_grade" string, such as "C", sets a minimum letter grade.
* AND: {"type": "and", "requirements": [rule, ...]}
  Every child rule must be met.
* OR: {"type": "or", "requirements": [rule, ...]}
  At least one child rule must be met.

Groups must have at least one child and may be nested. An empty dictionary at
the top level means verified no prerequisites; None means no verified rule is
available. This module does not define official Rutgers prerequisite data.
"""

from typing import Any, TypeAlias


PrerequisiteRule: TypeAlias = dict[str, str | list["PrerequisiteRule"]]
CompletedCourse: TypeAlias = dict[str, str | None]
RequirementResult: TypeAlias = dict[str, Any]

# Higher numbers represent higher grades. Missing or unrecognized earned grades
# do not meet any minimum grade requirement.
_GRADE_RANK = {
    grade: rank
    for rank, grade in enumerate(
        ("F", "D-", "D", "D+", "C-", "C", "C+", "B-", "B", "B+", "A-", "A", "A+")
    )
}


def _evaluate_rule(
    rule: PrerequisiteRule,
    completed_courses: list[CompletedCourse],
) -> tuple[RequirementResult, list[RequirementResult], list[RequirementResult]]:
    """Return the evaluated tree, satisfied course leaves, and needed leaves."""
    if not isinstance(rule, dict):
        raise ValueError("A prerequisite rule must be a dictionary")

    kind = rule.get("type")
    if kind == "course":
        if set(rule) not in ({"type", "course"}, {"type", "course", "min_grade"}):
            raise ValueError(
                "A course rule needs only type, course, and optional min_grade")
        course = rule["course"]
        if not isinstance(course, str) or not course.strip():
            raise ValueError("A course rule needs a nonempty course string")

        minimum = rule.get("min_grade")
        if "min_grade" in rule:
            if not isinstance(minimum, str):
                raise ValueError("min_grade must be a letter-grade string")
            minimum = minimum.strip().upper()
            if minimum not in _GRADE_RANK:
                raise ValueError(f"Unsupported minimum grade: {minimum}")

        matches = [item for item in completed_courses if item.get(
            "course") == course]
        satisfied = bool(matches)
        if minimum is not None:
            # Any qualifying entry suffices, regardless of input order. This
            # does not choose a Rutgers-specific repeated-course policy.
            satisfied = False
            for item in matches:
                grade = item.get("grade")
                if isinstance(grade, str) and (
                    _GRADE_RANK.get(grade.strip().upper(), -
                                    1) >= _GRADE_RANK[minimum]
                ):
                    satisfied = True
                    break

        result: RequirementResult = {
            "type": "course", "course": course, "satisfied": satisfied}
        if minimum is not None:
            result["min_grade"] = minimum
        if not satisfied:
            result["reason"] = "not_completed" if not matches else "minimum_grade_not_met"
        return result, [result] if satisfied else [], [] if satisfied else [result]

    if kind in ("and", "or"):
        if set(rule) != {"type", "requirements"}:
            raise ValueError("A group rule needs only type and requirements")
        children = rule["requirements"]
        if not isinstance(children, list) or not children:
            raise ValueError("A group rule needs a nonempty requirements list")

        evaluated = [_evaluate_rule(child, completed_courses)
                     for child in children]
        satisfied = (
            all(child[0]["satisfied"] for child in evaluated)
            if kind == "and"
            else any(child[0]["satisfied"] for child in evaluated)
        )
        result = {
            "type": kind,
            "satisfied": satisfied,
            "requirements": [child[0] for child in evaluated],
        }
        satisfied_courses = [course for _, courses,
                             _ in evaluated for course in courses]
        missing = (
            [course for _, _, courses in evaluated for course in courses]
            if kind == "and" or not satisfied
            else []
        )
        return result, satisfied_courses, missing

    raise ValueError(f"Unknown prerequisite rule type: {kind}")


def _describe_unmet(node: RequirementResult) -> str:
    """Describe remaining obligations while keeping AND branches grouped."""
    if node["type"] == "course":
        course = str(node["course"])
        minimum = node.get("min_grade")
        return f"{course} (minimum grade {minimum})" if minimum else course

    children = node["requirements"]
    failed = [child for child in children if not child["satisfied"]]
    if node["type"] == "or":
        alternatives = []
        for child in failed:
            description = _describe_unmet(child)
            if child["type"] == "and" and " and " in description:
                description = f"({description})"
            alternatives.append(description)
        return f"any one of ({'; '.join(alternatives)})"
    return " and ".join(_describe_unmet(child) for child in failed)


def _contains_or(node: RequirementResult) -> bool:
    if node["type"] == "or":
        return True
    children = node.get("requirements", [])
    return any(_contains_or(child) for child in children)


def check_eligibility(
    rule: PrerequisiteRule | None,
    completed_courses: list[CompletedCourse],
) -> dict[str, object]:
    """Evaluate a rule against {"course": id, "grade": optional letter} entries.

    None returns unknown; {} returns eligible with verified no prerequisites.
    The result contains status, an evaluated rule tree, individually satisfied
    course requirements, unmet requirements, and an explanation.
    """
    if rule is None:
        return {
            "status": "unknown",
            "rule": None,
            "satisfied_requirements": [],
            "missing_requirements": [],
            "explanation": "Verified prerequisite information is unavailable for this course.",
        }
    if rule == {}:
        return {
            "status": "eligible",
            "rule": {"type": "empty", "satisfied": True},
            "satisfied_requirements": [],
            "missing_requirements": [],
            "explanation": "This course is verified to have no prerequisites.",
        }

    evaluated_rule, satisfied, missing = _evaluate_rule(
        rule, completed_courses)
    if evaluated_rule["satisfied"]:
        explanation = "Prerequisites satisfied."
        if _contains_or(evaluated_rule):
            explanation += " Any one alternative in each OR group is sufficient."
    else:
        explanation = f"Unmet prerequisites: {_describe_unmet(evaluated_rule)}."
    return {
        "status": "eligible" if evaluated_rule["satisfied"] else "ineligible",
        "rule": evaluated_rule,
        "satisfied_requirements": satisfied,
        "missing_requirements": missing,
        "explanation": explanation,
    }


# Development example only. DEMO course identifiers and this prerequisite
# combination are fictional; they are not Rutgers requirements.
SAMPLE_RULE: PrerequisiteRule = {
    "type": "and",
    "requirements": [
        {"type": "course", "course": "DEMO:101", "min_grade": "C"},
        {
            "type": "or",
            "requirements": [
                {"type": "course", "course": "DEMO:102"},
                {
                    "type": "and",
                    "requirements": [
                        {"type": "course", "course": "DEMO:103"},
                        {"type": "course", "course": "DEMO:104"},
                    ],
                },
            ],
        },
    ],
}
