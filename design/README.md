# 디자인 단일 출처 — Aperture.

이 프로젝트의 디자인은 **Claude Design에서 export한 프로토타입**이 단일 출처다.
구현 화면과 충돌하면 **디자인이 우선** — 단, 아래 "문서화된 의도적 이탈"은 예외.

## 위치

`design/claude_design/` — Claude Design 프로젝트 전체 export.

## 파일 맵 (무엇을 볼 것인가)

| 파일                    | 역할                                                                                     | 중요도 |
| ----------------------- | ---------------------------------------------------------------------------------------- | ------ |
| `Portfolio.html`        | 데스크톱 셸 — 상단 네비, 4뷰(작업/앨범/지도/소개), 라이트박스 모달, 내보내기 모달 마크업 | ★      |
| `Mobile.html`           | 모바일 셸 — 하단 탭바, 바텀시트 상세                                                     | ★      |
| `portfolio.js`          | **데이터 모델**(PHOTOS·ALBUMS) + 데스크톱 렌더 + 내보내기 프레임 로직                    | ★★★    |
| `mobile-screens.js`     | 모바일 화면 렌더 함수 (mHome/mAlbums/mMap/mAbout/mDetail…)                               | ★★     |
| `styles/tokens.css`     | **디자인 토큰** — 색·폰트·간격·radius. `globals.css :root` 이식의 원본                   | ★★★    |
| `styles/components.css` | 컴포넌트 스타일 (타일·모달·EXIF·프레임·칩…)                                              | ★★     |
| `styles/mobile.css`     | 모바일 레이아웃                                                                          | ★      |
| `styles/wireframe.css`  | 데스크톱 레이아웃 보조                                                                   | ★      |
| `images/`               | 샘플 사진 (tone01–12, wide1–4) — mock 데이터용                                           | —      |
| `screenshots/`          | 디자인 시안 스크린샷 (참고용)                                                            | —      |

## 무시할 것

- `_ds/hsw-design-system/` — **미사용.** `tokens.css` 주석에 `NOT the HSW system (per direction)` 로 명시됨. 이 디자인 시스템은 채택되지 않았다.
- `Foundations.html`, `Wireframes.html`, `Wireframes-Mobile.html`, `design-canvas.jsx` — 초기 반복 산출물. 최종 기준은 `Portfolio.html`(데스크톱) + `Mobile.html`(모바일).

## 토큰 요약 (`styles/tokens.css`)

- **폰트**: Newsreader(제목·워드마크, serif) / Schibsted Grotesk(UI·본문, sans) / Spline Sans Mono(좌표·기술수치, mono). CDN 핫링크 금지 → **next/font로 로드**.
- **색**: 그레이스케일 주도 + 액센트 1개(`#0a84ff` 블루) + 좋아요(`#ff2d55` 레드). Light/Dark는 `html[data-theme]`.
- **모서리**: 전부 각짐(`radius: 0`). pill(999px)은 **태그 칩 전용**.

## 문서화된 의도적 이탈 ★

"디자인 우선" 원칙의 **예외 4건** — 사용자와 합의된 변경이다. 이 4건 외의 임의 변경은 금지.

| #   | 디자인                      | 구현                                                            | 사유                                        |
| --- | --------------------------- | --------------------------------------------------------------- | ------------------------------------------- |
| 1   | 언어 토글 UI 없음           | ko/en 토글 추가 (데스크톱=상단 지구본 드롭다운, 모바일=메뉴 안) | 이중언어 지원 결정                          |
| 2   | 좋아요 = 로컬 토글          | 익명 **공개 카운트** (+1 전용, `likes≥1`이면 빨강 채움)         | Firestore delta-guard Rule로 무인증 +1 허용 |
| 3   | 지도 = 추상 SVG 맵          | **Google Maps** 실제 지도 + 좌표 핀                             | 실지도 요구                                 |
| 4   | 내보내기 해상도 "원본" 옵션 | 저장 해상도(webp ~2048px)까지만                                 | 원본 미보관 (Storage 보호)                  |

## 참조

- 프로젝트 헌법: [`CLAUDE.md`](../CLAUDE.md)
- 이식 원칙: [`frontend` agent](../.claude/agents/frontend.md) §디자인 이식 원칙
- 충실도 점검: `/design-check`
