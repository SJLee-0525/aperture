# 03-architecture 후보 4건 처리 결과 (2026-08-31)

브랜치 `feature/core-web-vital` · 기준 `2f7044b` 위에서 진행.
계획은 후보 3 → 2 → 1 → 4 순서로 넷을 모두 구현하는 것이었다.
원본 보고서는 [03-architecture.md](03-architecture.md).

## 처리 현황

| 후보 | 내용                               | 처리                                                   |
| ---- | ---------------------------------- | ------------------------------------------------------ |
| 3    | `lib/discord` 의 역방향 타입 의존  | 완료. import 2곳 이동, 재수출 삭제                     |
| 2    | embed 예산 3벌 복제, raw `slice`   | 완료. `lib/discord/embed-budget.ts` 한 벌로            |
| 2b   | (계획서 추가) 전송기 예산 강제     | 완료. `sendDiscordCard` 가 전송 직전 Discord 상한 적용 |
| 1    | 트리아지 전송 630줄 3벌 복제       | 완료. `lib/triage` 신설, 계열은 계약 약 40줄만         |
| 5    | (계획서 추가) 스크립트 seam 캐스트 | 완료. 검증 이후 값의 `unknown` 캐스트 12개 제거        |
| 4    | CONTEXT.md 에 어휘 없음            | 완료. `lib/triage`·`lib/discord` 등재 + ADR-0007       |

수치로는, 전송 계층 비테스트 9파일 630줄이 공용 4파일 321줄 + 계열 계약 3파일 133줄이
됐다. 계열 하나의 몫이 평균 210줄에서 44줄로 줄었고, 어댑터 6파일이 사라졌다.
`truncate`·`embedLength`·fit 루프 3벌은 `embed-budget.ts` 123줄 한 벌이 됐고 셋 다
`truncateUtf16Safely` 를 쓴다.

검토가 센 비대칭 다섯은 전부 공용 계층의 테스트가 됐다.

| 기존 비대칭                   | 지금 위치                                      |
| ----------------------------- | ---------------------------------------------- |
| Gemini `blockReason`/`SAFETY` | `lib/triage/gemini.test.ts` — 세 계열 공통     |
| OpenAI `error` 필드           | `lib/triage/openai.test.ts` — 세 계열 공통     |
| `truncate` 음수 상한·UTF-16   | `lib/discord/embed-budget.test.ts`             |
| 설정 누락 경고·폴백 승격      | `lib/triage/provider.test.ts` — 세 계열 공통   |
| 테스트용 `fetch` 주입         | `provider.test.ts` + `contract-wiring.test.ts` |

## 계획 검수가 잡은 것

착수 전 두 차례 검수가 계획의 결함 넷을 잡았고, 넷 다 구현에 반영됐다.

**`Partial<typeof DISCORD_LIMIT>` 는 컴파일되지 않는 계획이었다.** `as const` 객체에서
뽑으면 `description` 이 `4096` 리터럴 타입이 되어 performance 의 `{ description: 1000 }`
정책을 받을 수 없다. `EmbedBudget` 을 `number` 인터페이스로 명시했다.

**개별 상한만으로는 6,000자가 보장되지 않는다.** title 256 + description 4,096 +
footer 2,048 = 6,400 이라 field 를 다 버려도 합계를 넘는다. 처음 계획의
`shrinkDescription` 선택 플래그는 기본값에서 이 구멍을 남기므로 제거했고, `fitEmbed` 은
정책과 무관하게 field → description → footer → title 순으로 항상 합계를 맞춘다.
각 단계마다 `embedLength` 를 다시 잰다. `truncate` 가 말줄임표를 더해 한 번의 뺄셈으로는
감소량이 보장되지 않기 때문이다.

**정책 값은 clamp 만으로 부족했다.** `Math.max(0, NaN)` 은 NaN 이라 `total: NaN` 정책이
합계 비교를 항상 거짓으로 만들어 초과 카드가 통과한다. 숫자가 아니거나 유한하지 않은
값은 기본값으로 보고, 소수는 내림, `total` 은 하한 1 로 정규화했다.

**"래퍼 0개" 와 `analyzeTargets` 1인자 seam 은 동시에 성립하지 않았다.**
`runCoreWebVitalsReport(dependencies, signal)` 로 호출자가 취소 seam 을 소유하게 바꾸고
`analyzeTargets: triageProvider` 를 그대로 배선했다. 이미 abort 된 signal 은 AI 만
생략하고 측정 카드는 나간다.

## 리뷰와 달랐던 것

**"400 이 나지 않는다" 는 과한 주장이었다.** 전송기 하드닝이 막는 것은 문자열 길이·
field 개수·합계 초과·빈 field 뿐이다. 빈 title 이나 URL 형식 같은 나머지 embed 유효성은
빌더의 몫으로 남고, 문서와 JSDoc 은 "예산 초과로 인한 400" 으로 좁혀 적었다.

**mock 종단 실행 계획은 실행 불가능했다.** 처음 계획의 CLI 명령은 PowerShell 에서
동작하지 않는 bash 문법이었고, 실제 GitHub API 와 토큰에 의존했으며, 웹훅을 비우면
의도적으로 exit 1 이라 성공 기준이 없었다. script-level 통합 테스트(외부 seam 전부
주입)로 바꿨다. 세 계열 모두 공용 mock provider 를 지나는 경로가 단위 테스트로 고정된다.

**ADR-0006 의 해당 문장은 Decision 5 가 아니었다.** "코드가 아니라 규약" 은
`추론 과정 → 모델을 env로 두는 이유와 기본값 선택` 절(`:119`)에 있다. 본문은 보존하고
Status 절의 포인터가 그 위치를 가리킨다.

**단위 없는 `AbortSignal.timeout(1초)` 가 테스트를 흔들었다.** 커버리지 실행의 부하에서
외부 signal 로 쓴 1초 타임아웃이 간헐적으로 먼저 끊겨 2건이 한 번 실패했다. 취소가
필요 없는 자리는 전부 무취소 `new AbortController().signal` 로 바꿨다.

## 관측 가능한 동작 변경

- `dependency-security` 카드의 title·description·footer 가 Discord 상한으로 잘린다.
  지금 그 셋은 상수와 짧은 집계뿐이라 관측되지 않는다.
- `dependency-security`·`performance-alerts` 도 field 를 다 버린 뒤 description 을
  줄인다. 지금까지는 그 상태에서 상한 초과 카드를 그대로 보냈다.
- `getDependencyTriageProvider()` 가 `null` 대신 던지는 provider 를 돌려준다. 미설정
  주차 실행 로그가 0줄에서 2줄이 되고, 전송되는 카드는 같다.
- `DEPENDENCY_TRIAGE_PROVIDER=mock` 이 동작한다. 판정 결과는 요청의 alertNumber 마다
  확신도 low 안내 하나로 고정이다.
- 단일 제공자 설정(sentry·dependency)도 이제 구간 상한(base 20초)을 받는다. 이전에는
  폴백이 있을 때만 구간 상한이 걸리고 없으면 호출자의 외부 signal 만 있었다.
- 경고 라벨이 `[triage-provider]` 하나에서 `[triage]`·`[dependency-triage]`·
  `[performance-triage]` 로 나뉜다.

## 검증

- 범위 내 단위 45파일 531 passed / 0 failed. 기준선은 `2f7044b` 의 41파일 475다.
  파일은 어댑터 테스트 3개가 지워지고 공용 4개 + 계열 계약 2개 + embed-budget 1개가
  늘었다.
- 전체 `npx vitest run` 356파일 2,948 passed. `npm run test:coverage` exit 0,
  `src/lib/triage` statements 96.8% · branches 86.44%, `src/lib/**` 임계값(85/80/78/85) 위.
- `npm run check` 0 error · `npm run lint` 0 problem · `npm run deps:check`
  0 violation (1,309 modules) · `prettier --write` 적용 후 `--check` 통과.

측정하지 않은 것: 실제 LLM 응답 분포, 실제 Discord 도착, 워크플로 실행. push 이후
`gh workflow run core-web-vitals-report.yml -f force_ai_analysis=true` 와
`gh workflow run dependency-security-report.yml` 수동 dispatch 가 이 셋과
`01-resolution.md` 가 남긴 미확인 3건(액션 버전 상향 통과, 카드 도착, artifact 분석)을
함께 덮는다. 실제 provider 호출 비용과 실제 알림이 발생한다.
