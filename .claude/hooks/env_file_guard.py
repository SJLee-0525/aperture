#!/usr/bin/env python3
"""env_file_guard — .env 류 + Firebase 서비스 계정 키 자동 수정 차단 (PreToolUse, blocking).

차단 대상:
  1. .env / .env.local / .env.production 등 — Firebase 설정·시크릿이 들어가는 파일
  2. 서비스 계정 키 JSON (*serviceaccount*.json, *adminsdk*.json)
     — 이 프로젝트는 firebase-admin 자체를 쓰지 않는 게 원칙 (CLAUDE.md 아키텍처 원칙 #5)

차단 동작: stderr 로 사유 출력 + exit 2 (Claude Code 가 차단 신호로 처리).

비활성화: .claude/settings.json 의 PreToolUse 에서 본 항목 제거.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")  # Windows cp949 콘솔에서 한글 깨짐 방지


def is_service_account_key(name: str) -> bool:
    nl = name.lower()
    if not nl.endswith(".json"):
        return False
    return "serviceaccount" in nl or "adminsdk" in nl or "service-account" in nl


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

    if name == ".env" or name.startswith(".env."):
        sys.stderr.write(
            f"[hook:env_file_guard] {p} 자동 수정 차단\n"
            f"  .env 류는 Firebase 설정·시크릿을 포함할 수 있어 Claude 자동 수정을 막습니다.\n"
            f"  사용자가 직접 편집하거나, hook 비활성화 후 재시도 하세요.\n"
            f"  비활성화: .claude/settings.json 의 PreToolUse 에서 env_file_guard 제거\n"
        )
        return 2

    if is_service_account_key(name):
        sys.stderr.write(
            f"[hook:env_file_guard] {p} 자동 수정 차단\n"
            f"  Firebase 서비스 계정 키로 보입니다. 이 프로젝트는 서버리스 원칙상\n"
            f"  firebase-admin SDK 를 사용하지 않습니다 (CLAUDE.md 아키텍처 원칙 #5).\n"
            f"  키 파일이 repo 에 들어오면 안 됩니다. .gitignore 확인하세요.\n"
        )
        return 2

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
