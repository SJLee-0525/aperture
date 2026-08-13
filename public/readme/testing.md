# 테스트 전략

품질 검사는 정적 코드 분석과 실행 기반 테스트로 나뉩니다. 실행 기반 테스트에서는 공개 포트폴리오의 주요 탐색 흐름, 관리자 데이터 변환, 외부 서비스 경계와 반응형 화면을 확인합니다.

## 테스트 구성

| 범위             | 도구                                                                | 확인하는 내용                              |
| ---------------- | ------------------------------------------------------------------- | ------------------------------------------ |
| 단위·컴포넌트    | [Vitest](../../vitest.config.ts), Testing Library                   | 검색, 다국어, 모달, 폼 변환과 공용 로직    |
| 공개 사용자 흐름 | [Playwright](../../playwright.config.ts)                            | 라우트, 내비게이션, 검색, 필터와 상세 모달 |
| 반응형           | [Playwright projects](../../playwright.config.ts)                   | 데스크톱 Chrome과 Pixel 7 크기             |
| 접근성           | [axe, Playwright](../../e2e/accessibility.e2e.ts)                   | 문서 구조, ARIA와 WCAG AA 색상 대비        |
| 시각 회귀        | [Playwright snapshots](../../e2e/visual/public-pages.visual.e2e.ts) | 핵심 공개 화면의 픽셀 변화                 |
| Firebase Rules   | [Firebase Emulator](../../test/security-rules.test.mjs)             | 비로그인 쓰기 차단과 관리자 권한           |
| 품질·성능        | [Lighthouse CI](../../lighthouserc.cjs)                             | 접근성, Best Practices, SEO와 성능 지표    |
| 컴포넌트 상태    | [Storybook](../../.storybook)                                       | 공용 UI의 기본·빈 상태·모바일 변형         |

## 자주 사용하는 명령어

전체 스크립트는 [`package.json`](../../package.json)에서 확인할 수 있습니다.

```bash
npm test
npm run test:coverage
npm run test:e2e
npm run test:e2e:admin
npm run test:a11y
npm run test:visual
npm run test:chat-eval
npm run test:lighthouse
npm run test:rules
```

## 정적 코드 분석

| 도구                                                | 확인하는 내용                                          | 명령                   |
| --------------------------------------------------- | ------------------------------------------------------ | ---------------------- |
| [TypeScript](../../tsconfig.json)                   | strict 타입 검사와 빌드 전 타입 오류                   | `npm run check`        |
| [ESLint](../../eslint.config.mjs)                   | Next.js 권장 규칙, TypeScript와 feature 간 import 경계 | `npm run lint`         |
| [dependency-cruiser](../../.dependency-cruiser.cjs) | 순환 의존성과 해석할 수 없는 import                    | `npm run deps:check`   |
| [Knip](../../knip.json)                             | 사용하지 않는 파일, export와 의존성                    | `npm run knip`         |
| [jscpd](../../.jscpd.json)                          | TypeScript·TSX 코드 중복과 설정된 10% 중복 임계값      | `npm run jscpd`        |
| [Prettier](../../.prettierrc.json)                  | Markdown을 포함한 저장소 파일의 형식                   | `npm run format:check` |

ESLint의 `boundaries` 규칙은 서로 다른 feature의 직접 참조와 shared·platform 계층의 역방향 참조를 검사합니다. dependency-cruiser는 모듈 그래프 전체에서 순환 의존성을 따로 확인합니다. 두 검사는 비슷해 보이지만 각각 계층 규칙과 실제 의존 그래프를 담당합니다.

## Mock 기반 E2E

[`e2e`](../../e2e) 테스트 서버는 `NEXT_PUBLIC_USE_MOCK=1`로 시작합니다. Firebase 운영 상태나 관리자 계정과 관계없이 고정된 데이터로 같은 흐름을 검사합니다.

대표 mock 콘텐츠를 이용해 다음 흐름을 검사합니다.

- 한국어·영어 공개 라우트
- 루트의 언어 쿠키·`Accept-Language` 우선순위와 307 응답
- 분석 동의 전 Google tag 차단, 허용·철회·재허용
- Privacy, Terms, Accessibility 문서와 내부 표 스크롤
- 데스크톱 mega-menu와 모바일 내비게이션
- 사진 검색, 태그 필터와 무한 스크롤
- 사진, 연주, 수상과 개발 프로젝트 모달
- 앨범 목록과 상세 페이지
- 문의 폼과 챗봇
- 브라우저 console error와 처리되지 않은 page error

E2E는 지도와 외부 링크가 표시되는 지점까지 검사합니다. 지도 타일, YouTube, 메일 앱과 외부 프로젝트 사이트의 응답 여부는 범위에서 제외합니다.

일반 E2E는 분석 동의를 거부한 저장 상태로 시작해 배너가 화면 조작과 시각 기준선을 가리지 않게
합니다. 분석 동의 전용 스펙만 이 값을 제거합니다. CI 프로덕션 빌드는 테스트용 GA 측정 ID를
빌드 시 넣고 Google tag 요청은 Playwright에서 응답하므로 실제 분석 데이터가 전송되지 않습니다.

## 챗봇 평가

`npm run test:chat-eval`은 전용 mock 서버를 시작해 사실성, 언어, RAG 검색 여부와 참조 카드 유형을 검사합니다. 채팅 제공자와 의도 분류 키를 비우고 케이스별 rate-limit 버킷을 분리하므로 외부 API를 호출하지 않습니다.

실제 제공자의 응답 품질과 지연을 확인할 때는 서버를 별도로 실행한 뒤 `npm run test:chat-eval:live`를 사용합니다. 기본 주소는 `http://127.0.0.1:3000`이며 `CHAT_EVAL_BASE_URL`로 바꿀 수 있습니다. 운영 rate limit이 그대로 적용되므로 전체 평가 대신 `CHAT_EVAL_CASE`로 한 케이스씩 실행할 수도 있습니다.

라이브 평가는 외부 모델의 답변과 의도 분류가 실행마다 달라질 수 있어 결정적인 CI 통과 조건으로 사용하지 않습니다. 조회 여부만 달라진 실패는 답변의 사실성과 반복 실행 결과를 함께 확인합니다. 화면 문맥 전달처럼 고정해야 하는 계약은 mock 평가와 단위·E2E 테스트에서 별도로 검증합니다.

## 시각 회귀

시각 기준선은 운영 빌드와 같은 조건에서 생성합니다. 의도한 디자인 변경일 때만 스냅샷을 갱신하고 actual, expected, diff 이미지를 함께 확인합니다.

폰트 렌더링은 운영체제에 따라 달라질 수 있어 기준 환경을 고정합니다. macOS에서는 일반 E2E와 접근성 검사를 실행하고, 시각 기준선 갱신은 지정된 CI 환경에서 처리합니다.

## Firebase Rules

[`Firebase Rules 테스트`](../../test/security-rules.test.mjs)는 Firebase Emulator와 별도의 demo 프로젝트를 사용합니다. 공개 읽기와 관리자 쓰기 조건을 실제 운영 데이터 없이 확인하며, 새 컬렉션이나 Storage 경로가 추가되면 허용·거부 사례를 함께 추가합니다.
