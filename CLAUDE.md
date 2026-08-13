# Sungjoon Lee. — 통합 포트폴리오 (사진 · 음악 · 개발)

> 디자인 단일 출처: [`design/README.md`](design/README.md) → `design/ver_2/` (Claude Design에서 export한 Desktop/Mobile 프로토타입).
> 구현과 디자인이 충돌하면 **디자인이 우선** (단, [문서화된 의도적 이탈](design/README.md) 예외).
> 운영 철학: **서버 0대, 월 $0**. 관리자(본인) 1명 + 불특정 방문자 구조이므로
> 상시 가동 백엔드 대신 Firebase BaaS + 정적 우선 렌더링.
>
> ⚠️ **이 저장소는 사진 포트폴리오 `Aperture.` 에서 출발**해 지금은 **이성준 개인 통합 포트폴리오 `Sungjoon Lee.`** 로 확장 중이다.
> 사진 섹션은 기존 구현(P1·P2 완료)을 그대로 계승하고 브랜드만 서브브랜드 `Aperture.` 로 유지한다.
> 확장 로드맵은 [`docs/plan/00-plan-v2.md`](docs/plan/00-plan-v2.md) (v1 = 사진 전용 [`docs/plan/00-plan.md`](docs/plan/00-plan.md), 대부분 완료).

## Project Vision

**이성준(Sungjoon Lee)** 의 개인 통합 포트폴리오. 사이트 워드마크 `Sungjoon Lee.`, 태그라인 **Photographer · Pianist · Developer**.
하나의 셸(상단 mega-menu 네비 + 랜딩 허브) 아래 **세 개의 섹션**이 각자의 액센트 색과 콘텐츠를 갖는다.

| 섹션     | 경로       | 액센트             | 정체성 / 콘텐츠                                                                           |
| -------- | ---------- | ------------------ | ----------------------------------------------------------------------------------------- |
| **랜딩** | `/`        | 블루               | 3섹션 진입 허브 — 개발 행은 프로젝트(`/dev/projects`), 사진·음악 행은 각 섹션 루트로 이동 |
| **사진** | `/photo/*` | **블루** `#0a84ff` | 서브브랜드 `Aperture.` — 작업·앨범·지도·소개 + 상세 모달 + 프레임 내보내기                |
| **음악** | `/music/*` | **레드** `#e5484d` | 피아니스트 — 연주·경력(학력·경력·수상)·영상·소개 (개별 페이지 + 연주/수상 모달)           |
| **개발** | `/dev/*`   | **그린** `#16a34a` | 프론트엔드 개발자 — 소개·경력(기술 스택 포함)·프로젝트 (개별 페이지, Phase C)             |
| **연락** | `/contact` | **주황** `#f5820d` | 전역 연락 페이지 — mailto 폼 + 인스타·깃헙·메일 링크 (섹션 아니지만 자체 액센트)          |

- **방문자**: 로그인 없음, **ko/en 토글**, 다크모드. 각 섹션을 자유 열람.
  - 사진: EXIF·촬영 위치·태그·**프레임 내보내기**.
  - 음악: 연주 프로그램·예매 정보·영상 임베드.
  - 개발: 프로젝트 상세(개요·담당·트러블슈팅·스택·링크).
- **관리자(본인 1명)**: 로그인 후 **세 섹션 모두** 콘텐츠 관리(CMS). 사진 업로드 시 **EXIF 자동 추출**, **드래그로 수동 정렬**.

## 확정 스택 & 결정 기록

| 레이어      | 선택                                              | 왜 (결정 사유)                                                                                                                         |
| ----------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 프레임워크  | Next.js (App Router)                              | 공개 페이지 정적 우선 + 관리자 페이지 동거. 3섹션 라우트 공존                                                                          |
| 호스팅      | Vercel Hobby                                      | 무료, git push 자동 배포                                                                                                               |
| 인증        | Firebase Auth                                     | 관리자 1명. **회원가입 없음** — 콘솔에서 계정 1개 수동 생성                                                                            |
| DB          | Firestore                                         | **무활동 일시정지 없음**. 사진·음악·개발 콘텐츠 전부 여기 (섹션별 컬렉션)                                                              |
| 이미지      | Firebase Storage                                  | 브라우저에서 직접 업로드, **webp 3단 압축** (2048px 메인·960px 프리뷰·320px 썸네일)                                                    |
| 스타일      | **CSS Modules + CSS 변수**                        | 디자인 export가 순수 CSS → Tailwind 재작성 세금 회피 + 파일당 SRP. **Tailwind 미사용**                                                 |
| i18n        | 자체 구현 (라이브러리 X)                          | **경로 기반 /ko·/en** (`app/[lang]/`, 구글 권장) + `pickText` 폴백. **전 섹션 이중언어**. [ADR-0002](docs/adr/0002-path-based-i18n.md) |
| 지도        | **MapLibre GL + CARTO**                           | 사진 좌표를 실제 지도에 핀. 무료 타일·**키/카드 없음**, 테마 연동(Positron/Dark Matter)                                                |
| EXIF        | `exifr`                                           | 업로드 시 **압축 前** 자동 추출 (조리개·셔터·ISO·초점·렌즈·카메라·촬영일시·GPS)                                                        |
| 내보내기    | 클라이언트 canvas                                 | 프레임 6종 + EXIF 각인 → webp. **저장 해상도 기준**(원본 미보관)                                                                       |
| 애니메이션  | CSS + `motion`                                    | 랜딩/개발 reveal-on-scroll, 타이핑 효과, 페이지 전환. 무거운 라이브러리 회피                                                           |
| 블로그 본문 | `mdast-util-from-markdown` (+gfm-table·directive) | 파싱만 라이브러리, 렌더는 **허용 노드 → React element 직접 매핑**. HTML 문자열 단계가 없어 sanitizer·`dangerouslySetInnerHTML` 불필요  |
| 코드 색칠   | `shiki` **서버 전용**                             | 문법·테마를 브라우저에 보내지 않는다. 토큰만 넘기고 라이트·다크는 CSS 변수 한 쌍(`--shiki-light`/`--shiki-dark`)                       |

> ⚠️ **Firebase Storage는 Blaze(종량제) 전환 + 카드 등록 필요.** 무료 한도 내에서는 청구액 $0.
> **GCP 예산 알림 $1 등록 필수.** 지도는 MapLibre+CARTO 무료 타일이라 **카드 등록 표면은 Firebase 하나뿐** (Google Maps 미사용 — 카드·비용 회피).
> 오류 모니터링은 카드 등록이 필요 없는 Sentry Developer 플랜을 사용한다. 쿼터를 초과하면 수집만 중단된다([ADR-0004](docs/adr/0004-consent-gated-error-monitoring.md)).

### 상단 네비게이션 규칙 (사용자 확정) ★

- **검색창**: 데스크톱 상단 네비의 **가장 우측**(테마/언어 토글 옆), **항상 노출**. 제출 시 통합 검색(`/search?q=`)으로 이동. (모바일은 버거 메뉴 안.)
- **로그인 유저 아이콘(아바타) 없음.** 디자인 프로토타입의 `.avatar` 요소는 이식하지 않는다. 관리자 진입은 `/admin` 직접 접근.
- 데스크톱 = mega-menu(사진/음악/개발 + 드롭다운 패널) / 모바일 = 앱바(워드마크+테마+버거) + 섹션별 하단 탭바 + 버거 메뉴 시트(아코디언).

## 아키텍처 원칙 (서버리스)

1. **별도 백엔드 서버 없음.** 보안 경계는 Firestore/Storage **Security Rules가 전부**다.
   클라이언트 코드의 인증 가드는 UX 편의일 뿐, 보안이 아니다.
2. **관리자 판별 = 단일 UID 비교.** Rules의 `isAdmin()` 함수에서 본인 UID 하드코딩.
3. **이미지 흐름**: 브라우저에서 ① `exifr`로 EXIF·좌표 추출(**압축 前 ★**, 사진만) → ② 원본 dimension 추출 →
   ③ `browser-image-compression`으로 webp(2048px 메인·960px 프리뷰·320px 썸네일) 압축 → ④ Storage 직접 업로드 → ⑤ 다운로드 URL + 메타를 Firestore에 저장.
   (음악 포스터·개발 썸네일은 EXIF 추출 없이 ②③④⑤만.)
4. **방문자 read 규칙**: `published == true` 문서만. 초안은 관리자만 읽기 가능. **전 컬렉션 공통.**
5. **firebase-admin SDK 사용 금지.** 서비스 계정 키가 필요해지는 순간 서버리스 원칙이 깨진다.
   (hook이 서비스 계정 키 파일 수정을 차단함)
6. **공개 페이지 서버 읽기 = Firestore REST API + `fetch`** (`lib/firebase/firestore-rest.ts`),
   클라이언트 SDK 아님. 클라 SDK를 서버 렌더(ISR 재생성)에서 쓰면 stale/실패 → 재생성이 폐기되고
   재빌드 전까지 공개 페이지가 안 바뀐다. REST는 `fetch` 기반이라 ISR·`revalidatePath`와 정상 연동.
   published 문서·`site`는 Rules가 무인증 read를 허용 → 웹 API 키만으로 충분. **쓰기·관리자 읽기만 클라 SDK**(`firestore.ts`).
7. **★ 무인증 쓰기 전면 금지.** 방문자는 모든 컬렉션을 읽기만 하며, Firestore·Storage 쓰기는 관리자만 허용한다.
   공개 server action도 Firebase ID token을 검증하고 관리자 UID와 일치할 때만 실행한다.
8. **★ AI = 서버리스 Route Handler만.** 채팅과 OpenAI 임베딩 키는 Vercel 서버 환경변수로 분리하고
   브라우저 번들에 노출하지 않는다. 관리자 쓰기는 Firebase ID token과 고정 관리자 UID를 검증한다.
   별도 상시 서버와 `firebase-admin`은 두지 않는다. 자세한 결정은 `docs/adr/0001-serverless-rag.md`를 따른다.
9. **★ 섹션 액센트 = `html[data-section]`.** 라우트에 따라 `photo`(블루)/`music`(레드)/`dev`(그린)/`home`(블루)를 설정,
   `globals.css`가 `--accent` 계열을 오버라이드. 컴포넌트는 항상 `--accent` 변수만 참조(섹션별 색 하드코딩 금지).

## 데이터 모델 (Firestore)

> ko/en 이중언어 필드는 `{ko, en}` map. 언어 무관 필드(카메라·렌즈·EXIF 수치·좌표·날짜·파일명·기술 태그·URL)는 평면 값.
> 모든 시간 필드는 Timestamp, 표시 포맷은 렌더 시. **전 리스트 컬렉션 공통**: `order`(수동 정렬) · `published` · `createdAt` · `updatedAt`.
> 공개 쿼리 = `where(published==true) + orderBy(order)` → 컬렉션마다 **복합 인덱스 1개** (`firestore.indexes.json`).

### 사진 섹션 (기존)

| 컬렉션   | 역할             | 주요 필드                                                                                                                                                                                                                                               |
| -------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `photos` | 사진 (작업)      | title{ko,en}, shotAt(TS), camera, lens, exif{aperture,shutter,iso,focalLength,ev,wb,metering,flash}, dimensions{w,h}, aspectRatio, place{ko,en}, coords{lat,lng}\|null, tags[](태그 id 참조), image{url,path,w,h,preview?,thumbnail?}, order, published |
| `albums` | 앨범 (사진 묶음) | title{ko,en}, subtitle{ko,en}, **coverPhotoId**, cover?(관리자 목록용 이미지 스냅샷), photoIds[](**수동 순서**), order, published                                                                                                                       |

### 음악 섹션 (신규)

| 컬렉션        | 역할      | 주요 필드                                                                                                                                                                                                             |
| ------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `musicWorks`  | 연주 목록 | title{ko,en}, subtitle{ko,en}(작곡가·작품번호), performedAt(TS), time, venue{ko,en}, category{ko,en}(리사이틀/협연/갈라), program[](곡명 평면), description{ko,en}, poster{url,path,w,h}, ticketUrl, order, published |
| `musicAwards` | 수상 경력 | year(number), name{ko,en}, place, description{ko,en}, order, published                                                                                                                                                |
| `musicMedia`  | 영상      | title{ko,en}, source{ko,en}, youtubeId, order, published                                                                                                                                                              |

### 개발 섹션 (신규)

| 컬렉션        | 역할     | 주요 필드                                                                                                                                                                                                                                                                                                                                                         |
| ------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `devProjects` | 프로젝트 | title{ko,en}, category{ko,en}, year, period{ko,en}, position{ko,en}, summary{ko,en}, overview{ko,en}, features[]{ko,en}(제품 기능), roles[]{ko,en}(담당·작업), troubleshooting[]{title,problem,solution,result?}(각 {ko,en}), achievements[]{ko,en}(성과·수상·지표), techTags[](평면), links[]{label,href}, cover{url,path,w,h}\|null, images[], order, published |

### 고정 config 문서 (`site` 컬렉션)

| 문서 ID  | 역할           | 주요 필드                                                                                                                                                                                      |
| -------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config` | 전역 + 사진    | name{ko,en}, **tagline{ko,en}**, **landingLead{ko,en}**, bio{ko,en}, links[]{label,href}, **tags[]{id,ko,en}**(사진 태그 사전)                                                                 |
| `music`  | 음악 섹션 설정 | intro{ko,en}(소개 헤드라인·본문 — 첫 문장=요약), career[]{period,title{ko,en}}, education[]{period,title{ko,en}}                                                                               |
| `dev`    | 개발 섹션 설정 | heroLead{ko,en}, typeWords[], interview[]{q{ko,en},a{ko,en}}, stack[]{category,items[]}, timeline[]{period,title{ko,en},role{ko,en},desc{ko,en}}, githubUrl, resumeUrl, contactEmail, social[] |

설계 메모:

- **정렬 = 수동 `order` 필드** (dnd-kit로 관리자가 드래그). 앨범 내 사진 순서 = `photoIds` 배열 순서.
- **사진 태그는 통제 사전** — `site/config.tags`에 `{id, ko, en}`을 정의, 사진은 **id만 참조**. 카메라·초점거리 필터는 photos EXIF에서 파생.
- **음악 program·개발 techTags**는 평면 배열(곡명·기술명은 언어 무관). category/name/설명 등 서술 필드만 `{ko,en}`.
  개발 troubleshooting 은 구조화 map 배열({title,problem,solution,result?})이며 그 텍스트 하위 필드가 `{ko,en}`.
  구형 평문 `{ko,en}` 항목은 디코더의 `normalize-troubleshooting` 이 하위호환 정규화(재저장 시 신형 이행).
- **좌표는 사진 전용** — EXIF GPS 자동 또는 관리자 지도 클릭. 음악·개발엔 좌표 없음.
- 콘텐츠 소량 → **페이지네이션 없음**, 전체 fetch + 클라이언트 필터/검색. 검색은 사진 섹션 한정.
- slug 없음 — 사진 상세·연주 상세·프로젝트 상세는 **모달**(`?photo=`/`?work=`/`?project=` 딥링크), 문서 ID가 식별자. 앨범 상세 = `/photo/albums/[id]`.

상세 설계·Rules 패턴은 [`firebase` agent](.claude/agents/firebase.md) 참조.

## 디렉토리 구조 (단일 Next.js 앱, 루트 — 3계층: app → features → components)

```
src/
├── app/                        # ★ 라우팅 껍데기만 (fetch + features 조립)
│   ├── [lang]/(public)/        # 방문자 — /ko·/en 프리픽스, Server Component + revalidate ([lang]/layout.tsx가 lang 검증·경로 모드 LangProvider)
│   │   ├── page.tsx            # ★ 랜딩 허브 (/ — 이름·태그라인 + 3섹션 진입 행)
│   │   ├── photo/              # 사진 섹션 (서브브랜드 Aperture.)
│   │   │   ├── page.tsx        # 작업 — 사진 그리드 + 필터 (?photo= 모달)
│   │   │   ├── albums/page.tsx        albums/[id]/page.tsx
│   │   │   ├── map/page.tsx    # 지도 (MapLibre+CARTO — next/dynamic ssr:false)
│   │   │   └── about/page.tsx  # 소개 (통계 파생)
│   │   ├── music/              # 음악 — 연주·경력·영상·소개 개별 페이지
│   │   ├── dev/                # 개발 — 소개(/dev)·경력+기술 스택(/dev/career)·프로젝트 개별 페이지
│   │   └── layout.tsx          # chrome(SiteHeader) 마운트는 여기서만 + 섹션 액센트 세팅
│   ├── admin/                  # 관리자 — 전부 client, AuthGuard 마운트는 admin/layout.tsx
│   │   ├── login/
│   │   ├── photos/  albums/  tags/  site/   # 사진 CMS (기존)
│   │   ├── music/              # 음악 CMS: works · awards · media · config
│   │   └── dev/                # 개발 CMS: projects · config
│   └── layout.tsx              # 폰트 3종 + 테마 no-flash + LangProvider
├── features/                   # ★ 기능 단위 조합 — 비즈니스 로직 있음
│   │                           # ★ 폴더 내부 = 타입별 하위폴더: _components/(*.tsx + 동거 *.module.css) · _hooks/(use-*.ts) · _lib/(그 외 *.ts)
│   ├── gallery/                # 예) _components/{GalleryView,FilterBar}.tsx(+.module.css) · _hooks/use-photo-filter · _lib/filter-photos
│   ├── landing/                # _components/LandingView (reveal-on-scroll, 3섹션 진입)
│   ├── photo-detail/           # _components/{PhotoModal(라이트박스/바텀시트),ExifPanel,미니맵} · _hooks/use-photo-modal
│   ├── albums/  map/  about/   # 사진 섹션 뷰 (_components/)
│   ├── export/                 # 프레임 내보내기
│   ├── contact/                # _components/ContactView (mailto 폼 + 소셜 링크)
│   ├── analytics/              # 분석 동의 상태·배너·GA 동적 로딩과 철회 처리
│   ├── legal/                  # _components/LegalDocumentView 공용 레이아웃 · _lib/legal-documents.tsx 한·영 정책 원문
│   ├── music/                  # 음악 섹션: 연주(Works)·경력(학력·경력·수상)·영상·소개 개별 뷰 + 연주/수상 모달 (_components/)
│   ├── dev/                    # 개발 섹션: 소개·경력(+기술 스택)·프로젝트 뷰 + 프로젝트 모달 (_components/)
│   ├── dev-blog/               # ★ 횡단(platform) — 공개 상세와 관리자 편집기가 공유. _lib/markdown-*(파서·검증·목차·읽기 시간·서버 색칠) · _components/{ArticleDocumentView,ArticleBody,ArticleCodeBlock,ArticleYouTube}
│   ├── site-header/            # _components/: SiteHeader(mega-menu + 연락 링크), 모바일 탭/메뉴, ThemeToggleButton, LangMenu, SearchBox(사진 한정)
│   ├── theme/  lang/           # 다크모드(html[data-theme]) · ko/en Context — _hooks/·_lib/·_components/
│   ├── auth/                   # _components/{LoginForm,AuthGuard} · _hooks/use-auth
│   ├── image-upload/           # _hooks/{use-image-upload,use-poster-upload,use-dev-image-upload} · _lib/{compress,read-dimensions}
│   ├── admin-dev-articles/     # 블로그 CMS: _lib/(저장소 경계·slug·발행 조건·복구본·미리보기 action) · _hooks/ · _components/
│   └── admin-*/                # 섹션별 폼(_components/) + use-*-admin hook(_hooks/, dnd-kit 정렬) — 사진·음악·개발
├── components/                 # ★ 순수 재사용 UI — 비즈니스 로직·firebase 접근 금지, props만
│   └── (PhotoTile, Modal, ExifList, Chip, MapPin, FrameCard, SectionHeading, WorkPoster, ProjectCard, YouTubeFacade …) + 각 .module.css
├── lib/firebase/               # client.ts, auth.ts, firestore.ts, firestore-rest.ts, storage.ts
├── lib/admin/                  # 관리자 저장소 경계 — 컬렉션별 *-repository.ts 가 mock(로컬)↔live(Firestore) 선택 ★ + mock/(로컬 저장 구현)
├── lib/content/                # 공개 페이지 getter — mock↔Firestore 교체 지점 ★ (get-photos/albums/music-*/dev-*/site)
├── lib/i18n/                   # pick-text.ts (ko/en 폴백)
├── lib/exif/                   # exifr 래퍼 (사진 전용)
├── mocks/                      # env 미설정 시 폴백 (design 데이터 이식 — photos/albums/music/dev/site)
├── constants/                  # COLLECTIONS, DICTIONARY, NAVIGATION(mega-menu), ROUTES, STORAGE_KEYS, FRAME_STYLES, SECTIONS(액센트)
├── hooks/                      # 2개 이상 feature가 공유하는 hook만 (use-scroll-lock)
└── types/                      # photo, album, music(work/award/media/config), dev(project), dev-article(+tag), site, tag, localized, timeline, lang, image, coords
```

의존 방향: `app → features → components` (역방향 금지). barrel export(index.ts) 금지 — 직접 경로 import.

**features/ 폴더 내부 정리 규칙 ★**: 각 feature 폴더는 파일을 타입별 하위폴더로 나눈다 — `_components/`(`*.tsx` + 짝 `*.module.css` 동거) · `_hooks/`(`use-*.ts`) · `_lib/`(그 외 순수 `*.ts` 유틸). 해당 타입 파일이 없으면 그 하위폴더도 없음.
import는 **같은 하위폴더면 `./`**(예: `_components/` 안의 컴포넌트↔짝 CSS↔형제 컴포넌트), **다른 하위폴더면 `@/features/<폴더>/<하위>/…` alias**(`../` 금지 — hook 경고). 예: `@/features/gallery/_components/GalleryView`, `@/features/gallery/_hooks/use-photo-filter`, `@/features/gallery/_lib/filter-photos`.
(단 `components/`·`lib/` 등 features 밖은 이 규칙 대상 아님 — 기존대로 평면 + CSS 동거.)

### 라우팅 & URL 마이그레이션 (경로 기반 i18n — [ADR-0002](docs/adr/0002-path-based-i18n.md))

- **공개 URL은 전부 `/ko/*`·`/en/*` 로케일 프리픽스**(`app/[lang]/(public)/*`). URL 세그먼트가 언어의 단일 출처 — `LangProvider` 경로 모드가 SSR부터 해당 언어로 렌더한다. `/ko/` = 랜딩(ko), 랜딩의 개발 행은 대표 콘텐츠인 `/dev/projects`로 바로 진입한다.
- **언어가 없는 루트 `/`만 `src/proxy.ts`에서 조건부 307**: 명시적 언어 쿠키(`ap-lang-pref-v1`) → `Accept-Language` → `ko` 기본값 순서로 `/ko` 또는 `/en`을 고르고 query를 보존한다. 응답은 `private, no-store`이며 수동 선택 전에는 쿠키를 쓰지 않는다. 그 밖의 무-로케일·구 URL은 `next.config` redirects로 `/ko/*`에 308 직행(체인 금지): `/photo/* → /ko/photo/*`(음악·개발·연락·검색 동일), v1 URL `/albums → /ko/photo/albums`, `/map → /ko/photo/map`, `/about → /ko/photo/about`. 명시적인 `/ko/*`·`/en/*`는 자동 전환하지 않고 언어 메뉴만 같은 페이지의 반대 언어 경로로 이동한다.
- 공개 내부 링크는 `LocalizedLink`(현재 언어 프리픽스 자동 부착), 경로 유틸은 `lib/i18n/locale-path.ts` 단일 출처. pathname 소비 코드는 `stripLangPrefix` 경유(섹션 판별·활성 링크). hreflang은 ko·en 상호 참조 + x-default(ko)를 `pageMetadata`·sitemap이 공유한다.
- 음악·개발은 **개별 페이지**로 구성한다. 개발은 `/dev`=소개, `/dev/career`=학력·경력·수상 + 기술 스택, `/dev/projects`=프로젝트이며 프로젝트 상세는 `?project=` 딥링크 모달이다. 구 `/dev/about`은 같은 언어의 `/dev`로 308 리다이렉트한다.
- `/admin/*` 는 **로케일 밖**(프리픽스 없음) — 세 섹션 CMS를 모두 포함(사진·음악·개발). 관리자 UI 언어는 기존 localStorage 스토어 모드 유지.

## 환경변수 (`.env.local` — hook이 자동 수정 차단, 직접 편집)

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_ADMIN_UID=                 # UI 가드 + 검증된 ID token UID 비교(Rules 하드코딩 UID와 동기화)
# NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX      # (선택) GA4 측정 ID. 미설정 시 gtag 미삽입. 실값은 Vercel에만
# NEXT_PUBLIC_SENTRY_DSN=             # (선택) Sentry DSN. DSN·지역 중 하나라도 비거나 불일치하면 비활성
# NEXT_PUBLIC_SENTRY_DATA_REGION=US|DE # 필수 짝. 실제 Sentry 저장 지역과 일치하지 않으면 수집 금지
# SENTRY_AUTH_TOKEN=                  # (빌드 전용 시크릿) 소스맵 업로드용. .env.sentry-build-plugin·Vercel에만 저장
# NEXT_PUBLIC_FORCE_ANALYTICS_CONSENT_BANNER=0|1 # (개발 전용) 저장 상태와 무관하게 동의 배너 미리보기
# NEXT_PUBLIC_USE_MOCK=0|1            # (선택) 콘텐츠 소스 강제. 미설정 시 dev=mock·prod=real 자동. 프로덕션 빌드에 '1'이면 next.config가 즉시 throw
# NEXT_PUBLIC_ADMIN_TEST_SESSION=0|1  # (개발·E2E 전용) AuthGuard 우회 — 프로덕션 빌드에서 '1'이면 즉시 throw. mock 여부와 무관한 별도 플래그
# APERTURE_E2E_ALLOW_PRODUCTION_MOCK=1 # (E2E·시각 회귀 전용) 위 mock 금지 가드의 탈출구. NEXT_PUBLIC_ 아님 → 브라우저 번들 미포함. 배포 환경에 넣지 않는다
```

> GA4와 Sentry 브라우저 수집은 방문자가 각 항목을 허용한 뒤에만 해당 클라이언트 청크를 로드한다(세분화 동의 배너,
> [ADR-0004](docs/adr/0004-consent-gated-error-monitoring.md)). 선택은 `ap-consent:v3` localStorage에
> 저장하며 Footer에서 철회·재허용할 수 있다. Sentry 서버·엣지 수집은 동의 무관하되 dataCollection
> 최소화·스크럽으로 헤더·본문·쿼리·방문자 식별자를 담지 않고, 브라우저 이벤트는 `/monitoring` 터널(동일 출처)로
> 전송해 CSP를 넓히지 않는다. 언어 선택 쿠키와 동의를 결합하지 않는다. Privacy, Terms, Accessibility
> 원문은 `src/features/legal/_lib/legal-documents.tsx`에서 함께 관리한다.

> **콘텐츠 소스(개발 편의)**: getter는 **개발(`npm run dev`)에선 mock 우선**(음악·개발 미완성 중 UI 테스트),
> **프로덕션 빌드는 실데이터**(배포 안전). `NEXT_PUBLIC_USE_MOCK` 로 강제 override(`0`=실데이터, `1`=mock). — `lib/content/content-source.ts`
> **관리자 화면도 같은 스위치를 따른다(B3.5)**: mock 모드의 관리자 저장은 Firestore 가 아니라 브라우저 로컬 저장소로
> 간다(`lib/admin/*-repository.ts` 가 mock/live 선택, 상단 MOCK 배지로 표시). **실데이터를 만지려면 `NEXT_PUBLIC_USE_MOCK=0`.**
>
> **프로덕션 빌드 + mock 은 `next.config.ts` 가 막는다**(`lib/content/assert-deployable-content-source.ts`).
> Vercel 여부를 보지 않으므로 self-host 배포에도 걸리고, `next build` 와 `next start` 양쪽에서 실행된다.
> 재현 가능한 화면이 필요한 E2E·시각 회귀만 서버 전용 `APERTURE_E2E_ALLOW_PRODUCTION_MOCK=1` 로 연다
> (`e2e/run.cjs` 가 build·server 환경 모두에 주입). **로컬에서 mock 프로덕션 빌드를 점검할 때도 이 플래그가 필요하다.**

> 지도(MapLibre+CARTO)는 **키가 없다** — CARTO 무료 타일 사용.
> Firebase 웹 키(`AIza…`)는 공개돼도 보안 위험이 아니다 — 보안은 Rules가 담당.
> LLM·임베딩 키는 Vercel 서버 환경변수에만 둔다. `NEXT_PUBLIC_` 접두사를 사용하거나 코드에 하드코딩하지 않는다.

## 무료 한도 가드

| 리소스       | 무료 한도                          | 이 프로젝트 대응                                                    |
| ------------ | ---------------------------------- | ------------------------------------------------------------------- |
| Firestore    | 읽기 5만/일, 쓰기 2만/일, 저장 1GB | 공개 페이지 ISR 캐싱으로 읽기 절약. 쓰기는 관리자만 허용            |
| Storage      | 5GB, 다운로드 1GB/일               | 업로드 전 3단 WebP 압축. Vercel 최적화 없이 용도별 파생본 직접 전송 |
| Vercel       | 100GB 대역폭/월                    | next/image 최적화                                                   |
| 지도 (CARTO) | 무료 타일 (저트래픽)               | 키·카드·과금 없음. `/photo/map` 라우트에서만 dynamic 로드           |

## 개발 명령어

```bash
npm run dev          # 개발 서버 (port 3000)
npm run build        # 프로덕션 빌드 (배포 전 필수 통과)
npm run lint         # ESLint
firebase emulators:start   # Rules 로컬 테스트 (Auth/Firestore/Storage)
firebase deploy --only firestore:rules,storage   # Rules만 배포
```

### ⚠️ 의존성 추가 시 lockfile은 npm 10으로 재생성 (CI 필수)

CI(ci.yml)는 전 잡이 **Node 22(npm 10.9.x)** 에서 `npm ci`로 설치한다. 로컬 npm 11로 `npm install` 하면
lockfile이 churn된다(peer 플래그 뒤집기 + `@emnapi/*` 엔트리 삭제) → CI `npm ci`가 "Missing from lock file"로 전 잡 실패.
**의존성 추가/변경 후 커밋 전에 반드시:**

```bash
git checkout -- package-lock.json          # npm 11이 쓴 churn 롤백
npx npm@10 install --package-lock-only     # CI와 같은 npm 10으로 재생성
npx npm@10 ci --dry-run                    # 검증 (에러 없으면 OK)
```

diff에 추가한 패키지 엔트리만 남아야 정상. `package.json`과 `package-lock.json`은 **반드시 같은 커밋**에.

## 컨벤션

- 커밋: `[TYPE] 한글 제목` — [git-commit-convention](.claude/skills/git-commit-convention/SKILL.md)
- 브랜치: `main` + `feature/{요약}` 단순 전략 — [git-branch-strategy](.claude/skills/git-branch-strategy/SKILL.md)
- **파일당 단일 책임(SRP)** — 사용자 강선호 ([memory](.claude/memory/feedback_srp_per_file.md))
- 상대경로 import(`../`) 금지 → `@/` alias (hook이 경고)
- UI 표시 문자열은 ko/en 사전 경유 / 영어 코드·변수명. **전 섹션 콘텐츠 이중언어**(음악·개발 포함)
- **스타일 = CSS Modules** (컴포넌트별 `.module.css`, 짝 `.tsx`와 같은 폴더에 동거 — features에선 `_components/` 안). 색·간격은 `globals.css`의 `:root` 변수 경유
  (디자인 `tokens.css` 이식). **hex 직박 금지**, 다크모드는 `[data-theme]` 셀렉터, **섹션 액센트는 `[data-section]`**.
- **features/ 내부 = 타입별 하위폴더**(`_components/`·`_hooks/`·`_lib/`) — 위 「디렉토리 구조」 섹션 참조.

### 코드 주석과 JSDoc 작성 규칙 ★

주석은 코드를 한국어로 다시 읽어 주는 문장이 아니다. 코드만으로 알 수 없는 **이유, 제약, 실패 조건, 외부 계약**만 기록한다.

#### 반드시 지킬 원칙

1. **현재 코드만 설명한다.** “이번에 추가했다”, “기존 방식을 대체한다”, “B5에서 연결한다”처럼 diff나 작업 단계를 서술하지 않는다. 변경 이력은 커밋과 문서에 남긴다.
2. **한 주석에는 한 가지 이유만 적는다.** 두 문장을 넘기기 시작하면 코드 구조나 별도 문서가 필요한지 먼저 확인한다.
3. **코드에서 보이는 사실은 반복하지 않는다.** 함수명, 타입, 조건문을 그대로 번역한 주석은 삭제한다.
4. **비유와 과장된 표현을 쓰지 않는다.** “죽는다”, “조용히 삼킨다”, “붙들어 둔다”, “회수한다”, “최후의 보루”, “의도된 GC” 대신 실제 상태와 결과를 적는다.
5. **대시(`—`)로 문장을 길게 잇지 않는다.** 문장을 나누거나 원인과 결과만 남긴다. 화살표(`→`)로 절차를 꾸미지 않는다.
6. **판단을 변호하지 않는다.** “이쪽이 더 낫다”, “가장 나쁜 상황이다” 대신 어떤 오류나 데이터 손실을 막는지 적는다.
7. **보안·호환성 근거는 구체적으로 남긴다.** 허용하는 호스트, 브라우저 API 차이, 캐시·인덱스 조건처럼 코드를 바꿀 때 필요한 정보는 지우지 않는다.
8. **TODO에는 완료 조건이나 추적 대상을 적는다.** 막연한 `TODO: 개선 필요`는 금지한다.

#### JSDoc을 쓰는 경우

- 공개되거나 여러 모듈에서 재사용하는 함수·타입
- 이름만으로 알기 어려운 입력 제약이나 반환 의미가 있는 함수
- 예외, 부작용, 캐시, 보안 경계를 설명해야 하는 함수
- 테스트가 고정하는 도메인 규칙

단순 컴포넌트, 짧은 내부 헬퍼, 타입이 이미 설명하는 함수에는 JSDoc을 의무적으로 붙이지 않는다. `@param`, `@returns`도 타입을 그대로 반복한다면 생략한다.

#### 좋은 JSDoc 형식

```ts
/**
 * 참조가 없고 업로드한 지 24시간이 지난 블로그 이미지를 찾는다.
 * 이 함수는 파일을 삭제하지 않는다.
 *
 * @param now 보존 시간을 계산할 기준 시각.
 * @returns 삭제 대상 파일과 전체 크기.
 */
const scanUnusedArticleImages = async (now: () => Date): Promise<ScanResult> => {
  // ...
};
```

```ts
/**
 * 정책 판단에 사용할 쓰기 직전 문서를 읽는다.
 * 정책이 없으면 추가 읽기를 하지 않는다.
 */
const readBeforeWrite = async (id: string): Promise<Snapshot | null> => {
  // ...
};
```

#### 나쁜 예시와 수정

```ts
// 나쁨: 변경 이력, 단계 번호, 장황한 변호
// B5에서 새 저장소 경계를 얹는다 — 기존 흐름을 그대로 유지하면서도
// mock/live 계약이 조용히 깨지는 것을 막기 위한 의도된 방어선이다.

// 좋음: 현재 제약과 결과만 설명
// mock과 live 저장소는 같은 반환 타입과 오류 조건을 사용한다.
```

```ts
// 나쁨: 코드를 그대로 번역
// published가 true면 글을 반환한다.
if (article.published) return article;

// 좋음: 주석이 필요 없으므로 삭제
if (article.published) return article;
```

```ts
// 나쁨: 비유와 감정적 판단
// 스냅샷 조회 실패를 조용히 삼키면 stale 청크가 살아남는다 — 불필요한
// 동기화 한 번이 이쪽보다 훨씬 낫다.

// 좋음: 실패 시 동작을 구체적으로 기록
// 스냅샷 조회가 실패하면 남은 청크를 제거할 수 있도록 동기화를 요청한다.
```

```ts
// 나쁨: 타입을 반복하는 JSDoc
/**
 * 사용자를 가져온다.
 * @param id 사용자 ID.
 * @returns 사용자 또는 null.
 */
const getUser = (id: string): User | null => users.get(id) ?? null;

// 좋음: 추가 정보가 없으므로 JSDoc 생략
const getUser = (id: string): User | null => users.get(id) ?? null;
```

#### 완료 전 주석 점검

코드를 수정한 뒤 함께 추가·수정한 주석을 다시 읽고 아래를 확인한다.

- 이 주석이 없으면 코드에서 알 수 없는 정보가 사라지는가?
- 현재 구현을 설명하는가, 방금 만든 diff를 설명하는가?
- 함수명과 타입을 한국어로 반복하고 있지 않은가?
- `—`, `→`, 단계 번호, 과한 강조, 비유를 걷어낼 수 있는가?
- 두 문장 이하로 줄여도 의미가 유지되는가?

의미가 사라지지 않는다면 주석을 줄이거나 삭제한다.

## .claude 구성

| 종류     | 항목                                                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| agents   | [`frontend`](.claude/agents/frontend.md) (디자인 이식·UI·3섹션), [`firebase`](.claude/agents/firebase.md) (데이터·Rules·인증) |
| commands | `/design-check` (디자인 충실도 점검), `/deploy-check` (배포 전 점검)                                                          |
| hooks    | env_file_guard(차단), secret_scan(차단), frontend_convention_check(경고) — [README](.claude/hooks/README.md)                  |

## Agent skills

### Issue tracker

작업과 PRD는 GitHub Issues에서 관리한다. 자세한 규칙은 `docs/agents/issue-tracker.md`를 따른다.

### Triage labels

`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`를 사용한다. 자세한 매핑은 `docs/agents/triage-labels.md`를 따른다.

### Domain docs

루트 `CONTEXT.md`와 `docs/adr/`를 사용하는 single-context 구조다. 자세한 규칙은 `docs/agents/domain.md`를 따른다.

## Phase 계획 (v2 — 통합 포트폴리오)

> 사진 전용 v1(P1 디자인 이식 + P2 Firebase 연동)은 **대부분 완료**. 아래는 통합 확장 로드맵 요약이며 상세는 [`docs/plan/00-plan-v2.md`](docs/plan/00-plan-v2.md).

- **Phase A — 셸 & 랜딩**: 라우트 재구성(사진 `/photo/*` 이동 + redirects), mega-menu SiteHeader(검색 우측·아바타 제거),
  섹션 액센트(`[data-section]`), 랜딩 허브, 모바일 탭바/메뉴 3섹션 대응.
- **Phase B — 음악 섹션**: 타입·mock·getter·Firestore 컬렉션(musicWorks/awards/media + site/music) + Rules·인덱스 +
  공개 개별 페이지(연주·경력(학력·경력·수상)·영상·소개, 연주/수상 모달) + 관리자 CMS(`/admin/music/*`). (공연 일정 미채택)
- **Phase C — 개발 섹션**: 타입·mock·getter·Firestore 컬렉션(devProjects + site/dev) + Rules·인덱스 +
  공개 개별 페이지(스택·프로젝트·경력·소개, 프로젝트 모달, reveal·타이핑) + 관리자 CMS(`/admin/dev/*`).
- **Phase D — 마감**: 전 섹션 ko/en 번역 채움, 반응형·다크·접근성 점검, SEO/OG(섹션별), `/design-check`·`/deploy-check` 통과, 배포.
- **Phase 3(선택)**: AI 태그 추천(브라우저 `transformers.js`), 지도 고도화, `/api/revalidate` 즉시 반영.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
