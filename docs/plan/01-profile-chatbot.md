# 포트폴리오 챗봇 구현 계획

> 상태: **MVP 구현 완료 / 운영 준비 중**
> 목적: 방문자가 공개 포트폴리오의 사진·음악·개발 작업을 한국어와 영어로 탐색하게 한다.

## 1. 현재 구조

```text
전역 Chat UI
    ↓ POST /api/chat
Next.js Route Handler
    ├─ 입력 검증·요청 제한·timeout
    ├─ 캐시된 공개 포트폴리오 문맥 구성
    ├─ 선택한 CHAT_PROVIDER 호출
    └─ 텍스트·내부 링크·콘텐츠 참조 반환
```

- 기본 제공자는 OpenAI GPT-5.6 Luna이며 응답 시작 전 장애에는 Gemini로 폴백한다.
- API 키와 모델 호출은 서버에서만 처리한다.
- Firebase Admin SDK나 별도 상시 서버를 추가하지 않는다.
- 대화는 브라우저 메모리에만 유지되어 패널을 닫아도 남고 새로고침하면 초기화된다.
- 제공자 응답은 NDJSON으로 스트리밍하며 첫 토큰 전에는 대기 말풍선을 표시한다.
- 질문과 후속 대화를 분류해 필요한 프로필·개발·음악·사진 문맥만 모델에 전달한다.

## 2. 환경변수

```dotenv
CHAT_PROVIDER=openai
CHAT_PROVIDER_MODEL=gpt-5.6-luna
CHAT_PROVIDER_API_KEY=
CHAT_FALLBACK_PROVIDER=gemini
CHAT_FALLBACK_PROVIDER_MODEL=gemini-3.5-flash-lite
CHAT_FALLBACK_PROVIDER_API_KEY=
EMBEDDING_PROVIDER=openai
EMBEDDING_PROVIDER_MODEL=text-embedding-3-small
EMBEDDING_PROVIDER_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
# 또는 Vercel Marketplace가 자동 주입하는 아래 두 변수
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

로컬 값은 `.env.local`, 운영 값은 Vercel의 server-only 환경변수에 넣는다. 비밀값에 `NEXT_PUBLIC_` 접두사를 붙이거나 저장소에 실제 키를 커밋하지 않는다. 외부 호출 없는 개발·테스트에는 `CHAT_PROVIDER=mock`을 사용할 수 있다. Luna는 Responses API의 스트리밍, 엄격한 Structured Outputs, 낮은 verbosity와 `reasoning: none`을 사용한다. OpenAI가 아직 본문을 보내지 않은 상태에서 실패할 때만 Gemini로 폴백해 서로 다른 제공자의 문장이 섞이지 않게 한다. Upstash의 `UPSTASH_REDIS_REST_*` 또는 Vercel Marketplace의 `KV_REST_API_*` 쌍이 설정되면 공유 limiter를 사용하고, 없으면 인스턴스 메모리 limiter를 사용한다. `REDIS_URL`, `KV_URL`, `KV_REST_API_READ_ONLY_TOKEN`은 이 기능에서 사용하지 않는다.

채팅 생성과 임베딩 생성은 키·모델·할당량을 완전히 분리한다. `EMBEDDING_PROVIDER_API_KEY`가 없을 때 `CHAT_PROVIDER_API_KEY`로 폴백하지 않는다. 관리자는 `/admin/maintenance`에서 공개 프로필·개발·음악·사진 콘텐츠를 의미 단위 RAG 청크로 일괄 생성한다. 서버는 Firebase 관리자 ID token을 검증하고 OpenAI 배치 임베딩을 생성한 뒤 Firestore 요청 크기에 맞춰 `ragDocuments`를 분할 교체한다. 런타임은 분류된 섹션의 청크를 1시간 캐시하고 Route Handler에서 코사인 유사도를 계산한다.

## 3. 공개 문맥과 데이터 절약

문맥 빌더는 사이트에 공개된 데이터만 사용한다.

- 프로필 소개, 음악·개발 소개와 공개 이력
- 공개된 사진, 음악 작업, 개발 프로젝트의 질의에 필요한 메타데이터
- 콘텐츠 카드용 대표 이미지 또는 썸네일 메타데이터 한 건
- 실제 사이트 내부 경로

원본 이미지, 갤러리 전체, EXIF, 좌표, 관리자 데이터는 모델 요청에 넣지 않는다. Firestore 조회 결과는 1시간 캐시하고 관리자 콘텐츠 재검증 시 같은 태그로 무효화한다. 콘텐츠 규모가 현재 수준을 크게 넘기기 전까지 vector database는 도입하지 않는다.

## 4. 응답 형식

서버는 제공자 응답을 다음 구조로 정규화한다.

```ts
type ChatProviderResult = {
  content: string;
  links?: { label: string; href: string }[];
  references?: { type: "photo" | "music" | "project"; id: string }[];
};
```

- `content`: 요청 언어로 작성된 간결한 일반 텍스트
- `links`: 서버가 허용한 포트폴리오 내부 경로, 최대 2개
- `references`: 공개 데이터에서 확인된 콘텐츠, 최대 3개

참조 ID는 서버에서 공개 데이터와 다시 대조한 뒤 제목·부제·대표 이미지·딥 링크가 포함된 카드로 변환한다. 사진뿐 아니라 음악과 프로젝트 카드도 기존 상세 모달을 연다. 모델이 만든 외부 URL, 비공개 ID, 존재하지 않는 ID는 폐기한다.

## 5. 입력·출력 경계

- 요청 언어: `ko` 또는 `en`
- 역할: `user`와 `assistant`만 허용
- 최근 메시지: 최대 12개
- 메시지당: 최대 2,000자
- 전체 메시지: 최대 8,000자
- 요청 본문: 최대 20KB
- 사용자 입력창: 최대 500자
- 제공자 timeout: 15초
- 모델 출력: 최대 512 tokens, 응답 본문 최대 1,200자

응답은 질문 언어를 따르고 공개 문맥에 없는 사실을 추측하지 않는다. 일반 소개에는 불필요한 카드나 연락 링크를 붙이지 않으며, 사용자가 콘텐츠 유형과 개수를 지정하면 가능한 범위에서 해당 카드만 반환한다.

## 6. 보안·비용 방어

현재 구현된 항목:

- 서버 전용 API 키
- 요청 스키마와 본문 크기 검증
- 출력 길이 제한과 timeout
- 내부 링크 allowlist와 공개 콘텐츠 재검증
- provider 원문 오류·stack trace 비노출
- 유효 요청에만 적용되는 IP 기준 분당 6회 공유 제한
- Redis 키에는 IP 원문 대신 SHA-256 식별자만 사용
- Upstash timeout·장애 시 인스턴스 메모리 limiter로 폴백
- 패널 내 민감한 개인정보 입력 주의 문구

운영에서는 Upstash Redis REST 환경변수를 설정해야 서버리스 인스턴스 사이에 제한이 공유된다. 제공자와 Upstash의 비용 한도·알림도 함께 설정한다. API 키, 전체 질문, 모델 원본 응답, 전체 프로필 문맥은 로그에 남기지 않는다.

## 7. UI·접근성 기준

- 데스크톱 우하단 아이콘 버튼, 모바일 하단 메뉴 가시성에 맞춘 위치
- 모바일 전체 화면 패널과 safe area 대응
- 패널을 닫아도 새로고침 전까지 대화 유지
- textarea 자동 확장, 최대 3줄, `Enter` 전송, `Shift+Enter` 줄바꿈
- focus trap, `Escape` 닫기, 배경 `inert`, scroll lock
- reduced motion, 키보드 focus, 한국어·영어 accessible name 대응
- 입력 중 패널과 전송 버튼이 매번 다시 렌더되지 않는 비제어 textarea

## 8. 테스트 현황

- Route Handler: 입력 검증, 언어, 오류 매핑, timeout, 요청 제한
- 문맥 빌더: 공개 데이터 projection과 캐시
- 제공자: Gemini 요청·구조화 응답·오류 매핑
- 클라이언트 hook: 대화 전송·유지·오류
- UI unit: dialog isolation과 작성기 동작
- E2E: 닫기/열기 후 대화 유지, 콘텐츠 카드→기존 모달, 영어 요청, axe 접근성 검사

## 9. 다음 단계

1. Vercel에 Upstash 환경변수와 제공자 비용 알림 설정
2. `npm run test:chat-eval`로 mock 사실성·언어·카드 선택을 검사하고, `npm run test:chat-eval:live`로 실제 제공자의 TTFT·전체 지연을 확인
3. 운영 환경에서 provider별 데이터 처리·보관 정책을 개인정보 처리 안내에 반영
4. 실제 평가 결과를 바탕으로 문맥 검색과 요청 중단 UX를 추가 개선
5. 제공자 변경 시 `chat-provider` 경계 안에서 어댑터만 교체

## 10. 완료 기준

- API 키가 클라이언트 번들·응답·로그에 노출되지 않는다.
- 공개 포트폴리오 데이터만 모델 문맥과 카드에 사용한다.
- 모르는 내용과 개인정보를 추측하지 않는다.
- 한국어·영어, 모바일·데스크톱, 키보드에서 사용할 수 있다.
- 오류·timeout·429가 일반화된 현지화 메시지로 표시된다.
- 관련 unit, E2E, typecheck, lint, production build가 통과한다.
- 공개 운영 전 Upstash 환경변수와 제공자 비용 한도를 설정한다.
