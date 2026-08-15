# ADR-0005: Firebase에서 Supabase로 데이터 계층 이전

## Status

Accepted — 2026-08-15 (조사: [`docs/research/firebase-to-supabase.md`](../research/firebase-to-supabase.md), 구현: [`docs/plan/08-supabase-migration.md`](../plan/08-supabase-migration.md))

수용 근거 측정치(2026-08, 15일 사용): Storage 68.42MB · 객체 735개 · 전송 1.56GB(월 환산 약 3GB) · 요청 2.6만.
무료 한도(Storage 1GB, egress 월 10GB) 안에 여유가 있어 일시정지 트레이드오프를 keep-alive 전제로 수용한다.

## Context

Firestore Spark의 읽기 한도(5만/일)가 실사용에서 소진된다. 주범은 방문자 트래픽이 아니라
관리자 편집과 챗봇이다. 관리자 저장마다 `revalidateTag(CHAT_PROFILE_CACHE_TAG)`가 실행되어
RAG 스냅샷 캐시가 비워지고, 다음 챗 질문이 `ragDocuments` 전 청크(현재 285문서)를 다시
읽는다. 관리자 목록 화면은 캐시 없이 매 방문 컬렉션 전체를 projection 조회한다.
`retry-fetch.ts`는 429를 무료 한도 소진으로 간주해 재시도하지 않는 방어까지 이미 갖고 있다.

읽기 절약을 위해 쌓은 우회 구조가 자체 한계에 다가서고 있다. RAG 벡터를 int8 양자화 +
base64로 압축해 Vercel Data Cache에 담는 스냅샷(`src/lib/ai/rag-index.ts`)은 항목당 2MB
한도를 가지며, 현재 457KB로 23%를 쓰고 있다. 블로그 1편이 15청크 안팎이라 40편 수준에서
경고선(1.5MB)에 닿고, 한도를 넘으면 Next가 캐시를 건너뛰어 매 요청 전체 재조회로 조용히
강등된다. 쓰기 쪽도 드래그 정렬이 목록 크기만큼 개별 `updateDoc`을 만들고
(`src/hooks/use-ordered-admin.ts`), 모든 관리자 저장에 RAG 청크 삭제 후 재삽입이 딸려온다.

Supabase는 v1 스택 결정 당시 "무료 DB의 7일 무활동 일시정지" 때문에 기각했다
(`.claude/memory/decision_stack_firebase.md`). 이번 결정은 그 트레이드오프를 재평가한
결과다. 당시에는 일시정지가 곧 사이트 다운이었지만, 현재 구조에서는 ISR이 재생성 실패 시
기존 캐시를 유지하므로 DB가 정지해도 공개 페이지는 stale로 계속 서빙되고, 공개 저장소의
GitHub Actions cron으로 무비용 keep-alive가 가능하다.

코드 조사 결과 이전 난이도는 낮다. `onSnapshot`, `runTransaction`, FieldValue 연산,
`firebase-admin` 전부 미사용이고 `writeBatch`는 1곳뿐이다. 공개 읽기는 이미 REST + `fetch`
경계(`src/lib/firebase/public/transport.ts`)로 분리돼 있으며, 관리자 화면은 mock/live
저장소 경계(`src/lib/admin/select-repository.ts`) 뒤에 있어 live 구현만 교체하면 된다.

## Decision

- 데이터 계층 전체를 Supabase로 이전한다: Firestore → Postgres, Firebase Auth →
  Supabase Auth, Firebase Storage → Supabase Storage, RAG 검색 → pgvector.
  Firebase 의존성과 Rules, `firebase.json`은 이전 완료 후 제거한다.
- 7일 무활동 일시정지는 keep-alive로 수용한다. 공개 저장소의 GitHub Actions cron이 주 2회
  Supabase REST API를 직접 호출한다. ISR이 방문자 트래픽을 DB에서 가리므로 사이트 URL
  핑은 무활동 판정을 막지 못한다. API 직접 호출이어야 한다.
- 아키텍처 원칙 1은 유지한다. 별도 백엔드 서버를 두지 않고 **RLS가 보안 경계의 전부**다.
  관리자 쓰기는 브라우저의 supabase-js가 사용자 JWT로 수행하고 RLS가 인가한다.
  서버 Route Handler(RAG 동기화)도 요청의 사용자 access token을 PostgREST에 그대로
  전달해 RLS 인가를 받는다. **런타임 코드에 service_role 키를 두지 않는다.**
  service_role은 저장소 밖 1회성 마이그레이션 스크립트에서만 쓰고 즉시 폐기한다.
- 관리자 판별은 UID 하드코딩 대신 **role 클레임 단일 출처**로 바꾼다. 관리자 계정의
  `app_metadata.role = "admin"`을 대시보드에서 1회 설정하고, RLS 정책·서버 검증(`getClaims`
  JWKS 로컬 검증)·클라이언트 가드가 모두 이 클레임을 읽는다. env와 Rules의 UID 수동 동기화
  문제(`firestore.rules` 상단 경고)와 `NEXT_PUBLIC_ADMIN_UID`가 함께 사라진다.
- 공개 읽기는 supabase-js가 아니라 **PostgREST 직접 `fetch`**로 한다. 현재 `transport.ts`가
  Firestore REST에 하는 것과 같은 형태다. `next: { revalidate, tags }` 옵션과 태그 기반
  무효화, 1시간 ISR 전략은 그대로 유지한다(근거는 research 문서 8절). supabase-js는
  브라우저(관리자 쓰기·Auth·Storage)에서만 쓴다.
- RAG는 pgvector 질문당 조회로 바꾼다. 발행 시 `rag_documents.embedding vector(512)`에
  upsert하고, 챗 요청마다 RPC로 코사인 상위 후보를 받아 기존 하이브리드 점수
  (키워드 0.35 가중, 점수 하한, 화면 문맥 우선 슬롯)는 후처리로 보존한다.
  스냅샷 계층(`rag-index.ts`)과 전 청크 fetch(`public/rag.ts`)는 삭제한다.
  현재 규모(수백 청크)에서는 벡터 인덱스를 만들지 않는다. 순차 스캔으로 충분하다.
- 기존 문서 ID는 text PK로 보존한다. `?photo=`/`?work=`/`?project=` 딥링크와 Storage 경로
  `photos/{id}`가 문서 ID에 걸려 있다. 신규 ID는 `crypto.randomUUID()`로 클라이언트
  선발급을 유지한다.
- 정렬 저장은 `updateOrder(id, order)` 단건 계약을 배열 일괄 계약으로 바꾸고, 저장은
  정렬 전용 RPC(jsonb 목록을 받아 UPDATE)로 구현해 드래그 1회 = 1왕복으로 만든다.
  부분 upsert는 쓰지 않는다. `on conflict do update`는 삽입 후보 행의 NOT NULL 검사를
  먼저 하므로 `data jsonb not null` 스키마에서 실패한다.
  `createdAt`/`updatedAt`은 컬럼 DEFAULT와 트리거로 옮긴다.

## Consequences

- 읽기·쓰기 횟수 한도가 청구 축에서 사라진다. 제약은 용량과 전송량으로 이동한다:
  DB 500MB(현 콘텐츠 규모로 도달 불가), Storage 1GB(측정 68.42MB, 객체 735개), egress 월
  10GB(캐시 5 + 비캐시 5, 측정 월 환산 약 3GB). 측정상 상한 안이지만 트래픽 급증 시나리오는
  배포 후 대시보드로 계속 관찰한다.
- RAG 코퍼스의 2MB 상한, 캐시 미스 시 285문서 읽기 스파이크, 갱신 1시간 지연,
  1,000문서 하드 가드가 사라진다. 반면 질문마다 DB 왕복 1회가 추가된다(리전을
  ap-northeast-2로 두면 지연은 작다).
- keep-alive가 새로운 운영 의존이 된다. GitHub Actions 스케줄은 지연·누락이 있을 수
  있으므로 주 2회로 마진을 두고, 실패가 이어지면 알림을 받도록 한다. 공식 문서는 유지
  판정 기준을 정확한 횟수로 보장하지 않으므로, 전환 후 관찰 기간에 대시보드에서 정지
  예고가 없는지 확인하고 빈도를 조정한다. 핑이 모두 실패해
  정지되더라도 공개 페이지는 ISR stale로 유지되고 챗봇·관리자만 죽는다.
- Rules 단위 테스트(`test:rules`, `@firebase/rules-unit-testing`)는 이관할 수 없어
  로컬 Supabase(Docker) 기반 RLS 검증으로 다시 만든다. 이전 비용 중 가장 눈에 안 띄는
  항목이다.
- 기존 문서에 저장된 `firebasestorage.googleapis.com` URL은 파일 이전 후 전부 죽는다.
  `path` 기준 일괄 재작성이 마이그레이션의 필수 단계이며, 블로그 본문 Markdown 내부
  주소까지 포함한다.
- Firebase Storage(Blaze) 때문에 등록한 카드가 더 이상 필요 없어진다. 반대로 무료
  프로젝트 2개 제한 안에서 이 프로젝트가 슬롯 하나를 상시 점유한다.
- CLAUDE.md의 스택 표, 아키텍처 원칙 5~8, 데이터 모델, 환경변수, 무료 한도 가드 표와
  ADR-0001의 저장소 서술, `.claude/agents/firebase.md`가 전면 개정 대상이 된다.
- ADR-0001의 "벡터는 Firestore ragDocuments에 저장, int8 스냅샷 캐시" 결정은 본 ADR로
  대체된다. 임베딩 모델·차원 키(`모델명@차원`) 검증과 증분 동기화·fingerprint skip
  정책은 그대로 유효하다.
