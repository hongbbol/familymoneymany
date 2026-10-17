#!/usr/bin/env python3
"""GitHub 이슈 폼(공부 기록) 본문을 파싱해서 data/logs.json에 추가한다.

사용법: ISSUE_BODY='...' ISSUE_NUMBER=12 python3 scripts/add_study_log.py
"""
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

LOGS_PATH = Path(__file__).resolve().parent.parent / "data" / "logs.json"
KST = timezone(timedelta(hours=9))

# 이슈 폼의 label → 저장 키
FIELD_KEYS = {
    "날짜": "date",
    "분야": "category",
    "공부 시간": "minutes",
    "오늘 공부한 주제": "topic",
    "배운 내용": "learned",
    "새로 알게 된 용어": "terms",
    "메모 / 소감": "memo",
}


def parse_issue_body(body: str) -> dict:
    """'### 라벨\\n\\n값' 형태의 이슈 폼 본문을 dict로 변환한다."""
    fields = {}
    sections = re.split(r"^### ", body.replace("\r\n", "\n"), flags=re.MULTILINE)
    for section in sections:
        if not section.strip():
            continue
        label, _, value = section.partition("\n")
        label = label.strip()
        value = value.strip()
        if value == "_No response_":
            value = ""
        key = FIELD_KEYS.get(label)
        if key:
            fields[key] = value
    return fields


def normalize_date(value: str) -> str:
    value = (value or "").strip()
    m = re.match(r"^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$", value)
    if m:
        try:
            return datetime(int(m[1]), int(m[2]), int(m[3])).strftime("%Y-%m-%d")
        except ValueError:
            pass
    return datetime.now(KST).strftime("%Y-%m-%d")


def build_entry(body: str, issue_number: str | None) -> dict:
    fields = parse_issue_body(body)
    entry = {
        "date": normalize_date(fields.get("date", "")),
        "category": fields.get("category", "") or "공통/뉴스",
        "minutes": fields.get("minutes", ""),
        "topic": fields.get("topic", ""),
        "learned": fields.get("learned", ""),
        "terms": fields.get("terms", ""),
        "memo": fields.get("memo", ""),
    }
    if issue_number:
        entry["issue"] = int(issue_number)
    return entry


def main() -> int:
    body = os.environ.get("ISSUE_BODY", "")
    if not body.strip():
        print("ISSUE_BODY가 비어 있습니다.", file=sys.stderr)
        return 1
    entry = build_entry(body, os.environ.get("ISSUE_NUMBER"))
    if not entry["topic"]:
        print("주제(topic)가 없어 저장하지 않습니다.", file=sys.stderr)
        return 1

    logs = json.loads(LOGS_PATH.read_text(encoding="utf-8")) if LOGS_PATH.exists() else []
    logs.append(entry)
    logs.sort(key=lambda e: (e.get("date", ""), e.get("issue", 0)))
    LOGS_PATH.write_text(json.dumps(logs, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"저장 완료: {entry['date']} [{entry['category']}] {entry['topic']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
