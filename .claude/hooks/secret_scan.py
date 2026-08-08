#!/usr/bin/env python3
"""secret_scan — 코드/문서에 시크릿 패턴이 박혀있는지 검출하고 작업을 차단.

Edit/Write 전 입력과 작업 후 파일을 모두 검사하고, 탐지 시 exit 2로 실패시킨다.
탐지 키만 라인 번호와 함께 마스킹해서 보고. 시크릿 자체는 로그에 남기지 않음.

이 프로젝트 특이사항:
  - Firebase 웹 API 키(AIza…)는 공개되어도 보안 위험은 아니지만(보안은 Rules),
    env 관리 원칙 위반이므로 경고 대상.
  - GCP/Firebase 서비스 계정 private key 는 진짜 시크릿 — 최우선 경고.

비활성화: .claude/settings.json 의 PreToolUse와 PostToolUse에서 본 항목 제거.
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
    "OpenAI key": re.compile(r"sk-(?:(?:proj|svcacct)-)?[A-Za-z0-9_\-]{20,}"),
    "Anthropic key": re.compile(r"sk-ant-[A-Za-z0-9_\-]{20,}"),
    "AWS access key": re.compile(r"AKIA[0-9A-Z]{16}"),
    "GitHub PAT": re.compile(r"gh[pousr]_[A-Za-z0-9]{20,}"),
    "GitHub fine-grained PAT": re.compile(r"github_pat_[A-Za-z0-9_]{20,}"),
    "GitLab PAT": re.compile(r"glpat-[A-Za-z0-9_\-]{20,}"),
    "Slack token": re.compile(r"xox[baprs]-[A-Za-z0-9\-]{10,}"),
    "Stripe live secret": re.compile(r"(?:sk|rk)_live_[A-Za-z0-9]{16,}"),
    "JWT": re.compile(
        r"eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}"
    ),
    "Generic api_key/secret/password literal": re.compile(
        r"(?i)(api[_-]?key|secret|password)\s*[:=]\s*['\"][A-Za-z0-9+/=_\-]{16,}['\"]"
    ),
}


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
    candidates: list[tuple[str, str]] = []
    for key in ("content", "new_string"):
        value = tool_input.get(key)
        if isinstance(value, str):
            candidates.append((f"incoming {key}", value))
    if p.exists():
        try:
            candidates.append(("file", p.read_text(encoding="utf-8")))
        except Exception:
            pass
    if not candidates:
        return 0

    hits: list[str] = []
    seen: set[tuple[str, str]] = set()
    for source, text in candidates:
        for label, pat in PATTERNS.items():
            for m in pat.finditer(text):
                matched = m.group(0)
                fingerprint = (label, matched)
                if fingerprint in seen:
                    continue
                seen.add(fingerprint)
                line = text.count("\n", 0, m.start()) + 1
                hits.append(f"  - {label} ({source} line {line}): {mask(matched)}")

    if hits:
        sys.stderr.write(
            f"[hook:secret_scan] {p}\n"
            f"  시크릿 패턴 의심:\n"
            + "\n".join(hits)
            + "\n  하드코딩 금지. 공개 값이 아니면 server-only 환경변수로 옮기세요.\n"
            "  오탐은 탐지 규칙을 좁히거나 Gitleaks 설정에 구체적으로 예외 처리하세요.\n"
        )
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
