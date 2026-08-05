# ADR-0002: 경로 기반 i18n (/ko·/en)

## Status

Accepted

## Context

기존 ko/en 전환은 단일 URL + 클라이언트 토글(localStorage)이었다. SSR이 항상 ko 스냅샷으로
렌더되므로 검색엔진은 en 콘텐츠를 발견하지 못하고, 언어별 `<title>`·description 분리도 불가능해
탭 제목을 영어로 고정하는 타협이 있었다. 구글은 언어 버전마다 별도 URL(서브디렉토리 권장)과
양방향 hreflang을 권장하며, Accept-Language 기반 자동 리다이렉트를 금지한다.

## Decision

- 공개 트리 전체를 `app/[lang]/(public)/*`로 이동한다. URL `[lang]` 세그먼트(ko·en)가 언어의
  단일 출처이며, 지원 외 세그먼트는 404. 관리자(/admin)·API는 로케일 밖에 둔다.
- 무-로케일 URL(`/`, `/photo/*` 등)과 v1 사진 URL(`/albums` 등)은 next.config redirects로
  `/ko/*`에 308 직행한다(체인 금지). Accept-Language 분기 middleware는 두지 않는다 — 언어
  선택은 헤더 토글(다른 언어의 같은 페이지로 이동)로만 한다.
- `LangProvider`는 두 모드로 동작한다: 경로 모드(`lang` prop, 공개 트리 — URL이 표시 언어를
  결정)와 스토어 모드(관리자·에러 페이지 — 기존 localStorage 동작). `useLang()` 소비자
  인터페이스는 유지해 언어 소비 컴포넌트 수정을 없앤다. 다른 언어로의 이동은 유일한 전환
  UI인 LangMenu가 `switchLangPath`로 수행한다(Provider는 훅-프리 — 테스트의 부분 mock 보호).
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
- ISR 프리렌더 페이지가 언어당 1벌씩 2배가 된다 (무료 한도 영향 미미).
- pathname을 소비하는 코드는 로케일 프리픽스를 전제해야 한다 — 섹션 판별(`sectionFromPath`)과
  활성 링크 판정은 `stripLangPrefix`를 경유한다.
- 언어 전환이 내비게이션이 되므로 페이지 전환 애니메이션(template 재마운트)이 재생된다.
