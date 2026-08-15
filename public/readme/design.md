# 디자인과 구현

이 포트폴리오는 사진, 음악, 개발이라는 서로 다른 작업을 하나의 이름과 화면 체계 안에서 보여주도록 설계했습니다. 사진 영역에서는 `Aperture.`라는 서브브랜드를 유지합니다.

<picture>
  <source media="(max-width: 640px)" srcset="./landing-mobile.webp">
  <img src="./landing-desktop.webp" alt="Sungjoon Lee 포트폴리오 랜딩 화면">
</picture>

## 하나의 셸, 세 개의 영역

상단 워드마크와 기본 내비게이션은 모든 영역에서 유지됩니다. 현재 영역은 색으로 구분합니다.

- Photo: 파란색
- Music: 빨간색
- Dev: 초록색

컴포넌트는 색을 직접 지정하지 않고 [`--accent` 토큰](../../src/app/globals.css)을 사용합니다. 같은 컴포넌트를 Photo, Music, Dev에서 재사용할 수 있습니다.

## 타이포그래피

- Newsreader: 워드마크와 큰 제목
- Noto Serif KR: 한글 serif 보완
- Schibsted Grotesk: 본문과 UI
- Spline Sans Mono: 좌표, EXIF와 기술 수치

폰트는 [`next/font`](../../src/app/layout.tsx)로 로드합니다. [이미지 생성 코드](../../src/lib/metadata/create-site-image.tsx)에 필요한 Newsreader와 Spline Sans Mono 파일은 [`src/assets/fonts`](../../src/assets/fonts)에 포함하고 각각의 OFL 문서를 함께 보관합니다.

## 데스크톱과 모바일

데스크톱은 mega-menu와 상단 검색을 사용합니다. 모바일에서는 앱바, 버거 메뉴와 영역별 하단 탭으로 바뀝니다.

사진, 연주, 수상과 개발 프로젝트 상세는 현재 목록의 맥락을 유지하도록 query 기반 모달로 엽니다. 사진 앨범만 고유 URL이 필요한 콘텐츠라 별도 상세 경로를 사용합니다.

## 화면의 성격

모서리는 대부분 각지게 유지하고 pill 형태는 태그처럼 의미가 있는 요소에만 사용했습니다. 깊이는 큰 그림자보다 표면 색과 얇은 구분선으로 표현합니다. 라이트·다크 테마 모두 같은 정보 위계가 유지되도록 색상 토큰을 나눴습니다.

랜딩에는 세 영역에서 공통으로 쓰는 큰 워드마크와 역할 타이핑이 있습니다. 애니메이션은 첫 진입과 상태 변화에만 사용하고, `prefers-reduced-motion` 환경에서는 움직임을 줄입니다.

## 프로토타입에서 구현까지

Claude Design으로 [`design/ver_2`](../../design/ver_2/)의 데스크톱·모바일 프로토타입을 만들고 이를 기준으로 화면을 구현했습니다. 프로토타입에 있던 정적 콘텐츠는 CMS와 한국어·영어 데이터 구조로 옮겼습니다. 추상 지도 대신 [MapLibre 기반 실제 지도](../../src/features/map/_components/MapCanvas.tsx)를 사용합니다.

좋아요와 사진 프레임 내보내기는 현재 공개 범위에서 제외했습니다. 업로드 이미지는 [브라우저 압축 과정](../../src/features/image-upload/_lib/compress.ts)을 거쳐 긴 변 약 2048px의 WebP로 저장해 전송량과 Storage 사용량을 줄입니다.

기획, 프로토타이핑, 구현에 생성형 AI를 보조 도구로 사용했습니다. 정보 구조와 디자인을 결정하고 결과물을 편집해 코드에 반영하는 작업은 직접 맡았습니다.
