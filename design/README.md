# 디자인 단일 출처 — Sungjoon Lee. (사진 · 음악 · 개발)

이 프로젝트의 디자인은 **Claude Design에서 export한 프로토타입**이 단일 출처다.
구현 화면과 충돌하면 **디자인이 우선** — 단, 아래 "문서화된 의도적 이탈"은 예외.

## 위치

**`design/ver_2/`** — 통합 포트폴리오 최종 export (사진 `Aperture.` 를 감싼 3섹션 셸). **구현 기준은 ver_2.**

> 이전 사진 전용 export는 `design/ver_1/`(구 `claude_design`)에 아카이브로 보존. `design/ver_*/_ds/`는 미채택 디자인 시스템 번들이므로 구현 기준에서 제외한다.

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

- `ver_*/_ds/hsw-design-system-*` — **미사용.** export에 포함된 디자인 시스템 번들이지만 현행 포트폴리오에는 적용하지 않는다.
- `Foundations.html`, `Wireframes*.html`, `Portfolio.html`, `Mobile.html`, `design-canvas.jsx` — 초기/사진 전용 반복 산출물.
  최종 기준은 **`Sungjoon Lee.html`(데스크톱) + `Sungjoon Lee - Mobile.html`(모바일)**.

## 토큰 요약 (`styles/tokens.css`)

- **폰트**: Newsreader(제목·워드마크, serif) / Schibsted Grotesk(UI·본문, sans) / Spline Sans Mono(좌표·기술수치, mono). CDN 핫링크 금지 → **next/font로 로드**.
- **색**: 그레이스케일 주도. Light/Dark는 `html[data-theme]`.
- **섹션 액센트**(`styles/site.css`, `html[data-section]`): **사진=블루 `#0a84ff`** · **음악=레드 `#e5484d`** · **개발=그린 `#16a34a`** · 랜딩=블루.
  다크모드 보정: 음악 `#ff5b60`, 개발 `#2ecc71`. **컴포넌트는 `--accent` 변수만 참조** (섹션 색 하드코딩 금지).
- **좋아요**(`#ff2d55` 레드)는 프로토타입에만 남아 있으며 현행 구현에서는 사용하지 않는다.
- **모서리**: 전부 각짐(`radius: 0`). pill(999px)은 **태그 칩 전용**.

## 셸 & 네비 (구현 규칙) ★

- **워드마크 = `Sungjoon Lee.`** (site nav). 사진 섹션 내부만 서브브랜드 `Aperture.`.
- **데스크톱 mega-menu**: 사진/음악/개발 + hover 드롭다운. **검색창은 가장 우측**(테마/언어 옆), **항상 노출**하며 제출하면 `/search?q=`로 이동한다. 모바일 검색은 버거 메뉴 안에 있다.
- **모바일**: 앱바(워드마크+테마+버거) + 섹션별 하단 탭바 + 버거 메뉴 아코디언(사진/음악/개발 + 검색).
- **음악·개발**은 개별 페이지 네비. 개발은 소개(`/dev`)·경력(`/dev/career`, 학력·경력·수상 + 기술 스택)·프로젝트(`/dev/projects`)로 나뉘며 프로젝트 상세는 `?project=` 모달이다.

## 문서화된 의도적 이탈 ★

"디자인 우선" 원칙의 **예외** — 사용자와 합의된 변경이다. 이 목록 외의 임의 변경은 금지.

| #   | 디자인                                          | 구현                                                                                                                                  | 사유                                                  |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | 언어 토글 UI 없음                               | ko/en 토글 추가 (데스크톱=상단 지구본 드롭다운, 모바일=메뉴 안)                                                                       | 이중언어 지원 결정                                    |
| 2   | 좋아요 = 로컬 토글                              | 현행 구현에서 제외                                                                                                                    | 현재 공개 포트폴리오 범위                             |
| 3   | 지도 = 추상 SVG 맵                              | **MapLibre GL + CARTO** 실제 지도 + 좌표 핀 (무료·키/카드 없음)                                                                       | 실지도 요구 (Google Maps 카드·비용 회피)              |
| 4   | 사진 프레임 내보내기                            | 현행 구현에서 제외. 업로드 이미지는 긴 변 약 2048px WebP로 저장                                                                       | 원본 미보관 (Storage 보호)                            |
| 5   | 사진 상단바 `.avatar`(유저)                     | **아바타/유저 아이콘 제거** — 관리자 진입은 `/admin` 직접                                                                             | 사용자 확정 (로그인 유저 아이콘 불요)                 |
| 6   | 음악·개발 콘텐츠 = 정적 ko                      | **Firestore CMS + ko/en 이중언어** (사진과 동일 관리)                                                                                 | 사용자 확정 (전 섹션 CMS·이중언어)                    |
| 7   | 랜딩 = 정적 eyebrow + `reveal` fade-up          | 역할 **타이핑 라인**(name 아래·순환·역할색) + **진입 애니메이션**(글자 블러 캐스케이드 · 마침표 공 바운스 · IntroSplash 걷힌 뒤 시작) | 사용자 요청 (랜딩 히어로 강조·"화려하되 과하지 않게") |
| 8   | 개발 프로젝트 모달 = 개요·담당·트러블슈팅(평문) | **스키마 확장** — 기간·포지션·주요 기능·성과 섹션 추가 + 트러블슈팅 **구조화 카드**(제목/문제/해결/결과)                              | 사용자 확정 (프로젝트 상세 이력서형 강화)             |
| 9   | 랜딩 개발 행 = 개발 섹션 루트 진입              | 대표 콘텐츠인 **프로젝트 목록(`/dev/projects`)으로 직행**. `/dev`는 소개 페이지                                                       | 사용자 확정 (랜딩에서 프로젝트 우선 노출)             |

## 참조

- 현재 제품과 아키텍처: [`CONTEXT.md`](../CONTEXT.md)
- 저장소 개요와 실제 폴더 구조: [`README.md`](../README.md)
- 확장 과정 기록: [`docs/plan/00-plan-v2.md`](../docs/plan/00-plan-v2.md) (완료 전 계획을 보존한 문서)
- 디자인 점검 절차: [`.claude/commands/design-check.md`](../.claude/commands/design-check.md)
