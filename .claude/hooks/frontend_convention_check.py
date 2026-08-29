#!/usr/bin/env python3
"""frontend_convention_check — src/**/*.{ts,tsx} 컨벤션 위반 검출 가드.

src/ 안의 ts/tsx 에 Edit/Write 발생 시, 다음 패턴이 발견되면 stderr 로 경고
(차단 X, exit 0). frontend agent self-check 보조용.

검출 대상 (4종):
  1. relative-parent-import : ../ 로 거슬러 올라가는 상대경로 import
                              → @/ path alias 사용
  2. raw-img-tag            : <img ...> 직접 사용
                              → next/image <Image> 사용 (갤러리 사이트라 LCP 직결)
  3. components-impure-import : src/components/** 안에서 Supabase 또는 @/features import
                              → components 는 순수 UI (props 만). 로직은 features/ 로
                                (3계층 의존 방향 app → features → components)
  4. barrel-file            : src/features/** · src/components/** 에 index.ts(x) 생성
                              → barrel export 금지. 직접 경로 import 사용

제외:
  - 주석 줄 (`// ...`, `* ...`)
  - 라인 끝/안에 `// @convention-ignore` 마커
  - 테스트 파일 (*.test.{ts,tsx}, *.spec.{ts,tsx})

완벽한 AST 분석은 아니며 false positive 가능. 의도된 케이스는 줄 끝에
`// @convention-ignore` 추가.

비활성화: .claude/settings.json 의 PostToolUse 에서 본 항목 제거.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")  # Windows cp949 콘솔에서 한글 깨짐 방지

IGNORE_MARKER = "@convention-ignore"

# 1. 상대경로 import: from "../..." 또는 require("../...")
RELATIVE_PARENT_IMPORT = re.compile(
    r"""(?:from|require\()\s*["']\.\.[/\\]"""
)

# 2. <img 태그 직접 사용 (JSX)
RAW_IMG_TAG = re.compile(r"<img[\s>]")

# 3. components/ 안에서 Supabase·features import (순수성 위반)
COMPONENTS_IMPURE_IMPORT = re.compile(
    r"""(?:from|require\()\s*["'](?:@/lib/supabase|@supabase/|@/features/)"""
)


def is_in_dir(p: Path, dirname: str) -> bool:
    return dirname in [x.lower() for x in p.parts]


def is_target(p: Path) -> bool:
    if p.suffix not in (".tsx", ".ts"):
        return False
    parts_lc = [x.lower() for x in p.parts]
    if "src" not in parts_lc:
        return False
    if "node_modules" in parts_lc:
        return False
    name = p.name
    if name.endswith((".test.tsx", ".test.ts", ".spec.tsx", ".spec.ts")):
        return False
    return True


def scan(text: str, in_components: bool = False) -> list[tuple[int, str, str]]:
    findings: list[tuple[int, str, str]] = []
    for i, line in enumerate(text.splitlines(), start=1):
        stripped = line.lstrip()
        if not stripped:
            continue
        if stripped.startswith("//") or stripped.startswith("*") or stripped.startswith("/*"):
            continue
        if IGNORE_MARKER in line:
            continue

        for m in RELATIVE_PARENT_IMPORT.finditer(line):
            findings.append((i, "relative-parent-import", m.group(0).strip()))

        for m in RAW_IMG_TAG.finditer(line):
            findings.append((i, "raw-img-tag", m.group(0)))

        if in_components:
            for m in COMPONENTS_IMPURE_IMPORT.finditer(line):
                findings.append((i, "components-impure-import", m.group(0).strip()))

    return findings


HINT = {
    "relative-parent-import": "→ @/ path alias 사용 (예: @/features/gallery/GalleryView)",
    "raw-img-tag": "→ next/image <Image> 사용 (외부 URL 은 next.config remotePatterns 등록)",
    "components-impure-import": "→ components 는 순수 UI (props 만). Supabase·로직은 features/ 로",
    "barrel-file": "→ barrel export 금지. index.ts 삭제하고 직접 경로 import",
}


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
    if not is_target(p):
        return 0
    if not p.exists():
        return 0

    try:
        text = p.read_text(encoding="utf-8")
    except Exception:
        return 0

    in_components = is_in_dir(p, "components")
    findings = scan(text, in_components=in_components)

    # barrel 파일 검사 (features/, components/ 안의 index.ts(x))
    if p.name in ("index.ts", "index.tsx") and (
        is_in_dir(p, "features") or in_components
    ):
        findings.append((1, "barrel-file", p.name))
    if not findings:
        return 0

    by_kind: dict[str, int] = {}
    for _, kind, _ in findings:
        by_kind[kind] = by_kind.get(kind, 0) + 1
    summary = ", ".join(f"{k}:{v}" for k, v in by_kind.items())

    sys.stderr.write(
        f"[hook:frontend_convention_check] {p}\n"
        f"  컨벤션 위반 {len(findings)}건 ({summary})\n"
    )
    for line_no, kind, snippet in findings[:12]:
        snippet_short = (snippet[:80] + "…") if len(snippet) > 80 else snippet
        sys.stderr.write(f"  L{line_no} [{kind}] {snippet_short}\n")
    if len(findings) > 12:
        sys.stderr.write(f"  ... +{len(findings) - 12}건\n")
    sys.stderr.write("  힌트:\n")
    for kind in by_kind:
        sys.stderr.write(f"    [{kind}] {HINT[kind]}\n")
    sys.stderr.write(
        "  의도된 케이스는 줄 끝에 `// @convention-ignore` 추가\n"
        "  비활성화: .claude/settings.json 에서 본 hook 제거\n"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
