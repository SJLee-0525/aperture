---
description: 구현된 화면을 디자인 단일 출처(design/claude_design/ Desktop·Mobile 프로토타입)와 대조해 충실도를 점검한다. 색·타이포·간격·반응형 차이를 찾고, 문서화된 의도적 이탈 4건은 위반으로 보지 않는다.
allowed-tools: Read, Glob, Grep, Bash, Agent, AskUserQuestion
---

구현 화면이 Claude Design 원본과 일치하는지 점검하는 명령. 화면 작성을 마쳤거나 커밋 직전에 사용.

## 사용 시점

- `design/claude_design/` 프로토타입의 섹션을 Next.js 로 이식 완료했을 때
- 기존 화면의 레이아웃·스타일을 수정했을 때
- 반응형(모바일 하단 탭바·바텀시트) 동작을 바꿨을 때

## 절차

### Step 1 — 점검 대상 식별

- 어떤 페이지/컴포넌트를 점검하나 (없으면 `git diff --stat` 으로 추론)
- 디자인의 어느 뷰에 해당하나: **작업 / 앨범 / 지도 / 소개 / 사진 상세(라이트박스·바텀시트) / 내보내기** (Desktop/Mobile 각각)

### Step 2 — 디자인 원본 추출

- `design/claude_design/` 에서 해당 섹션의 마크업·스타일 Read:
  - 마크업/렌더: `Portfolio.html`(데스크톱), `Mobile.html`·`mobile-screens.js`(모바일), `portfolio.js`(데이터·프레임)
  - 스타일: `styles/tokens.css`(토큰 ★), `styles/components.css`, `styles/mobile.css`, `styles/wireframe.css`
- 비교 기준값 정리: 색(hex/변수), 폰트 패밀리·크기·행간, 여백, radius(각짐/pill), breakpoint 동작

### Step 3 — 구현과 대조

- 구현 파일(`src/app/…`, `src/features/…`, `src/components/…` + 각 `.module.css`) + `globals.css` `:root` 토큰 Read
- 확인: **색이 `:root` 변수 경유인가(hex 직박 없음)**, 폰트 next/font 등록, radius, 다크모드 `[data-theme]` 대응
- 가능하면 dev 서버 + 프리뷰로 실제 렌더 확인 (데스크톱 폭 + 모바일 폭 ~390px 2회, 라이트/다크 2회)

### Step 4 — 의도적 이탈 필터 ★

아래 4건은 **디자인과 다른 게 정상** — 위반으로 보고하지 말 것 ([design/README.md](../../design/README.md)):

1. 언어 토글 UI 추가 (디자인엔 없음)
2. 좋아요 = 익명 공개 카운트 (`likes≥1` 빨강 채움) — 디자인은 로컬 토글
3. 지도 = Google Maps 실제 지도 — 디자인은 추상 SVG 맵
4. 내보내기 해상도 "원본" 옵션 제거 (저장 webp 해상도까지만)

### Step 5 — 차이 보고

```
## design-check 결과 — <페이지/컴포넌트>

### 일치
- ...

### 차이 (우선순위순 · 의도적 이탈 4건 제외)
| # | 항목 | 디자인 원본 | 구현 | 수정 |
|---|------|------------|------|------|
| 1 | 워드마크 크기 | 1.35rem | 1.2rem | globals.css --brand-size |

### 반응형
- 모바일 대비: <O/X/부분> — 차이 섹션: ...

### 다음 액션
- [ ] 차이 #1 수정
```

## 빠른 체크리스트 (호출 전 self-check)

- [ ] 색이 `tokens.css`에서 추출한 `:root` 변수 경유인가 (hex 직박 없음)
- [ ] 폰트 3종(Newsreader·Schibsted Grotesk·Spline Sans Mono) next/font 등록·용도(제목/UI/수치) 맞는가
- [ ] radius 각짐(0), 태그 칩만 pill 인가
- [ ] 모바일 폭(~390px)에서 하단 탭바·바텀시트가 `Mobile.html` 과 같은가
- [ ] 이미지 비율·그림자가 원본과 같은가
- [ ] 의도적 이탈 4건 외의 임의 장식을 추가하지 않았는가

## 참조

- [`design/README.md`](../../design/README.md) — 디자인 단일 출처 규칙·파일 맵·의도적 이탈 4건
- [`frontend` agent](../agents/frontend.md) §디자인 이식 원칙
