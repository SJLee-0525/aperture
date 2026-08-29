# 챗봇이 현재 사진과 다른 사진을 설명하는 문제

## 증상

사진 모달을 연 상태에서 챗봇 입력창에는 `보고 있는 사진`이 표시되지만, 챗봇은 이전에 본 사진이나
검색으로 찾은 다른 사진의 장소·장비를 답할 수 있다.

실제 재현 경로는 다음과 같았다.

```text
/ko/photo/albums/9rhrRuIfN0eREKKOId77?photo=8JxaXkRHqvWT6hd80IGg
```

화면의 사진은 일산 호수공원에서 Sony ILCE-7M3와 FE 24-105mm F4 G OSS로 촬영한 사진이지만,
챗봇은 앞서 대화한 올림픽공원 사진과 Canon 장비를 설명했다.

## 핵심 원인

화면의 문맥 칩과 서버의 답변 문맥은 서로 다른 단계에서 만들어진다.

```text
PhotoModal
  → 클라이언트 target 등록
  → 챗봇 문맥 칩 표시
  → /api/chat 요청에 pathname + openTarget 전송
  → 서버 pathname 검증
  → 공개 데이터에서 openTarget 재조회
  → SCREEN_CONTEXT 생성
  → 모델 응답
```

따라서 칩이 보인다는 사실은 첫 번째 단계만 성공했다는 뜻이다. 서버가 pathname이나 target을
거부하면 칩은 그대로 보여도 모델에는 현재 사진 정보가 전달되지 않는다.

이번 장애에는 세 가지 원인이 겹쳤다.

### 1. 앨범 모달의 target 등록 누락

일반 Photo Work는 `OnDemandPhotoModal`을 사용했지만 앨범 상세는 `PhotoModal`을 직접 렌더링했다.
target 등록이 `OnDemandPhotoModal`에만 있어 앨범에서 연 사진은 등록되지 않았다.

등록 책임을 현재 선택된 `photo`를 실제로 알고 있는 `PhotoModal`로 옮겼다. 호출부는
`chatTarget` 사용 여부만 전달한다. 이 구조에서는 앨범 사진과 이전·다음 사진 전환도 같은 경로로
문맥을 갱신한다.

### 2. 실제 앨범 ID가 pathname 검증에서 탈락

초기 테스트는 `city-night`처럼 소문자 slug만 사용했다. 이전 데이터에서 이어받은 실제 앨범 ID에는
`9rhrRuIfN0eREKKOId77`처럼 대문자가 포함된다. 기존 pathname 정규식이 소문자만 허용해 실제 앨범
상세 경로의 문맥 전체를 버렸다.

정적 경로 허용 목록은 그대로 유지하고, 동적 앨범 상세 한 단계에만 영문 대소문자·숫자·하이픈을
허용한다.

```ts
const ALBUM_DETAIL_PATH_PATTERN = /^\/photo\/albums\/[A-Za-z0-9-]+$/;
```

`/photo/albums/{id}/nested` 같은 중첩 경로, query가 섞인 pathname, percent encoding과 허용되지 않은
정적 경로는 계속 거부한다.

### 3. 오래된 화면 문맥과 대화 이력이 현재 화면보다 우선

기존 resolver는 RAG 스냅샷에 같은 ID가 있으면 최신 공개 데이터를 조회하지 않았다. 사진의 장소나
EXIF가 수정되어도 오래된 값이 `SCREEN_CONTEXT`에 남을 수 있었다. 또한 모델이 이전 대화와
`PROFILE_CONTEXT`에서 찾은 다른 사진을 현재 사진보다 우선할 여지도 있었다.

live 환경의 화면 문맥은 최신 공개 데이터를 먼저 조회한다. 최신 조회가 실패하거나 항목이 없을 때만
캐시된 스냅샷으로 물러난다. 프롬프트에도 `SCREEN_CONTEXT`가 현재 항목을 식별하는 유일한 기준이며,
대화 이력이나 RAG의 다른 장소·장비와 섞지 말아야 한다고 명시한다.

## 진단 방법

### 1. 브라우저 요청 확인

`/api/chat` 요청 JSON에 다음 값이 있는지 확인한다.

```json
{
  "context": {
    "pathname": "/ko/photo/albums/9rhrRuIfN0eREKKOId77",
    "openTarget": {
      "type": "photo",
      "id": "8JxaXkRHqvWT6hd80IGg"
    }
  }
}
```

칩은 보이는데 `context`가 없다면 클라이언트 요청 생성 문제다. `context`는 있지만 서버 응답이 다른
항목을 설명한다면 pathname 파싱, 공개 데이터 조회와 프롬프트 우선순위를 차례로 확인한다.

### 2. 공개 사진 데이터와 챗봇 응답 비교

사진 상세 API에서 같은 ID의 `place`, `camera`, `lens`, `exif.focalLength`를 확인한다. 그다음 같은
pathname과 `openTarget`으로 `/api/chat`을 호출한다. 두 결과가 다르면 UI 데이터 문제가 아니라
채팅 서버의 문맥 처리 문제다.

### 3. 경로 검증을 실제 ID로 재현

사람이 만든 slug만으로 테스트하지 않는다. 이전 데이터에서 이어받은 대소문자 혼합 ID도 사용한다.

```ts
buildChatContext(
  "/ko/photo/albums/9rhrRuIfN0eREKKOId77",
  new URLSearchParams("photo=8JxaXkRHqvWT6hd80IGg"),
);
```

결과에는 원래 pathname과 `photo` openTarget이 모두 남아야 한다.

## 회귀 테스트

- `chat-context.test.ts`: 대소문자 혼합 앨범 ID의 build/parse 왕복
- `resolve-chat-screen-context.test.ts`: 같은 ID의 stale 캐시보다 최신 장소를 우선
- `OnDemandPhotoModal.test.tsx`: `chatTarget`을 실제 `PhotoModal`로 전달
- `chat.e2e.ts`: 앨범 딥링크에서 칩을 표시하고 요청 본문에 사진 target을 포함
- 실제 로컬 API 확인: 이전 사진 대화가 있어도 현재 호수공원 사진의 장소를 답변

관련 테스트만 빠르게 실행하려면 다음 명령을 사용한다.

```powershell
npm test -- --run src/features/chat/_lib/chat-context.test.ts `
  src/features/chat/_lib/resolve-chat-screen-context.test.ts `
  src/features/chat/_lib/chat-prompt.test.ts `
  src/features/photo-detail/_components/OnDemandPhotoModal.test.tsx
```

## 재발 방지 원칙

- UI 표시는 서버 문맥 적용의 성공 신호로 간주하지 않는다.
- 동적 경로 테스트에는 실제 저장소 ID 형식을 최소 하나 포함한다.
- 현재 화면처럼 정확성이 중요한 단일 항목은 검색 결과보다 직접 ID 조회를 우선한다.
- 최신 조회 장애는 채팅 전체 장애로 번지지 않게 캐시 폴백을 유지한다.
- “이 사진”, “여기” 같은 지시어는 현재 `SCREEN_CONTEXT`를 최우선으로 해석한다.
- E2E는 칩 표시만 보지 않고 실제 `/api/chat` 요청의 `openTarget`까지 검사한다.
