# 관리자 UI 컨벤션

관리자(`/admin/*`)와 관리자 로그인 화면의 용어·컴포넌트·치수 규칙. 공개(방문자) 페이지에는 적용하지 않는다.

## 공용 프리미티브 (`src/components/`)

| 컴포넌트      | 역할                                                                  | 주요 API                                                                                                                                                                              |
| ------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AdminButton` | 관리자 공용 버튼. `href`가 있으면 같은 외형의 `next/link` Link로 렌더 | `variant: primary\|secondary\|danger`, `size: md(44)\|sm(40)\|xs(36)`, 기본 `type="button"` — 제출은 `type="submit"` 명시. `disabled`는 href 변형도 받는다(aria-disabled + 클릭 차단) |
| `AdminInput`  | 텍스트 입력. `multiline`이면 textarea                                 | `size: md(44)\|sm(40)`, `tone: default\|raised(surface-2)`                                                                                                                            |
| `AdminField`  | 라벨 + 입력 세로 묶음                                                 | `label`, `required`(라벨 뒤 ` *` 렌더)                                                                                                                                                |

- 공용 CSS는 **외형만** 소유한다. width·flex·grid·min-height 같은 배치는 호출부 모듈 CSS 클래스를 `className`으로 병합한다.
- 관리자 인증 화면(`LoginForm`)도 관리자 프리미티브를 사용한다.

### 프리미티브를 쓰지 않는 것 (의도적 예외)

- Row 소형 텍스트 액션(`edit`·`delete`·`move`·`handle`·공개 배지) — `admin-shell`의 `admin-row.module.css`가 소유
- 파일 선택은 `hidden` input + `AdminButton`이 `.click()`으로 연다. 라벨로 감싸는 clip 패턴은 포커스 링이 1px 영역에 그려져 쓰지 않는다
- 공개 체크박스(`공개 (방문자에게 표시)`) — 로컬 `.checkbox` 패턴 유지
- 폼·필드 안의 인라인 `.remove` — Row 밖 일곱 곳(`ArticleForm`·`ProjectForm`·`WorkForm`·`TroubleshootingField`·`DevImageField`·`PosterUploadField`·`SelectedPhotoChip`). 배열 항목·업로드 파일을 지우는 소형 텍스트 액션이며 Row 액션과 배치가 다르다. Row 쪽은 `admin-row.module.css`가 소유하므로 이 일곱만 로컬로 남는다
- `ArticleTagManagerPanel`의 `.action`·`.field`·`.label` — 컴팩트(micro) 패널 밀도 유지. 입력만 `AdminInput size="sm"`
- 배너 두 종(`RagStaleBanner`·`RevalidateFailureBanner`)의 `.action` — 좁은 알림 줄 전용 36px. 두 배너가 같은 CSS 파일을 공유하므로 한쪽만 보고 고치지 않는다
- Markdown 본문 편집기는 공용 외형 + 로컬 편집기 레이아웃(`min-height: 420px`·mono·`tab-size`) className 유지

## 용어·라벨

| 항목                 | 규칙                                            | 예외                                                                           |
| -------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------ |
| 제출 버튼            | `저장` / 진행 중 `저장 중…`                     | LoginForm `로그인`/`로그인 중…`                                                |
| 나가기 버튼          | `취소`                                          | dirty면 확인 후 이동                                                           |
| 파괴적 버튼          | `AdminButton variant="danger"` (테두리형)       | 강조(primary)는 같은 줄의 안전한 동작이 가져간다                               |
| published 배지 (Row) | `공개` / `비공개`                               | 블로그는 `공개`/`초안` — [발행 의미론](plan/07-dev-blog.md) (발행일·slug 잠금) |
| 폼 공개 체크박스     | `공개 (방문자에게 표시)`                        | 블로그는 `발행` (발행 조건 검사와 짝)                                          |
| 목록 상단 버튼       | `+ 새 {엔티티}`                                 | —                                                                              |
| 빈 상태 CTA          | `+ 첫 {엔티티} 만들기`                          | 사진 `+ 첫 사진 추가`(업로드), 블로그 `+ 첫 글 쓰기`                           |
| 배열 항목 추가       | `+ {대상} 추가` — 대상 명시. 맨몸 `+ 추가` 금지 | 범용 필드만 `+ 항목 추가`                                                      |
| category 라벨        | `분류` (`구분`·`카테고리` 금지)                 | —                                                                              |
| 설정 페이지 h1       | `소개`                                          | —                                                                              |
| ko/en 라벨           | `{필드명} (한국어)` / `{필드명} (English)`      | —                                                                              |
| 필수 표시            | `AdminField required` → 라벨 뒤 ` *`            | 블로그는 발행 조건 리스트로 검증                                               |
| 진행형 라벨          | `{동사} 중…` (`업로드 중…`, `검색 중…`)         | —                                                                              |
| 워드마크             | `Sungjoon Lee.` (AdminChrome·LoginForm)         | —                                                                              |

### placeholder

- **예시값만** 넣는다: `2025`, `19:30`, `React`, `Geneva, CH`. `예:` 접두와 라벨 반복 금지. 설명이 필요하면 라벨이나 힌트 문단으로 옮긴다.
- 보이는 라벨이 없는 인라인 행(sr-only 라벨)은 placeholder가 라벨을 대신한다: `제목 (한국어)` 등.
- 말줄임은 `…` 한 글자(`https://…`), 기간 대시는 `—`.

## 치수

- 텍스트 버튼·입력 높이: **44(md) / 40(sm) / 36(xs)** 3단계. 인라인 행은 sm, 배열 추가 버튼은 xs, 입력과 나란한 버튼은 그 입력 높이에 맞춘다.
- 정사각 아이콘·칩 액션: **32(icon-md) / 28(icon-sm)** 2단계. 배열 이동 버튼과 칩 안 조작이 여기 해당한다. 텍스트 3단계와 섞지 않는다.
- Row 소형 액션(`edit`·`delete`)은 **32px**. 같은 줄의 `move` 버튼과 높이를 맞춘다.
- 어느 단계에도 24px 미만을 두지 않는다. WCAG 2.5.8 에는 간격 예외가 있어 곧바로 위반은 아니지만, 여유가 없는 치수다.
- 폼·편집기 폭: **{720, 860, 960}** 3단계만 사용 — 엔티티 폼 860, 밀도 높은 설정 편집기 960, 좁은 단일 열 720.
  - 예외: `ArticleForm`은 전폭(에디터+프리뷰 2단) + sticky 하단 액션 바.

## focus 소유권

| 요소                                                  | 소유자                           | 스타일                                                  |
| ----------------------------------------------------- | -------------------------------- | ------------------------------------------------------- |
| 텍스트 입력/textarea                                  | `AdminInput`                     | `outline: none` + `border-color: var(--accent)`         |
| `AdminButton`                                         | `AdminButton`                    | `outline: 2px solid var(--accent); outline-offset: 2px` |
| checkbox·Row 소형 버튼·배지·로그아웃 등 프리미티브 밖 | `AdminChrome.module.css` 셸 규칙 | AdminButton과 동일 선언                                 |
| 로그인 화면 (셸 밖)                                   | 프리미티브 자체 focus            | —                                                       |

셸 규칙과 프리미티브는 같은 선언을 쓴다. 새 focus 스타일을 다른 값으로 추가하지 않는다.
셸 규칙은 `AdminButton`이 붙이는 `data-admin-control`을 `:not()`으로 제외해 프리미티브를 매칭하지 않는다.
특이성이 아니라 매칭 범위로 소유권을 나눈다.

### 공개 페이지

관리자 규칙은 공개 페이지에 적용하지 않는다. 공개 트리의 소유자는 `globals.css`의 Focus 절이다.

| 요소                                  | 소유자                                    | 스타일                                                  |
| ------------------------------------- | ----------------------------------------- | ------------------------------------------------------- |
| 기본값 (링크·버튼·입력·`[tabindex]`)  | `globals.css` `:where(...):focus-visible` | `outline: 2px solid var(--accent); outline-offset: 2px` |
| 어두운 사진 위 크롬 (모달·라이트박스) | 각 `.module.css`                          | 같은 선언에 색만 `var(--text-inverse)`                  |
| 테두리 없는 입력을 감싼 상자 (검색창) | 각 `.module.css`                          | `:has()`로 링을 상자 바깥선에 그린다                    |

globals 규칙은 `:where()`라 특이도가 0이다. 컴포넌트가 자기 링을 선언하면 그쪽이 이기므로
기존 규칙을 깨지 않는다. 공개 페이지에 `:focus { outline: none }`을 쓰지 않는다.
테두리 색 변화만으로는 저시력 사용자에게 표시가 얇다.

## 후속 과제 (범위 밖 기록)

- 목록 셸(head·hint·state·빈 상태) 추출 — 7개 목록이 같은 구조를 반복하지만 이번 범위에서 제외
