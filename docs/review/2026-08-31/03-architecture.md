# 구조

적용 기준: `improve-codebase-architecture`.
용어는 그 스킬의 어휘를 쓴다. 모듈은 인터페이스와 구현을 가진 것,
seam 은 인터페이스가 사는 자리, 깊이는 작은 인터페이스 뒤에 놓인 동작의 양이다.

읽고 시작한 것: [CONTEXT.md](../../../CONTEXT.md),
[ADR-0006](../../adr/0006-ai-error-triage-alerts.md).

## 한 줄 요약

`sentry-triage` 를 두 번 복사해 파이프라인을 늘렸고, 규약만으로 세 사본이 함께 자랄 것이라
가정했다. 자라지 않았다. 그 대가가 [02](02-correctness.md) 의 C1(높음)과 [01](01-security-and-boundaries.md) 의 S4 다.
기준은 정확성 라운드가 끝난 `2f7044b` 다
(신규 모듈 `metric-descriptor`·`metric-severity`·`select-triage-targets` 는 `3658a56`~`2f7044b` 로 들어갔다).
C1 은 `1a67ec4`, S4 는 `0baf016` 에서 닫혔고 C12 는 `3658a56` 의 `metric-descriptor` 분리가 닫았다.
결함은 닫혔지만 **세 사본은 그대로다.** 아래 후보 넷의 구조는 하나도 바뀌지 않았고
비테스트 9개 파일 630줄이라는 수치도 같다.

## 후보 1. 트리아지 전송 계층이 세 번 복제돼 있다

**파일**: `src/lib/{sentry-triage,dependency-security,performance-alerts}/` 아래
`triage-provider.ts`, `openai-triage-provider.ts`, `gemini-triage-provider.ts`.
비테스트 9개 파일 630줄.

| 계열                | provider | openai | gemini |
| ------------------- | -------- | ------ | ------ |
| sentry-triage       | 141      | 67     | 67     |
| dependency-security | 58       | 45     | 39     |
| performance-alerts  | 97       | 61     | 55     |

### 문제

세 계열이 같은 3단 구조를 각자 구현한다. env 이름 세 개를 읽어 provider 를 고르는
`configured`, `AbortSignal.any` 로 상위 신호와 자체 타임아웃을 합치는 `withFallback`,
OpenAI Responses 의 `output_text` 추출, Gemini `candidates[0].content.parts` 추출.

계열마다 실제로 다른 것은 지시문, 입력 직렬화, JSON 스키마, 파서, 토큰 예산, env 접두사뿐이다.
**전송은 같다.** 인터페이스가 구현만큼 복잡한 상태, 즉 shallow module 이다.

### 삭제 테스트

가설이 아니라 이미 치른 비용이다. 한 사본이 배운 것을 나머지가 못 배운 사례를 센다.

| 학습한 것                       | sentry | dependency | performance | 상태             |
| ------------------------------- | ------ | ---------- | ----------- | ---------------- |
| Gemini `blockReason` / `SAFETY` | 있음   | **없음**   | 있음        | 열림             |
| OpenAI 응답의 `error` 필드 타입 | 있음   | 없음       | 없음        | 열림             |
| `truncate` 의 음수 상한 방어    | 없음   | 없음       | 있음        | 열림             |
| 설정 누락 경고와 폴백 승격      | 있음   | 없음       | 없음        | 열림             |
| 테스트용 `fetch` 주입           | 없음   | 없음       | 있음        | 열림             |
| 배열 원소 타입 검증             | 있음   | 있음       | 있음        | 닫힘 (`0baf016`) |
| 빈 목록에서 embed field 방어    | 있음   | 해당 없음  | 있음        | 닫힘 (`1a67ec4`) |

첫 행: `dependency-security` 에서 Gemini 가 안전 차단을 하면 빈 텍스트가 돌아와
"unusable dependency triage result" 라는 엉뚱한 사유로 실패한다.
나머지 둘은 차단됐다고 말한다.

셋째 행: `performance-alerts/discord-report.ts:41` 의 `Math.max(0, limit - 1)` 이
상한 0 에서 `slice(0, -1)` 이 되는 경로를 막는다. 나머지 둘은 `max - 1` 을 그대로 넘긴다.

넷째 행: `sentry-triage/triage-provider.ts:117-134` 만 폴백 이름이 설정됐는데 키나 모델이
없는 상태를 경고하고, primary 가 없을 때 폴백을 승격한 사실도 남긴다. 나머지 둘은 조용히
provider 없이 진행한다.

다섯째 행: `performance-alerts` 의 두 provider 는 `request: typeof fetch = fetch` 를 받아
테스트가 전역을 바꾸지 않는다. 나머지 둘의 테스트는 `vi.stubGlobal("fetch", …)` 를 쓴다.

마지막 두 행은 닫혔다. 다만 두 건 모두 다른 사본에 이미 있던 방어를 뒤늦게 같은 자리에
다시 쓴 것이고, 그 자리를 찾은 것은 코드가 아니라 검토였다.
[01](01-security-and-boundaries.md#s4-배열-원소-타입을-보지-않는다-닫힘-0baf016) 의 처리
기록은 두 파서의 짝 맞추기 모델이 달라 같은 수정이 반대 방향이었다는 점도 적는다.
사본이 셋인 한 위와 같은 항목이 계속 생긴다. 앞의 다섯 행이 지금 열려 있는 목록이다.

### 해법

`src/lib/discord/` 가 그랬듯 `src/lib/triage/` 에 전송을 한 벌 두고,
각 계열은 계약만 넘긴다.

```
TriageContract<In, Out> = {
  envPrefix, instructions, schemaName,
  buildInput(request: In): string,
  schema(strict: boolean): Record<string, unknown>,
  parse(text: string, request: In): Out | null,
  outputTokens(request: In): number,
  timeoutMs(request: In, base: number): number,
  mockResult?(request: In): Out,
}
getTriageProvider(contract) -> (request: In, signal) => { result: Out, provider, model }
```

`outputTokens`·`timeoutMs`·`parse` 는 상수가 아니라 요청의 함수여야 한다.
`performance-alerts` 만 셋 다 대상 수에 따라 달라지고,
`parsePerformanceTriageResult` 는 기대 대상 수를 두 번째 인자로 받는다
(`triage-schema.ts` 가 `targetIndex` 순서쌍을 검증하기 때문이다).
상수로 두면 이 계열이 계약에 들어오지 못한다.

호출부 세 곳의 차이도 함께 없앤다.

- `dependency-security` 만 반환 키가 `results` 이고 `getDependencyTriageProvider()` 가
  `null` 을 돌려준다. 나머지 둘은 `result` 이고 호출 시 던지는 provider 를 돌려준다.
  `scripts/dependency-security-report.ts:23-24` 의 `NonNullable<typeof provider>` 와
  `provider &&` 분기가 그 차이 때문에 있다.
- mock provider 는 `sentry-triage`(`TRIAGE_PROVIDER=mock` 을 먼저 본다)와
  `performance-alerts`(`configured` 안에서 본다)에 있고 `dependency-security` 에는 없다.
  판정하는 자리도 둘이 다르다.

### 얻는 것

leverage 로는, 호출자가 두 제공자의 응답 형태 차이와 신호 합성, env 해석을 몰라도 된다.
locality 로는, 안전 차단이나 에러 필드 같은 학습이 한 곳에 쌓이고 세 계열이 동시에 받는다.
테스트로는, 지금 `sentry-triage` 에만 있는 `triage-provider-symmetry.test.ts` 가
세 계약을 같은 표에 넣는 형태로 확장된다.

### ADR 충돌

[ADR-0006](../../adr/0006-ai-error-triage-alerts.md) 은 챗봇 provider 와의 코드 공유를
명시적으로 거부하며 이렇게 적었다.

> 챗봇 provider 를 일반화해서 공유하지 않는다. 채팅은 스트리밍과 `links`/`references`/
> `contactDraft` 계약에 묶여 있고 트리아지는 단발 JSON 이다. 합치면 양쪽 다 복잡해진다.
> 공유하는 것은 코드가 아니라 규약(env 이름, `withFallback` 형태, mock provider, symmetry 테스트)이다.

그때는 사본이 둘이었고 채팅은 실제로 달랐다. 이 판단은 지금도 유효하다.
바뀐 것은 **단발 JSON 트리아지가 셋이 됐고, 셋의 차이가 전부 위 계약 필드 안에 들어간다**는 점이다.

챗봇을 끌어들이자는 제안이 아니다. ADR 이 선택한 "규약 공유"가 규약만으로는 유지되지
않았다는 증거가 위 표이고, 트리아지 세 계열에 한해 코드 공유를 다시 보자는 것이다.

## 후보 2. embed 예산 계산이 세 번 복제됐고, 저장소가 이미 만든 안전한 truncate 를 아무도 안 쓴다

**파일**: `sentry-triage/discord-card.ts:41,44`,
`dependency-security/discord-report.ts:20,22`,
`performance-alerts/discord-report.ts:40,43`.

`truncate` 와 `embedLength` 가 세 번 정의된다. `embedLength` 는 앞 둘이 글자까지 같고
셋째는 누적 변수 이름만 다르다. `truncate` 는 `performance-alerts` 만 음수 상한을 막는다.
6,000자를 넘을 때 뒤에서 pop 하는 루프도 셋 다 있는데 **동작이 갈린다**.
`sentry-triage` 는 field 를 다 버린 뒤 description 까지 줄이고, 나머지 둘은 field 만 버린다.
첫 검토의 C7(통합 카드 상한 초과)이 이 갈림에서 나왔고, `84509d7` 의 카드 재설계로 닫혔다.

field 별 상한도 셋이 다르다. 같은 Discord 를 상대로 세 벌의 정책이 있다.

| 계열                | title | description | footer | field 수 | field value |
| ------------------- | ----- | ----------- | ------ | -------- | ----------- |
| sentry-triage       | 256   | 4,096       | 2,048  | 없음     | 1,024       |
| dependency-security | 없음  | 없음        | 없음   | 25       | 1,024       |
| performance-alerts  | 256   | 1,000       | 500    | 10       | 1,024       |

`dependency-security` 는 title·description·footer 를 자르지 않는다. 지금 그 셋이 상수와
짧은 집계뿐이라 넘지 않을 뿐이고, 상한을 확인하는 코드는 없다.

더 눈에 띄는 것은 따로 있다. `src/lib/text/truncate-utf16-safely.ts` 가 이미 있고
JSDoc 에 이렇게 적혀 있다.

> `slice` 는 이모지처럼 두 code unit 을 쓰는 문자의 한가운데를 자를 수 있고,
> 남은 반쪽은 화면에 대체 문자로 보인다.

`chat-response-contract.ts` 와 `article-plain-text.ts` 가 이미 쓴다.
**신규 카드 빌더 셋은 전부 raw `slice` 로 돌아갔다.**
저장소가 두 번 배운 것을 세 번 잃었다.

`84509d7` 은 이 사본 위에 `mergedStatus` 와 `worstTargets` 집계를 얹었고, 정확성 라운드가
`discord-report.ts` 를 298줄까지 늘렸다. truncate 는 여전히 raw `slice` 다.
새 집계의 방향·단위 문제([02](02-correctness.md) C12)는 `metric-descriptor.ts` 를 새로
분리해 닫았다. 방향·단위·표시 자릿수를 한곳에 모은 것은 맞지만 그 모듈은
`performance-alerts` 안에만 있고, 예산 계층은 여전히 세 벌이다.

### 해법

`src/lib/discord/embed-budget.ts` 에 `truncate`(내부에서 `truncateUtf16Safely` 사용),
`embedLength`, `fitEmbed(embed, policy)` 를 둔다. 어느 field 를 먼저 버릴지는 정책 인자로 받는다.

`lib/discord/` 에 이미 `types.ts` 와 `send-webhook.ts` 가 있으므로 자연스러운 자리다.
Discord 의 6,000 / 1,024 / 256 제약과 서로게이트 처리가 한곳에 모인다.

## 후보 3. `lib/discord` 가 절반만 만들어진 seam 이다

**파일**: `src/lib/discord/send-webhook.test.ts:5`,
`src/lib/sentry-triage/discord-card.ts:136`, `handle-sentry-alert.ts:8`.

이번 변경이 `send-discord-card.ts` 를 `sentry-triage` 에서 `lib/discord/send-webhook.ts` 로
끌어올려 seam 을 만들었다. 좋은 방향인데 타입 재수출이 남았다.

`send-webhook.test.ts:5` 가 `@/lib/sentry-triage/discord-card` 에서 `DiscordEmbed` 를 가져온다.
**공용 계층의 테스트가 도메인 모듈에 의존한다.** 의존 방향이 역행한다.
`discord-card.ts:136` 의 `export type { DiscordEmbed }` 는 이 참조 둘만을 위해 남아 있다.

두 import 를 `@/lib/discord/types` 로 옮기고 재수출을 지우면 끝난다.
후보 2 와 함께 하면 `lib/discord` 가 "카드를 만들고 예산을 맞춰 보낸다"는 완결된 모듈이 된다.

어댑터가 셋이면 실재하는 seam 이다. 지금 Discord 소비자가 셋이므로 가설이 아니다.

같은 자리에 두 번째 구멍이 있다. `scripts/core-web-vitals-report.ts:57-72` 의
`ReportDependencies` 는 카드·입력·분석을 전부 `unknown` 으로 선언하고, 배선하는 `main()` 이
`as DiscordEmbed`·`as PerformanceTriageInput` 로 12번 되돌린다
(`:145,151,314-316,322,327,334-336,342,348-349`).
seam 이 타입을 갖지 않으니 규율이 캐스트로 내려갔다. 후보 2 가 `lib/discord` 에 카드 타입과
예산을 함께 두면 이 선언들이 실제 타입을 가질 수 있다.

## 후보 4. CONTEXT.md 에 이 계열의 어휘가 없다

`CONTEXT.md` 의 Architecture boundaries 절은 `lib/content`, `lib/monitoring`, `platform`,
`admin token gate` 를 정의한다. Discord 로 카드를 보내는 파이프라인 셋은 등재되지 않았다.

후보 1~3 이 정리되면 두 용어를 추가해야 한다.

- `triage transport`: 제공자 교체와 폴백을 갖는 단발 JSON 판정 전송
- `alert card`: Discord embed 예산 계층

이름이 정해지는 시점에 반영한다.

## 후보들의 관계

후보 1 과 2 는 같은 원인의 두 증상이다. 후보 3 은 이번 변경이 이미 옳은 방향으로
한 걸음 뗀 것이고 마무리만 남았다. 후보 4 는 앞의 셋이 끝난 뒤에 한다.

착수한다면 3 → 2 → 1 순서가 맞다. 3 은 import 두 줄이고, 2 는 그 자리에 예산 계층을 세우며,
1 은 그 위에서 전송을 합친다.
