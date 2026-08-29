#!/usr/bin/env python3
"""env_file_guard — .env 류 자동 수정 차단 (PreToolUse, blocking).

차단 대상:
  - .env / .env.local / .env.production 등 — 운영 설정·시크릿이 들어가는 파일

예외(허용):
  - .env.example / .env.*.example 등 `.example`·`.sample`·`.template` 로 끝나는 템플릿.
    플레이스홀더만 담고 커밋 대상이라(.gitignore `!.env.example`) 차단할 이유가 없다.

차단 동작: stderr 로 사유 출력 + exit 2 (Claude Code 가 차단 신호로 처리).

비활성화: .claude/settings.json 의 PreToolUse 에서 본 항목 제거.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")  # Windows cp949 콘솔에서 한글 깨짐 방지


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
    name = p.name
    nl = name.lower()

    # 템플릿(.example/.sample/.template)은 플레이스홀더뿐이라 허용 (.gitignore `!.env.example`)
    is_template = nl.endswith((".example", ".sample", ".template"))

    if (name == ".env" or name.startswith(".env.")) and not is_template:
        sys.stderr.write(
            f"[hook:env_file_guard] {p} 자동 수정 차단\n"
            f"  .env 류는 운영 설정·시크릿을 포함할 수 있어 Claude 자동 수정을 막습니다.\n"
            f"  사용자가 직접 편집하거나, hook 비활성화 후 재시도 하세요.\n"
            f"  비활성화: .claude/settings.json 의 PreToolUse 에서 env_file_guard 제거\n"
        )
        return 2

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
