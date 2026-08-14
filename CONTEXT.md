# Aperture Domain Context

## Product

`Sungjoon Lee.`는 이성준의 사진, 음악, 개발 작업을 하나의 공개 셸에서 보여주는 통합 포트폴리오다. 사진 섹션은 `Aperture.` 서브브랜드를 유지한다.

방문자는 로그인하지 않는다. 한국어와 영어, 라이트와 다크 테마를 선택하며 공개 콘텐츠를 탐색한다. `Admin`은 본인 한 명을 위한 CMS이며 공개 사용자 흐름과 E2E 범위에서 분리한다.

## Public areas

| Term          | Route                  | User-facing responsibility            |
| ------------- | ---------------------- | ------------------------------------- |
| Landing       | `/`                    | Photo, Music, Dev 진입 허브           |
| Photo Work    | `/photo`               | 사진 탐색, 검색, 필터, 사진 상세 모달 |
| Photo Albums  | `/photo/albums`        | 앨범 목록과 `/photo/albums/[id]` 상세 |
| Photo Map     | `/photo/map`           | 촬영 위치 목록과 지도                 |
| Photo About   | `/photo/about`         | 사진가 소개와 통계                    |
| Music Works   | `/music`               | 연주 목록과 연주 상세 모달            |
| Music Career  | `/music/career`        | 학력, 경력, 수상과 수상 상세 모달     |
| Music Media   | `/music/media`         | 연주 영상 목록                        |
| Music About   | `/music/about`         | 피아니스트 소개                       |
| Dev About     | `/dev`                 | 개발자 소개 (구 `/dev/about` 은 308)  |
| Dev Career    | `/dev/career`          | 학력, 경력, 수상과 기술 스택          |
| Dev Projects  | `/dev/projects`        | 프로젝트 목록과 프로젝트 상세 모달    |
| Dev Blog      | `/dev/articles`        | 블로그 목록, 태그 필터와 페이지 이동  |
| Dev Article   | `/dev/articles/[slug]` | 블로그 본문, 목차와 연관 프로젝트     |
| Contact       | `/contact`             | 연락 양식과 외부 연락 링크            |
| Privacy       | `/privacy`             | 언어 저장·분석 동의·외부 처리 안내    |
| Terms         | `/terms`               | 콘텐츠 권리·외부 링크·챗봇 이용 안내  |
| Accessibility | `/accessibility`       | 접근성 목표·제한·피드백 안내          |
| Search        | `/search`              | 공개 콘텐츠 통합 검색 결과            |

`Photo`, `Music`, `Dev`는 각 섹션의 공식 명칭이다. 테스트와 문서에서 임의의 동의어 대신 이 명칭을 사용한다.

## Content source

공개 페이지는 `src/lib/content/`의 getter를 통해 콘텐츠를 읽는다. `NEXT_PUBLIC_USE_MOCK=1`은 모든 공개 getter가 `src/mocks/`의 결정적인 데이터를 사용하도록 강제한다. E2E는 이 모드로 전용 Next.js 서버를 시작하며 Firebase 데이터나 관리자 인증에 의존하지 않는다.

블로그 본문은 한국어 Markdown 원문 하나만 저장한다. 제목·요약·태그는 다른 콘텐츠처럼 한국어와 영어를 함께 저장하지만, 본문 번역은 제공하지 않는다. 초안은 공개 getter가 걸러내므로 공개 목록·상세·검색·RAG·sitemap 어디에도 나타나지 않는다.

mock 콘텐츠는 단순한 테스트 대역이 아니라 공개 UI를 완전히 탐색할 수 있는 로컬 데모 데이터다. E2E는 mock 데이터의 대표 항목을 통해 목록, 상세, 필터, 검색과 모달 행동을 검증한다.

## Portfolio RAG

`Portfolio RAG`는 공개 Photo, Photo Albums, Music, Dev, Dev Blog 콘텐츠와 프로필 설정을 의미 단위 청크로 검색하는 챗봇 문맥 계층이다. 채팅 분류기는 유지하며, 선택된 섹션 안에서 OpenAI 임베딩과 키워드 점수를 결합한다.

관리자 최초 실행은 전체 청크를 생성한다. 이후 콘텐츠 저장·공개·비공개·삭제는 해당 원본만 자동 동기화한다. 태그 사전 변경은 영향을 받는 Photo 청크를 갱신한다. 일반 Search는 임베딩 호출 없이 브라우저에서 이중언어 텍스트와 장비 별칭을 검색한다.

## Navigation and detail behavior

- 데스크톱은 상단 mega-menu와 전역 검색을 사용한다.
- 모바일은 앱바, 버거 메뉴와 섹션별 하단 탭을 사용한다.
- 사진, 연주, 수상, 개발 프로젝트 상세는 별도 페이지가 아니라 query 기반 모달이다.
- query key는 각각 `photo`, `work`, `award`, `project`다.
- 앨범 상세와 블로그 본문만 경로를 사용한다: `/photo/albums/[id]`, `/dev/articles/[slug]`.
- 모달은 열기, 콘텐츠 확인, 닫기와 URL query 동기화가 사용자에게 관찰 가능해야 한다.

## Architecture boundaries

Next.js App Router 단일 앱이며 의존 방향은 `app → features → components`다.

- `app`: 라우팅, 공개 콘텐츠 fetch, feature 조립
- `features`: 사용자 행동과 도메인 UI
- `components`: props 기반 재사용 UI
- `lib/content`: mock과 Firestore 콘텐츠 소스의 교체 지점
- `lib/monitoring`: Sentry 오류 관측. 공개 브라우저에서는 오류 보고 동의 후 로드하고, 관리자에서는 UID 확인 후 시작한다. 서버·엣지는 최소 수집 설정으로 항상 실행한다(ADR-0004).
- `mocks`: 결정적인 공개 데모 콘텐츠
- `admin`: 인증된 CMS이며 공개 E2E에서 제외

공개 페이지의 서버 읽기는 Firestore REST를 사용하고 관리 기능은 Firebase client SDK를 사용한다. E2E mock 모드는 이 외부 경계를 통과하지 않는다. 지도 타일과 외부 링크는 제3자 시스템이므로 E2E는 앱의 컨테이너, 링크와 위치 데이터까지만 검증한다.

## E2E behavior contract

E2E는 데스크톱과 모바일에서 다음 사용자 관점의 행동을 보장한다.

- 모든 공개 정적 라우트와 대표 mock 앨범 상세가 오류 없이 열린다.
- 각 페이지의 고유 heading과 대표 mock 콘텐츠가 보인다.
- 현재 viewport에 맞는 navigation이 동작한다.
- 페이지의 핵심 클릭 가능 요소가 실제로 열리거나 이동한다.
- Photo, Music Career, Music Works, Dev Projects의 상세 모달이 열리고 닫힌다.
- 검색과 필터가 mock 결과를 변경한다.
- 블로그 본문의 목차가 현재 위치를 따라가고, 초안과 존재하지 않는 slug는 본문을 노출하지 않는다.
- 심각한 브라우저 console error와 처리되지 않은 page error가 없다.
- 루트 언어 판정과 분석 동의 전 GA 차단이 언어·저장 상태별 계약을 지킨다.
- 외부 지도 타일, mail client, YouTube와 외부 프로젝트 사이트의 성공 여부는 검사하지 않는다.
