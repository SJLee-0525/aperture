# Hooks — JH Portfolio

Claude Code 의 PreToolUse / PostToolUse 이벤트에 자동 실행되는 검증 스크립트.
(alphaLetterTest 의 hook 설계 원칙 계승)

설계 원칙:

- **관찰·검증 위주, 차단 최소화** — 한 개(env_file_guard)만 차단형, 나머지는 stderr 경고
- **자동 수정·삭제·외부 전송 금지** — 모든 hook 은 read-only
- **시크릿은 마스킹** — secret_scan 도 키 자체를 로그에 남기지 않음
- **비활성화 경로 명시** — 각 hook 헤더에 끄는 방법 기록

## 활성/비활성 현황

| 등급  | 파일                                                         | 이벤트                    | 동작                                                                                                   |
| ----- | ------------------------------------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------ |
| 🟢 ON | [env_file_guard.py](env_file_guard.py)                       | PreToolUse `Edit\|Write`  | `.env` 류 + 서비스 계정 키 JSON 자동 수정 **차단**                                                     |
| 🟢 ON | [secret_scan.py](secret_scan.py)                             | PostToolUse `Edit\|Write` | 시크릿 패턴 검출 (Firebase private key·AIza 키 포함, 마스킹 보고)                                      |
| 🟢 ON | [frontend_convention_check.py](frontend_convention_check.py) | PostToolUse `Edit\|Write` | 상대경로 import / `<img>` / 컬렉션명 직박 / firebase-admin / components 순수성 위반 / barrel 파일 경고 |

## 활성화 / 비활성화 방법

활성/비활성은 **`.claude/settings.json` 등록 여부**로 결정. 스크립트는 항상 존재.

- 비활성화: settings.json 에서 해당 줄 제거 (스크립트는 그대로 둬도 됨)
- 개인용 임시 비활성화: `.claude/settings.local.json` 에서 같은 hook 을 빈 배열로 덮어쓰기

## 디버깅

각 hook 은 stdin 으로 JSON payload 를 받음. 수동 테스트:

```bash
echo '{"tool_input": {"file_path": "src/lib/firebase/client.ts"}}' | python .claude/hooks/frontend_convention_check.py
```

stderr 로 메시지 출력 확인.

## 위험·제약

- Python 3.10+ 필요 (`python` 이 PATH 에 있어야 함).
- Windows 에서 `python` 이 Microsoft Store 스텁이면 동작 안 함. `python --version` 확인.
- secret_scan 은 정규식 기반 — 오탐 가능. 오탐 시 `ALLOWLIST_TOKENS` 또는 `ALLOWLIST_SUFFIXES` 에 추가.
- env_file_guard 가 `exit 2` 로 차단하므로, 의도적으로 `.env.example` 템플릿을 Claude 에게
  만들게 하려면 hook 을 잠시 비활성화 필요.
- frontend_convention_check 의 `firestore-collection-literal` 은 `src/constants/` 안에서는
  검사하지 않음 (정의처이므로).

## 참고

- 프로젝트 헌법: [CLAUDE.md](../../CLAUDE.md)
- 아키텍처 원칙 #5 (firebase-admin 금지)가 env_file_guard·frontend_convention_check 두 곳에서 강제됨
