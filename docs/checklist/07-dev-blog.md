# 개발 블로그 구현 체크리스트

> 원본 계획: [`docs/plan/07-dev-blog.md`](../plan/07-dev-blog.md) — 항목의 상세 근거는 계획 문서의 섹션 번호(§)를 따른다.
> 사용법: 완료한 항목은 `- [x]`로 체크한다. 단계 순서(B1→B7)가 곧 의존 순서다. 요약표의 상태도 함께 갱신한다.
> 마지막 갱신: 2026-08-12 (B3 완료)

## 진행 요약

| 단계 | 내용                            | 상태      |
| ---- | ------------------------------- | --------- |
| B1   | 개발 정보 구조 개편             | ✅ 완료   |
| B2   | Mock 데이터와 Markdown renderer | ✅ 완료   |
| B3   | Mock 기반 관리자 작성 환경      | ✅ 완료   |
| B3.5 | 관리자 mock 모드 전면 대응      | ⬜ 미착수 |
| B4   | Mock 기반 공개 목록과 상세      | ⬜ 미착수 |
| B5   | Firebase 전환과 배포            | ⬜ 미착수 |
| B6   | 검색·RAG·챗봇·WebMCP            | ⬜ 미착수 |
| B7   | 검증과 마이그레이션             | ⬜ 미착수 |

상태: ⬜ 미착수 · 🔄 진행 중 · ✅ 완료

---

## 전 단계 공통 구현 규칙

이 항목은 B1부터 B7까지 매 단계에 적용한다. 단계별 기능이 동작하더라도 아래 항목을 지키지 않은 코드는 완료로 체크하지 않는다.

### 저장소 컨벤션

- [ ] 작업 전 `CLAUDE.md`의 아키텍처·디렉터리·import·i18n·CSS 규칙과 작업 경로의 기존 구현을 확인한다
- [ ] `app → features → components` 의존 방향, 파일당 단일 책임(SRP), barrel export 금지, `../` 상대경로 금지와 `@/` 직접 경로 import를 지킨다
- [ ] feature 파일은 `_components`·`_hooks`·`_lib`에 책임별로 두고, 컴포넌트와 짝 CSS Module은 같은 `_components` 폴더에 둔다
- [ ] UI 문자열은 `constants/dictionary.ts`의 ko/en 사전을 거치며 컴포넌트에 사용자 표시 문구를 하드코딩하지 않는다
- [ ] 색·간격·레이어·floating UI 좌표는 기존 전역 토큰이나 명시적인 CSS custom property를 사용한다. hex·간격·z-index·챗봇 offset 매직넘버를 새로 흩어 놓지 않는다
- [ ] Firebase 공개 읽기는 기존 REST 경계를, 관리자 쓰기는 인증된 client 경계를 사용한다. `firebase-admin`과 서비스 계정 의존성을 추가하지 않는다
- [ ] 새 추상화는 실제로 둘 이상의 사용처가 겹칠 때만 만든다. 블로그 전용 책임을 공용 컴포넌트에 밀어 넣지 않고, 공용 primitive를 추출한 경우 기존 화면 회귀 테스트를 함께 추가한다

### JSDoc과 코드 주석

- [ ] 새로 만들거나 수정한 exported 컴포넌트·hook·순수 함수·adapter에는 역할과 경계를 설명하는 JSDoc을 작성한다. 이름과 타입만 다시 읽는 한 줄 설명으로 끝내지 않는다
- [ ] JSDoc 첫 문단에는 UI 배치나 데이터 변환뿐 아니라 해당 구현이 필요한 이유를 적는다. portal·stacking context·스크롤 잠금·캐시·보안 경계·URL 복원처럼 호출자가 알아야 할 제약도 포함한다
- [ ] 객체 props는 `@param {Props} props` 다음에 실제 사용 필드를 `props.<name>` 단위로 기록한다. 선택 필드는 `undefined` 가능성을 표기하고, boolean·callback처럼 동작을 바꾸는 값은 조건과 결과까지 설명한다
- [ ] 반환값은 `@returns`에 실제 의미를 적는다. `null` 가능 여부, portal·Promise·정규화 결과처럼 호출부가 처리해야 할 형태를 빠뜨리지 않는다
- [ ] 복잡한 hook이나 함수는 입력·출력만 적지 않고 URL/history 변경, 부수 효과, cleanup, 오류 처리와 memo 경계를 설명한다. 타입 선언만 봐도 자명한 내용은 반복하지 않는다
- [ ] 구현 내부 주석은 코드가 무엇을 하는지 번역하지 않고 이유·불변조건·브라우저 제약·실패 시 동작을 설명한다. 변경 이력이나 “이번에 추가했다” 같은 diff 중심 문장은 쓰지 않는다
- [ ] 정렬 방향, debounce 시간, pagination 크기, observer 기준선, drawer 폭, Storage 경로처럼 의미가 있는 값은 이름 있는 상수로 두고 단위와 선택 이유를 주석 또는 JSDoc에 남긴다

JSDoc은 아래 밀도를 기준으로 삼는다. 태그 수를 기계적으로 맞추기보다 호출자가 구현 제약을 다시 추적하지 않아도 될 만큼 작성한다.

```tsx
/**
 * 다이얼로그 모달. 수직 중앙 정렬과 스크롤 가능한 backdrop을 제공하고,
 * 패널은 y 이동과 scale animation으로 나타난다.
 * document.body로 portal해 header와 section wrapper의 stacking context 밖에 두므로
 * navigation 뒤로 가려지지 않는다. scrim click, Escape, scroll lock을 처리하며
 * 음악·개발 상세가 공유하는 순수 UI다. accent는 상위 [data-section]이 결정한다.
 *
 * @param {Props} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.closeLabel
 * @param {string | undefined} props.crumb
 * @param {string | undefined} props.label
 * @param {number | undefined} props.maxWidth
 * @param {boolean | undefined} props.mobileFull - 640px 이하에서 패널을 viewport에 맞춘다. 프로젝트·연주처럼 콘텐츠가 긴 상세 모달에 사용한다.
 * @param {string | undefined} props.shareTitle
 * @param {string | undefined} props.shareLabel
 * @param {ReactNode} props.children
 * @returns {ReactPortal | null} 닫힌 상태에서는 null, 열린 상태에서는 document.body에 연결한 portal.
 */
```

### 주석·상수·메시지 문체

- [ ] 코드 주석, JSDoc 설명, 상수명·상수 설명, 오류 문구, 빈 상태, 도움말과 관리자 안내 문구를 새로 쓰거나 수정할 때 `avoid-ai-writing` 스킬을 사용한다
- [ ] 스킬은 `docs` 또는 `technical` 문맥의 edit 방식으로 적용한다. 코드 블록·식별자·인용한 외부 문구는 바꾸지 않고 이번 작업에서 작성한 문장만 최소 수정한다
- [ ] “원활한”, “강력한”, “직관적인”, “완벽한” 같은 근거 없는 수식과 챗봇식 도입·맺음말을 쓰지 않는다. 동작, 조건, 실패 원인과 사용자가 취할 조치를 직접 적는다
- [ ] 오류 메시지는 실패 대상과 다음 행동을 포함하고 내부 구현·보안 정보를 노출하지 않는다. 같은 실패를 표현하는 문구는 상수나 formatter의 단일 출처로 모은다
- [ ] 상수명은 역할과 단위가 드러나게 작성한다. `TIMEOUT`, `SIZE`, `LIMIT` 대신 `PREVIEW_DEBOUNCE_MS`, `ARTICLE_PAGE_SIZE`처럼 사용 맥락을 포함한다
- [ ] 구현 완료 후 이번 작업에서 추가·수정한 주석과 사용자 문구를 다시 읽고, 코드 동작과 어긋난 설명·복사한 낡은 문구·AI 문체가 남지 않았는지 확인한다

---

## B1 — 개발 정보 구조 개편 (§1, §12-B1)

- [x] `/dev`에 기존 소개 콘텐츠(`DevAboutView`)를 옮기고, 기존 `/dev`의 기술 스택은 경력 페이지로 이동한다
- [x] `/dev/about`을 같은 언어의 `/dev`로 영구 리다이렉트한다 (`next.config` redirects, 로케일 prefix 보존, 체인 금지)
- [x] `/dev/career`에 경력·수상·기술 스택을 합친다 (`DevCareerView` + `DevStackSection`)
- [x] `constants/routes.ts`에 `DEV_ARTICLES`(`/dev/articles`)를 추가한다 (상세 경로 헬퍼는 slug 계약이 정해지는 B2 이후)
- [x] `constants/navigation.ts`의 `MEGA_MENU` dev 링크를 `소개 → 경력·기술 → 프로젝트` 순서로 바꾼다 (블로그는 화면이 생기는 B4에서 추가)
- [x] `MOBILE_TABS.dev`를 같은 3탭 구성(아이콘 포함)으로 갱신한다
- [x] `constants/dictionary.ts`에 `devCareerStackNav`(네비 `경력·기술`), `devStackHeading`(페이지 안 h2 `기술`), 블로그 라벨(`블로그`/`Blog`)을 추가한다 — 경력 페이지는 h1 `경력`과 같은 크기·서체의 h2 `기술` 두 제목으로 읽힌다
- [x] sitemap에서 `/dev/about`을 제거하고 새 구조를 반영한다 (hreflang ko·en + x-default 유지)
- [x] 모바일 버거 메뉴 시트(아코디언)의 dev 섹션 링크를 갱신한다 (`MEGA_MENU` 공유 — 데스크톱·푸터와 함께 반영)
- [x] `/dev` 의미 반전에 딸린 참조를 함께 고친다 — 챗봇 참조 카드 중복 억제(`ROUTES.DEV` → `DEV_PROJECTS`), 링크·문맥 화이트리스트, WebMCP `get_profile` 사이트맵

### B1 검증

- [x] 기존 직접 링크(`/dev`, `/dev/career`, `/dev/projects`)와 로케일 prefix가 회귀 없이 동작한다
- [x] 활성 메뉴 판정(`stripLangPrefix` 경유)이 새 경로 구조에서 올바르다
- [x] 기존 unit·E2E 테스트가 통과한다
- [x] 회귀를 잡을 테스트를 추가한다 — `navigation.test.ts`(메뉴 순서·사전 키), `sitemap.test.ts`(리다이렉트 URL 제외), `sections.test.ts`(`/dev/articles`), `locale.e2e.ts`(308 1홉), a11y 스캔에 `/dev`·`/dev/career`

---

## B2 — Mock 데이터와 안전한 Markdown renderer (§2, §3, §12-B2)

### 타입과 repository 경계

- [x] `types/dev-article.ts` — `DevArticle` 타입: `title`/`summary`/`coverAlt`는 `LocalizedText`, `body`는 한국어 Markdown 단일 문자열, `publishedAt`/`firstPublishedAt`/`createdAt`/`updatedAt` 구분 (§2)
- [x] `types/dev-article-tag.ts` — `DevArticleTag` 타입: 기존 `Tag`와 같은 `id/ko/en` 계약 (§2)
- [x] `lib/content/dev-articles.ts` — 공개 getter 경계: 화면은 mock/Firestore를 구분하지 못한다 (기존 `lib/content/dev.ts` 패턴, mock은 동적 import) — live 분기는 B5에서 Firestore reader로 교체할 때까지 빈 목록
- [x] `mocks/dev-articles.ts` — 대표 글 mock 작성, 아래 경계 사례를 모두 포함 (§2):
  - [x] 대표 이미지 있는 글 / 없는 글
  - [x] 긴 목차 + 같은 이름의 heading + 표가 있는 글
  - [x] JavaScript·TypeScript·Java·C·C++·Python 코드 블록
  - [x] 본문 중간 이미지 여러 장 + YouTube 영상
  - [x] 연관 프로젝트가 여러 개인 글 / 없는 글
  - [x] 발행일이 같은 글, 초안과 발행 글

### Markdown 계약 (`features/dev-blog/_lib/markdown-*`)

- [x] parser — 제목·문단·강조·목록·인용·링크·구분선·표·fenced code·이미지 지원 범위를 순수 함수 경계로 구현한다 (§3)
- [x] sanitizer — 허용 요소·속성 제한, 임의 HTML/MDX/스크립트 차단 (§3) — HTML 문자열 단계를 두지 않고 mdast를 허용 노드로만 옮겨(`markdown-normalize`) sanitizer 계층 자체를 없앴다
- [x] 링크 검증 — `https`/`mailto`/내부 경로만 허용(`http` 제외 — §3 각주), 외부 링크에 안전한 `rel` 부여 (§3)
- [x] 이미지 출처 — 관리자 Storage URL과 명시적 허용 출처만 통과, 대체 텍스트 필수 (§3)
- [x] `::caption` directive — 바로 앞 이미지에만 연결 (§3)
- [x] `::youtube` directive — `youtube.com`/`youtu.be`만 영상 ID 추출, `title` 필수·`source` 선택, 임의 iframe 제거 (§3)
- [x] heading id — renderer가 생성, 소문자 slug + 중복 시 문서 순서대로 `-2`, `-3` suffix. 목차·본문·URL fragment가 같은 parser 결과 사용 (§3)
- [x] 예상 읽기 시간 — AST를 받는 단일 순수 함수: `CJK/500 + 비CJK 단어/265 + 코드 비어 있지 않은 줄/20`, 올림·최소 1분, 표식·URL·directive 제외 (§3)
- [x] 코드 하이라이팅 — 서버 전용 처리(클라이언트 언어 번들 금지), 언어 별칭 한곳 정규화, 미지 언어는 일반 코드 블록 폴백, 라이트·다크 색 토큰·대비 준수 (§3)
- [x] 잘못된 directive·비허용 URL·대체 텍스트 누락·제목 없는 YouTube를 오류 위치와 함께 보고하는 검증 결과 계약 (§3) — 문구가 아니라 코드로 반환하고, 관리자 문구는 화면이 생기는 B3에서 사전으로 붙인다

### B2 검증

- [x] parser·sanitizer·목차·읽기 시간·별칭 정규화가 `_lib` 단위 테스트로 고정된다 (커버리지 화이트리스트 자동 포함)
- [x] 이미지·YouTube 전용 문법의 서버 렌더링 결과를 테스트로 검증한다 (`ArticleBody`·`ArticleCodeBlock` 컴포넌트 테스트)
- [x] YouTube facade를 `components/YouTubeFacade`로 승격하고 음악 영상 목록의 단일 재생 동작을 회귀 테스트로 고정한다

---

## B3 — Mock 기반 관리자 작성 환경 (§5, §12-B3)

### 편집 폼

- [x] 한국어·영어 제목·요약·대표 이미지 대체 텍스트, 한국어 Markdown 본문(원문 언어 표시), 태그, 발행일, 연관 프로젝트, 발행 상태 필드 (§5)
- [x] slug — 영어 제목 우선 자동 제안(한국어는 `es-hangul` 로마자), 저장 시 정규화·중복 거부, `firstPublishedAt` 존재 시 UI와 `prepareArticleInput` 모두 변경 거부 (§2)
- [x] 발행일 — 날짜·시간 직접 입력, 최초 발행 시 자동 덮어쓰기 없음 (§5) — `firstPublishedAt` 스탬프는 모든 쓰기가 지나가는 저장소가 찍는다
- [x] 태그 — 통제 사전에서 다중 선택 + 관리자 신규 추가(한·영 라벨), id 중복·공백 라벨 거부, 글에는 id 배열만 저장 (§5)
- [x] 연관 프로젝트 — 순서 있는 다중 선택, `relatedProjectIds` 단일 원천 (§7) — 삭제·비공개 프로젝트는 행에 남기고 표시

### 관리자 목록

- [x] drag reorder 없는 발행일 내림차순(동일 발행일 id 오름차순) 목록 hook — `useOrderedAdmin` 미사용, 상태머신·낙관적 토글 패턴만 차용 (§5) — 초안은 수정일 내림차순으로 맨 위
- [x] body 제외 목록 projection 계약(제목·상태·발행일·수정일·slug·태그)을 mock 단계부터 분리한다 (§5)
- [x] 검색과 초안/발행 필터 (§5)

### 편집기 동작

- [x] 편집/미리보기 토글 — 두 패널 동시 렌더 금지, 인증된 preview handler로 서버 renderer 호출, 탭 열림·입력 정지 시에만 debounce 요청 (§3, §5) — Server Action이 `{document, issues, highlights}` JSON을 돌려주고 브라우저가 공개 상세와 같은 `ArticleBody`로 그린다
- [x] 커서 위치 이미지 삽입 — mock uploader 주입, 업로드 완료 시 대체 텍스트 포함 Markdown 삽입 (§4)
- [x] YouTube 삽입 대화상자 — URL·제목(필수)·출처(선택), 외부 metadata 조회 없음 (§4)
- [x] 로컬 복구본 — 입력 후 5초 자동 저장, 이미지 바이너리 제외(URL만), 저장 성공 시 삭제, 미저장 이탈 경고 (§5) — 저장 전 새 글 ID를 세션에 붙들어 새로고침해도 같은 글로 복구된다
- [x] 저장 중 중복 제출·발행 차단 (§5)
- [x] 발행 조건 검사 — 한·영 제목·요약 / slug 유효·유일 / 대체 텍스트 / YouTube·프로젝트 ID 공개 가능 / Markdown 허용 렌더 (§5)
- [x] 관리자 전용 전체 페이지 미리보기 — 공개 상세와 같은 컴포넌트, 미저장 변경 시 저장 안내 (§5) — `dev-blog/ArticleDocumentView`가 첫 소비처이고 B4 공개 상세가 재사용한다
- [x] `/admin/dev` 허브에 블로그 카드 추가

### 관리자 E2E harness (프로젝트 최초)

- [x] 테스트 인증 adapter — `AuthGuard` 경계 주입, E2E 전용 env var + 비-production 이중 조건, production 빌드에서 설정 거부 (§12-B3)
- [x] mock repository·localStorage 초기화 fixture — 이후 관리자 기능도 재사용 가능한 형태
- [x] 작성 → 로컬 복구 → 저장 → 전체 미리보기 → 발행 흐름 E2E

### B3 검증

- [x] slug 제안·정규화·중복, 발행 조건, 폼 변환이 `_lib` 단위 테스트로 고정된다
- [x] 로컬 초안 adapter 저장·수정·미리보기 흐름이 E2E로 검증된다

---

## B3.5 — 관리자 mock 모드 전체 적용 (계획 문서 밖 · 이 문서가 원본)

> 배경: B3에서는 블로그 관리자만 로컬 저장소를 사용한다. 같은 mock 모드에서도 사진·앨범·태그·음악·개발 프로젝트·설정 화면은 실제 Firestore에 연결되므로, 관리자 기능을 개발하려면 Firebase 계정과 운영 컬렉션이 필요하다. 블로그에서 마련한 로컬 개발·E2E 흐름을 나머지 관리자 화면에도 적용한다.
> 적용 시점: **B3 완료 후, B4 시작 전.** B3에서 만든 저장소 경계를 다른 관리자 도메인으로 확장하고, B5에서는 같은 경계에 Firestore 구현을 연결한다.
> 확정 범위: **전체 CRUD는 로컬 저장소 지원** · **진입은 별도 플래그로 제어** · **이미지는 압축과 EXIF 추출까지 실제 처리하고 저장 단계만 objectURL 사용**.

### 실데이터 경로 보호

> 이 단계의 unit 테스트와 E2E는 mock 분기를 검증한다. unit 테스트는 Firestore를 호출하지 않고 E2E는 `NEXT_PUBLIC_USE_MOCK=1`로 실행하므로, 실데이터 경로는 별도의 계약 테스트와 배포 전 확인 절차로 보호한다.

- [ ] **`listCrud`는 변경하지 않는다.** mock 어댑터를 같은 계약의 별도 구현으로 만들고 팩토리가 mock/live 구현을 선택한다. 실데이터 경로의 변경 범위를 저장소 선택 지점으로 제한한다. RAG 정책 주입은 B5에서 별도로 다룬다
- [ ] 저장 후처리(`requestPublicRevalidate`·`requestRagSync`)는 `listCrud`에 유지한다. 저장 성공 뒤 공개 캐시나 RAG만 갱신되지 않는 상태가 생기지 않도록 실데이터 구현이 후처리를 계속 소유한다
- [ ] 업로드 훅은 Storage 호출 경계만 교체한다. 경로 규칙(`photos/{id}/`·`music/{id}/`·`dev/{id}/`·`dev-blog/{id}/`)과 3단 webp 산출물은 저장 문서가 참조하는 기존 계약을 유지한다
- [ ] 사진↔앨범 관계 후처리(`remove-photo-from-album`)와 `asset-lifecycle` 정리는 실데이터 구현에 유지하고, mock 어댑터에도 같은 동작을 구현한다
- [ ] mock/live 구현이 같은 타입을 만족하도록 강제하고, 공용 저장소 계약 테스트를 mock 어댑터에 적용한다
- [ ] **배포 전 실데이터 스모크 테스트**: 컬렉션마다 문서 한 건을 저장하고 공개 상태를 변경한 뒤 삭제한다. 공개 페이지 반영과 RAG 상태까지 확인하고, 자동화 범위 밖의 검증 절차로 기록한다
- [ ] `npm run test:rules`를 실행해 Rules가 이 변경의 영향을 받지 않았는지 확인한다

### 공용 저장소 경계

- [ ] `listCrud`와 같은 인터페이스의 mock 어댑터 팩토리를 만든다. 컬렉션 이름과 seed mock을 받아 로컬 저장소 기반의 `list`/`get`/`create`/`update`/`updateOrder`/`setPublished`/`remove`를 제공한다. B3의 `local-dev-article-repository`를 공용 형태로 확장한다
- [ ] 컬렉션별 저장소 선택은 하나의 팩토리에서 처리한다. 팩토리는 `shouldUseMockContent()`로 mock/live 구현을 고르고, 화면과 훅에는 선택 결과를 노출하지 않는다
- [ ] `shouldUseMockContent()`는 모듈 평가 시점이 아니라 저장소 호출 시점에 실행한다. 설정이 없는 프로덕션에서 이 함수가 throw하더라도 관리자 모듈 전체의 로드를 막지 않아야 한다
- [ ] 대상 컬렉션: `photos` · `albums` · `musicWorks` · `musicAwards` · `musicMedia` · `devProjects` (`devArticles`는 B3에서 완료)
- [ ] config 문서: `site/config`(전역·연락·사진 태그 사전) · `site/music` · `site/dev`. 각 화면이 소유한 필드만 병합하는 현재 계약을 유지한다
- [ ] `admin-list-rest.ts`의 projection 4종도 같은 저장소 선택 경계를 사용한다. mock 목록에서도 본문이나 원본 이미지처럼 행에 필요하지 않은 큰 필드를 제외한다
- [ ] mock 저장에서는 `requestPublicRevalidate`와 `requestRagSync`를 호출하지 않는다. 서버 후처리가 생략됐고 공개 화면에는 반영되지 않는다는 사실을 관리자 UI에 표시한다

### 이미지 업로드

- [ ] `use-image-upload`·`use-poster-upload`·`use-dev-image-upload`는 기존 EXIF 추출과 webp 3단 압축을 유지하고 **Storage 호출 경계만** 교체한다. mock에서도 사진 관리자의 EXIF 자동 입력 흐름을 검증할 수 있어야 한다
- [ ] mock 업로더는 `URL.createObjectURL`로 미리보기 URL을 만들고, 새로고침하면 URL이 유효하지 않다는 점을 화면에 안내한다
- [ ] mock의 `asset-lifecycle` 정리는 참조되지 않는 objectURL에 `URL.revokeObjectURL`을 호출한다

### 진입 플래그

- [ ] B3의 `NEXT_PUBLIC_E2E_ADMIN_SESSION`을 관리자 개발 전반에 적용할 수 있는 이름으로 변경한다(예: `NEXT_PUBLIC_ADMIN_TEST_SESSION`). E2E와 로컬 개발은 같은 플래그를 사용한다
- [ ] mock 콘텐츠 사용 여부와 관리자 인증 우회를 분리한다. `NEXT_PUBLIC_USE_MOCK`만으로 `AuthGuard`가 열리지 않으며, 인증 우회는 별도의 명시적 플래그로 제어한다
- [ ] 인증 우회 플래그가 프로덕션 빌드에서 활성화되면 즉시 실패하는 가드를 유지한다. `.env.local` 주석과 `CLAUDE.md` 환경변수 목록에도 같은 조건을 기록한다
- [ ] 관리자 화면 상단에 mock 모드임을 표시하고, 저장값이 현재 브라우저에만 남으며 공개 화면에는 반영되지 않는다고 안내한다

### 실데이터 전용 화면

- [ ] `/admin/maintenance`의 임베딩 생성과 썸네일 마이그레이션은 실제 Storage·OpenAI 연결이 필요하다. mock 모드에서는 실행 버튼을 비활성화하고 필요한 연결을 안내한다
- [ ] `RagStaleBanner`처럼 서버 상태에 의존하는 UI는 mock 모드에서 사용할 상태의 출처와 표시 조건을 정한다

### 관리자 E2E 확장 (mock 지원 화면 전체)

> B3의 harness(`e2e/utils/admin-fixtures.ts` · `NEXT_PUBLIC_ADMIN_TEST_SESSION`)를 사용한다. 테스트는 데스크톱 뷰포트에서 실행하며, mock 저장소를 지원하는 관리자 화면만 대상으로 한다. 실제 서비스 연결이 필요한 화면은 B3.5 E2E 범위에서 제외한다.

- [ ] 관리자 전역 초기화 fixture를 만든다. 컬렉션별 로컬 저장소 키를 한곳에서 제거하고, 각 테스트를 동일한 mock seed에서 시작한다
- [ ] **관리자 목록 스모크 테스트는 데이터 주도형 단일 spec으로 구성한다.** 경로·행 이름·`새 항목` 라벨 표를 순회하며 목록 렌더링, 공개 상태 변경과 삭제를 확인한다. `workers: 1` 환경에서 화면별 spec 복제로 실행 시간이 늘어나지 않게 한다
- [ ] `useOrderedAdmin`을 사용하는 화면 중 하나에서 실제 drag로 순서를 저장하고, 새로고침 뒤에도 순서가 유지되는지 확인한다. 공용 정렬 훅의 동작은 이 대표 시나리오로 검증한다
- [ ] 사진 폼에서 파일 선택 → EXIF 자동 입력(조리개·셔터·ISO·촬영일시) → 태그 선택 → 저장 흐름을 확인한다. 저장소에는 EXIF를 포함한 작은 JPEG fixture를 두며, mock에서도 실제 추출 과정이 실행되는지 검증한다
- [ ] 앨범 폼에서 표지 지정과 사진 순서 편집을 확인한다. 사진 삭제 시 해당 사진이 앨범에서도 제거되는 `remove-photo-from-album` 후처리까지 검증한다
- [ ] 태그 사전에서 추가·라벨 수정·정렬·삭제한 결과가 사진 폼의 선택지에 반영되는지 확인한다
- [ ] config 화면(전역·사진 소개·음악·개발) 중 하나에서 **화면이 소유한 필드만 병합 저장**하는 계약을 확인한다. 서로 다른 화면을 차례로 저장해도 다른 화면의 값이 유지되어야 한다
- [ ] 관리자 상단의 mock 배지와 `/admin/maintenance`의 비활성 실행 버튼·안내 문구를 확인한다
- [ ] spec 추가 전후의 전체 E2E 실행 시간을 비교하고 증가 폭과 원인을 기록한다

### B3.5 검증

- [ ] Firebase 환경변수 없이 `npm run dev`로 모든 관리자 화면을 열고 목록·편집·저장·삭제·정렬·공개 상태 변경을 확인한다
- [ ] 기존 실데이터 CRUD·projection·업로드 동작과 Rules 테스트가 모두 통과한다
- [ ] 관리자 mock 저장소와 공개 getter(`lib/content/*`)를 분리한다. 공개 화면은 계속 `mocks/*`를 읽어야 한다
- [ ] 기존 공개 E2E·시각 회귀·접근성 스캔이 통과한다. 프로덕션 모드 테스트에서는 관리자 인증 우회 플래그가 비활성 상태여야 한다

---

## B4 — Mock 기반 공개 목록과 상세 (§6, §12-B4)

### 공용 primitive 선행 추출 (사진 회귀 필수)

- [ ] page toolbar — 갤러리의 인라인 `제목/결과 수/보기 전환` 마크업을 공용 shell로 추출, 사진 회귀 테스트 통과 (§6)
- [ ] `TagFilterBar` — 사진 `FilterBar`에서 태그 칩 행 + overflow 스타일만 승격 (카메라·초점거리 popover는 잔류), 사진 회귀 테스트 통과 (§6)
- [ ] `ViewToggle` — boolean `square`·사진 아이콘 고정 API를 option id·label·icon 주입식 범용 segmented control로 리팩터링, `aria-pressed`·키보드 동작 공유, 사진 회귀 테스트 통과 (§6) — 사진의 로컬 view state를 URL로 옮기는 일은 범위 외
- [ ] 앨범 상세 hero — shell·scrim·back/share 위치·진입 motion을 공용 hero primitive로 추출(metadata는 slot), 앨범 회귀 테스트 통과 (§6)

### 블로그 목록 (`/dev/articles`)

- [ ] URL 계약 — `?tag`(없거나 삭제된 id는 `전체` 정규화, 변경 시 page 1 리셋)·`?view=grid|list`(기본 grid)·`?page`(범위 밖·비숫자는 canonical 1페이지 정규화), 세 키만 직렬화·기본값 생략 (§6)
- [ ] 정렬·pagination — `publishedAt desc, id asc`, 페이지당 8개, 뒤로가기·공유 URL 복원 (§6)
- [ ] 그리드 보기 — 데스크톱 2열·모바일 1열, 대표 이미지·제목·요약·태그·발행일·읽기 시간 (§6)
- [ ] 목록 보기 — 행 구성, 작은 화면 metadata 줄바꿈, 이미지 없는 글은 이미지 칸 생략 (§6)
- [ ] 이미지 없는 그리드 카드 — 개발 섹션 토큰 기반 블로그 전용 CSS·실제 텍스트 대체 구성 (프로젝트 카드의 라이트/다크 OG 이미지 2장 방식 복제 금지) (§6)
- [ ] 빈 필터 결과 — 선택 태그 표시 + 초기화 동작 (§6)

### 블로그 상세 (`/dev/articles/[slug]`)

- [ ] hero(이미지 有) — full-bleed 배경 + scrim, 실제 HTML 텍스트 제목·요약·발행일·수정일·읽기 시간·태그, 좌상단 목록 복귀·우상단 `ShareButton`(canonical URL) (§6)
- [ ] hero(이미지 無) — 타이포그래피형, scrim 생략, back/share 버튼 WCAG 대비 surface 전환, 같은 정보 위계 (§6)
- [ ] `cover`의 focal position 지원 여부를 구현 전 확인하고 결정을 기록한다 (현재 `ImageMeta`에는 없음) (§6)
- [ ] 본문 — 긴 글용 최대 폭·행간, 서체는 기존 토큰만(`--font-display` 제목·본문 / `--font-sans` UI / `--font-mono` 코드), 코드 라이트·다크 테마 (§6)

### 노션식 floating 목차 (§6)

- [ ] 축소 인디케이터 — 오른쪽 중앙 세로 선(h3는 짧게), 현재 heading 강조(색상 외 수단 병행), heading 2개 미만이면 미렌더, 본문 구간에서만 표시
- [ ] 현재 위치 추적 — `IntersectionObserver` 기반(heading별 scroll listener 금지), 읽기 기준선·문서 끝 규칙
- [ ] 데스크톱 확장 — hover/focus 시 왼쪽 확장, 유예 후 축소(focus 중엔 유지), `aria-current="location"`, 2줄 말줄임 + 전체 accessible name
- [ ] 모바일 drawer — 44×44px hit area, `min(82vw, 320px)`·`100dvh`, focus trap, backdrop·닫기·`Escape`·뒤로가기로 닫힘, 배경·챗봇 trigger `inert`
- [ ] 챗봇 버튼 좌표 공용화 — `ChatLauncher.module.css`의 크기·offset을 CSS custom property로 승격, 목차와 최소 간격 공유, `data-section="dev"` 모바일 offset 회귀 테스트 (§6)
- [ ] fragment/history — `history.pushState` 계약, 뒤로가기 시 fragment·스크롤 복원, heading 공통 `scroll-margin-top`
- [ ] 접근성·motion — `목차 열기` accessible name + `aria-expanded`/`aria-controls`, `prefers-reduced-motion` 즉시 처리, 확대·고대비 시 텍스트 라벨
- [ ] component + E2E 테스트로 계층·추적·확장·drawer·복원 고정 (§12-B4)

### 본문 하단·언어·SEO

- [ ] 연관 프로젝트 카드 — 지정 순서, 비공개 ID 제외 (§7)
- [ ] 블로그 탐색 목록 — 표 형태 5개, 현재 글 페이지 우선·현재 행 강조, `?articlePage=` 분리, 본문 유지 갱신, 키보드 탐색 (§6)
- [ ] 관계·목록 projection — 본문 없이 id·slug·제목·요약·cover·태그·발행일·읽기 시간·프로젝트 ID만 캐시 (§6, §7)
- [ ] 영어 경로 — `This article is available in Korean only.` 안내, 본문 `lang="ko"` (§8)
- [ ] metadata — 언어별 제목·요약 metadata + Article 구조화 데이터, canonical은 한국어 URL, 초안·미리보기 `noindex`, sitemap 등재 (§8)

### B4 검증

- [ ] 공개 목록·상세 + 관리자 작성 흐름 mock E2E 통과 → 콘텐츠 계약 고정 (§12-B4)
- [ ] 추출한 공용 컴포넌트가 사진·앨범 화면을 회귀시키지 않는다 (§14)

---

## B5 — Firebase 전환과 배포 (§2, §4, §12-B5)

### 쿼리·인덱스·Rules

- [ ] REST transport 범용 query builder — 다중 정렬 방향 + document id 보조 정렬, query·index 모두 `__name__ ASCENDING` 명시, 기존 `order asc` 호출 무회귀 (§2)
- [ ] `published + publishedAt desc + id asc` 복합 인덱스 배포 (`tags array-contains` 인덱스는 규모 임계치 확인 전까지 유예 — 태그는 projection 서버 필터) (§2)
- [ ] 태그 저장 위치 확정 — 기본안 `devArticleTags` 컬렉션. 채택 시 collection 상수·관리자 write Rules·cache tag 추가, config 문서 선택 시 근거 기록 (§2)
- [ ] `firestore.rules`에 `devArticles`(+ 태그 컬렉션) — `published == true` 공개 읽기 / 관리자만 쓰기
- [ ] `test/security-rules.test.mjs`의 `PUBLIC_COLLECTIONS` 배열에 신규 컬렉션 추가

### CRUD·RAG 정책·Storage

- [ ] `devArticles` getter·CRUD를 repository 경계에 연결 (mock/live 화면 코드 무변경)
- [ ] 관리자 목록 — `admin-list-rest.ts` projection 패턴으로 body 제외 조회
- [ ] `listCrud` 후처리 정책 — 저장 전후 entity·작업 종류를 받아 `sync`/`remove`/`skip` 반환하는 선택적 정책 주입, 미주입 컬렉션 기존 동작 유지 (§11)
- [ ] 블로그 RAG 정책 — 초안 제외, 발행일·이미지·연관 프로젝트만 변경 시 skip, §11 표 계약 구현, article 문서 ID 기준 멱등 (§11)
- [ ] 기존 컬렉션 CRUD·RAG 동작 회귀 테스트 (§12-B5)
- [ ] Storage — `dev-blog/{articleId}/` 업로드 3종(메인·프리뷰·썸네일) + 글 삭제 시 폴더 정리, 실제 uploader를 폼에 연결 (§4)

### 고아 이미지 관리 (`/admin/maintenance`)

- [ ] `dev-blog/` 파일 목록 ↔ 전체 글(cover + 본문 URL) 참조 비교 (§4)
- [ ] 미참조 + 업로드 24시간 경과 파일만 후보 표시 (§4)
- [ ] 기본 dry run — 경로·크기·업로드 시각·예상 절감 용량 (§4)
- [ ] 확인 삭제 — 실행 직전 참조 재계산, 개별 실패 격리·성공/실패 결과 기록 (§4)

### B5 검증

- [ ] Rules·index emulator 검증 후 배포 (§12-B5)
- [ ] 실제 초안 1건 — 작성·전체 미리보기·발행·발행 취소·삭제·이미지 정리 왕복 확인 (§12-B5)
- [ ] mock/live 소스가 섞이지 않고 mock 자동화 테스트가 계속 동작한다 (§12-B5)

---

## B6 — 검색·RAG·챗봇·WebMCP (§9, §10, §12-B6)

### 통합검색

- [ ] `SearchDocument`에 article 투영 — `key: article-{id}`, `section: dev`, `LocalizedText` metadata 그대로, 상세 경로 href, 초안 제외 (§9)
- [ ] `/search`·헤더 자동완성·`search_portfolio` 3개 표면에서 블로그 결과 확인

### RAG

- [ ] source type `article` — 글 ID·slug 기록, 제목·요약 + heading 단위 평문 청크, 코드 블록 예산 제한 (§9)
- [ ] 증분 동기화 경로 — `rag-source.ts` target 맵·decoder, embeddings route 허용 타입, 비공개 시 빈 결과로 자동 청크 제거
- [ ] `/admin/maintenance` 일괄 재생성에 블로그 포함 (§9)
- [ ] `searchRagChunks`에 `sourceType/sourceId` 선택 scope 추가 — 기존 section-only 호출 무파괴 (§9)

### 챗봇

- [ ] 화면 문맥 — `/dev/articles/[slug]` 경로 정규식 분기, `{ type: "article", id: 문서 ID }` 전송, 서버가 slug 일치·공개 여부 재검증 후 제목·요약·slug만 `SCREEN_CONTEXT` (§9)
- [ ] 열린 글 질문 — 해당 article 청크 우선 검색 → 부족 시 전체 dev RAG 확장 (§9)
- [ ] 참조 카드 — `ChatReferenceType`에 article 추가(응답 스키마 enum·검증·서버 재확인 포함), 제목·발행일·요약·경로 카드 (§9)
- [ ] mock·live 평가 — 블로그 검색 사례 + 열린 글 화면 문맥 사례 추가 (§9)

### WebMCP

- [ ] `list_blog_posts` — `tag?`·`limit?` → 제목·발행일·요약·slug·경로 (§10)
- [ ] `get_blog_post` — `articleId?`/`slug?` 택일(둘 다 오면 오류, 상세 페이지면 현재 글) → 요약·목차·경로 (§10)
- [ ] `/dev/articles`·상세에만 등록, 관리자·초안 미등록, 페이지당 도구 수(전역 2 + 블로그 2 = 4) 재검증 (§10)

### B6 검증

- [ ] 초안이 검색·RAG·챗봇 참조·WebMCP 어디에도 노출되지 않는다 (§14)
- [ ] 재검증 실패 시 관리자 표시 + maintenance 복구 경로 동작 (§11)

---

## B7 — 검증과 마이그레이션 (§12-B7)

- [ ] 기존 글을 실제 발행일·slug로 입력한다
- [ ] 이미지·코드·YouTube가 포함된 대표 글을 점검한다
- [ ] 전체 테스트 스위트 통과 — Rules emulator·unit·component·E2E·접근성·typecheck·lint·production build
- [ ] 공개 후 확인 — 검색 인덱스·RAG 완료율, Storage 고아 파일, 이전 `/dev/about` 유입

---

## 최종 완료 기준 (§14 대조)

- [ ] 개발 메뉴와 URL이 `소개 → 경력·기술 → 프로젝트 → 블로그` 구조로 동작한다
- [ ] 관리자가 발행일과 slug를 정해 Markdown 글을 작성하고 실제 레이아웃으로 미리 볼 수 있다
- [ ] 제목·요약·대표 이미지 설명·태그는 한·영 저장·표시, Markdown 본문만 한국어 단일 원문
- [ ] 주요 언어 코드 블록이 라이트·다크 테마에서 읽기 좋다
- [ ] 본문 임의 위치에 이미지와 검증된 YouTube 영상을 넣을 수 있다
- [ ] `/admin/maintenance`에서 미참조 24시간 이전 이미지만 확인 후 정리할 수 있다
- [ ] 대표 이미지 유무와 무관하게 목록 카드가 기존 개발 디자인과 어울린다
- [ ] 태그 선택·보기 전환·pagination이 URL에 보존되고 뒤로가기·공유 URL에서 복원된다
- [ ] 사진 태그 행·보기 전환·앨범 hero에서 추출한 공용 컴포넌트가 기존 화면을 회귀시키지 않는다
- [ ] 상세 hero가 이미지 유무와 무관하게 같은 정보 위계·대비를 유지한다
- [ ] 제목·본문은 기존 display 서체 토큰, UI·코드는 기존 sans·mono 역할 유지
- [ ] floating 목차가 데스크톱 hover/focus·모바일 tap 모두로 열리고 챗봇 버튼과 겹치지 않는다
- [ ] 목차 이동·fragment·뒤로가기·focus·reduced motion이 같은 heading id 계약으로 동작한다
- [ ] 프로젝트 모달에서 공개된 연관 글을 역방향으로 찾을 수 있다
- [ ] 영어 경로에서 한국어 원문과 언어 안내가 올바르게 표시된다
- [ ] 초안은 공개 getter·sitemap·검색·RAG·챗봇 참조·WebMCP에 노출되지 않는다
- [ ] 관리자 목록은 body를 내려받지 않고 발행일순으로 동작하며 drag order가 없다
- [ ] 관리자 E2E가 격리된 mock repository에서 작성·복구·저장·미리보기·발행 흐름을 검증한다
- [ ] 기존 `order asc` 쿼리·CRUD RAG 동작 무회귀 + article 발행일 정렬·조건부 RAG 정책 적용
- [ ] 열린 글을 가리키는 챗봇 질문이 해당 글의 공개 데이터·RAG 청크를 우선 사용한다
- [ ] 관련 Rules·테스트·접근성 검사·production build가 통과한다
