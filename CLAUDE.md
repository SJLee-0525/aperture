# Aperture. — Sungjoon Lee 사진 포트폴리오

> 디자인 단일 출처: [`design/`](design/README.md) — Claude Design에서 export한 Desktop/Mobile 프로토타입.
> 구현과 디자인이 충돌하면 **디자인이 우선** (단, [문서화된 의도적 이탈 4건](design/README.md) 예외).
> 운영 철학: **서버 0대, 월 $0**. 관리자(사진작가 본인) 1명 + 불특정 방문자 구조이므로
> 상시 가동 백엔드 대신 Firebase BaaS + 정적 우선 렌더링.

## Project Vision

사진작가 **이성준(Sungjoon Lee)** 의 개인 사진 포트폴리오. 워드마크 `Aperture.`

- **방문자**: 작업(사진 그리드)·앨범·지도·소개를 본다. 로그인 없음, **ko/en 토글**, 다크모드.
  사진 상세에서 EXIF(조리개·셔터·감도…)·촬영 위치·태그를 함께 본다. **좋아요**(익명 카운트)·**프레임 내보내기** 가능.
- **관리자(본인 1명)**: 로그인 후 사진·앨범·태그 사전·소개 관리. 업로드 시 **EXIF 자동 추출**, **드래그로 수동 정렬**.

## 확정 스택 & 결정 기록

| 레이어     | 선택                       | 왜 (결정 사유)                                                                         |
| ---------- | -------------------------- | -------------------------------------------------------------------------------------- |
| 프레임워크 | Next.js (App Router)       | 공개 페이지 정적 우선 + 관리자 페이지 동거                                             |
| 호스팅     | Vercel Hobby               | 무료, git push 자동 배포                                                               |
| 인증       | Firebase Auth              | 관리자 1명. **회원가입 없음** — 콘솔에서 계정 1개 수동 생성                            |
| DB         | Firestore                  | **무활동 일시정지 없음** (Supabase 무료 DB의 7일 정지 회피가 선택 이유)                |
| 이미지     | Firebase Storage           | 브라우저에서 직접 업로드, **webp 압축**                                                |
| 스타일     | **CSS Modules + CSS 변수** | 디자인 export가 순수 CSS → Tailwind 재작성 세금 회피 + 파일당 SRP. **Tailwind 미사용** |
| i18n       | 자체 구현 (라이브러리 X)   | `useSyncExternalStore` + `pickText` 폴백. **ko/en** (de 없음)                          |
| 지도       | Google Maps JS API         | 사진 좌표를 실제 지도에 핀. 키 **referrer 제한** 필수                                  |
| EXIF       | `exifr`                    | 업로드 시 **압축 前** 자동 추출 (조리개·셔터·ISO·초점·렌즈·카메라·촬영일시·GPS)        |
| 내보내기   | 클라이언트 canvas          | 프레임 6종 + EXIF 각인 → webp. **저장 해상도 기준**(원본 미보관)                       |

> ⚠️ **Firebase Storage · Google Maps는 Blaze(종량제) 전환 + 카드 등록 필요.** 무료 한도 내에서는 청구액 $0.
> **GCP 예산 알림 $1 등록 필수** — Firebase + Maps **두 결제 표면**을 함께 감시.

## 아키텍처 원칙 (서버리스)

1. **별도 백엔드 서버 없음.** 보안 경계는 Firestore/Storage **Security Rules가 전부**다.
   클라이언트 코드의 인증 가드는 UX 편의일 뿐, 보안이 아니다.
2. **관리자 판별 = 단일 UID 비교.** Rules의 `isAdmin()` 함수에서 본인 UID 하드코딩.
3. **이미지 흐름**: 브라우저에서 ① `exifr`로 EXIF·좌표 추출(**압축 前 ★**) → ② 원본 dimension 추출 →
   ③ `browser-image-compression`으로 webp(~2048px) 압축 → ④ Storage 직접 업로드 → ⑤ 다운로드 URL + EXIF를 Firestore에 저장.
4. **방문자 read 규칙**: `published == true` 문서만. 초안은 관리자만 읽기 가능.
5. **firebase-admin SDK 사용 금지.** 서비스 계정 키가 필요해지는 순간 서버리스 원칙이 깨진다.
   (hook이 서비스 계정 키 파일 수정을 차단함)
6. **공개 페이지 서버 읽기 = Firestore REST API + `fetch`** (`lib/firebase/firestore-rest.ts`),
   클라이언트 SDK 아님. 클라 SDK를 서버 렌더(ISR 재생성)에서 쓰면 stale/실패 → 재생성이 폐기되고
   재빌드 전까지 공개 페이지가 안 바뀐다. REST는 `fetch` 기반이라 ISR·`revalidatePath`와 정상 연동.
   published 문서·`site`는 Rules가 무인증 read를 허용 → 웹 API 키만으로 충분. **쓰기·관리자 읽기만 클라 SDK**(`firestore.ts`).
7. **★ 좋아요 = 유일하게 허용된 무인증 쓰기.** `photos.likes` 필드를 **+1** 하는 업데이트만 Rules가 허용
   (delta 가드). 그 외 무인증 쓰기는 전면 금지. 원칙 #1의 유일한 명문화된 예외. (firebase agent 참조)
8. **★ AI(Phase 3 태그 추천) = 브라우저 내 추론(`transformers.js`)만.** 클라우드 비전/LLM API 금지 —
   진짜 시크릿 키를 클라에 둘 수 없고, 프록시할 서버가 없다(원칙 #1·#5와 충돌).

## 데이터 모델 (Firestore)

> ko/en 이중언어 필드는 `{ko, en}` map. 언어 무관 필드(카메라·렌즈·EXIF 수치·좌표·날짜·파일명)는 평면 값.
> 모든 시간 필드는 Timestamp, 표시 포맷은 렌더 시.

| 컬렉션   | 역할               | 주요 필드                                                                                                                                                                                                                                                                |
| -------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `photos` | 사진 (작업)        | title{ko,en}, shotAt(TS), camera, lens, exif{aperture,shutter,iso,focalLength,ev,wb,metering,flash}, dimensions{w,h}, aspectRatio, place{ko,en}, coords{lat,lng}\|null, tags[](태그 id 참조), image{url,path,w,h}, **likes**, **order**, published, createdAt, updatedAt |
| `albums` | 앨범 (사진 묶음)   | title{ko,en}, subtitle{ko,en}, **coverPhotoId**(소속 사진 중 하나), photoIds[](**수동 순서**), **order**, published, createdAt, updatedAt                                                                                                                                |
| `site`   | 고정 문서 `config` | name{ko,en}, bio{ko,en}, links[{label, href}](관리자 자유 추가), **tags[{id, ko, en}]**(태그 사전)                                                                                                                                                                       |

- **정렬 = 수동 `order` 필드** (dnd-kit로 관리자가 드래그). 앨범 내 사진 순서 = `photoIds` 배열 순서.
  공개 쿼리 = `where(published==true) + orderBy(order)` → **복합 인덱스 2개** (photos/albums, `firestore.indexes.json`).
- **태그는 통제 사전** — `site/config.tags`에 `{id, ko, en}`을 한 번 정의, 사진은 **id만 참조**
  (필터 칩 정체성 일관 + ko/en 한 번만 정의). **카메라·초점거리 필터는 photos EXIF에서 파생** (사전 불요).
- **좌표는 EXIF GPS 자동** 또는 GPS 없으면 **관리자 지도 클릭으로 수동 지정**. coords 있는 사진만 지도 핀.
- 이미지 필드는 `{url, path, w, h}` — path는 삭제 시 Storage 정리용, w/h는 next/image CLS 방지 (업로드 시점 추출 필수).
- slug 없음 — 사진 상세는 **모달**(`?photo=` 딥링크), 문서 ID가 식별자. 앨범 상세 = `/albums/[id]`.
- 콘텐츠 소량 → **페이지네이션 없음**, 전체 fetch + 클라이언트 필터/검색.

상세 설계·Rules 패턴은 [`firebase` agent](.claude/agents/firebase.md) 참조.

## 디렉토리 구조 (단일 Next.js 앱, 루트 — 3계층: app → features → components)

```
src/
├── app/                        # ★ 라우팅 껍데기만 (fetch + features 조립)
│   ├── (public)/               # 방문자 — Server Component + revalidate
│   │   ├── page.tsx            # 작업 — 사진 그리드 + 필터 (?photo= 모달)
│   │   ├── albums/page.tsx     # 앨범 그리드
│   │   ├── albums/[id]/page.tsx# 앨범 상세 (히어로 + 메이슨리, ?photo= 모달)
│   │   ├── map/page.tsx        # 지도 (Google Maps — next/dynamic ssr:false)
│   │   ├── about/page.tsx      # 소개 (통계 파생)
│   │   └── layout.tsx          # chrome(SiteHeader) 마운트는 여기서만
│   ├── admin/                  # 관리자 — 전부 client, AuthGuard 마운트는 admin/layout.tsx
│   │   ├── login/
│   │   ├── photos/             # 목록 + new + [id] 폼 (업로드·EXIF·좌표·태그)
│   │   ├── albums/  tags/  site/
│   └── layout.tsx              # 폰트 3종 + 테마 no-flash + LangProvider
├── features/                   # ★ 기능 단위 조합 — 비즈니스 로직 있음
│   ├── gallery/                # 작업 그리드, 필터바(태그·카메라·초점거리), 뷰토글, use-photo-filter
│   ├── photo-detail/           # 라이트박스/바텀시트 + EXIF 패널 + 미니맵 + use-photo-modal
│   ├── albums/                 # 앨범 그리드·상세 뷰
│   ├── map/                    # Google Maps 뷰 + 위치 리스트
│   ├── about/                  # 소개 (통계 자동 집계)
│   ├── export/                 # 프레임 내보내기 (canvas, 프레임 6종)
│   ├── likes/                  # 하트 버튼 + use-like (익명 +1)
│   ├── site-header/            # SiteHeader, 모바일 탭/메뉴, ThemeToggleButton, LangMenu
│   ├── theme/  lang/           # 다크모드(html[data-theme]) · ko/en Context
│   ├── auth/                   # LoginForm, AuthGuard, use-auth
│   ├── image-upload/           # exifr 추출 + 압축 + Storage 업로드
│   └── admin-*/                # 섹션별 폼 + use-*-admin hook (dnd-kit 정렬 포함)
├── components/                 # ★ 순수 재사용 UI — 비즈니스 로직·firebase 접근 금지, props만
│   └── (PhotoTile, Modal, ExifList, Chip, MapPin, FrameCard …) + 각 컴포넌트 .module.css
├── lib/firebase/               # client.ts, auth.ts, firestore.ts, firestore-rest.ts, storage.ts
├── lib/content/                # 공개 페이지 getter — mock↔Firestore 교체 지점 ★
├── lib/i18n/                   # pick-text.ts (ko/en 폴백)
├── lib/exif/                   # exifr 래퍼
├── lib/maps/                   # Google Maps 로더
├── mocks/                      # Phase 1 mock (design 데이터 이식, env 미설정 시 폴백)
├── constants/                  # COLLECTIONS, DICTIONARY, NAVIGATION, ROUTES, STORAGE_KEYS, FRAME_STYLES
├── hooks/                      # 2개 이상 feature가 공유하는 hook만 (use-scroll-lock)
└── types/                      # photo, album, site, tag, localized, lang, image, coords
```

의존 방향: `app → features → components` (역방향 금지). barrel export(index.ts) 금지 — 직접 경로 import.

## 환경변수 (`.env.local` — hook이 자동 수정 차단, 직접 편집)

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_ADMIN_UID=                 # UI 가드용 (보안은 Rules의 isAdmin()이 담당)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=       # HTTP referrer 제한 필수
```

> Firebase 웹 키(`AIza…`)·Maps 키는 공개돼도 보안 위험이 아니다 — 보안은 Rules와 **referrer 제한**이 담당.
> LLM/비전 API 키 같은 **진짜 시크릿은 이 프로젝트에 없다**(아키텍처 원칙 #8). 코드 하드코딩 시 secret_scan hook이 경고.

## 무료 한도 가드

| 리소스      | 무료 한도                          | 이 프로젝트 대응                                             |
| ----------- | ---------------------------------- | ------------------------------------------------------------ |
| Firestore   | 읽기 5만/일, 쓰기 2만/일, 저장 1GB | 공개 페이지 ISR 캐싱으로 읽기 절약. 좋아요 쓰기는 view당 1회 |
| Storage     | 5GB, 다운로드 1GB/일               | 업로드 전 브라우저 압축 (webp, 긴 변 ~2048px). next/image    |
| Vercel      | 100GB 대역폭/월                    | next/image 최적화                                            |
| Google Maps | 월 무료 한도 (지도 로드)           | `/map` 라우트에서만 dynamic 로드. 예산 알림으로 감시         |

## 개발 명령어

```bash
npm run dev          # 개발 서버 (port 3000)
npm run build        # 프로덕션 빌드 (배포 전 필수 통과)
npm run lint         # ESLint
firebase emulators:start   # Rules 로컬 테스트 (Auth/Firestore/Storage)
firebase deploy --only firestore:rules,storage   # Rules만 배포
```

## 컨벤션

- 커밋: `[TYPE] 한글 제목` — [git-commit-convention](.claude/skills/git-commit-convention/SKILL.md)
- 브랜치: `main` + `feature/{요약}` 단순 전략 — [git-branch-strategy](.claude/skills/git-branch-strategy/SKILL.md)
- **파일당 단일 책임(SRP)** — 사용자 강선호 ([memory](.claude/memory/feedback_srp_per_file.md))
- 상대경로 import(`../`) 금지 → `@/` alias (hook이 경고)
- UI 표시 문자열은 ko/en 사전 경유 / 영어 코드·변수명
- **스타일 = CSS Modules** (컴포넌트별 `.module.css`). 색·간격은 `globals.css`의 `:root` 변수 경유
  (디자인 `tokens.css` 이식). **hex 직박 금지**, 다크모드는 `[data-theme]` 셀렉터.

## .claude 구성

| 종류     | 항목                                                                                                                    |
| -------- | ----------------------------------------------------------------------------------------------------------------------- |
| agents   | [`frontend`](.claude/agents/frontend.md) (디자인 이식·UI), [`firebase`](.claude/agents/firebase.md) (데이터·Rules·인증) |
| commands | `/design-check` (디자인 충실도 점검), `/deploy-check` (배포 전 점검)                                                    |
| hooks    | env_file_guard(차단), secret_scan(경고), frontend_convention_check(경고) — [README](.claude/hooks/README.md)            |

## Phase 계획

- **Phase 1 — 디자인 이식 (정적)**: `design/` 프로토타입 → Next.js 컴포넌트. mock 데이터, 반응형 통합,
  다크모드·ko/en 토글. 4뷰(작업/앨범/지도/소개) + 상세 모달 + 내보내기 + 지도(mock 좌표).
- **Phase 2 — Firebase 연동**: Auth(관리자 로그인) + Firestore(photos·albums·site) + Storage(exifr + webp 압축) +
  관리자 CMS(폼 + dnd-kit 수동 정렬) + 좋아요 delta-guard Rule + Google Maps 실연동.
- **Phase 3 — 선택**: **AI 태그 추천**(브라우저 내 `transformers.js` CLIP zero-shot), 지도 고도화,
  OG 이미지·SEO 강화, `/api/revalidate` 즉시 반영.
