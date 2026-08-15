# 개발 블로그 구현 체크리스트

> 원본 계획: [`docs/plan/07-dev-blog.md`](../plan/07-dev-blog.md) — 항목의 상세 근거는 계획 문서의 섹션 번호(§)를 따른다.
> 사용법: 완료한 항목은 `- [x]`로 체크한다. 단계 순서(B1→B7)가 곧 의존 순서다. 요약표의 상태도 함께 갱신한다.
> 마지막 갱신: 2026-08-15 (B6·B7 완료 — 미참조 이미지 정리와 WebMCP 안내 재검증만 남음)

## 진행 요약

| 단계 | 내용                            | 상태    |
| ---- | ------------------------------- | ------- |
| B1   | 개발 정보 구조 개편             | ✅ 완료 |
| B2   | Mock 데이터와 Markdown renderer | ✅ 완료 |
| B3   | Mock 기반 관리자 작성 환경      | ✅ 완료 |
| B3.5 | 관리자 mock 모드 전면 대응      | ✅ 완료 |
| B4   | Mock 기반 공개 목록과 상세      | ✅ 완료 |
| B4.5 | B4 검수 후속 수정               | ✅ 완료 |
| B5   | Firebase 전환과 배포            | ✅ 완료 |
| B6   | 검색·RAG·챗봇·WebMCP            | ✅ 완료 |
| B7   | 검증과 마이그레이션             | ✅ 완료 |

상태: ⬜ 미착수 · 🔄 진행 중 · ✅ 완료

---

## 전 단계 공통 구현 규칙

이 항목은 B1부터 B7까지 매 단계에 적용한다. 단계별 기능이 동작하더라도 아래 항목을 지키지 않은 코드는 완료로 체크하지 않는다.

### 저장소 컨벤션

- [x] 작업 전 `CLAUDE.md`의 아키텍처·디렉터리·import·i18n·CSS 규칙과 작업 경로의 기존 구현을 확인한다
- [x] `app → features → components` 의존 방향, 파일당 단일 책임(SRP), barrel export 금지, `../` 상대경로 금지와 `@/` 직접 경로 import를 지킨다
- [x] feature 파일은 `_components`·`_hooks`·`_lib`에 책임별로 두고, 컴포넌트와 짝 CSS Module은 같은 `_components` 폴더에 둔다
- [x] UI 문자열은 `constants/dictionary.ts`의 ko/en 사전을 거치며 컴포넌트에 사용자 표시 문구를 하드코딩하지 않는다
- [x] 색·간격·레이어·floating UI 좌표는 기존 전역 토큰이나 명시적인 CSS custom property를 사용한다. hex·간격·z-index·챗봇 offset 매직넘버를 새로 흩어 놓지 않는다
- [x] Firebase 공개 읽기는 기존 REST 경계를, 관리자 쓰기는 인증된 client 경계를 사용한다. `firebase-admin`과 서비스 계정 의존성을 추가하지 않는다
- [x] 새 추상화는 실제로 둘 이상의 사용처가 겹칠 때만 만든다. 블로그 전용 책임을 공용 컴포넌트에 밀어 넣지 않고, 공용 primitive를 추출한 경우 기존 화면 회귀 테스트를 함께 추가한다

### JSDoc과 코드 주석

- [x] 새로 만들거나 수정한 exported 컴포넌트·hook·순수 함수·adapter에는 역할과 경계를 설명하는 JSDoc을 작성한다. 이름과 타입만 다시 읽는 한 줄 설명으로 끝내지 않는다
- [x] JSDoc 첫 문단에는 UI 배치나 데이터 변환뿐 아니라 해당 구현이 필요한 이유를 적는다. portal·stacking context·스크롤 잠금·캐시·보안 경계·URL 복원처럼 호출자가 알아야 할 제약도 포함한다
- [x] 객체 props는 `@param {Props} props` 다음에 실제 사용 필드를 `props.<name>` 단위로 기록한다. 선택 필드는 `undefined` 가능성을 표기하고, boolean·callback처럼 동작을 바꾸는 값은 조건과 결과까지 설명한다
- [x] 반환값은 `@returns`에 실제 의미를 적는다. `null` 가능 여부, portal·Promise·정규화 결과처럼 호출부가 처리해야 할 형태를 빠뜨리지 않는다
- [x] 복잡한 hook이나 함수는 입력·출력만 적지 않고 URL/history 변경, 부수 효과, cleanup, 오류 처리와 memo 경계를 설명한다. 타입 선언만 봐도 자명한 내용은 반복하지 않는다
- [x] 구현 내부 주석은 코드가 무엇을 하는지 번역하지 않고 이유·불변조건·브라우저 제약·실패 시 동작을 설명한다. 변경 이력이나 “이번에 추가했다” 같은 diff 중심 문장은 쓰지 않는다
- [x] 정렬 방향, debounce 시간, pagination 크기, observer 기준선, drawer 폭, Storage 경로처럼 의미가 있는 값은 이름 있는 상수로 두고 단위와 선택 이유를 주석 또는 JSDoc에 남긴다

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

- [x] 코드 주석, JSDoc 설명, 상수명·상수 설명, 오류 문구, 빈 상태, 도움말과 관리자 안내 문구를 새로 쓰거나 수정할 때 `avoid-ai-writing` 스킬을 사용한다
- [x] 스킬은 `docs` 또는 `technical` 문맥의 edit 방식으로 적용한다. 코드 블록·식별자·인용한 외부 문구는 바꾸지 않고 이번 작업에서 작성한 문장만 최소 수정한다
- [x] “원활한”, “강력한”, “직관적인”, “완벽한” 같은 근거 없는 수식과 챗봇식 도입·맺음말을 쓰지 않는다. 동작, 조건, 실패 원인과 사용자가 취할 조치를 직접 적는다
- [x] 오류 메시지는 실패 대상과 다음 행동을 포함하고 내부 구현·보안 정보를 노출하지 않는다. 같은 실패를 표현하는 문구는 상수나 formatter의 단일 출처로 모은다
- [x] 상수명은 역할과 단위가 드러나게 작성한다. `TIMEOUT`, `SIZE`, `LIMIT` 대신 `PREVIEW_DEBOUNCE_MS`, `ARTICLE_PAGE_SIZE`처럼 사용 맥락을 포함한다
- [x] 구현 완료 후 이번 작업에서 추가·수정한 주석과 사용자 문구를 다시 읽고, 코드 동작과 어긋난 설명·복사한 낡은 문구·AI 문체가 남지 않았는지 확인한다

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

- [x] **`listCrud`는 변경하지 않는다.** mock 어댑터를 같은 계약의 별도 구현으로 만들고 팩토리가 mock/live 구현을 선택한다. 실데이터 경로의 변경 범위를 저장소 선택 지점으로 제한한다. RAG 정책 주입은 B5에서 별도로 다룬다
- [x] 저장 후처리(`requestPublicRevalidate`·`requestRagSync`)는 `listCrud`에 유지한다. 저장 성공 뒤 공개 캐시나 RAG만 갱신되지 않는 상태가 생기지 않도록 실데이터 구현이 후처리를 계속 소유한다
- [x] 업로드 훅은 Storage 호출 경계만 교체한다. 경로 규칙(`photos/{id}/`·`music/{id}/`·`dev/{id}/`·`dev-blog/{id}/`)과 3단 webp 산출물은 저장 문서가 참조하는 기존 계약을 유지한다
- [x] 사진↔앨범 관계 후처리(`remove-photo-from-album`)와 `asset-lifecycle` 정리는 실데이터 구현에 유지하고, mock 어댑터에도 같은 동작을 구현한다
- [x] mock/live 구현이 같은 타입을 만족하도록 강제하고, 공용 저장소 계약 테스트를 mock 어댑터에 적용한다
- [x] **배포 전 실데이터 스모크 테스트**: 컬렉션마다 문서 한 건을 저장하고 공개 상태를 변경한 뒤 삭제한다. 공개 페이지 반영과 RAG 상태까지 확인하고, 자동화 범위 밖의 검증 절차로 기록한다 → 절차는 아래 「실데이터 스모크 절차」 참조
- [x] `npm run test:rules`를 실행해 Rules가 이 변경의 영향을 받지 않았는지 확인한다 → 로컬에 Java 가 없어 CI(ci.yml, Java 21)가 실행한다. `firestore.rules`·`storage.rules`·`src/lib/firebase/*` 는 diff 0 으로 확인

### 공용 저장소 경계

- [x] `listCrud`와 같은 인터페이스의 mock 어댑터 팩토리를 만든다. 컬렉션 이름과 seed mock을 받아 로컬 저장소 기반의 `list`/`get`/`create`/`update`/`updateOrder`/`setPublished`/`remove`를 제공한다. B3의 `local-dev-article-repository`를 공용 형태로 확장한다
- [x] 컬렉션별 저장소 선택은 하나의 팩토리에서 처리한다. 팩토리는 `shouldUseMockContent()`로 mock/live 구현을 고르고, 화면과 훅에는 선택 결과를 노출하지 않는다
- [x] `shouldUseMockContent()`는 모듈 평가 시점이 아니라 저장소 호출 시점에 실행한다. 설정이 없는 프로덕션에서 이 함수가 throw하더라도 관리자 모듈 전체의 로드를 막지 않아야 한다
- [x] 대상 컬렉션: `photos` · `albums` · `musicWorks` · `musicAwards` · `musicMedia` · `devProjects` (`devArticles`는 B3에서 완료)
- [x] config 문서: `site/config`(전역·연락·사진 태그 사전) · `site/music` · `site/dev`. 각 화면이 소유한 필드만 병합하는 현재 계약을 유지한다
- [x] `admin-list-rest.ts`의 projection 4종도 같은 저장소 선택 경계를 사용한다. mock 목록에서도 본문이나 원본 이미지처럼 행에 필요하지 않은 큰 필드를 제외한다
- [x] mock 저장에서는 `requestPublicRevalidate`와 `requestRagSync`를 호출하지 않는다. 서버 후처리가 생략됐고 공개 화면에는 반영되지 않는다는 사실을 관리자 UI에 표시한다

### 이미지 업로드

- [x] `use-image-upload`·`use-poster-upload`·`use-dev-image-upload`는 기존 EXIF 추출과 webp 3단 압축을 유지하고 **Storage 호출 경계만** 교체한다. mock에서도 사진 관리자의 EXIF 자동 입력 흐름을 검증할 수 있어야 한다
- [x] mock 업로더는 `URL.createObjectURL`로 미리보기 URL을 만들고, 새로고침하면 URL이 유효하지 않다는 점을 화면에 안내한다
- [x] mock의 `asset-lifecycle` 정리는 참조되지 않는 objectURL에 `URL.revokeObjectURL`을 호출한다

### 진입 플래그

- [x] B3의 `NEXT_PUBLIC_E2E_ADMIN_SESSION`을 관리자 개발 전반에 적용할 수 있는 이름으로 변경한다(예: `NEXT_PUBLIC_ADMIN_TEST_SESSION`). E2E와 로컬 개발은 같은 플래그를 사용한다
- [x] mock 콘텐츠 사용 여부와 관리자 인증 우회를 분리한다. `NEXT_PUBLIC_USE_MOCK`만으로 `AuthGuard`가 열리지 않으며, 인증 우회는 별도의 명시적 플래그로 제어한다
- [x] 인증 우회 플래그가 프로덕션 빌드에서 활성화되면 즉시 실패하는 가드를 유지한다. `.env.local` 주석과 `CLAUDE.md` 환경변수 목록에도 같은 조건을 기록한다
- [x] 관리자 화면 상단에 mock 모드임을 표시하고, 저장값이 현재 브라우저에만 남으며 공개 화면에는 반영되지 않는다고 안내한다

### 실데이터 전용 화면

- [x] `/admin/maintenance`의 임베딩 생성과 썸네일 마이그레이션은 실제 Storage·OpenAI 연결이 필요하다. mock 모드에서는 실행 버튼을 비활성화하고 필요한 연결을 안내한다
- [x] `RagStaleBanner`처럼 서버 상태에 의존하는 UI는 mock 모드에서 사용할 상태의 출처와 표시 조건을 정한다

### 관리자 E2E 확장 (mock 지원 화면 전체)

> B3의 harness(`e2e/utils/admin-fixtures.ts` · `NEXT_PUBLIC_ADMIN_TEST_SESSION`)를 사용한다. 테스트는 데스크톱 뷰포트에서 실행하며, mock 저장소를 지원하는 관리자 화면만 대상으로 한다. 실제 서비스 연결이 필요한 화면은 B3.5 E2E 범위에서 제외한다.

- [x] 관리자 전역 초기화 fixture를 만든다. 컬렉션별 로컬 저장소 키를 한곳에서 제거하고, 각 테스트를 동일한 mock seed에서 시작한다
- [x] **관리자 목록 스모크 테스트는 데이터 주도형 단일 spec으로 구성한다.** 경로·행 이름·`새 항목` 라벨 표를 순회하며 목록 렌더링, 공개 상태 변경과 삭제를 확인한다. `workers: 1` 환경에서 화면별 spec 복제로 실행 시간이 늘어나지 않게 한다
- [x] `useOrderedAdmin`을 사용하는 화면 중 하나에서 실제 drag로 순서를 저장하고, 새로고침 뒤에도 순서가 유지되는지 확인한다. 공용 정렬 훅의 동작은 이 대표 시나리오로 검증한다
- [x] 사진 폼에서 파일 선택 → EXIF 자동 입력(조리개·셔터·ISO·촬영일시) → 태그 선택 → 저장 흐름을 확인한다. 저장소에는 EXIF를 포함한 작은 JPEG fixture를 두며, mock에서도 실제 추출 과정이 실행되는지 검증한다
- [x] 앨범 폼에서 표지 지정과 사진 순서 편집을 확인한다. 사진 삭제 시 해당 사진이 앨범에서도 제거되는 `remove-photo-from-album` 후처리까지 검증한다
- [x] 태그 사전에서 추가·라벨 수정·정렬·삭제한 결과가 사진 폼의 선택지에 반영되는지 확인한다
- [x] config 화면(전역·사진 소개·음악·개발) 중 하나에서 **화면이 소유한 필드만 병합 저장**하는 계약을 확인한다. 서로 다른 화면을 차례로 저장해도 다른 화면의 값이 유지되어야 한다
- [x] 관리자 상단의 mock 배지와 `/admin/maintenance`의 비활성 실행 버튼·안내 문구를 확인한다
- [x] spec 추가 전후의 전체 E2E 실행 시간을 비교하고 증가 폭과 원인을 기록한다 → `e2e/admin` 데스크톱 기준 B3 4개 spec ≈ 50초(서버 부팅 제외) → B3.5 17개 spec 2.3분. 증가분은 새 화면 13개의 dev 서버 첫 컴파일과 새로고침 유지 검증(목록 spec당 새로고침 2회)이며, 목록 검증을 표 순회 단일 spec으로 묶어 화면당 부팅 반복은 피했다. `e2e/pages`(151개)는 변화 없음

### 실데이터 스모크 절차 (배포 전 · 자동화 밖)

> B3.5 이후 자동화 테스트는 mock 분기만 지난다. 실데이터 경로는 배포 전에 아래를 수동으로 확인한다.
> `.env.local`에 `NEXT_PUBLIC_USE_MOCK=0`을 두고 `npm run dev`로 실행하며, 관리자 상단에 MOCK 배지가 없어야 실데이터 상태다.

1. 컬렉션마다(사진·앨범·연주·수상·영상·프로젝트) 문서 한 건을 저장 → 공개 토글 → 삭제한다. 사진은 실제 파일 업로드로 EXIF 추출·3단 webp 산출까지 확인한다
2. 설정 문서 3종(전역·음악·개발)을 각각 저장하고 다른 화면의 필드가 유지되는지 확인한다
3. 공개 페이지에 저장·삭제가 반영되는지(`revalidate`) 확인하고, `/admin`의 RAG 잔류 배너와 `/admin/maintenance` 임베딩 상태로 RAG 동기화를 확인한다

### B3.5 검증

- [x] Firebase 환경변수 없이 `npm run dev`로 모든 관리자 화면을 열고 목록·편집·저장·삭제·정렬·공개 상태 변경을 확인한다 → E2E 17개가 같은 흐름을 자동으로 확인하고, dev 서버 수동 확인으로 배지·폼 규격을 봤다
- [x] 기존 실데이터 CRUD·projection·업로드 동작과 Rules 테스트가 모두 통과한다 → live 경로(`lib/firebase/*`)는 diff 0, repository live 분기는 기존 훅이 조립하던 어댑터의 이동이라 호출 코드가 같다. Rules 테스트는 CI 가 실행
- [x] 관리자 mock 저장소와 공개 getter(`lib/content/*`)를 분리한다. 공개 화면은 계속 `mocks/*`를 읽어야 한다
- [x] 기존 공개 E2E·시각 회귀·접근성 스캔이 통과한다. 프로덕션 모드 테스트에서는 관리자 인증 우회 플래그가 비활성 상태여야 한다 → `e2e/pages` 150+1(재실행) 통과, `test:a11y` 22개 통과. `e2e/run.cjs` 는 `--production` 에서 플래그를 넣지 않고, 프로덕션 빌드에 플래그가 있으면 가드가 throw 한다

---

## B4 — Mock 기반 공개 목록과 상세 (§6, §12-B4)

### 공용 primitive 선행 추출 (사진 회귀 필수)

- [x] page toolbar — 갤러리의 인라인 `제목/결과 수/보기 전환` 마크업을 공용 shell로 추출, 사진 회귀 테스트 통과 (§6) → `components/PageToolbar`, CSS는 글자 그대로 이동. 결과 수는 포맷을 모르는 `count?: string`
- [x] `TagFilterBar` — 사진 `FilterBar`에서 태그 칩 행 + overflow 스타일만 승격 (카메라·초점거리 popover는 잔류), 사진 회귀 테스트 통과 (§6) → popover는 `trailing` 슬롯. 어느 폭에서든 한 줄 + 좌우 스크롤이며 넘치는 방향에만 화살표(사용자 요청, 사진 데스크톱 스냅샷 갱신)
- [x] `ViewToggle` — boolean `square`·사진 아이콘 고정 API를 option id·label·icon 주입식 범용 segmented control로 리팩터링, `aria-pressed`·키보드 동작 공유, 사진 회귀 테스트 통과 (§6) — 사진의 로컬 view state를 URL로 옮기는 일은 범위 외
- [x] 앨범 상세 hero — shell·scrim·back/share 위치·진입 motion을 공용 hero primitive로 추출(metadata는 slot), 앨범 회귀 테스트 통과 (§6) → `components/DetailHero`. 커버 없으면 타이포그래피형(scrim 생략·버튼 surface 전환). 추출 전 앨범 상세 시각 기준선을 먼저 만들고, 교체 후 픽셀 동일을 확인했다

### 블로그 목록 (`/dev/articles`)

- [x] URL 계약 — `?tag`(없거나 삭제된 id는 `전체` 정규화, 변경 시 page 1 리셋)·`?view=grid|list`(기본 grid)·`?page`(범위 밖·비숫자는 canonical 1페이지 정규화), 세 키만 직렬화·기본값 생략 (§6) → `_lib/article-list-query`. 서버 `searchParams` 대신 클라 `useSearchParams`+`pushCurrentUrl`(ISR 유지·Next 16 동일 pathname no-op 회피)
- [x] 정렬·pagination — `publishedAt desc, id asc`, 페이지당 8개, 뒤로가기·공유 URL 복원 (§6) → 정렬은 getter 가 이미 마쳤고 화면은 자르기만 한다. mock 공개 글을 9건으로 늘려 2페이지를 만든다
- [x] 그리드 보기 — 데스크톱 2열·모바일 1열, 대표 이미지·제목·요약·태그·발행일·읽기 시간 (§6)
- [x] 목록 보기 — 행 구성, 작은 화면 metadata 줄바꿈, 이미지 없는 글은 이미지 칸 생략 (§6) → 카드 골격은 개발 프로젝트 카드와 같게 맞췄다(사용자 요청)
- [x] 이미지 없는 그리드 카드 — ~~블로그 전용 CSS·실제 텍스트 대체 구성~~ → **결정 변경**: 프로젝트 카드와 같은 라이트/다크 워드마크 이미지를 쓴다. 같은 개발 섹션에서 목록마다 카드 모양이 갈리는 편이 더 어색하다는 판단(사용자 요청)
- [x] 빈 필터 결과 — 선택 태그 표시 + 초기화 동작 (§6) → mock 사전의 `accessibility` 태그를 어느 글도 쓰지 않게 두어 이 화면을 확인한다

### 블로그 상세 (`/dev/articles/[slug]`)

- [x] hero(이미지 有) — full-bleed 배경 + scrim, 실제 HTML 텍스트 제목·요약·발행일·읽기 시간·태그, 좌상단 목록 복귀·우상단 `ShareButton`(canonical URL) (§6) → 배경은 지면 전체, 글은 본문과 같은 폭(860px)에 맞춘다. 넓은 화면에서는 태그 왼쪽·발행 정보 오른쪽. **수정일은 표시하지 않는다** — 읽기 전에 필요한 것은 언제 쓴 글이고 얼마나 걸리는지 두 가지뿐이라는 판단(구조화 데이터에는 남는다)
- [x] hero(이미지 無) — 타이포그래피형, scrim 생략, back/share 버튼 WCAG 대비 surface 전환, 같은 정보 위계 (§6) → 최소 높이도 두지 않는다. 채울 사진이 없는데 자리만 비우면 제목이 아래로 밀린다
- [x] `cover`의 focal position 지원 여부를 구현 전 확인하고 결정을 기록한다 (§6) → **도입하지 않는다.** `ImageMeta` 에 필드가 없고 저장소 전체에 `object-position` 사용이 0건이다. 넣으려면 타입·업로더·관리자 폼·기존 문서 이행이 함께 움직여야 해서, 실제 커버에서 잘림이 문제가 될 때 다시 판단한다
- [x] 본문 — 긴 글용 최대 폭·행간, 서체는 기존 토큰만, 코드 라이트·다크 테마 (§6) → B2 가 미뤄 둔 지면 타이포를 확정했다: 행간 1.65, 문단 사이는 좁게(`--s-3`) 두고 제목 **위** 여백만 크게(h2 `--s-10`·h3 `--s-8`) 잡아 절 구분이 간격으로 읽히게 했다. 폭 860px

### 노션식 floating 목차 (§6)

- [x] 축소 인디케이터 — 오른쪽 중앙 세로 선(h3는 짧게), 현재 heading 강조(색상 외 수단 병행), heading 2개 미만이면 미렌더, 본문 구간에서만 표시 → 눈금은 작고 연하게(기본 `opacity: .42`) 두고 포인터가 오면 또렷해진다. 커서 스냅은 `data-cursor-passive` 로 끈다 — 반응은 커서가 아니라 눈금이 해야 한다
- [x] 현재 위치 추적 — `IntersectionObserver` 기반(heading별 scroll listener 금지), 읽기 기준선·문서 끝 규칙 → 읽기 기준선 96px 은 `--reading-line-offset` 과 `READING_LINE_PX` 가 같은 값을 쓰고, heading `scroll-margin-top` 도 여기에 맞춰 이동 직후 그 제목이 현재 항목이 된다
- [x] 데스크톱 확장 — hover/focus 시 왼쪽 확장, 유예 후 축소(focus 중엔 유지), `aria-current="location"`, 2줄 말줄임 + 전체 accessible name
- [x] 모바일 drawer — 44×44px hit area, focus trap, backdrop·닫기·`Escape` 로 닫힘, 배경·챗봇 trigger `inert` → **전면 시트 대신 오른쪽 가운데의 작은 패널**(`min(78vw,300px)`·`max-height: min(56dvh,420px)`). 목차는 읽던 자리를 잃지 않으려고 여는 것이라 본문이 뒤에 보이는 편이 낫다는 판단(사용자 요청)
- [x] 챗봇 버튼 좌표 공용화 — `ChatLauncher.module.css`의 크기·offset을 CSS custom property로 승격, 목차와 최소 간격 공유 (§6) → `--chat-launcher-size`·`--mobile-tab-bar-height` 를 `globals.css` 단일 출처로. 62px 이 탭바와 런처 두 곳에 중복돼 있던 것도 함께 정리했다
- [x] fragment/history — `history.pushState` 계약, 뒤로가기 시 fragment·스크롤 복원, heading 공통 `scroll-margin-top` → 이동 전 현재 기록에 `scrollY` 를 적고 되돌아올 때 그 값이 있을 때만 복원한다(목차가 만든 새 기록에는 없으므로 앞으로 가기와 섞이지 않는다)
- [x] 접근성·motion — `목차 열기` accessible name + `aria-expanded`/`aria-controls`, `prefers-reduced-motion` 즉시 처리, 고대비 대응 → 보이지 않을 때는 `visibility: hidden` 으로 Tab 순서에서도 뺀다(투명한 버튼에 포커스가 가면 화면에 없는 것이 읽힌다)
- [x] component + E2E 테스트로 계층·추적·확장·drawer·복원 고정 (§12-B4) → `use-hover-grace`·`heading-navigation` 단위 테스트 + `e2e/pages/dev-article-detail.e2e.ts`(표시 구간·hover 확장·이동 위치·모바일 열고 닫기·항목 선택 이동)

### 본문 하단·언어·SEO

- [x] 연관 프로젝트 카드 — 지정 순서, 비공개 ID 제외 (§7) → 프로젝트 상세는 목록 화면의 모달이라 `?project=` 딥링크로 보낸다(상세 지면에 모달과 데이터를 다시 세우지 않는다)
- [x] 블로그 탐색 목록 — 표 형태 5개, 현재 글 페이지 우선·현재 행 강조, `?articlePage=` 분리, 본문 유지 갱신, 키보드 탐색 (§6) → 쪽 이동은 `replaceCurrentUrl`(push 아님) — 표를 넘긴 횟수만큼 뒤로가기가 쌓이면 목차 fragment 기록과 섞인다
- [x] 관계·목록 projection — 본문 없이 id·slug·제목·요약·cover·태그·발행일·읽기 시간·프로젝트 ID만 캐시 (§6, §7) → `_lib/article-projection` 하나를 목록·상세·탐색 표가 함께 쓴다
- [x] 프로젝트 모달 역방향 — 그 프로젝트를 지목한 공개 글을 발행일 내림차순으로 표시 (§7) → 관계는 글에만 저장하므로 `_lib/group-articles-by-project` 가 뒤집는다. 프로젝트 지면은 본문이 필요 없어 `getDevArticleProjectLinks`(slug·제목·발행일·관계만 select)를 따로 읽는다
- [x] 영어 경로 — `This article is available in Korean only.` 안내, 본문 `lang="ko"` (§8)
- [x] metadata — 언어별 제목·요약 metadata + Article 구조화 데이터, canonical은 한국어 URL, 초안·미리보기 `noindex`, sitemap 등재 (§8) → `pageMetadata` 결과의 `alternates` 를 통째로 바꿔 canonical 을 한국어로 고정하고 hreflang 은 달지 않는다(영어 경로는 번역본이 아니다). BlogPosting JSON-LD 는 저장소 최초. sitemap 도 같은 정책으로 글별 한국어 URL 하나만 올린다. 관리자 미리보기는 `robots.ts` 의 `/admin` disallow 로 이미 차단돼 있어 추가 작업 없음

### B4 검증

- [x] 공개 목록·상세 + 관리자 작성 흐름 mock E2E 통과 → 콘텐츠 계약 고정 (§12-B4) → `e2e/pages/dev-articles.e2e.ts`(태그·보기·페이지 URL 계약, canonical 정규화, 빈 결과) · `dev-article-detail.e2e.ts`(목차 표시 구간·hover 확장·이동 위치·모바일 패널·하단 영역·없는 slug/초안 404) · `public-routes`·`ACCESSIBILITY_ROUTES` 등록
- [x] 추출한 공용 컴포넌트가 사진·앨범 화면을 회귀시키지 않는다 (§14) → 앨범 상세는 hero 교체 전후 시각 기준선이 픽셀 동일. 사진 작업 목록은 태그 줄 정책을 바꾼 데스크톱 스냅샷만 의도적으로 갱신했고 나머지는 무변화

### B4 에서 함께 고친 것 (계획 밖)

- 상세 지면에 `main` 랜드마크가 없어 지면 전체가 landmark 밖에 있었다 — `ArticleDetailView` 에 `landmark` 옵션을 두고 공개 라우트만 `main` 으로 감싼다(관리자 미리보기는 이미 다른 `main` 안).
- 목차 인디케이터가 `opacity: 0` 로만 숨겨져 보이지 않는 동안에도 Tab 으로 잡혔다 → `visibility` 로 함께 감춘다.
- 모바일에서 목차 항목을 눌러도 이동하지 않던 문제 — 패널을 닫을 때 배경 스크롤 잠금을 푸는 처리가 저장해 둔 위치로 되돌리고 있었다. 닫힌 뒤에 이동하도록 순서를 바꿨다.
- `e2e/run.cjs` 가 프로덕션 모드에서 `NEXT_PUBLIC_ADMIN_TEST_SESSION=0` 을 명시한다 — `.env.local` 에 이 플래그를 두고 개발하면 프로덕션 빌드 가드에 걸려 시각 회귀를 돌릴 수 없었다.

---

## B4.5 — B4 검수 후속 수정 (계획 문서 밖 · 이 문서가 원본)

> 범위: `7ece62d`(B1 직전)부터 현재까지 바뀐 306개 파일을 검수했다. B1~B4에서 생긴 결함과 공용 컴포넌트 추출 과정에서 기존 화면에 생긴 회귀를 함께 다룬다.
> 적용 시점: **B4 완료 후, B5 시작 전.** P0는 빌드 실패나 보안 경계 훼손으로 이어질 수 있으므로 Firestore 연동보다 먼저 처리한다.
> 검수 시점 상태: `vitest` 1242/1242 통과, `npm run lint` 통과, `npm run check` 통과. bare `tsc --noEmit`은 오래된 `.next/types`에 영향을 받으므로 검증 명령으로 쓰지 않는다.
> 별도 수정이 필요 없다고 확인한 범위: shiki 서버 전용 격리, URL·이미지 출처 정책, raw HTML 차단, `/dev/about` 308 단일 홉, live CRUD·RAG 후처리, mock과 실데이터 사이의 교차 쓰기 방지.
> 종료 상태: 직접 수정 41건과 검증을 모두 마쳤다. 아직 열려 있는 두 칸(`960 프리뷰 / 2048 원본 분리`, `B5 진입 전 확인`)은 B4.5 의 잔여 작업이 아니라 **B5 에서 처리하기로 정한 것**이다.

### P0 — 배포를 막는 결함

- [x] `markdown-code-language.ts:63` — `CODE_LANGUAGE_ALIASES[key]`가 프로토타입 체인까지 조회한다. ` ```constructor ` fence를 넣으면 `block.language`에 함수가 들어가고, 이 값은 `?? null`에도 걸러지지 않는다. 공개 상세에서는 React Flight가 함수를 직렬화하지 못해 prerender가 실패하고, 관리자 미리보기도 같은 값을 반환한다 → 별칭 조회에 `Object.hasOwn`을 사용하거나 prototype이 없는 사전을 쓴다
- [x] `dev/articles/[slug]/page.tsx:129` — JSON-LD를 `JSON.stringify` 결과 그대로 `dangerouslySetInnerHTML`에 넣는다. `JSON.stringify`는 `<`를 이스케이프하지 않으며 제목·요약·태그 라벨은 관리자 입력값이다. `</script>`가 들어가면 script 요소가 일찍 닫히고, 현재 CSP는 `script-src 'unsafe-inline'`을 허용한다 → 직렬화 결과의 `<`를 `\u003c`로 바꾸고 필요하면 `>`와 `&`도 함께 이스케이프한다. 128행의 “사용자 입력이 그대로 들어가지 않는다”는 주석도 삭제하거나 바로잡는다
- [x] `markdown-normalize.ts:63,120` — `toInlines`와 `toBlocks`에 중첩 깊이 제한이 없다. `">".repeat(2000)`처럼 약 2KB에 불과한 입력도 재귀 호출에서 `RangeError`를 내며, 현재 호출 경로에는 이를 처리하는 경계가 없다. `PREVIEW_MAX_BODY_LENGTH = 200_000`도 이 입력을 막지 못한다 → 중첩 깊이 상한을 두고 초과 지점을 issue로 반환한다
- [x] `markdown-heading-id.ts:29` — `used`는 발급한 id가 아니라 base slug의 등장 횟수만 센다. `## 정리` / `## 정리 2` / `## 정리`는 `정리` / `정리-2` / `정리-2`가 되어 id가 겹친다. 목차 이동 대상과 `ArticleTocRail`의 React key도 함께 중복된다 → 발급한 id를 `Set`으로 관리하고 비어 있는 번호를 찾는다
- [x] `firebase/client.ts:21`과 관리자 Firebase import 경계 — `getAuth(app)`이 모듈 평가 시점에 실행되어 API 키가 없으면 `auth/invalid-api-key`를 던진다. `AuthGuard`는 테스트 세션에서도 `useAuth`를 먼저 호출하고, mock 저장소 모듈도 live 구현을 정적 import한다. 따라서 B3.5의 “Firebase 없이 관리자 개발” 계약이 성립하지 않는다. 저장소의 live 분기만 지연 import해도 `AuthGuard` 경로가 남으므로 충분하지 않다 → Firebase client 초기화와 인증 훅, 저장소 live 구현을 함께 지연하고 테스트 세션에서는 Firebase 모듈을 평가하지 않는 회귀 테스트를 둔다
- [x] `content-source.ts:22` — 프로덕션 mock 차단이 `VERCEL`에만 의존한다. 이 값은 클라이언트 번들에서 사용할 수 없고, Vercel이 아닌 프로덕션에서는 `NEXT_PUBLIC_USE_MOCK=1`을 허용한다. 반면 Windows production E2E는 같은 플래그가 필요하므로 `NODE_ENV`만 보고 전부 막을 수도 없다 → 서버의 빌드·부팅 단계에서 배포 환경을 검증하고, production E2E 예외는 배포 산출물에 남지 않는 전용 설정으로 분리한다. 클라이언트는 서버가 확정한 콘텐츠 소스만 받게 한다

### P1 — 사용자에게 보이는 회귀

- [x] `AlbumDetailView.module.css:7,12` — 앨범 제목과 메타 정보는 흰색 계열로 고정되어 있지만, `DetailHero`의 plain variant는 scrim 없이 `--surface-1`을 쓴다. 커버로 쓸 공개 사진이 없으면 라이트 모드의 밝은 배경 위에 흰 글자가 놓인다. `ArticleHero`에는 이미 variant별 글자색 규칙이 있다 → 앨범 텍스트에도 같은 variant 분기를 둔다
- [x] `photo/(work)/loading.module.css:70` — 스켈레톤의 데스크톱 규칙은 예전 `FilterBar`처럼 여러 줄로 감싼다. 실제 `TagFilterBar`는 모든 화면 폭에서 한 줄이므로 로딩 화면이 본문으로 바뀔 때 masonry 그리드의 시작 위치가 달라진다. 파일 첫 주석도 예전 컴포넌트를 가리킨다 → 스켈레톤을 현재 태그 행 규격(`nowrap`, `gap: --s-3`, `align-items: center`)에 맞춘다
- [x] 태그 행 한 줄 정책을 `design/README.md`의 의도적 이탈 목록에 넣는다. 디자인 원본의 `.chiprow`는 여러 줄을 허용하지만 현재 확정 사양은 한 줄과 좌우 스크롤이다. 지금은 근거가 이 체크리스트의 B4 항목에만 있어 `/design-check`가 위반으로 판단한다. 동작은 바꾸지 않는다
- [x] `ArticleBodyEditor.tsx:46,77` — 이미지 업로드가 끝난 뒤 실행되는 `insert`는 업로드 시작 시점의 `value`를 사용한다. 업로드 중 textarea에 입력한 내용은 이미지 삽입과 함께 사라질 수 있다 → 최신 값을 ref로 읽거나 상위 상태가 함수형 업데이트를 받도록 바꾼다. `ArticleCoverField`의 `setForm(prev => …)` 방식은 이 문제가 없다
- [x] `e2e/visual/public-pages.visual.e2e.ts` 의 기준선 상태를 정리한다 → 고아 기준선 4개(`dev-articles-*` · `dev-article-detail-*`)는 png 만 커밋되고 `VISUAL_ROUTES` 에 라우트가 없어 아무 테스트도 소비하지 않았다. **두 라우트를 추가했다.** `photo-album-detail-*` 는 `930a6eb` 이후 히어로 교체를 반영하지 않았다 — 아래 갱신 항목에서 왜 그 png 가 그대로인지 함께 설명한다
- [x] `DetailHero.module.css` — 공용 히어로로 옮기며 앨범 하단 padding 32→24px, 고정 `height`→`min-height`, 복귀 버튼 간격·굵기·글리프가 달라졌다 → **현재 규격을 확정 사양으로 둔다**(사용자 확정). 상단 여백 계산은 좁은 화면에서 제목이 버튼 아래로 파고드는 것을 막고, `min-height` 전환은 커버 없는 지면이 빈 자리를 남기지 않게 한다. 글리프는 이번에 SVG 로 바뀌었다

### P2 — 계약 불일치와 오류 은폐

- [x] `markdown-normalize.ts:87` — reference 문법을 처리하지 않아 `linkReference`의 라벨과 `imageReference`의 대체 텍스트가 사라진다. `[문서][doc] 뒤 문장`은 `" 뒤 문장"`만 남아 “허용하지 않은 링크도 글자는 남긴다”는 계약과 어긋난다 → `linkReference`는 링크만 벗기고 자식을 유지한다. `imageReference`는 허용 여부를 명시적으로 보고하고 대체 텍스트를 보존할지 계약을 정한다
- [x] `markdown-toc.ts:25` — `items.at(-1)`은 마지막 h2가 아니라 마지막 최상위 항목이다. 문서가 `### a / ### b`로 시작하면 `b`가 `a`의 자식이 된다 → 마지막 h2를 따로 추적한다. h2보다 먼저 나온 h3를 어떻게 표시할지도 주석과 테스트에 함께 고정한다
- [x] `markdown-normalize.ts:113` — `attachCaption`은 앞 블록이 이미지가 아닌 경우와 이미지에 이미 캡션이 있는 경우를 모두 `false`로 반환한다. 이 때문에 두 번째 `::caption`에도 `caption-without-image`가 붙고 발행을 막는다 → 두 경우에 서로 다른 issue를 반환한다
- [x] `markdown-highlight.ts:50,64` — `highlighter ??=`와 `loadedLanguages.set`이 reject된 Promise를 계속 보관한다. wasm 또는 언어 청크 로드가 한 번 실패하면 같은 프로세스에서 재시도하지 않으며, 호출부의 빈 `catch` 때문에 원인도 남지 않는다 → 실패한 Promise는 캐시에서 지우고 관찰 가능한 로그를 남긴다
- [x] `local-list-repository.ts:106,116` — 항목 하나가 형 검증에 실패해도 `decode`는 배열 전체를 버리고 `load`는 곧바로 mock seed를 채운다. 기존 편집 내용이 폐기됐다는 사실은 화면에 드러나지 않는다 → 폐기 사유를 관리자에게 표시하거나 최소한 개발 콘솔에 남긴다
- [x] `local-store.ts:38,123` — `getItem` 예외는 `null`로 바뀌고 seed 저장 실패도 무시된다. localStorage가 차단된 환경에서는 저장소가 정상 초기화된 것처럼 보인다 → 읽기 실패와 seed 저장 실패를 일반 저장 실패처럼 드러낸다
- [x] `local-doc-repository.ts:53,80` — mock은 `{ ...seeded, ...existing }`로 누락 필드를 mock 문구에서 채운다. live는 문서가 없으면 `EMPTY_*`를 반환하고, 문서가 있으면 필드별 빈 기본값을 쓴다. 따라서 오래된 저장본에 새 필드가 생겼을 때 mock과 live의 화면 값이 달라질 수 있다. `merge`도 최상위 shallow merge라 Firestore의 `setDoc(..., { merge: true })`와 중첩 객체 동작이 다르다 → 누락 필드와 중첩 병합 계약을 각각 정해 두 구현을 맞춘다
- [x] `local-list-repository.ts:161,172` — mock은 `order`가 같으면 삽입 순서를 유지하지만 live 쿼리는 문서 id를 보조 정렬 키로 쓴다. `AwardForm`과 `MediaForm`은 새 항목의 `order`를 모두 0으로 만들어 동률이 흔하다. `create`도 mock은 중복 id를 거부하지만 live의 `setDoc`은 덮어쓴다 → mock 정렬에 id 보조 키를 넣고 중복 id 계약을 맞춘다
- [x] `use-article-editor.ts:84` — `setForm` updater 안에서 `setDirty`를 호출한다 → `dirty`를 `fingerprint(form) !== savedFingerprint.current`에서 계산한다
- [x] `markdown-insert.ts:79` — `youtubeMarkdown`은 title과 source만 정리하고 URL의 `]`와 `}`는 그대로 둔다. 이 문자가 들어가면 directive가 깨질 수 있다 → URL에도 directive 인자용 정규화를 적용한다
- [x] `ArticleHero.tsx:80` — 태그 라벨을 React key로 쓴다. 라벨이 겹치거나 알 수 없는 태그 id의 폴백 문자열이 겹치면 key도 중복된다 → 태그 id를 key로 쓴다
- [x] `ViewToggle.tsx:9` — `icon: string`이라 오타가 컴파일 오류 없이 빈 `<svg>`를 만든다 → `Icon`이 허용하는 이름을 별도 타입으로 내보내고 option의 `icon`을 그 타입으로 제한한다
- [x] `PublicPageSkeletons.tsx:51` — `StackGroupsSkeleton`에는 `기술` h2와 `clamp(56px, 7vw, 88px)` 상단 여백이 없다. `/dev/career`에서 스켈레톤의 기술 영역이 실제 화면보다 100~120px 위에 놓인다
- [x] `globals.css:51` 토큰 승격의 미적용분을 확인한다 → `AnalyticsConsentBanner.module.css:4` 의 `48px` 은 챗봇 런처 크기와 정확히 같고 "런처 위에 쌓기" 계산이라 `var(--chat-launcher-size)` 로 바꿨다. **나머지 둘은 바꾸지 않는다** — `SiteFooter.module.css:193` 의 64px 와 `AnalyticsConsentBanner.module.css:180` 의 74px 는 탭바 높이(62px)와 값이 달라 같은 치수를 뜻한다고 볼 근거가 없다

### 블로그 탐색 표의 행 단위 hover·커서 스냅

> 현상: 상세 지면 하단 「다른 글」 표는 `<td>` 안의 `<Link>` 하나만 인터랙티브해서(`ArticleNavigationTable.tsx:91-97`) 클릭·hover·커스텀 커서 스냅이 전부 **제목 글자 폭**에서만 일어난다. 날짜 셀은 눌리지 않고, hover 반응은 `.link:hover { color: var(--accent) }` 글자색뿐이다(`ArticleNavigationTable.module.css:35-37`).
> 기준으로 삼을 것: `/dev/career`의 수상 행(`DevCareerView.tsx:68-77` · `DevCareerView.module.css:51-71`). **행 전체가 `<button>`이라 어디를 가리켜도 반응한다**는 점이 핵심이다. `padding-left: 16px` + `background: var(--surface-1)` 로 행이 오른쪽으로 밀리며 배경이 깔린다. 음악 경력 행(`MusicCareerView.module.css:30-47`)이 같은 규격을 공유한다.
> 커서는 행 크기로 스냅하지 않는다 — `CustomCursor.tsx:233`의 `targetCompact` 조건이 `width <= 450 && height <= 128`인데 이 행들은 그보다 넓어 `:320`에서 `setSnapped(null)` 후 `link` 모드(30px 원)가 된다. 따라서 `data-cursor-snapped`가 붙지 않아 CSS hover가 그대로 작동한다. `:hover:not([data-cursor-snapped])` 가드는 저장소 25곳이 쓰는 규약이라 함께 붙이되, 좁은 창에서의 snap 경계는 이번 범위에서 다루지 않는다(사용자 확정).
> **레이아웃은 바꾸지 않는다** — 제목 왼쪽·날짜 오른쪽·구분선·현재 글 강조는 그대로 두고 hit area와 hover 반응만 행 단위로 올린다.

- [x] 행 전체를 하나의 링크로 만든다. `<td>`마다 `<a>`를 두면 hit area 가 셀 단위로 갈리므로, `<tr>` 안에 `<td colSpan={2}>` 하나를 두고 그 안의 `<a>`를 `display: flex; justify-content: space-between`으로 편다
- [x] hover 반응을 수상 행 규격으로 맞춘다 — `padding-left` 이동 + 배경 전환, `transition: background .2s, padding-left .2s`. 색만 바뀌던 기존 반응을 대체한다
- [x] `:hover:not([data-cursor-snapped])`를 붙인다. 저장소 25곳이 쓰는 규약인데 `ArticleNavigationTable.module.css`만 빠져 있었다
- [x] 현재 글 행은 hover 대상에서 제외한다(사용자 확정). 링크가 아니므로 `.current`의 `--surface-1` 배경을 그대로 두고 hover 규칙을 적용하지 않는다 → 같은 색이지만 두 상태가 한 행에서 겹치지 않는다
- [x] 현재 글 행의 `aria-current="page"`와 `<time dateTime>`을 `colSpan` 마크업에서도 유지한다
- [x] `prefers-reduced-motion` 블록이 `padding-left` transition도 끈다
- [x] 행 어디를 눌러도 이동하는지, 현재 글 행에는 hover 가 안 걸리는지 `e2e/pages/dev-article-detail.e2e.ts`에 추가한다 → 기존 spec 은 표의 쪽 이동조차 확인하지 않았다

### 글리프 아이콘을 SVG로 교체 (16개 파일 28곳)

> 배경: 화살표·닫기·체크를 `‹ › ← → ↑ ↓ ✕ × ✓` 문자로 그리는 곳이 남아 있다. 저장소에는 이미 인라인 SVG 세트(`components/Icon.tsx` 20종)와 닫기 전용 `components/CloseIcon.tsx`가 있고, `ImageCarousel.tsx:32,45`와 `ImageLightbox.tsx:30,43`은 같은 chevron SVG를 각자 중복 정의한다. 화살표가 필요할 때 SVG·글리프·복붙 세 갈래로 갈려 있다.
> 근거: `line-height: 0px`가 저장소 전체에서 글리프 3파일(`DetailHero.module.css:41` · `TagFilterBar.module.css:45` · `ArticleNavigationTable.module.css:77`)에만 있다. 글리프 baseline이 버튼 중앙에 맞지 않아 넣은 보정이고, `DetailHero.module.css:47`은 `.arrowBack { font-size: var(--t-h3) }`로 아이콘 크기를 폰트 크기에 맡긴다. 폰트 폴백에 따라 굵기가 달라져 `Icon.tsx`의 `strokeWidth={1.7}`과도 어긋난다.
> 접근성은 이미 확보돼 있다 — 조작 버튼에는 `aria-label`이 붙어 있고 `TagFilterBar` 화살표는 의도적으로 `aria-hidden`이다. 이 항목은 시각 일관성만 다룬다.

- [x] `Icon.tsx`에 `chevronLeft` · `chevronRight` · `arrowUp` · `arrowDown` · `check`를 추가하고, `ImageCarousel`·`ImageLightbox`가 각자 들고 있던 chevron 을 흡수한다(로컬 정의 삭제)
- [x] `PATHS` 를 `as const satisfies Record<string, ReactNode>` 로 바꿔 `IconName` 이 literal key 를 유지하게 하고, `Icon.name` · `ViewToggleOption.icon` · `NavItem.icon` 이 그 타입을 쓴다 → 위 P2 의 `ViewToggle.tsx:9` 항목과 같은 작업이다
- [x] 공개 화면 교체 — `DetailHero`(복귀) · `TagFilterBar`(스크롤, `aria-hidden` 유지) · `ArticlePagination`(쪽 이동) · `ArticleNavigationTable`(쪽 이동)
- [x] `ArticleTocDrawer`의 `✕`를 `CloseIcon`으로 바꾼다. `CloseIcon` JSDoc이 "모든 닫기 액션이 공유하는 아이콘"이라고 적은 계약을 이 한 곳만 지키지 않았다
- [x] 관리자 정렬 버튼 `↑ ↓` 9개 파일 18곳 — `admin-music-config/TimelineRow` · `admin-global/LinkRow` · `admin-dev-config/{DevTimelineRow,DevEducationRow,InterviewRow,DevAwardRow,StackGroupRow}` · `admin-dev-articles/ArticleRelatedProjectsField` · `admin-dev-projects/DevImageField`. `aria-label`은 그대로 뒀다
- [x] 관리자 나머지 — `ProjectForm`(`×` 태그 삭제 → `CloseIcon`) · `AlbumPhotoPicker`(`✓` 선택 표시 → `check`)
- [x] 교체한 버튼에서 `line-height: 0px` 보정 3곳과 `.arrowBack`의 `font-size` 지정을 걷어낸다 → 저장소에 `line-height: 0px` 가 0건이 됐다
- [x] **시각 규격 변경**: `ArticlePagination`의 `← →`가 chevron 이 되어 목록 페이저와 표 페이저 모양이 같아진다(사용자 승인)
- [x] 교체 대상이 아닌 것을 구분해 남긴다 — `ExifPanel.tsx:37`의 `${w} × ${h}`는 곱셈 기호, 관리자 허브 카드의 `관리 →`는 문구 일부, `LangMenu.tsx:83`의 `●`는 현재 언어 표시, 외부 링크 `↗` 7곳은 범위 밖(사용자 확정)
- [x] 앨범 상세·블로그 상세·사진 작업 목록의 시각 기준선을 다시 만든다. 위 P1의 히어로 규격 항목과 같은 화면을 건드리므로 기준선 갱신은 한 번에 처리한다 → 아래 「B4.5 검증」의 기준선 항목에 결과를 적었다

### 기록만 하고 이번에 고치지 않는 것

- 상세 페이지 payload — 탐색 테이블과 WebMCP 도구가 전 글을 각각 투영한다. `BlogTools` 의 지원 여부 게이트는 **등록 청크만** 막고, `articles`·`tags` 는 client component 의 prop 이라 미지원 브라우저에도 RSC payload 로 직렬화된다. **공개 글이 30건을 넘으면** 도구 투영 축소(전 글 `headings` 제외)를 검토한다. 현재 2건이라 조건에 닿지 않았다
- `ArticleDetailView.tsx:1` 이 `"use client"` 라 `ArticleBody`·`ArticleCodeBlock` 전체와 파싱된 AST·shiki 토큰이 RSC 페이로드로 브라우저에 실린다(SSR HTML 과 이중). 클라이언트가 실제로 필요한 것은 `ArticleToc` 뿐이다. 경계를 다시 그으면 상세 지면 구조가 바뀌므로 B5 에서 실데이터 본문 크기를 보고 판단한다
- `preview-article-markdown.ts:46` 의 server action 이 `isTestAdminSessionEnabled() || verifyAdminIdToken(...)` 이다. 비프로덕션에서 플래그가 켜진 서버는 미인증 호출자에게 shiki 렌더를 연다. 프로덕션 빌드 가드가 있어 의도된 개발 전용이지만 조건을 여기 남긴다
- `use-article-references.ts` 는 로딩 중 `articles` 가 `[]` 라 그 사이에 저장하면 slug 중복 검사가 통과한다. 태그가 없는 글에 한정되고 창이 매우 좁다 — B5 에서 서버 유일성 검사가 붙으면 함께 닫힌다
- `crypto.randomUUID()` 는 secure context 전용이라 `http://192.168.x.x` 실기기 접속에서 던진다. `local-list-repository.ts:158` · `mock-image-store.ts:26` 이 관리자 폼 경로로 확장했지만 `lib/firebase/storage.ts:14` · `use-chat.ts:171` 부터 있던 저장소 전반의 패턴이라 이 단계에서 따로 고치지 않는다
- 챗봇 화면 문맥·링크 화이트리스트·WebMCP 사이트맵에 `/dev/articles` 가 없다. `ROUTES.DEV_ABOUT` 만 지우고 새 경로를 넣지 않은 결과인데, 블로그 대응 자체가 B6 범위라 거기서 함께 넣는다

### 재검수와 사용자 요청으로 추가한 것

> 1차 수정 뒤 다시 검수하며 나온 결함과, 사용자가 요청한 지면 변경이다.

- [x] `use-article-preview.ts` · `ArticleFullPreview.tsx` 가 `getFirebaseAuth()` 를 조건 없이 불러, 설정이 없으면 미리보기가 오류 배너로만 떴다 — 서버 액션은 이미 테스트 세션을 토큰 없이 받아 주는데 클라이언트가 먼저 죽었다 → `_lib/admin-id-token.ts` 가 테스트 세션에서 Firebase 를 건드리지 않고 빈 토큰을 준다. P0 의 "Firebase 없이 관리자 개발" 이 여기서 새고 있었다
- [x] `local-dev-article-repository.setPublished` 가 발행 조건을 건너뛰어, 목록 배지 토글로 발행일 없는 초안이 `published: true` · `publishedAt: null` 이 됐다(폼에서는 막히는 상태) → 폼과 같은 `checkArticlePublishable` 을 태운다. 연관 프로젝트 공개 여부만은 저장소가 알 수 없어 제외했고, 그 항목은 공개 상세가 렌더 단계에서 거른다
- [x] `heading-navigation.ts` 가 떠나는 entry 에 적은 `scrollY` 가 `pushCurrentUrl` 의 기본 state 복사로 새 entry 에도 실렸다 — 목차 클릭 → 뒤로 → 앞으로 가 heading 이 아니라 클릭 전 위치로 갔다 → `pushCurrentUrl` 에 state 인자를 두고 `scrollY` 를 뺀 state 를 넘긴다. JSDoc 의 단언도 사실에 맞췄다
- [x] **본문 글자·표를 정책 지면(`/privacy` 등) 규격에 맞춘다**(사용자 요청) — 본문 `--text-2`(크기 0.95rem 은 원래 같았다), 링크는 액센트색 대신 `--text` + 밑줄 `offset 3px`, 표는 셀 전체 테두리 + 헤더 `--surface-2` + `min-width: 620px` 가로 스크롤, 인라인 코드는 `--surface-2` · 0.84em. 스크롤되는 표에는 정책 지면과 같이 `role="region"` · `tabIndex={0}` 을 붙였다(사전 키 `articleTableLabel`). 행간만 정책 지면(1.85)을 따르지 않는다 — 아래 「되돌리지 말 것」 참조
- [x] **본문 이미지를 눌러 크게 보고 그 글의 이미지들을 순회한다**(사용자 요청) — 프로젝트 캐러셀과 같은 `ImageLightbox` 를 처음 열 때 내려받아 쓴다. 순회 목록은 `_lib/article-images.ts` 가 문서 순서로 모으고, 스테이지 비율은 본문 이미지가 실려 올 때 읽은 원본 픽셀 크기를 쓴다
- [x] **주소가 죽은 본문 이미지의 폴백**(사용자 요청) — 표지 없는 카드가 쓰는 워드마크로 갈아탄다. 본문은 테마에 맞는 쪽을, 확대 뷰는 두 테마 모두 어두운 scrim 위라 항상 dark 를 쓴다. 깨진 자리도 순회 목록에서 빼지 않는다 — 빼면 `›` 로 넘길 때 인덱스가 어긋난다. 폴백 규칙에 `.figure` 를 함께 적은 것은 명시도 때문이다(`.figure img` 가 클래스+요소라 클래스 하나로는 덮이지 않아 두 장이 같이 보였다)
- [x] **본문 이미지 캡션 가운데 정렬**(사용자 요청)
- [x] **목차 여닫힘 애니메이션**(사용자 요청) — 데스크톱 패널은 `hidden`(= display:none)이라 전환 자체가 불가능해 튀었다. `data-open` + `transition-behavior: allow-discrete` + `@starting-style` 로 바꾸고, 모바일 드로어는 언마운트되므로 진입만 그린다(`ImageLightbox` 와 같은 방식). 둘 다 `prefers-reduced-motion` 에서 꺼진다. 브라우저 지원 범위는 `ArticleToc.module.css` 주석 참조
- [x] `e2e/admin/album-editor.e2e.ts` 가 드래그 직후 클릭이 삼켜져 실패했다 — **B4.5 이전부터 있던 결함**으로, 작업분을 stash 하고 HEAD 에서도 같은 실패를 확인했다. dnd-kit 의 `AbstractPointerSensor.detach()` 가 `setTimeout(removeAll, 50)` 으로 click 억제기를 늦게 떼는 설계라 제품 결함이 아니다(사람 손으로는 닿지 않는 창). 그 spec 안에 이유를 적은 상수를 두고 창이 닫히기를 기다린다
- [x] `markdown-normalize.test.ts` 의 깊은 목록 테스트가 CI 에서 vitest 기본 타임아웃(5초)을 넘겨 `test:coverage` 잡을 떨어뜨렸다. 로컬 173ms 짜리 파싱이 커버리지를 켠 느린 러너에서 7.4초가 됐다 — 목록은 한 단계마다 들여쓰기가 길어져 micromark 가 줄마다 열린 컨테이너를 전부 다시 확인한다 → 반복 횟수를 200 에서 `MAX_NESTING_DEPTH` 의 두 배인 64 로 낮추고, 같은 문서를 `not.toThrow()` 와 `codes()` 로 두 번 파싱하던 것을 한 번으로 줄였다(던지면 그 자리에서 그대로 실패한다). 커버리지 포함 실행이 1.46초에서 55ms 가 됐고 깊이 상한은 여전히 두 배 여유로 넘긴다
- [x] 관리자 E2E 전체가 CI 프로덕션 잡에서 떨어졌다. `/admin/*` 은 `AuthGuard` 의 `isAdmin || testSession` 을 지나야 하는데, `testSession` 을 여는 `NEXT_PUBLIC_ADMIN_TEST_SESSION` 은 번들에 박히는 빌드 시점 값이고 `test-admin-session.ts:22` 가 프로덕션 빌드에서 그 값을 금지한다(인증 우회가 배포에 섞이지 않게 둔 가드). Firebase 계정도 쓰지 않아 `isAdmin` 도 참이 될 수 없다 — 즉 **프로덕션 서버로는 처음부터 통과할 수 없는 조합**이었다. `npm run test:e2e` 가 로컬에서는 dev 서버로 돌아 플래그가 켜지는 바람에 이 브랜치의 첫 CI 실행에서야 드러났다(관리자 spec 은 `f7d9461`·`25f0a76`·`49537df` 로 이 브랜치에만 있다) → `playwright.config.ts` 가 `E2E_PRODUCTION=1` 일 때 `e2e/admin` 을 수집하지 않게 하고, dev 서버로 그 디렉터리만 도는 `Admin E2E` 잡을 CI 에 추가했다. 픽셀 비교가 없어 ubuntu 로 돌린다. 로컬에서 같은 명령으로 17개 통과(모바일 17개는 데스크톱 전용이라 skip)
- [x] **960 프리뷰 / 2048 원본 분리는 B5 로 미룬다**(사용자 확정) — Markdown 이 주소를 하나만 담고, 이 저장소의 3단 이미지는 하위 폴더에 각각 다른 UUID 로 올라가 프리뷰 주소를 원본에서 유도할 수 없다 → **B5 에서 확정(사용자 선택): 본문은 2048 메인 단일 주소.** Markdown 계약 무변경, 업로드는 기존 3단 유지. 본문 전용 이미지의 프리뷰·썸네일 파생본은 미참조로 남아 고아 정리 대상이 되며(지워도 렌더는 깨지지 않는 의도된 GC), 고아 패널 문구에 명시했다

### 사용자가 직접 넣은 변경 — 되돌리지 말 것 ★

> 아래는 B4.5 검수 범위 밖에서 사용자가 의도적으로 넣은 변경이다. 검수 도구가 "범위 밖 변경"
> 또는 "의도 확인 필요"로 잡더라도 되돌리지 않는다. 시각 기준선이 달라지는 것도 예상된 결과다.

- **목록 카드에서 요약문 제거** — `ArticleCard.tsx`(블로그)와 `DevProjectCard.tsx`(프로젝트)에서 요약 `<p>` 와 짝 CSS(`.summary` · `.pd`)를 지웠다. 카드는 제목·메타로만 읽는다
- **`ArticleCard` 태그 줄 `word-spacing: var(--s-1)`** — 간격 토큰을 `word-spacing` 에 쓴 것이 의도다
- **`ArticleTocRail.module.css` 좌우 padding 축소** — `var(--s-4) var(--s-5)` → `var(--s-4)`
- **`ArticleDetailView.module.css` 여백 조정** — 하단 padding 과 900px 이하 좌우 여백을 다시 잡았다
- **`DetailHero.module.css` 복귀 버튼 좌측 padding** — SVG 아이콘으로 바뀐 뒤 `8px 14px 8px 8px` 로 맞췄다
- **`ArticleBody` 본문 행간 1.6** — 정책 지면과 색·크기는 맞추되 행간만 좁게 둔다. 훑어보는 약관과 달리 블로그는 이어서 읽는 글이라 1.85 는 줄 사이가 벌어져 문단이 흩어져 보인다

### B5 진입 전 확인

- [x] `lib/content/dev-articles.ts:32`의 live 분기는 아직 빈 목록을 반환하지만 메가메뉴·모바일 탭·sitemap은 이미 `/dev/articles`를 노출한다. B5 연결 전에 배포하면 블로그 메뉴가 빈 목록으로 열린다 → **B5 에서 Firestore reader 를 연결해 해소** — 같은 브랜치가 통째로 머지되므로 노출과 연결이 같은 배포에 묶인다. B5 코드 머지 전에 main 을 단독 배포하지 않는다

### B4.5 검증

- [x] P0 6건에 회귀 테스트를 붙인다 — `constructor`·`toString` fence, `</script>`가 든 제목의 JSON-LD 이스케이프, 세 재귀 경로(`toBlocks`·`toInlines`·`toPlainText`)의 깊이 초과와 issue 중복 없음, `정리`/`정리 2`/`정리` heading id, Firebase 설정 없이 모듈 평가와 관리자 화면 mount, 프로덕션 mock 가드의 차단·탈출구 양방향
- [x] `npm run lint` · `npm run check` · `npm test` · `e2e/pages` · `test:a11y`가 통과한다 → 커밋 시점 `vitest` 1279 통과, `e2e/pages` 221 통과(1건은 dev 서버 첫 컴파일 타임아웃으로, 단독 재실행에서 1.0초에 통과), `test:a11y` 22 통과
- [x] **시각 기준선을 다시 만들었다** — Actions 의 `update-visual-snapshots` 를 `feature/dev-blog` 에서 돌려 `39b74b1` 로 커밋됐다. macOS 에서는 `test.skip(process.platform !== "win32")` 로 건너뛰므로 로컬 갱신이 불가능하고, 이 workflow 는 결과를 그 브랜치에 커밋·푸시한 뒤 `ci.yml` 을 다시 돌린다.
  - 18장 중 **6장만 바뀌었다** — `dev-articles-*` · `dev-article-detail-*`(`VISUAL_ROUTES` 에 새로 넣은 두 라우트라 이번이 첫 기준선이다. png 는 전부터 있었지만 소비하는 테스트가 없었다) · `dev-projects-*`(카드 요약 제거로 카드 높이가 줄었다).
  - 나머지 12장이 그대로인 것은 누락이 아니라 허용 오차다. 값을 주지 않은 `--update-snapshots` 는 `changed` 모드이고(`playwright/lib/program.js` 의 `preset: "changed"`), 이 모드는 **비교가 실패할 때만** png 를 다시 쓴다. `playwright.config.ts:49` 의 `maxDiffPixelRatio: 0.01` 안에 드는 차이는 통과로 처리된다. 앨범 상세 데스크톱은 1440×1361 = 196만 픽셀이라 1% 가 19,598 픽셀인데, 복귀 버튼의 글리프→SVG 교체가 건드리는 넓이는 그 수십분의 일이다. 태그 행 chevron 도 같다.
  - 앨범 히어로 글자색은 애초에 이 기준선에 찍히지 않는다. `city-night` 은 커버가 있어 image variant 로 렌더되고, 고친 것은 plain variant 다. 커버 없는 fixture 를 넣는 일은 B5 로 넘긴다.
- [x] `src/`의 `.tsx`에서 `‹ › ← → ↑ ↓ ✕ ✓`가 렌더 위치에 남지 않았는지 확인한다. 남기기로 한 것은 `ExifPanel.tsx`의 곱셈 기호, 관리자 허브 카드의 `관리 →`, `LangMenu`의 `●`, 외부 링크 `↗` 뿐이다
- [x] 이번에 고친 주석·오류 문구·상수명에 `avoid-ai-writing`을 적용한다(전 단계 공통 규칙 「주석·상수·메시지 문체」)

---

## B5 — Firebase 전환과 배포 (§2, §4, §12-B5)

### 쿼리·인덱스·Rules

- [x] REST transport 범용 query builder — 다중 정렬 방향 + document id 보조 정렬, query·index 모두 `__name__ ASCENDING` 명시, 기존 `order asc` 호출 무회귀 (§2) → `publishedQuery(collectionId, orderBy[], select?)` 신설, 기존 두 함수는 thin wrapper(산출 JSON deep-equal 테스트로 고정). `__name__` 명시는 신규 devArticles 쿼리·인덱스에만 — 기존 6개는 마지막 필드가 ASC 라 암묵 순서와 같고, 인덱스 정의를 건드리면 재생성 취급 위험만 생긴다
- [x] `published + publishedAt desc + id asc` 복합 인덱스 정의 추가 (`tags array-contains` 인덱스는 규모 임계치 확인 전까지 유예 — 태그는 projection 서버 필터) (§2) → `firestore.indexes.json` 에 커밋. **실제 배포는 아래 검증 단계**
- [x] 태그 저장 위치 확정 — **기본안 `devArticleTags` 컬렉션 채택**. collection 상수·관리자 write Rules·cache tag(`firestore:devArticleTags`) 추가 (§2) → 순서 계약은 **id 사전순**(`__name__ ASC`) — `DevArticleTag` 에 `order` 필드가 없고 재정렬 UI 요구도 없어 필드를 새로 만들지 않았다. mock 사전 배열도 같은 순서로 재정렬
- [x] `firestore.rules`에 `devArticles`(표준 패턴) + `devArticleTags`(`read: if true` — 발행 개념 없는 공개 사전, site 패턴) — 관리자만 쓰기
- [x] `test/security-rules.test.mjs`의 `PUBLIC_COLLECTIONS` 배열에 `devArticles` 추가 + **실제 공개 쿼리 형태 테스트**(published 필터 쿼리 성공·초안 미포함 / 무필터 전체 쿼리 거부 / 태그 무인증 목록 읽기 / 두 컬렉션 무인증·비관리자 쓰기 거부). ⚠️ emulator 는 복합 인덱스를 운영처럼 강제하지 않는다 — 인덱스 빌드 확인은 배포 단계의 별도 관문

### CRUD·RAG 정책·Storage

- [x] `devArticles` getter·CRUD를 repository 경계에 연결 (mock/live 화면 코드 무변경) → 공개는 `lib/firebase/public/dev-articles.ts`(decoder `toDevArticle` export — B6 RAG 증분이 재사용) + `lib/content/dev-articles.ts` 의 `cache()` 래퍼 유지(렌더당 읽기 1회). 관리자는 `live-dev-article-repository.ts` — 발행 조건·최초 발행 스탬프를 mock 과 같은 `dev-article-domain.ts` 로 공유하고, **slug 서버 유일성 검사**(`where("slug","==")`, 관리자 1명이라 race 허용)가 폼 참조 로딩 창 결함을 닫는다. 연관 프로젝트 공개 여부도 live 는 projection 으로 실제 검증(mock 은 자기 전달 유지 — 렌더 필터가 이중 방어)
- [x] 관리자 목록 — `admin-list-rest.ts` projection 패턴으로 body 제외 조회 → `listProjected` 에 orderBy 인자(기본값 `order ASC` 무회귀), 블로그는 **`__name__ ASC` 정렬**(⚠️ `publishedAt` 정렬은 필드 없는 초안을 결과에서 떨어뜨린다) + 화면 훅 순수 함수 정렬 유지
- [x] `listCrud` 후처리 정책 — 선택적 정책 주입, 미주입 컬렉션 기존 동작 유지(pre-read 0회 포함) (§11) → 계약은 `(before, after) => sync|remove|skip` — **작업 종류(kind)는 받지 않는다**(setPublished 가 스탬프 때문에 update 경로로 우회해도 계약이 어긋나지 않게). `remove` 는 별도 삭제 API 가 아니라 원본 재조회로 청크가 비워지는 sync 요청과 수렴함을 타입·JSDoc 에 명시. **pre-read 실패는 정책을 건너뛰고 강제 sync**(skip 오판으로 stale 청크가 남는 쪽보다 낫다)
- [x] 블로그 RAG 정책 — 초안 제외, 발행일·이미지·연관 프로젝트만 변경 시 skip, §11 표 계약 구현 (§11) → `lib/firebase/dev-article-rag-policy.ts`, §11 표 5행을 테스트 케이스로 그대로 열거. B6 이 `lib/firebase/dev-articles.ts` 의 listCrud 4번째 인자에 `"article"` 을 채워 실제로 켰다
- [x] 기존 컬렉션 CRUD·RAG 동작 회귀 테스트 (§12-B5) → `list-crud.test.ts` — 정책 미주입이면 4개 쓰기 모두 sync 호출 + 스냅샷 조회 0회
- [x] Storage — `dev-blog/{articleId}/` 업로드 3종(메인·프리뷰·썸네일) + 글 삭제 시 폴더 정리, 실제 uploader를 폼에 연결 (§4) → `article-image-uploader.ts` 의 live reject 분기만 교체(폼·mock 무변경). 삭제 시 이미지 정리 실패는 삭제를 되돌리지 않되 목록 화면에 경고로 표시(`DevArticleRemoveResult.imageCleanupWarning`)

### 미사용 이미지 관리 (`/admin/maintenance`)

- [x] `dev-blog/` 파일 목록 ↔ 전체 글(cover + 본문 URL) 참조 비교 (§4) → cover 는 `imagePaths()` 3경로, 본문은 순수 함수 `articleBodyStoragePaths`(percent-encoding·한글 파일명·비허용 호스트·`dev-blog/` 밖 경로 케이스 테스트). 초안 포함 전량 projection
- [x] 미참조 + 업로드 24시간 경과 파일만 후보 표시 (§4) → `ORPHAN_MIN_AGE_MS`, `getMetadata` 의 timeCreated 기준·now 주입 테스트
- [x] 기본 dry run — 경로·크기·업로드 시각·예상 절감 용량 (§4) → `ArticleOrphanImagePanel`, mock 모드 잠금 + 안내(기존 패널 패턴)
- [x] 확인 삭제 — 실행 직전 참조 재계산, 개별 실패 격리·성공/실패 결과 기록 (§4) → 삭제는 **관리자가 확인한 후보 ∩ 재검증 후보**만 — 재검증에서 새로 후보가 된 파일은 확인 없이 지우지 않고, 그 사이 참조된 파일은 `skipped` 로 보고

### B5 에서 함께 처리한 것

- 커버 없는 앨범 mock fixture(`unreleased`) + 시각 회귀 라우트 `photo-album-detail-plain` 추가 — B4.5 가 미룬 plain variant 히어로 글자색 기준선. ⚠️ 앨범 목록 기준선도 카드가 늘어 바뀐다 — Actions `update-visual-snapshots` 로 갱신 필요
- 태그 관리자 CRUD 확장 — `updateTag`(ko/en 만 — **id 는 문서 ID이자 글 `tags[]` 외래키라 수정 불가**)·`removeTag`(공유 헬퍼 `countTagUsage` 로 사용 글 수 검증 후 거부, transaction 아님 — 관리자 1명 전제, 삭제된 태그의 신규 참조는 발행 검사 `tag-unknown` 이 차단). 목록 화면 하단 `ArticleTagManagerPanel` + mock E2E(추가→수정→사용 중 삭제 거부→미사용 삭제)
- B4.5 가 미룬 `ArticleDetailView` 의 `"use client"` 경계 판단은 **B7 로 넘긴다** — 판단 기준이 "실데이터 본문 크기"인데 실제 글은 B7 마이그레이션에서 들어온다. B7 의 대표 글 점검 때 RSC 페이로드를 재고 기록한다

### B5 검증

- [x] Rules·index emulator 검증 후 배포 (§12-B5) → Rules 테스트는 CI(Java 21)가 실행. 2026-08-14 `aperture-5ec81` 배포 확인 — `firestore:indexes` 조회에 `devArticles(published ASC, publishedAt DESC)` 포함(빌드 중 인덱스는 목록에 나오지 않으므로 READY), 재배포에서 `firestore.rules already up to date` + `released rules`
- [x] 실제 초안 1건 — 작성·전체 미리보기·발행·발행 취소·삭제·이미지 정리 왕복 확인 (§12-B5) → 2026-08-14 실데이터로 사용자가 왕복 확인
- [x] mock/live 소스가 섞이지 않고 mock 자동화 테스트가 계속 동작한다 (§12-B5) → 분기 교체는 `dev-article-repository`·`article-image-uploader` 의 기존 단일 지점만, E2E 는 전부 `NEXT_PUBLIC_USE_MOCK=1` 유지, 신규 live 모듈은 모듈 평가 시 Firebase 미접촉(회귀 테스트에 등록)

---

## B6 — 검색·RAG·챗봇·WebMCP (§9, §10, §12-B6)

### 통합검색

- [x] `SearchDocument`에 article 투영 — `key: article-{id}`, `section: dev`, `LocalizedText` metadata 그대로, 상세 경로 href, 초안 제외 (§9) → `_lib/article-search-source.ts` 가 태그 id·ko·en 세 표기와 본문 h2·h3 를 `index.body` 에 담는다(사용자 확정). 본문 전문은 넣지 않는다 — `/api/search-index` 가 브라우저로 통째로 내려가기 때문이다
- [x] `/search`·헤더 자동완성·`search_portfolio` 3개 표면에서 블로그 결과 확인 → 세 표면이 `fetchSearchDocuments` 하나를 공유해 투영 추가만으로 동작한다. 데스크톱·모바일 실화면 확인
- [x] **결과 화면 구분**(계획 밖 · 사용자 요청) — 블로그를 개발 목록과 섞지 않고 `블로그` 그룹으로 나누고, 그룹 순서를 `개발 → 블로그 → 사진 → 음악` 으로 바꿨다. 행 오른쪽 메타는 요약 대신 태그다. `SearchSection` 대신 `SearchDocument.subsection` 을 둔 이유는 액센트(`data-section="dev"`)와 `search_portfolio` 의 `section` enum 을 쪼개지 않기 위해서다

### RAG

- [x] source type `article` — 글 ID·slug 기록, 제목·요약 + heading 단위 평문 청크, 코드 블록 예산 제한 (§9) → `_lib/article-rag-chunks.ts`. h2 구간을 논리 단위로 삼되 **1,200자에서 자르지 않고 블록 경계로 여러 part 로 나눈다**(`h-{구간}-{part}`) — 단순 truncate 는 긴 글의 뒤쪽을 영구히 검색에서 지운다. 코드 블록은 별도 400자 예산(`article-plain-text.ts`). `meta` 청크에 slug 와 상세 경로를 담아 프롬프트에서 챗봇이 주소를 안다
- [x] 증분 동기화 경로 — `rag-source.ts` target 맵·decoder, embeddings route 허용 타입, 비공개 시 빈 결과로 자동 청크 제거 → `listCrud` 4번째 인자에 `"article"` 을 넣어 `devArticleRagPolicy` 가 켜졌다. ⚠️ **조립 지점이 핵심** — `portfolio-embeddings/route.ts` 의 `buildAllRagChunks` 를 POST·GET 양쪽에서 쓴다. 한쪽만 바꾸면 생성은 되는데 진행률이 100%에 닿지 않는다
- [x] `/admin/maintenance` 일괄 재생성에 블로그 포함 (§9) → 조립 함수 공유 + `EmbeddingMigrationPanel` 안내 문구
- [x] `searchRagChunks`에 `sourceType/sourceId` 선택 scope 추가 — 기존 section-only 호출 무파괴 (§9) → `options.prioritize`. **분할은 `slice(0, 8)` 앞에서 한다** — 뒤에 두면 해당 글 청크가 전체 상위 8개 밖일 때 아무 효과가 없다. 우선 대상 상위 3개는 최소 점수 기준을 면제한다(짧은 지시어 질의 대응). 임베딩 모델 불일치는 우선 대상에도 그대로 적용

### 챗봇

- [x] 화면 문맥 — `/dev/articles/[slug]` 경로 분기, `{ type: "article", id: 문서 ID }` 전송, 서버가 slug 일치·공개 여부 재검증 후 제목·요약·slug만 `SCREEN_CONTEXT` (§9) → 문서 ID 는 URL 에 없으므로 `ArticleScreenTarget` 이 등록하고 `buildChatContext` 가 읽는다. 경로 판정은 `constants/routes.ts` 의 `matchDevArticleSlug` 를 챗봇과 WebMCP 가 공유한다(정규식 두 벌이 갈라지지 않게)
- [x] 열린 글 질문 — 해당 article 청크 우선 검색 → 부족 시 전체 dev RAG 확장 (§9) → **검증을 `Promise.all` 앞의 공통 단계로 올렸다**(`validateContextTarget`). 화면 문맥 안에서 판정하면 검증되지 않은 target 이 RAG 우선순위로 샌다. live 는 fresh 조회만 믿고 **cached fallback 을 쓰지 않는다** — 방금 발행을 취소한 글이 캐시에 남아 되살아나기 때문이다. 조회 자체가 실패하면 글 target 과 우선 검색을 함께 버리고 채팅은 이어 간다(글은 fail-closed, 채팅은 fail-open)
- [x] 참조 카드 — `ChatReferenceType`에 article 추가(응답 스키마 enum·검증·서버 재확인 포함), 제목·발행일·요약·경로 카드 (§9) → 타입 열거가 세 곳(타입·JSON Schema enum·파서 리터럴)에 중복돼 있어 함께 고쳤다. `subtitle` 은 `formatYMD` 로 만든 `YYYY.MM.DD · 요약`. 스냅샷 캐시 키를 **v6 → v7** 로 올렸다
- [x] mock·live 평가 — 블로그 검색 사례 + 열린 글 화면 문맥 사례 추가 (§9) → `blog-ko`·`screen-article-ko`. mock 은 벡터 RAG 를 타지 않으므로 우선 검색은 `rag-search` 단위 테스트와 live 로그의 `prioritize=article:<id>` 표기가 증명한다

### B6 에서 함께 고친 것

- 정규식 인텐트 분류에 블로그 용어(`블로그`·`아티클`·`포스트`·`blog`·`article`·`post`)를 넣었다. 없으면 블로그 질문에 RAG 검색이 아예 돌지 않는다
- 열린 상세가 있고 분류가 비었으며 인사말도 아니면 그 항목의 섹션으로 조회한다. "이 글 요약해 줘" 처럼 분야 단어가 없는 지시어 질문이 조회 없이 답해 버리던 구멍이다. **인사말은 제외한다** — 상세 화면에서 인사만 해도 매번 벡터 검색이 돌면 비용이 는다
- `PROFILE_CONTEXT` 의 Development 블록에 글 목록(제목·요약·태그·발행일·경로)을 넣었다. mock 모드에는 벡터 RAG 가 없고, 모델이 참조 카드용 ID 를 고르려면 경로를 볼 수 있어야 한다
- `handle-chat-request` 의 참조↔링크 중복 제거가 `/${type}` 로 없는 경로(`/article`)를 만들던 것을 `REFERENCE_SECTION_ROUTES` 표로 바꿨다
- `ChatReferenceCard` 가 `reference.type` 원문을 그대로 그리던 것을 언어별 라벨로 바꿨다

### WebMCP

- [x] `list_blog_posts` — `tag?`·`limit?` → 제목·발행일·읽기 시간·**id·slug**·경로 (§10) → 태그는 id·ko·en 셋 다 대소문자 무시 정확 일치(W5 3-4 의 `"바다" → Sea`). 부분 일치는 한두 글자 인자가 거의 모든 태그에 걸려 쓰지 않는다. 0건이면 `Known tags:` 로 사전 전체를 안내한다
- [x] `get_blog_post` — `articleId?`/`slug?` 택일(둘 다 오면 오류, 상세 페이지면 현재 글) → 요약·목차·경로 (§10) → 공백 문자열은 미지정 취급. 상세·목록 모두 id 와 slug 를 함께 돌려준다(2-5 회귀 방지)
- [x] `/dev/articles`·상세에만 등록, 관리자·초안 미등록, 페이지당 도구 수(전역 2 + 블로그 2 = 4) 재검증 (§10) → `BlogTools` 를 두 지면에서만 마운트하고, `WebMcpTools` 와 같은 `isWebMcpSupported` 게이트 뒤에서 등록 청크를 dynamic import 한다. 관리자 차단은 어댑터의 `/admin` 가드가, 초안 제외는 공개 getter 가 맡는다. 도구 데이터는 서버 투영만 쓴다(ADR-0003: 새 데이터 소스 금지)
- [x] `get_profile` 사이트 지도에 `blog: /dev/articles` 추가 — 페이지 스코프 도구를 찾으려면 전역 도구가 경로를 알려 줘야 한다(W5 3-10)

### B6 코드리뷰 후속

리뷰·2차 검증에서 확정된 결함과 실데이터 확인 중 드러난 결함을 고쳤다. 각 항목은 회귀 테스트를 함께 둔다.

- 1,199자를 넘는 h2 소제목이 청크 분할 루프를 끝내지 못해 임베딩 API 가 응답하지 않던 것을 고쳤다. 다시 붙이는 구간 제목에 120자 상한을 두고, `splitOversized` 가 상한 1 미만을 1로 올려 루프 종료를 보장한다
- 열린 글 검증이 목록 전체(`getChatProfileData`) 대신 **문서 한 건**(`fetchDevArticleById`)만 읽는다. 검증에 읽은 문서로 `SCREEN_CONTEXT` 까지 만들어 같은 글을 두 번 읽지 않으며, 글 target 은 fresh 목록 조회를 타지 않는다
- 프로필 섹션 선택이 검증 **뒤로** 옮겨졌다. 검증 전 target 으로 고르면 위조 target 이 조회를 유발한다. 열린 항목으로 섹션을 고를 때도 `profile` 을 함께 넣어 `sectionsForText` 규약(`["profile", ...matched]`)과 맞춘다
- `openTarget.id` 에 문서 ID 문자 집합(`[A-Za-z0-9_-]`)을 강제하고 `fetchDocument` 가 문서 ID 를 인코딩한다. 서버가 이 값으로 REST 경로를 만들기 때문이다
- RAG 점수 하한 면제를 **지시어 질의**(질문이 스스로 섹션을 고르지 못한 경우)로 좁혔다. "무슨 프로젝트 했어?" 가 열린 글의 저점수 청크에 3자리를 내주던 문제다
- RAG 정렬을 하한 통과 청크로 되돌렸다. 색인 전체를 정렬하면 상위 8개를 고르는 비용이 색인 크기를 따라간다
- `PROFILE_CONTEXT` 의 글 목록에 최근 12건 상한을 뒀다. 참조 카드 lookup 은 상한 없이 전체를 유지한다
- 라이트박스가 원문에 적힌 이미지 크기를 쓴다(`ArticleImageRef.dimensions`). 본문 트리 메모에서 측정 크기를 빼 이미지 로드마다 전체가 다시 그려지던 것도 함께 고쳤다
- 챗봇 투영 타입(`ChatPhoto`·`ChatAlbum`·`ChatDevProject`·`ChatMusic*`·`ChatDevArticle`)을 디코더와 같은 층(`lib/firebase/public/*`)에서 한 번만 선언한다. 여섯 개가 중복 선언이었고 하나는 방향이 뒤집혀 있었다
- 글 참조 카드가 붙지 않던 문제 — `PROFILE_CONTEXT` 의 글 줄에 문서 ID 가 없었다. 사진·연주·프로젝트는 `url` 안에 ID 가 들어 있지만 글 주소는 slug 기반이라 ID 가 어디에도 없었고, `resolveReferencesWithRefresh` 는 못 찾은 요청을 조용히 버린다. RAG 청크 머리말(`[article:<id>]`)을 본 질문만 카드가 붙고 "글 몇 개 추천해줘" 같은 일반 질의는 산문만 나왔다. 글 줄에 `id:` 를 넣고 스냅샷 캐시 키를 **v8** 로 올렸다
- RAG 스냅샷 크기를 문자 수가 아니라 **UTF-8 바이트**로 잰다(`Buffer.byteLength`). 한글 본문을 글자당 1로 세어 과소 측정했고, 그 결과 경고선(1.5MB)이 실제 2MB 절벽보다 **뒤에서** 울렸다. 캐시를 채울 때마다 `[rag-index] chunks=… bytes=…` 를 남겨 남은 여유를 확인할 통로도 뒀다
- 목록 첫 행 커버에 `priority` 를 준다. 상세 히어로(`DetailHero`)에는 이미 있었다. `aspect-ratio` 자리 확보는 CLS 만 막고 LCP 는 요청 시작 시점이 정한다 (장수는 2회차에서 다시 잡았다 — 아래)

### B6 코드리뷰 2회차

리뷰 결과를 코드와 대조해 재검증한 뒤, 사실로 확인된 것만 고쳤다.

- 확인되지 않은 화면 target 이 RAG 검색을 켜던 경로를 닫았다. 글만 문서 조회로 검증하고 사진·연주·수상·프로젝트는 그대로 통과시켜, 없는 ID 로도 임베딩 생성과 벡터 검색이 돌았다. 이제 캐시 스냅샷의 화면 문맥 lookup 에서 항목을 찾은 target(`verified`)만 프로필 섹션을 연다. target 자체는 버리지 않는다 — 방금 공개한 항목이 캐시에 없을 수 있고 `resolveScreenContext` 의 최신 조회가 그 경우를 처리한다. 스냅샷을 읽지 못하면 확인 실패로 보고 답변은 이어 간다
- 타입명과 JSDoc 을 실제 보장에 맞췄다(`ValidatedChatTarget` → `ResolvedChatTarget`). 이름이 "검증을 통과한" 이라고 말하는 동안 네 종류가 검증 없이 지나갔다
- 글 검증 조회가 `AbortSignal` 을 받는다. `fetchDocument` 가 신호를 `fetch` 에 넘기지 않아 제한 시간(55초)과 방문자 연결 종료가 진행 중인 Firestore 요청을 끊지 못했다. **병렬화는 하지 않는다** — RAG 검색 범위가 검증 결과에 달려 있어 순서를 바꾸려면 임베딩을 투기적으로 먼저 만들어야 한다
- 인사말 턴에서도 화면 문맥은 그대로 만든다. 글 target 의 단건 조회가 곧 `SCREEN_CONTEXT` 의 출처라 건너뛰면 live 에서 목록 조회로 물러나 오히려 비싸진다(테스트가 이 계약을 고정하고 있다)
- `priority` 를 **가장 좁은 화면의 첫 행** 기준으로 낮췄다 — `/dev/articles` 1·`/photo/albums` 2·`/dev/projects` 1·`/music` 1. 데스크톱 열 수로 정하면 모바일에서 화면 밖 이미지까지 preload 한다. `PhotoGrid`(`index < 4`)는 이번 범위 밖이라 그대로 두어 규칙이 갈린다
- 대표 이미지가 없는 카드의 라이트·다크 자리표시자 두 장이 모두 `priority` 를 받던 것을 없앴다. CSS 가 테마당 한 장만 그리므로 나머지 한 장의 preload 는 항상 낭비였고, 워드마크 자리표시자는 LCP 후보도 아니다
- 참조 카드의 종류 라벨을 `constants/dictionary.ts` 로 옮겼다. 컴포넌트에는 `Record<ChatReferenceType, keyof UIDict>` 매핑만 남아 종류가 늘면 컴파일이 막는다
- 참조 카드 표기를 다시 잡았다(사용자 확정). 종류 라벨의 mono·uppercase·자간을 뺐다 — 라벨이 영어 원문이던 시절의 스타일이라 한글에는 글리프가 없고 uppercase 도 적용되지 않는다(이 저장소의 mono 는 날짜·숫자 전용). 종류 라벨은 항목이 속한 섹션 색을 쓴다. 카드가 현재 지면과 다른 섹션을 가리킬 수 있어 지면 액센트로는 구분되지 않기 때문이며, 색은 랜딩 진입 행과 같은 `--accent-photo/music/dev` 를 로컬 `--accent` 로 덮어 쓴다(섹션 색 하드코딩 없음). 위계는 장식 없이 크기와 여백으로 만든다 — 제목을 `--t-body` 로 올리고, 종류·제목은 붙이고 부제목만 띄우며, 텍스트 블록을 썸네일 윗변에 맞춘다
- mock 챗봇의 블로그 규칙이 "한글 폰트"·"한글을"·"postgres" 를 블로그 질문으로 보던 것을 고쳤다. 한글은 앞 글자가 한글이면 제외하고(`(?<![가-힣])글`), 영어는 단어 경계를 요구한다. mock 은 `npm run dev` 와 E2E·시각 회귀가 쓰는 경로다
- `search_portfolio` 설명에 블로그를 넣고 결과 줄이 `dev/blog` 로 종류를 밝힌다. `subsection` 을 출력에 쓰지 않아 글과 프로젝트가 같은 모양이었다
- `searchRagChunks` 의 `@returns` 를 실제 반환에 맞췄다. 우선 대상 최대 3개 뒤에 나머지가 붙으므로 전역 점수순이 아니며, `ignoreScoreFloor` 에서는 저점수 우선 청크가 앞에 온다(의도된 정책)
- 구간 제목 예산이 **첫 part** 까지 깎던 것을 고쳤다. 제목은 두 번째 part 부터 붙는데 상한은 모든 part 에서 줄어 한 청크에 들어갈 구간이 둘로 나뉘었다. `packParts` 가 첫 part 상한을 따로 받는다. ⚠️ **청크 경계가 바뀌므로 배포 후 `/admin/maintenance` 일괄 재생성이 필요하다** — 밀린 `chunkKey` 의 옛 청크는 같은 글 범위의 stale 삭제가 정리한다
- 중복 계약 네 건을 정리했다. 태그 토큰 생성기(`article-tag-tokens.ts`)를 RAG·검색·WebMCP 세 곳이 공유한다(RAG 는 dedupe 가 없어 `firebase / Firebase / Firebase` 로 들어가고 있었다). 발행일 비교자(`lib/content/article-order.ts`)를 공개 목록과 챗봇 투영이 공유하고, live 결과 재정렬은 뺐다 — Firestore 쿼리가 이미 같은 순서를 낸다. 끝 슬래시 정규화는 `stripTrailingSlash` 로 모았다. 참조 종류는 `types/chat.ts` 의 `CHAT_REFERENCE_TYPES` 하나에서 JSON Schema enum·파서·라벨·경로표가 파생한다
- 상세 페이지 화면 라벨(`[slug]/page.tsx` 의 현재 로케일 태그 라벨)은 그대로 뒀다. 색인용 토큰과 목적도 출력도 다르다
- 리뷰가 지적한 `current-target.ts` 의 slug matcher 재구현은 사실이 아니었다. `matchDevArticleSlug` 를 이미 공유하고 있었고 중복은 끝 슬래시 처리뿐이라 그것만 합쳤다

### B6 검증

- [x] 초안이 검색·RAG·챗봇 참조·WebMCP 어디에도 노출되지 않는다 (§14) → 검색·WebMCP 는 `getDevArticles()`(published만), RAG 는 `raw.published !== true` 게이트 **+ `articleRagChunks` 자체 방어**, 챗봇은 공개 projection + fresh 검증. 각 경로에 테스트를 뒀다
- [x] 재검증 실패 시 관리자 표시 + maintenance 복구 경로 동작 (§11) → 실패한 태그·경로를 `revalidate-failure-store` 에 남기고 `RevalidateFailureBanner` 가 관리자 전 화면 상단에서 알린다. 배너의 `지금 다시 시도` 가 같은 대상으로 재검증을 다시 요청하고, 성공해야 기록을 지운다. 저장은 이미 끝난 상태라 재시도하지 않아도 ISR 주기가 지나면 갱신된다
- [x] 실데이터 스냅샷 용량 — **285청크 / 457,098바이트**(한도 2MB 의 22.9%, 청크당 평균 1,604B). 내역은 벡터 43%·메타 18%·본문 39%. 경고선(1.5MB)까지 약 650청크, 절벽(2MB)까지 약 960청크 남았고 글 하나가 15청크 안팎이라 **40편쯤 더 쓰면 경고**가 뜬다. 개별 텍스트 상한은 한 청크의 폭주만 막고 스냅샷 용량은 **청크 수 × 임베딩 차원**이 지배한다 — 좁혀야 하면 `EMBEDDING_PROVIDER_DIMENSIONS` 를 낮추는 쪽이 벡터 몫을 비례해서 줄인다
- [x] Tool Inspector 평가 — 노출 4종(`get_blog_post`·`get_profile`·`list_blog_posts`·`search_portfolio`)과 두 도구 실행을 확인하고 `webmcp-tool-eval.md` 에 6·7차로 남겼다. 태그 질의가 검색 도구로 새던 결함을 찾아 고쳤고, 지면 한정 등록과 부딪히는 안내 하나가 재검증 대기로 남았다

---

## B7 — 검증과 마이그레이션 (§12-B7)

- [x] 기존 글을 실제 발행일·slug로 입력한다
- [x] 이미지·코드·YouTube가 포함된 대표 글을 점검한다
- [x] 전체 테스트 스위트 통과 — Rules emulator·unit·component·E2E·접근성·typecheck·lint·production build
- [x] 공개 후 확인 — 검색 인덱스·RAG 완료율, Storage 고아 파일, 이전 `/dev/about` 유입

### B7 에서 함께 고친 것

- **빌드 후 발행한 글이 그 배포에서 계속 404** — `[lang]` 레이아웃의 `dynamicParams = false` 가 하위 세그먼트까지 잠가, 프리렌더 목록 밖 slug 는 페이지를 렌더하지도 못하고 전역 404 가 됐다. 자식 라우트의 `dynamicParams = true` 로는 되돌릴 수 없다(통제 실험으로 확인: 같은 빌드에서 잠금만 풀면 200). 같은 이유로 `/photo/albums/[id]` 도 빌드 후 만든 앨범을 열지 못했다. 재발을 막으려고 `src/app/[lang]/layout.test.ts` 가 이 설정의 부재를 고정한다
- 잠금을 풀면 없는 slug 가 요청-시 렌더돼 응답 상태가 200 으로 남는다(soft 404). 화면과 `noindex` 는 그대로라 E2E 계약을 상태 코드에서 **내용 비노출·색인 차단** 으로 옮겼다. `loading.tsx` 를 지워도 상태는 200 이라 원인은 그쪽이 아니다
- 발행 상태가 그대로인 저장도 상세 경로를 재검증한다. 초안일 때 열려 캐시된 404 는 컬렉션 태그 무효화로 지워지지 않아, 발행 뒤 다시 저장해도 404 로 남았다
- Firestore 공개 읽기에 재시도를 넣었다. 정적 생성 중 연결이 한 번 ETIMEDOUT 되면 빌드 전체가 중단됐다. 429 는 무료 한도 소진이 대부분이라 재시도 대상에서 뺐다

---

## 최종 완료 기준 (§14 대조)

- [x] 개발 메뉴와 URL이 `소개 → 경력·기술 → 프로젝트 → 블로그` 구조로 동작한다
- [x] 관리자가 발행일과 slug를 정해 Markdown 글을 작성하고 실제 레이아웃으로 미리 볼 수 있다
- [x] 제목·요약·대표 이미지 설명·태그는 한·영 저장·표시, Markdown 본문만 한국어 단일 원문
- [x] 주요 언어 코드 블록이 라이트·다크 테마에서 읽기 좋다
- [x] 본문 임의 위치에 이미지와 검증된 YouTube 영상을 넣을 수 있다
- [ ] `/admin/maintenance`에서 미참조 24시간 이전 이미지만 확인 후 정리할 수 있다
- [x] 대표 이미지 유무와 무관하게 목록 카드가 기존 개발 디자인과 어울린다
- [x] 태그 선택·보기 전환·pagination이 URL에 보존되고 뒤로가기·공유 URL에서 복원된다
- [x] 사진 태그 행·보기 전환·앨범 hero에서 추출한 공용 컴포넌트가 기존 화면을 회귀시키지 않는다
- [x] 상세 hero가 이미지 유무와 무관하게 같은 정보 위계·대비를 유지한다
- [x] 제목·본문은 기존 display 서체 토큰, UI·코드는 기존 sans·mono 역할 유지
- [x] floating 목차가 데스크톱 hover/focus·모바일 tap 모두로 열리고 챗봇 버튼과 겹치지 않는다
- [x] 목차 이동·fragment·뒤로가기·focus·reduced motion이 같은 heading id 계약으로 동작한다
- [x] 프로젝트 모달에서 공개된 연관 글을 역방향으로 찾을 수 있다
- [x] 영어 경로에서 한국어 원문과 언어 안내가 올바르게 표시된다
- [x] 초안은 공개 getter·sitemap·검색·RAG·챗봇 참조·WebMCP에 노출되지 않는다
- [x] 관리자 목록은 body를 내려받지 않고 발행일순으로 동작하며 drag order가 없다
- [x] 관리자 E2E가 격리된 mock repository에서 작성·복구·저장·미리보기·발행 흐름을 검증한다
- [x] 기존 `order asc` 쿼리·CRUD RAG 동작 무회귀 + article 발행일 정렬·조건부 RAG 정책 적용
- [x] 열린 글을 가리키는 챗봇 질문이 해당 글의 공개 데이터·RAG 청크를 우선 사용한다
- [x] 관련 Rules·테스트·접근성 검사·production build가 통과한다
