#!/usr/bin/env python3
"""secret_scan — 코드/문서에 시크릿 패턴 박혀있는지 검출.

Edit/Write 후 파일에 알려진 시크릿 패턴이 있으면 stderr로 경고 (차단 X, exit 0).
탐지 키만 라인 번호와 함께 마스킹해서 보고. 시크릿 자체는 로그에 남기지 않음.

이 프로젝트 특이사항:
  - Firebase 웹 API 키(AIza…)는 공개되어도 보안 위험은 아니지만(보안은 Rules),
    env 관리 원칙 위반이므로 경고 대상.
  - GCP/Firebase 서비스 계정 private key 는 진짜 시크릿 — 최우선 경고.

비활성화: .claude/settings.json 의 PostToolUse 에서 본 항목 제거.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")  # Windows cp949 콘솔에서 한글 깨짐 방지

PATTERNS: dict[str, re.Pattern[str]] = {
    "GCP/Firebase private key (진짜 시크릿!)": re.compile(
        r"-----BEGIN (?:RSA )?PRIVATE KEY-----"
    ),
    "Google/Firebase API key (env로 이동 — 위험은 아니나 하드코딩 금지)": re.compile(
        r"AIza[0-9A-Za-z\-_]{35}"
    ),
    "OpenAI key": re.compile(r"sk-[A-Za-z0-9]{32,}"),
    "Anthropic key": re.compile(r"sk-ant-[A-Za-z0-9_\-]{20,}"),
    "AWS access key": re.compile(r"AKIA[0-9A-Z]{16}"),
    "GitHub PAT": re.compile(r"gh[pousr]_[A-Za-z0-9]{20,}"),
    "JWT": re.compile(
        r"eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}"
    ),
    "Generic api_key/secret/password literal": re.compile(
        r"(?i)(api[_-]?key|secret|password)\s*[:=]\s*['\"][A-Za-z0-9+/=_\-]{16,}['\"]"
    ),
}

ALLOWLIST_TOKENS = ("test", "fixture", "example", "mock", "__pycache__", "node_modules")
ALLOWLIST_SUFFIXES = (".md",)


def mask(s: str) -> str:
    if len(s) > 12:
        return s[:6] + "…" + s[-4:]
    return "…"


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0

    tool_input = payload.get("tool_input") or {}
    file_path = tool_input.get("file_path") or ""
    if not file_path:
        return 0

    p = Path(file_path)
    pl = str(p).replace("\\", "/").lower()

    if any(token in pl for token in ALLOWLIST_TOKENS):
        return 0
    if p.suffix in ALLOWLIST_SUFFIXES:
        return 0
    if p.name.startswith(".env"):
        # .env 류는 env_file_guard.py 에서 별도 처리
        return 0
    if not p.exists():
        return 0

    try:
        text = p.read_text(encoding="utf-8")
    except Exception:
        return 0

    hits: list[str] = []
    for label, pat in PATTERNS.items():
        for m in pat.finditer(text):
            line = text.count("\n", 0, m.start()) + 1
            hits.append(f"  - {label} (line {line}): {mask(m.group(0))}")

    if hits:
        sys.stderr.write(
            f"[hook:secret_scan] {p}\n"
            f"  시크릿 패턴 의심:\n"
            + "\n".join(hits)
            + "\n  하드코딩 금지. .env.local + NEXT_PUBLIC_* 환경변수로 옮기세요.\n"
            f"  오탐이면 .claude/hooks/secret_scan.py 의 ALLOWLIST 에 토큰 추가.\n"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
