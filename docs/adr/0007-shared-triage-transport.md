# ADR-0007: 단발 JSON 트리아지의 전송 계층을 세 계열이 공유한다

## Status

Accepted — 2026-08-31 (ADR-0006 의 "코드가 아니라 규약을 공유한다" 판단 중
트리아지 전송에 관한 부분을 대체한다. 챗봇을 이 seam 에서 제외하는 판단은 유지한다.)

## Context

Discord 로 카드를 보내는 단발 JSON 판정 파이프라인이 셋이 됐다. Sentry 오류 트리아지
(`lib/sentry-triage`), 주간 의존성 보안 리포트(`lib/dependency-security`), Core Web Vitals
알림(`lib/performance-alerts`). 셋 다 env 로 제공자를 고르고, OpenAI Responses 와 Gemini
generateContent 를 부르고, primary 실패 시 폴백을 한 번 시도한다.

ADR-0006 은 이 구조를 계열마다 복사하면서 "공유하는 것은 코드가 아니라 규약(env 이름,
`withFallback` 형태, mock provider, symmetry 테스트)" 이라고 적었다. 그때는 사본이 둘이었고
비교 대상이 챗봇이었다. 챗봇은 스트리밍과 `links`/`references`/`contactDraft` 계약에 묶여
실제로 달랐다.

사본이 셋이 된 뒤 규약은 유지되지 않았다. 2026-08-31 검토
([docs/review/2026-08-31/03-architecture.md](../review/2026-08-31/03-architecture.md))가 센
비대칭이 다섯이다.

- Gemini `blockReason`/`SAFETY` 차단 구분이 `dependency-security` 에만 없었다
- OpenAI 응답의 `error` 필드 메시지를 `sentry-triage` 만 읽었다
- `truncate` 의 음수 상한 방어를 `performance-alerts` 만 가졌다
- 설정 누락 경고와 폴백 승격을 `sentry-triage` 만 가졌다
- 테스트용 `fetch` 주입을 `performance-alerts` 만 가졌다

닫힌 결함 두 건(C1·S4)도 다른 사본에 이미 있던 방어를 검토가 자리를 찾아 준 뒤에야
같은 자리에 다시 쓴 것이다. 전송 계층 비테스트 9개 파일 630줄이 세 벌이었다.

## Decision

1. `src/lib/triage/` 가 전송을 소유한다. 제공자 선택(env 해석·정규화), mock, 폴백과
   구간 타임아웃, 취소 전파, OpenAI/Gemini HTTP 어댑터, 설정 누락 경고가 여기 있다.
2. 계열은 `TriageContract<In, Out>` 만 소유한다. env 접두사, 스키마 이름, 지시문,
   입력 직렬화, provider 별 스키마, 파서, 출력 예산, 구간 상한, mock 결과.
   `outputTokens`·`timeoutMs`·`parse` 는 상수가 아니라 요청의 함수다.
   `performance-alerts` 는 셋 다 대상 수에 따라 달라진다.
3. 호출 규약은 `(request, signal)` 하나다. 반환은
   `{ result, provider: "openai" | "gemini" | "mock", model }`.
4. 외부 signal 이 abort 되면 어댑터가 무엇을 던졌든 `signal.reason` 을 올리고 폴백하지
   않는다. 취소는 실패가 아니고, 폴백 호출은 유료 요청 하나를 더 만든다.
5. 환경변수 이름은 바꾸지 않는다. `${envPrefix}_PROVIDER` 계열 6종
   (`TRIAGE`·`DEPENDENCY_TRIAGE`·`PERFORMANCE_TRIAGE`)이 그대로다.
6. 경고와 오류 메시지에 계열 라벨(`[triage]`·`[dependency-triage]`·`[performance-triage]`)과
   `schemaName` 을 넣는다. 세 계열이 같은 실행 로그에 찍힐 수 있다.

## 범위 밖

- **챗봇 provider** (`features/chat/_lib/chat-provider.ts`). 스트리밍과 응답 계약이 단발
  JSON 과 달라 ADR-0006 의 분리 판단이 그대로 유효하다.
- **`triage-rate-limit`**. 신규 두 파이프라인의 호출 상한(S2)은 워크플로에 Upstash 시크릿
  등록이 선행 조건이라 별도 결정으로 남는다.
- **Discord embed 예산** 은 `lib/discord/embed-budget.ts` 가 소유한다. 이 ADR 의 대상이
  아니라 같은 검토의 후보 2 로 함께 정리됐다.

## Consequences

- 계열별 `{openai,gemini}-triage-provider.ts` 6개 파일이 사라지고, 각 계열의
  `triage-provider.ts` 는 계약 리터럴과 `getXTriageProvider()` 약 40줄만 남는다.
- `dependency-security` 가 mock provider, Gemini 차단 구분, OpenAI `error` 메시지,
  설정 누락 경고를 새로 얻는다. `getDependencyTriageProvider()` 는 `null` 대신 호출 시
  던지는 provider 를 돌려주고, 미설정 주차 실행 로그가 0줄에서 2줄이 된다.
- 전송 테스트는 `lib/triage/` 에 한 벌만 있다. 계열에는 계약 필드 검증이 남고,
  `contract-wiring.test.ts` 가 세 실제 계약 × 두 실제 어댑터의 접합부를 고정한다.
- 단발 JSON 판정 파이프라인을 새로 만들 때는 계약 하나를 쓰는 것으로 끝난다. 전송을
  다시 복사하면 이 ADR 위반이다.

## 재검토 조건

- 스트리밍이 필요한 트리아지가 생기면 계약에 스트리밍 필드를 늘리지 말고 이 결정을
  다시 본다. 챗봇을 분리한 이유가 그대로 적용된다.
- OpenAI/Gemini 외 제공자가 필요해지면 어댑터를 `lib/triage` 에 더한다. 계열 폴더에
  어댑터를 만드는 순간 같은 비대칭이 다시 시작된다.
