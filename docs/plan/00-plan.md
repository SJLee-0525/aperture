# Aperture. 구현 마스터 플랜 (00)

> 사진작가 **이성준(Sungjoon Lee)** 개인 사진 포트폴리오 `Aperture.` 의 구현 로드맵.
> 결정의 배경·원칙은 [`CLAUDE.md`](../../CLAUDE.md), 디자인은 [`design/README.md`](../../design/README.md),
> 데이터·Rules 상세는 [`firebase` agent](../../.claude/agents/firebase.md), UI 규칙은 [`frontend` agent](../../.claude/agents/frontend.md).
> 이 문서는 **무엇을 어떤 순서로 만드는가**에 집중한다 (결정 사유는 위 문서에 있으니 중복 최소화).
>
> ⚠️ 이 파일의 이전 내용(연주자 JH Portfolio·Tailwind·TipTap·Works/Schedule 계획)은 **다른 프로젝트(jh-portfolio)** 것으로 전면 폐기됨.

---

## 0. 현재 상태 & 목표

- **현재**: 저장소는 문서만 있음 (`CLAUDE.md`, `.claude/`, `design/`). `src/`·`package.json` 없음, git 저장소 아님.
- **목표(P1)**: 디자인 프로토타입을 Next.js(App Router) + **CSS Modules** 로 이식 — mock 데이터, 4뷰(작업·앨범·**지도(MapLibre+CARTO)**·소개) + 상세 모달, 반응형·다크·ko/en 완비. (**내보내기는 P2**)
- **목표(P2)**: Firebase 연동(Auth·Firestore·Storage) + 관리자 CMS + 실제 좋아요 + **프레임 내보내기**.
- **목표(P3)**: AI 태그 추천·SEO·즉시 반영 등 선택 강화.

## 1. 작업 순서 원칙

1. **토대 → chrome → 뷰 → 상세 → 파워기능** 순으로 쌓는다 (아래가 위를 의존).
2. **P1은 Firebase·AI 없이 mock 데이터로 UI 를 완성.** 단 **지도만 실지도(MapLibre+CARTO)**(사용자 결정) — P1의 유일한 외부 의존. Firebase 실데이터는 P2.
3. **`lib/content/get-*` getter 뒤에 데이터 소스를 숨긴다** — P1은 mock, P2에서 Firestore 로 교체해도 **호출부 무변경** (getter는 모두 `Promise` 반환 + published 필터·`order` 정렬 완료 상태로).
4. **각 슬라이스는 반응형·다크·ko/en 3종을 항상 함께** 마감 (나중에 몰아서 하면 부채).
5. **매 슬라이스 종료 시 `npm run build` + `npm run lint` 통과** 유지 (hook 컨벤션 경고 0).
6. 커밋은 `feature/*` 브랜치 + `[TYPE] 한글제목`, 슬라이스 단위.

---

## 2. Phase 0 — 프로젝트 스캐폴드 (P1 착수 전 1회)

> ⚠️ **create-next-app 은 비어있지 않은 폴더를 거부**할 수 있다 (`CLAUDE.md`·`.claude`·`design` 존재).
> → 임시 폴더에 생성 후 `src/`·설정 파일만 병합하거나, 수동 셋업. **Tailwind 는 제외.**

- [ ] Next.js 앱 생성 — TypeScript · ESLint · App Router · `src/` · alias `@/*` · **Tailwind 제외** (**Next 16.x / React 19** — jh-portfolio 와 동일 계열)
- [ ] Prettier + ESLint 설정 (jh-portfolio 참고)
- [ ] `src/app/globals.css` — `design/claude_design/styles/tokens.css` 이식:
      `:root`(light) + `html[data-theme="dark"]` + `@media (prefers-color-scheme: dark)` 폴백 + 리셋(box-sizing) + 폰트 변수. **hex 직박 0, radius 0(칩만 pill).**
- [ ] `src/app/layout.tsx` — **next/font** 3종(Newsreader·Schibsted Grotesk·Spline Sans Mono) + 테마 no-flash 스크립트 + `LangProvider` (`<html suppressHydrationWarning>`)
- [ ] 디렉토리 골격 생성 (CLAUDE.md 구조표대로)
- [ ] `src/constants/` — `collections.ts` · `routes.ts` · `navigation.ts` · `storage-keys.ts`(`ap-theme`,`ap-lang`) · `dictionary.ts`(ko/en) · `frame-styles.ts`(프레임 6종 — P2 내보내기용, 상수만 미리)
- [ ] `src/types/` — `localized.ts`(`LocalizedText={ko,en}`) · `lang.ts`(`Lang="ko"|"en"`) · `image.ts`(`{url,path,w,h}`) · `coords.ts` · `tag.ts` · `photo.ts` · `album.ts` · `site.ts`
- [ ] `public/design-samples/` — `tone01–12`·`wide1–4` 복사 (P1 mock 이미지)
- [ ] `src/mocks/` — `photos.ts` · `albums.ts` · `site.ts` : `design/claude_design/portfolio.js` 의 `PHOTOS`/`ALBUMS` 이식 + **태그 사전** 작성 (단일어 태그 → `{id,ko,en}`)
- [ ] `src/lib/content/` — `get-photos.ts` · `get-albums.ts` · `get-album.ts` · `get-site.ts` · `get-tags.ts` (P1: mock 반환)
- [ ] `src/lib/i18n/pick-text.ts` — `pickText(field, lang) = field[lang] || field.en || field.ko`

**완료기준(M0)**: `npm run dev` 부팅, 폰트·색 토큰 적용, 테마/언어 Provider 동작.

---

## 3. Phase 1 — 정적 디자인 이식 (슬라이스별)

### Slice 1 — 토대: 테마 · 언어 · Chrome

- `features/theme/`: `theme-script.ts`(no-flash 인라인 상수), `use-theme-toggle.ts`(`html[data-theme]` 단일 원천, React state 아님)
- `features/lang/`: `LangProvider.tsx`(useSyncExternalStore + 모듈스토어, SSR 기본 ko), `use-lang.ts`
- `features/site-header/`: `ThemeToggleButton`(+`.module.css`, **해/달 크로스페이드** 500ms), `LangMenu`(지구본 드롭다운), `SiteHeader`(워드마크 `Aperture.`+네비+검색), `MobileTabBar`/`MobileMenuOverlay`, `SearchBox`
- `app/(public)/layout.tsx`: `SiteHeader` 마운트 (chrome 은 여기만)
- **완료**: 라이트↔다크 토글(지고 뜨는 애니), ko↔en 토글(라벨 즉시 변경), 데스크톱 상단네비 ↔ 모바일 하단탭바 반응형(768px)

### Slice 2 — 작업(Work) 그리드 + 필터 ★핵심

- `components/`: `PhotoTile`(+module), `PhotoGrid`(CSS `columns` 메이슨리 4→3→2), `Chip`, `RangeSlider`, `ViewToggle`
- `features/gallery/`: `GalleryView`, `FilterBar`, `use-photo-filter`(태그칩·카메라 select·초점거리 듀얼레인지·텍스트검색 — 전부 클라이언트)
- `app/(public)/page.tsx`: `getPhotos()` + `<GalleryView>`, `export const revalidate`
- **완료**: 메이슨리/정사각 토글, 4종 필터 동작, "검색 결과 없음" 빈 상태, 태그칩은 **사전에서** 렌더

### Slice 3 — 사진 상세 모달 ★핵심

- `components/`: `Modal`, `ExifList`, `ExifStrip`(F/S/ISO), `MiniMap`(**P1: 디자인 스타일 SVG** — 상세 열 때마다 실제 지도 로드하면 Maps 쿼터 낭비), `IconButton`
- `features/photo-detail/`: `PhotoModal`(데스크톱 라이트박스=사진 다크+패널 라이트 / 모바일 바텀시트 peek↔확장), `use-photo-modal`(`?photo=` 딥링크·prev/next·키보드)
- `features/likes/`: `LikeButton`, `use-like` (**P1: 로컬 optimistic**, 영속화는 P2)
- `hooks/use-scroll-lock.ts` (모달·모바일 메뉴 공유라 승격)
- 상세 패널의 **"내보내기" 버튼은 P1에선 자리/비활성** (실제 내보내기 모달은 P2)
- **완료**: 타일 클릭→모달, EXIF 삼각+리스트·미니맵(SVG)·태그, ←/→·ESC·스크림 닫기, `?photo=id` 딥링크, `likes≥1` 빨강 채움, 모바일 시트 확장/축소

### Slice 4 — 앨범(Albums)

- `components/AlbumCard`
- `features/albums/`: `AlbumsView`(그리드+커버+장수배지), `AlbumDetailView`(히어로+메이슨리)
- `app/(public)/albums/page.tsx`, `albums/[id]/page.tsx`
- **완료**: 앨범 그리드→상세, 상세 내 사진 클릭→상세 모달(`?photo=`)

### Slice 5 — 지도(MapLibre+CARTO) + 소개(About)

- `features/map/`: `MapCanvas`(**MapLibre GL + CARTO 무료 타일**, `next/dynamic` ssr:false, `/map`에서만) + `MapView` + `LocationList`. 마커 = coords 있는 사진, 클릭 → `?photo=` 딥링크. 테마 연동(Positron↔Dark Matter)
- `features/about/`: `AboutView`(bio·연락처 링크 + **통계 자동집계**: 사진/앨범/지역/바디 수 + 카메라·렌즈·지역 목록)
- `app/(public)/map/page.tsx`, `about/page.tsx`
- 선행조건 **없음** — CARTO 무료 타일이라 키·billing 불필요
- **완료**: 실제 지도에 좌표 핀·리스트 연동·테마 전환, 소개 통계/목록

### Slice 6 — 마감

- 전 뷰 반응형(~390px)·다크·ko/en 점검 (`/design-check`), 기본 접근성(포커스·aria), 기본 메타데이터
- (선택) Vercel 에 **P1 배포**로 체크포인트

**완료기준(M1)**: Slice 1–3. **완료기준(M2)**: Slice 4–6 → **P1 종료**.

---

## 4. Phase 2 — Firebase 연동 + 관리자 CMS + 내보내기

- [ ] `lib/firebase/`: `client.ts`(초기화 1곳, `getApps()[0] ?? initializeApp`), `auth.ts`, `firestore.ts`(관리자 SDK, Timestamp↔Date 변환·한국어 에러), `firestore-rest.ts`(공개 ISR fetch), `storage.ts`
- [ ] **Security Rules**: `firestore.rules`(photos/albums/site + **좋아요 delta-guard** `hasOnly(['likes'])`+`==old+1`+`published`), `storage.rules`(webp·10MB·image/*), `firestore.indexes.json`(published+order ×2)
- [ ] **Emulator 테스트**: 좋아요 +1 허용 / +2·−1·타필드·초안 거부, 타 UID 관리자쓰기 거부, 미정의 컬렉션 거부 (firebase agent 체크리스트) — **통과 후에만 Rules 배포**
- [ ] Auth: `LoginForm`, `AuthGuard`, `use-auth`, `admin/layout.tsx` 가드(비로그인→`/admin/login`)
- [ ] `lib/content/get-*` → mock에서 **Firestore 로 교체** (호출부 무변경) + 빈 컬렉션 폴백
- [ ] **업로드 파이프라인** `features/image-upload/`: `exifr`(압축 前 EXIF·GPS) → `browser-image-compression`(webp ~2048) → ID 선발급 → Storage → getDownloadURL → 폼 자동채움. 삭제 시 `deleteFolder` 정리
- [ ] 관리자 CMS: `admin/photos`(EXIF 폼·태그 멀티셀렉트·**지도 좌표 픽커**·**dnd-kit 정렬**), `admin/albums`(사진 선택·커버·정렬), `admin/tags`(사전 편집), `admin/site`(이름·bio·링크). admin 화면은 기존 토큰만 재사용(새 색 금지)
- [ ] 좋아요 영속화: `likePhoto = updateDoc(ref,{likes:increment(1)})`
- [ ] **프레임 내보내기** `features/export/`: `ExportModal`, `frame-preview.ts`(프레임 6종 — SRP 예외 한 파일), `use-export`(canvas → **webp** `toBlob`). 옵션: 워터마크·메타범위·해상도(저장본 기준). 상세 패널 "내보내기" 버튼 활성화
- [ ] `next.config` `images.remotePatterns` 에 `firebasestorage.googleapis.com`
- [ ] `deploy-check` 통과 후 배포. (선택) `app/api/revalidate` 즉시 반영

**완료기준(M3)**: 관리자가 사진 업로드(EXIF 자동) → 공개 페이지 반영, 좋아요·내보내기 실동작, 배포됨.

---

## 5. Phase 3 — 선택 강화

- [ ] **AI 태그 추천** — 브라우저 내 `transformers.js` CLIP zero-shot, 사진 vs 태그사전 매칭, 관리자 폼에 추천 하이라이트 (클라우드 API 금지 — 아키텍처 원칙 #8)
- [ ] 지도 고도화(클러스터 등), OG 이미지·SEO 메타·sitemap, `/api/revalidate` 즉시 반영

---

## 6. 의존성 추가 시점

| 시점 | 패키지                                                                        |
| ---- | ----------------------------------------------------------------------------- |
| P0   | 없음 (Next·React 만, **Tailwind 제외**)                                       |
| P1   | `maplibre-gl`(지도) + `motion`(전환 애니메이션). 그 외 UI 는 순수 CSS Modules |
| P2   | `firebase`, `browser-image-compression`, `exifr`, `@dnd-kit/*`                |
| P3   | `@huggingface/transformers`(또는 `@xenova/transformers`)                      |

## 7. 관리자(본인) 셋업 체크리스트 — 코드와 별개, 직접

**지도**: 셋업 불필요 — MapLibre + CARTO 무료 타일(키·카드·billing 없음).

**P2 전 (Firebase):**

- [ ] Firebase 프로젝트(Analytics 끔) + **Blaze** + Auth(계정 1개 콘솔 생성) + Firestore(`asia-northeast3`, 생성 후 변경 불가)·production + Storage 동일 리전
- [ ] **UID → `.env.local` `NEXT_PUBLIC_ADMIN_UID` + rules 2파일 양쪽에** (수동 동기화)
- [ ] Vercel 프로젝트 연결 + env 등록 + Authorized domains
- [ ] `.env.local` 작성 (env_file_guard hook 이 차단 → 직접 편집; 항목은 CLAUDE.md 환경변수 절)

> 결제 표면은 **Firebase 하나뿐** (지도는 CARTO 무료). 예산 알림 $1로 그 하나만 감시.

## 8. 마일스톤

| #   | 내용                                                   | Phase | 완료 기준                        |
| --- | ------------------------------------------------------ | ----- | -------------------------------- |
| M0  | 스캐폴드 + 토큰·폰트·테마·언어                         | P0    | 빈 홈에서 다크/라이트·ko/en 전환 |
| M1  | 작업뷰 + 상세모달 + 좋아요(로컬)                       | P1    | 반응형·다크·ko/en 완비           |
| M2  | 앨범 + **지도(MapLibre+CARTO)** + 소개 → **P1 완료**   | P1    | `/design-check` 통과·배포 가능   |
| M3  | Firebase + CMS + **내보내기** + 실좋아요 → **P2 완료** | P2    | `/deploy-check` 통과·배포        |
| M4  | AI 태그·SEO 등                                         | P3    | —                                |

## 9. 리스크 & 열린 질문

- **order 기본 부여** — 신규 문서를 맨 앞/맨 뒤 어디에? (P2 관리자에서 결정, 이후 드래그 조정)
- **지도 = MapLibre+CARTO** — 키·billing 불필요($0). CARTO 무료 타일 사용정책은 저트래픽 개인 사이트엔 무방(고트래픽 시 자가호스팅 Protomaps 대안).
- **Storage egress** — 트래픽 늘면 다운로드 1GB/일 위협 → next/image + Vercel 엣지 캐시로 완화 (Storage 는 원본당 1회만 히트)
- **EXIF 필드 편차** — 카메라별 GPS·렌즈명 누락 가능 → 수동 보정 UI 로 흡수

## 10. 확정된 착수 결정

1. **Next.js 버전** — jh-portfolio 와 동일 계열 **Next 16.x / React 19** ✅
2. **지도** — P1부터 실지도 ✅. Google Maps(카드·비용) 대신 **MapLibre GL + CARTO 무료 타일**로 교체(2026-07-02) — 키·카드 없음, 테마 연동.
3. **내보내기** — **P2로 이동** ✅ (P1 상세 패널엔 버튼 자리만)

---

> 세부 슬라이스가 커지면 `docs/plan/01-*.md`, `02-*.md` 로 분할 기록.
