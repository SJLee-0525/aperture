---
name: git-branch-strategy
description: 솔로 프로젝트용 단순 브랜치 전략에 따라 브랜치를 생성하고 관리합니다. 새 기능 개발, 버그 수정 시 사용합니다.
---

# 브랜치 전략 (솔로 간소화)

alphaLetterTest 의 Git Flow 를 1인 포트폴리오 프로젝트에 맞게 간소화.
develop / release 브랜치 없음 — **main + feature 2단 구조**.

## 브랜치 유형

| 브랜치  | 의미                                | 명명 규칙              |
| ------- | ----------------------------------- | ---------------------- |
| main    | 배포 브랜치 (Vercel 자동 배포 연결) | `main`                 |
| feature | 기능 단위 작업                      | `feature/{kebab-요약}` |
| fix     | 버그 수정                           | `fix/{kebab-요약}`     |

## 핵심 규칙

1. **main 에 push = 배포다.** Vercel 이 main 을 자동 배포하므로, main 머지 전 `/deploy-check`.
2. 기능 작업은 feature 브랜치에서 → main 으로 merge (1인이므로 PR 은 선택, 단 Rules 변경은 diff 재확인 후 merge).
3. merge 후 feature 브랜치 삭제.
4. 오타 수정·문서 등 사소한 변경은 main 직접 커밋 허용 (단, 빌드 깨지지 않는 변경만).

## Instructions

### Feature 브랜치 생성

\`\`\`bash
git checkout main
git pull origin main
git checkout -b feature/gallery-lightbox
\`\`\`

### Merge 흐름

\`\`\`
feature/* → main (배포 전 /deploy-check)
fix/* → main
\`\`\`

## Phase 별 운용

- Phase 1 (디자인 이식): `feature/design-{섹션명}` 단위로 쪼개기
- Phase 2 (Firebase 연동): `feature/auth`, `feature/admin-photos`, `feature/admin-albums` 등
- Security Rules 만 바꾸는 작업도 브랜치 분리 권장 (`fix/rules-…`) — 사고 추적 용이
