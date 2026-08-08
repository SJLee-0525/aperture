# 프로젝트 아키텍처

이 저장소에는 공개 포트폴리오와 개인용 콘텐츠 관리 도구가 하나의 Next.js 애플리케이션에 들어 있습니다. 방문자 화면과 관리자 기능은 라우트와 데이터 접근 방식부터 나뉩니다.

## 전체 구성

```text
방문자
├─ 공개 페이지 ─ src/lib/content ─ Mock 또는 Firestore REST
├─ 통합 검색 ─ 브라우저 내 검색
└─ 포트폴리오 챗봇 ─ RAG 검색 ─ 채팅 제공자

관리자
└─ Admin CMS ─ Firebase Authentication · Firestore · Storage
```

공개 페이지는 콘텐츠를 읽고, 인증된 Admin은 콘텐츠를 변경합니다. 방문자 UI는 관리자 인증 상태나 Firebase client SDK를 불러오지 않습니다.

## 공개 페이지

공개 라우트는 [`src/app/[lang]/(public)`](<../../src/app/[lang]/(public)>) 아래에 있습니다. 각 `page.tsx`는 서버에서 콘텐츠를 읽고 화면에 필요한 feature 컴포넌트에 전달합니다.

```text
page.tsx
└─ src/lib/content getter
   ├─ 개발·E2E: src/mocks
   └─ 운영: Firestore REST
```

[`src/lib/content`](../../src/lib/content)의 getter가 데이터 소스를 선택합니다. 화면 컴포넌트에는 mock과 Firestore가 같은 형태의 데이터를 전달합니다. 공개 페이지는 1시간 단위 재검증을 사용하고, 관리자가 콘텐츠를 저장하면 관련 캐시를 무효화합니다.

## Admin CMS

[`src/app/admin`](../../src/app/admin)은 로그인, 사진, 앨범, 음악, 개발 프로젝트와 사이트 설정을 관리합니다. 서버 레이아웃은 검색엔진 제외 메타데이터를 제공하고, [`AdminLayoutClient`](../../src/app/admin/_components/AdminLayoutClient.tsx)가 인증 확인과 관리자 화면을 담당합니다.

관리 기능은 Firebase client SDK를 사용합니다.

- Authentication: 관리자 한 명의 로그인 상태 확인
- Firestore: 콘텐츠 생성, 수정, 공개 상태와 정렬 순서 저장
- Storage: 사진, 포스터와 프로젝트 이미지 저장
- RAG 동기화: 변경된 콘텐츠의 임베딩 갱신 요청

## UI 계층

의존 방향은 `app → features → components`입니다.

| 계층                                 | 역할                                             |
| ------------------------------------ | ------------------------------------------------ |
| [`app`](../../src/app)               | 라우팅, 서버 데이터 조회와 화면 조립             |
| [`features`](../../src/features)     | 검색, 모달, 필터, 폼처럼 사용자 행동이 있는 기능 |
| [`components`](../../src/components) | props로 내용을 받아 표시하는 공용 UI             |

Feature 폴더는 필요에 따라 `_components`, `_hooks`, `_lib`, `_types`로 나눕니다. 화면, 상태 로직과 순수 함수의 위치를 구분해 관련 코드를 찾기 쉽게 구성했습니다.

## 다국어 라우팅

공개 URL은 `/ko`와 `/en`으로 나뉩니다. URL의 언어 값이 서버 렌더링, 내부 링크, canonical과 hreflang의 기준이 됩니다.

```text
/ko/photo
/en/photo
/ko/dev/projects
/en/dev/projects
```

언어를 바꾸면 같은 페이지의 다른 언어 경로로 이동합니다. Admin과 API는 언어 경로 밖에 두어 공개 페이지의 URL 정책과 분리했습니다.

## 외부 서비스 경계

- Firebase는 공개 콘텐츠, 관리자 인증과 이미지 저장을 담당합니다.
- MapLibre GL은 사진 위치를 지도에 표시합니다.
- OpenAI와 Gemini는 챗봇 응답, 분야 분류 또는 임베딩에 사용됩니다.
- Web3Forms는 문의 폼이 설정된 경우에만 사용됩니다.
- Upstash Redis는 배포 환경에서 챗봇 요청 제한을 공유합니다.

로컬에서는 외부 서비스 없이 mock 콘텐츠로 공개 화면을 확인할 수 있습니다.
