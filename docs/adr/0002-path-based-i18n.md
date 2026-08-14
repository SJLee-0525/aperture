# ADR-0002: 경로 기반 i18n (/ko·/en)

## Status

Accepted — **2026-08-09 최초 진입 언어 판정 개정 구현**

## Context

기존 ko/en 전환은 단일 URL + 클라이언트 토글(localStorage)이었다. SSR이 항상 ko 스냅샷으로
렌더되므로 검색엔진은 en 콘텐츠를 발견하지 못하고, 언어별 `<title>`·description 분리도 불가능해
탭 제목을 영어로 고정하는 타협이 있었다. 구글은 언어 버전마다 별도 URL과 양방향 hreflang을
권장하며, 추정 언어에 따라 한 언어 버전에서 다른 버전으로 사용자를 강제 전환하지 말라고
안내한다. Googlebot은 보통 `Accept-Language` 없이 요청하므로 헤더 판정만으로 언어 버전을
노출해서도 안 된다.

초기 결정은 이 위험을 피하기 위해 모든 무-로케일 URL을 `/ko/*`로 고정했다. 이후 실제 운영에서
해외 방문 비중이 예상보다 높다는 점이 확인됐고, 명시적인 `/ko/*`·`/en/*` URL의 안정성을
유지하면서 언어가 없는 최초 진입점 `/`만 브라우저 선호에 맞출 필요가 생겼다.

## Decision

- 공개 트리 전체를 `app/[lang]/(public)/*`로 이동한다. URL `[lang]` 세그먼트(ko·en)가 언어의
  단일 출처이며, 지원 외 세그먼트는 404. 관리자(/admin)·API는 로케일 밖에 둔다.
- 명시적인 `/ko/*`와 `/en/*`는 안정적인 언어 URL이다. 브라우저 언어, 쿠키, 접속 국가 또는
  User-Agent 때문에 한 언어 URL을 다른 언어 URL로 자동 전환하지 않는다.
- 언어가 없는 루트 `/`만 Next.js Proxy에서 조건부로 판정한다. 사용자가 언어 메뉴에서 명시적으로
  선택한 first-party 언어 쿠키를 최우선으로 하고, 쿠키가 없으면 `Accept-Language`의 최우선
  언어가 `ko` 계열인지 확인한다. 한국어면 `/ko`, 그 밖의 언어면 `/en`, 헤더가 없거나 해석할 수
  없으면 `/ko`로 보낸다.
- `/`의 조건부 이동은 요청마다 결과가 달라질 수 있으므로 `307 Temporary Redirect`와
  `Cache-Control: private, no-store`를 사용한다. query string은 보존한다. 수동 언어 선택 전에는
  언어 쿠키를 쓰지 않는다.
- `/photo/*`, `/music/*`, `/dev/*` 등의 무-로케일 URL과 `/albums` 등의 v1 사진 URL은 기존처럼
  next.config redirects에서 `/ko/*`에 308 직행한다. 이 경로들은 과거 URL의 결정적인 이전과 검색
  신호 보존이 목적이며, 최초 진입 언어 감지 범위에 포함하지 않는다.
- `LangProvider`는 두 모드로 동작한다: 경로 모드(`lang` prop, 공개 트리 — URL이 표시 언어를
  결정)와 스토어 모드(관리자·에러 페이지 — 기존 localStorage 동작). `useLang()` 소비자
  인터페이스는 유지해 언어 소비 컴포넌트 수정을 없앤다. 다른 언어로의 이동은 유일한 전환
  UI인 LangMenu가 `switchLangPath`로 수행한다(Provider는 훅-프리 — 테스트의 부분 mock 보호).
  LangMenu의 명시적 선택은 localStorage와 언어 쿠키에 함께 기록한다.
- 공개 내부 링크는 `LocalizedLink`(현재 언어 프리픽스 자동 부착, /admin·외부 통과)로 만든다.
  경로 유틸 단일 출처는 `lib/i18n/locale-path.ts`.
- 메타데이터는 `pageMetadata({lang, title{ko,en}, description{ko,en}, pathname})`로 언어별
  title·description·canonical을 내고, hreflang은 ko·en 상호 참조(자기 포함) + x-default(ko)를
  전 페이지·sitemap 양쪽에 같은 세트(`languageAlternates`)로 출력한다.
- `<html lang>`은 루트 layout(ko 기본) 위에서 `[lang]/layout`의 인라인 스크립트(첫 페인트)와
  `DocumentLang` effect(전환 시)가 교정한다 — 루트 layout은 `[lang]` params에 접근할 수 없다.

## Consequences

- en 콘텐츠가 SSR·색인 가능해지고, 언어별 title/description·OG locale이 분리된다.
  "탭 제목 영어 고정" 정책은 폐기한다.
- 비한국어 브라우저의 신규 `/` 방문은 영어 랜딩으로 이어지고, 사용자가 선택한 언어는 이후
  루트 방문에서도 브라우저 설정보다 우선한다.
- 언어 판정은 `/`의 짧은 리다이렉트 요청만 동적으로 처리한다. 실제 `/ko/*`·`/en/*` 페이지의
  정적 우선 렌더링과 ISR에는 영향을 주지 않는다.
- 기존 `/ → /ko` 308을 저장한 일부 브라우저는 캐시가 해소될 때까지 새 판정을 거치지 않을 수
  있다. 영문 외부 링크는 `/en`을 직접 사용하고, 모든 언어 페이지에서 언어 메뉴를 유지한다.
- 언어 쿠키는 `ko | en`만 담고 명시적 선택을 기억하는 단일 목적으로 사용한다. 별도 추적이나
  분석에 결합하지 않고 쿠키/개인정보 안내에 목적과 보유 기간을 공개한다. 분석 쿠키의 동의
  여부는 이 기능성 쿠키의 판단과 분리한다.
- ISR 프리렌더 페이지가 언어당 1벌씩 2배가 된다 (무료 한도 영향 미미).
- pathname을 소비하는 코드는 로케일 프리픽스를 전제해야 한다 — 섹션 판별(`sectionFromPath`)과
  활성 링크 판정은 `stripLangPrefix`를 경유한다.
- 언어 전환이 내비게이션이 되므로 페이지 전환 애니메이션(template 재마운트)이 재생된다.
- `[lang]` 이 모든 공개 라우트의 상위 세그먼트가 되므로 이 세그먼트의 route segment config 는
  하위 전체에 적용된다. 특히 `dynamicParams = false` 를 두면 프리렌더 목록 밖의 글·앨범이
  렌더되지 못하고 전역 404 가 되며, 자식 라우트의 `dynamicParams = true` 로 되돌릴 수 없다.
  지원 외 언어 세그먼트는 레이아웃의 `isLang` 검사가 404 로 막는다.

## Amendment notes

- 최초 결정의 “Accept-Language 분기 없음”을 루트 `/`에 한해 개정한다.
- 언어 URL을 방문 중인 사용자를 다른 언어로 강제 전환하지 않는 원칙은 유지한다.
- 상세 구현·테스트·배포·롤백 절차는
  [브라우저 언어 기반 최초 진입 라우팅 계획](../plan/03-browser-language-entry-routing.md)을 따른다.
- 개정은 `src/proxy.ts`의 루트 전용 판정과 명시적 언어 쿠키로 구현했다. 같은 배포에서 Basic
  Consent 방식의 GA4 로딩 경계와 한국어·영어 Privacy, Site Use & Content, Accessibility 문서를
  추가해 해외 방문자에게 필요한 고지와 제어 수단을 함께 제공한다.
