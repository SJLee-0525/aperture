---
name: git-commit-convention
description: Git 커밋 메시지 컨벤션에 따라 커밋 메시지를 생성합니다. 커밋 작성, staged changes 확인, 또는 커밋 메시지 검토 시 사용합니다.
---

# Git Commit Convention

`[TYPE] 한글 제목` 형식. (alphaLetterTest 팀 컨벤션을 솔로 프로젝트용으로 간소화 — Jira 이슈 번호 제거)

## 커밋 메시지 형식

\`\`\`
[TYPE] 제목

본문 (선택적)
\`\`\`

## 커밋 타입 (영어 대문자)

| 타입     | 의미                         | 예시                                   |
| -------- | ---------------------------- | -------------------------------------- |
| FEAT     | 새로운 기능 추가             | [FEAT] 갤러리 라이트박스 구현          |
| FIX      | 버그 수정                    | [FIX] 모바일에서 hero 이미지 잘림 수정 |
| DOCS     | 문서 수정                    | [DOCS] CLAUDE.md 데이터 모델 갱신      |
| REFACTOR | 코드 리팩토링                | [REFACTOR] firebase 래퍼 분리          |
| STYLE    | 코드 formatting, 세미콜론 등 | [STYLE] Prettier 적용                  |
| TEST     | 테스트 코드 추가/수정        | [TEST] Security Rules 테스트 추가      |
| CHORE    | 패키지 매니저, 기타 수정     | [CHORE] .gitignore 업데이트            |
| DESIGN   | CSS, UI 디자인 변경          | [DESIGN] 디자인 원본 대비 타이포 보정  |
| RENAME   | 파일/폴더명 수정 또는 이동   | [RENAME] components 구조 정리          |
| REMOVE   | 파일 삭제                    | [REMOVE] mock 데이터 제거              |
| !HOTFIX  | 긴급 치명적 버그 수정        | [!HOTFIX] Rules 전체 공개 사고 수정    |

## 작성 규칙

1. **커밋 타입**: 영어 대문자로 작성
2. **제목**: 한글로 작성, 끝에 마침표 금지
3. **제목 길이**: 영문 기준 50자 이내
4. **제목과 본문**: 빈 행으로 분리
5. **본문**: 변경한 내용과 이유 설명 (무엇 & 왜) — 사소한 변경은 생략 가능
6. **이슈 번호**: GitHub Issues 사용 시 본문 마지막에 `#번호` (선택)

## Instructions

1. `git diff --staged` 실행하여 변경사항 확인
2. 변경사항 분석하여 적절한 타입 선택
3. 제목 작성 (50자 이내, 명확하게)
4. 필요시 본문 추가
5. 사용자 확인 후 커밋

## 커밋 예시

\`\`\`bash
git commit -m "[FEAT] 사진 업로드 EXIF 자동추출 연동

exifr로 압축 前 조리개·셔터·GPS 추출 → webp 압축 → Storage 업로드"
\`\`\`

## Validation Checklist

- [ ] 커밋 타입이 정의된 목록에 있는가?
- [ ] 제목이 50자 이내 한글인가?
- [ ] 한 커밋에 한 가지 변경사항만 포함되었는가?
