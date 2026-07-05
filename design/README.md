# 디자인 단일 출처 — Sungjoon Lee. (사진 · 음악 · 개발)

이 프로젝트의 디자인은 **Claude Design에서 export한 프로토타입**이 단일 출처다.
구현 화면과 충돌하면 **디자인이 우선** — 단, 아래 "문서화된 의도적 이탈"은 예외.

## 위치

**`design/ver_2/`** — 통합 포트폴리오 최종 export (사진 `Aperture.` 를 감싼 3섹션 셸). **구현 기준은 ver_2.**

> 이전 사진 전용 export는 `design/ver_1/`(구 `claude_design`)에 아카이브로 보존. `design/_ds/` 는 미채택 디자인 시스템(무시).

## 파일 맵 (무엇을 볼 것인가)

| 파일                                    | 역할                                                                                                 | 중요도 |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------ |
| `Sungjoon Lee.html`                     | **데스크톱 셸** — mega-menu 네비, 랜딩 허브, 3섹션 조립(#sec-photo/#sec-music/#sec-dev), 모달들      | ★★★    |
| `Sungjoon Lee - Mobile.html`            | **모바일 셸** — 앱바 + 섹션별 하단 탭바 + 버거 메뉴 시트(아코디언)                                   | ★★★    |
| `portfolio.js`                          | 사진 **데이터 모델**(PHOTOS·ALBUMS) + 데스크톱 렌더 + 내보내기 프레임 로직                           | ★★★    |
| `music.js`                              | 음악 섹션 — 데이터(WORKS·SCHEDULE·AWARDS·VIDEOS) + 렌더 + 연주/수상 모달 + 타이핑 (`window.Music`)   | ★★★    |
| `dev.js`                                | 개발 섹션 — 데이터(STACK·QA·PROJECTS·TIMELINE) + 렌더 + 프로젝트 모달 + reveal·타이핑 (`window.Dev`) | ★★★    |
| `mobile-screens.js`                     | 모바일 사진 화면 렌더 함수 (mHome/mAlbums/mMap/mAbout/mDetail…)                                      | ★★     |
| `styles/tokens.css`                     | **디자인 토큰** — 색·폰트·간격·radius. `globals.css :root` 이식의 원본 (현행과 동일)                 | ★★★    |
| `styles/site.css`                       | **통합 셸** — mega-menu, 랜딩, **섹션 액센트**(`html[data-section]`), 검색 relocate 규칙             | ★★★    |
| `styles/components.css`                 | 컴포넌트 스타일 (타일·모달·EXIF·프레임·칩…) — 사진 섹션                                              | ★★     |
| `styles/music.css`                      | 음악 섹션 스타일                                                                                     | ★★     |
| `styles/dev.css`                        | 개발 섹션 스타일                                                                                     | ★★     |
| `styles/mobile.css` · `mobile-site.css` | 모바일 레이아웃 (사진 · 셸)                                                                          | ★      |
| `styles/wireframe.css`                  | 데스크톱 레이아웃 보조                                                                               | ★      |
| `images/`                               | 샘플 사진 (tone01–12, wide1–4) — mock 데이터용                                                       | —      |
| `screenshots/`                          | 디자인 시안 스크린샷 (참고용)                                                                        | —      |

## 무시할 것

- `_ds/hsw-design-system/` (있다면) — **미사용.** `tokens.css` 주석에 `NOT the HSW system (per direction)`.
- `Foundations.html`, `Wireframes*.html`, `Portfolio.html`, `Mobile.html`, `design-canvas.jsx` — 초기/사진 전용 반복 산출물.
  최종 기준은 **`Sungjoon Lee.html`(데스크톱) + `Sungjoon Lee - Mobile.html`(모바일)**.

## 토큰 요약 (`styles/tokens.css`)

- **폰트**: Newsreader(제목·워드마크, serif) / Schibsted Grotesk(UI·본문, sans) / Spline Sans Mono(좌표·기술수치, mono). CDN 핫링크 금지 → **next/font로 로드**.
- **색**: 그레이스케일 주도. Light/Dark는 `html[data-theme]`.
- **섹션 액센트**(`styles/site.css`, `html[data-section]`): **사진=블루 `#0a84ff`** · **음악=레드 `#e5484d`** · **개발=그린 `#16a34a`** · 랜딩=블루.
  다크모드 보정: 음악 `#ff5b60`, 개발 `#2ecc71`. **컴포넌트는 `--accent` 변수만 참조** (섹션 색 하드코딩 금지).
- **좋아요**(`#ff2d55` 레드)는 사진 전용.
- **모서리**: 전부 각짐(`radius: 0`). pill(999px)은 **태그 칩 전용**.

## 셸 & 네비 (구현 규칙) ★

- **워드마크 = `Sungjoon Lee.`** (site nav). 사진 섹션 내부만 서브브랜드 `Aperture.`.
- **데스크톱 mega-menu**: 사진/음악/개발 + hover 드롭다운. **검색창은 가장 우측**(테마/언어 옆), **항상 노출**(제출 시 `/photo?q=`). 모바일은 버거 메뉴 안. (디자인은 사진 한정이나 사용자 확정으로 전 섹션 노출.)
- **모바일**: 앱바(워드마크+테마+버거) + 섹션별 하단 탭바 + 버거 메뉴 아코디언(사진/음악/개발 + 검색).
- **음악·개발**은 단일 스크롤 페이지 + 앵커 인-페이지 네비. 상세는 모달(사진 `?photo=` / 연주 `?work=` / 프로젝트 `?project=`).

## 문서화된 의도적 이탈 ★

"디자인 우선" 원칙의 **예외** — 사용자와 합의된 변경이다. 이 목록 외의 임의 변경은 금지.

| #   | 디자인                      | 구현                                                            | 사유                                        |
| --- | --------------------------- | --------------------------------------------------------------- | ------------------------------------------- |
| 1   | 언어 토글 UI 없음           | ko/en 토글 추가 (데스크톱=상단 지구본 드롭다운, 모바일=메뉴 안) | 이중언어 지원 결정                          |
| 2   | 좋아요 = 로컬 토글          | 익명 **공개 카운트** (+1 전용, `likes≥1`이면 빨강 채움)         | Firestore delta-guard Rule로 무인증 +1 허용 |
| 3   | 지도 = 추상 SVG 맵          | **MapLibre GL + CARTO** 실제 지도 + 좌표 핀 (무료·키/카드 없음) | 실지도 요구 (Google Maps 카드·비용 회피)    |
| 4   | 내보내기 해상도 "원본" 옵션 | 저장 해상도(webp ~2048px)까지만                                 | 원본 미보관 (Storage 보호)                  |
| 5   | 사진 상단바 `.avatar`(유저) | **아바타/유저 아이콘 제거** — 관리자 진입은 `/admin` 직접       | 사용자 확정 (로그인 유저 아이콘 불요)       |
| 6   | 음악·개발 콘텐츠 = 정적 ko  | **Firestore CMS + ko/en 이중언어** (사진과 동일 관리)           | 사용자 확정 (전 섹션 CMS·이중언어)          |
| 7   | 랜딩 = 정적 eyebrow + `reveal` fade-up | 역할 **타이핑 라인**(name 아래·순환·역할색) + **진입 애니메이션**(글자 블러 캐스케이드 · 마침표 공 바운스 · IntroSplash 걷힌 뒤 시작) | 사용자 요청 (랜딩 히어로 강조·"화려하되 과하지 않게") |

## 참조

- 프로젝트 헌법: [`CLAUDE.md`](../CLAUDE.md)
- 확장 로드맵: [`docs/plan/00-plan-v2.md`](../docs/plan/00-plan-v2.md)
- 이식 원칙: [`frontend` agent](../.claude/agents/frontend.md) §디자인 이식 원칙 · §13–15(셸·음악·개발)
- 충실도 점검: `/design-check`
