# 정확성

실제로 잘못 동작하거나, 조건이 맞으면 잘못 동작할 코드만 적는다.
전부 `src/lib/performance-alerts/` 와 그 스크립트에서 나왔다.
`dependency-security` 와 `sentry-triage` 에서는 정확성 결함이 나오지 않았다.

첫 검토는 `89484c2` 기준이었다. 검토 중에 `84509d7` 이 C3·C4 를 겨냥해 들어와
전 항목을 그 커밋 기준으로 다시 대조했다. 세 건이 닫혔고(문서 하단), C5 는 범위가 넓어졌으며,
새 코드에서 두 건(C12·C13)이 나왔다.

이후 01 문서의 보안 항목을 처리하는 라운드에서 C1 이 함께 닫혔다. 허용 목록 필터링이
빈 배열을 만들 수 있어 C1 의 폴백과 한 커밋으로 묶어야 했기 때문이다.
줄번호는 `84509d7` 기준이며 C1 관련 줄번호만 `1a67ec4` 기준이다.

## 높음

### C2. 대상이 21개를 넘으면 AI 분석이 항상 버려진다

`src/lib/performance-alerts/triage-prompt.ts:67`, `openai-triage-provider.ts:53`,
`gemini-triage-provider.ts:50`

`buildPerformanceTriageInput` 은 입력을 `MAX_TARGETS`(20)로 자른다.
두 provider 는 그 뒤 `parsePerformanceTriageResult(text, inputs.length)` 를 호출하는데,
여기 들어가는 `inputs.length` 는 **자르기 전** 개수다.
`triage-schema.ts:137` 이 `expectedTargets > MAX_TARGETS` 면 즉시 `null` 을 돌려주므로
primary 도 fallback 도 "unusable result" 로 실패하고 AI 분석이 통째로 생략된다.

도달 조건은 드물지 않다. `report-decision.ts:134` 가 Lighthouse 의 `mobile` 을 `phone` 키로
합치므로 그룹 수는 origin 2개와 대상 12개 × phone/desktop 을 더해 최대 26개다.
`force_ai_analysis=true` 는 중복 억제를 건너뛰어 현재 경고 전부를 리포트로 만들고,
`84509d7` 이후로는 lab 경고까지 포함하므로 강제 실행의 그룹 수는 오히려 늘었다.
20 을 넘기는 것이 예외가 아니라 강제 실행의 정상 동작이다.

카드 자체는 나가므로 데이터가 깨지지는 않는다. 다만 분석이 가장 필요한 실행에서
분석만 조용히 사라진다.

자르는 지점이 셋이라는 것도 문제다. `buildPerformanceTriageInput` 이 자르고,
스키마가 상한을 검사하고, `core-web-vitals-report.ts:142` 의 `analyzable` 은 자르지 않는다.

## 중간

### C5. 강제 실행이 중복 억제 key 를 기록하지 않는다

`src/lib/performance-alerts/report-decision.ts:196, 231, 283`

```ts
if (judgement.alert && (input.forceAiAnalysis || registerAlert(key)))
  // 196
  if (input.forceAiAnalysis || registerAlert(key))
    // 231
    if (!input.forceAiAnalysis && !registerAlert(key)) continue; // 283
```

세 줄 모두 강제 플래그가 참이면 단락 평가로 `registerAlert` 가 호출되지 않아
key 가 `newAlerts` 에 들어가지 않는다. 그런데도 실행은
`core-web-vitals-report.ts:165` 까지 가서 새 snapshot 을 올린다.

강제 실행이 어떤 회귀를 처음 관측하면, 카드는 보내면서 `sentAlerts` 에는 그 key 를
남기지 않는다. 다음 정기 실행이 같은 회귀를 신규로 보고 카드를 한 번 더 보낸다.
troubleshooting 문서는 record 없음의 "대상별 연속 횟수와 중복 억제 key를 snapshot에 보존"한다고
적었는데, 강제 실행은 정확히 그 경로(196줄)에서 key 를 보존하지 않는다.

첫 검토 때는 두 경로(196, 231)였다. `84509d7` 이 C4 를 고치면서 283줄에 같은 단락 패턴을
썼고, 이전에는 key 를 기록하던 lab 경로까지 강제 실행에서 기록하지 않게 됐다.
범위가 세 경로로 늘었다.

`registerAlert(key)` 를 먼저 호출해 결과를 받고, 그 결과와 강제 플래그를 OR 하면
세 경로가 한 번에 닫힌다.

### C6. 2회 실행에서 performanceScore 를 낙관적으로 집계한다

`src/lib/performance-alerts/lighthouse-result.ts:84-94`

```ts
value: sorted.length === 3 ? (sorted[1] ?? 0) : (sorted[1] ?? 0),
```

주석은 "한 번 실패해 두 값만 남으면 회귀를 낙관하지 않도록 더 나쁜 값을 사용하고 partial로
표시한다"이고 테스트도 `aggregateValues([1, 3]) → 3` 으로 그 의도를 고정한다.
LCP, CLS, TBT 는 값이 클수록 나쁘므로 맞다.

`metricValues` 는 `performanceScore` 를 같은 레코드에 넣고 `summarizeLighthouseRuns:135` 가
모든 metric 에 같은 함수를 적용한다. **performanceScore 는 클수록 좋다.**
2회만 성공한 대상에서 `[0.75, 0.85]` 가 나오면 `0.85` 가 채택되고,
`judgeLab` 의 `performanceScore < 0.8` 임계값을 통과해 회귀가 묻힌다.

2회 성공은 `collectProductionLighthouse:151` 의 `>= 2` 조건으로 정상 도달한다.

같은 줄의 삼항은 두 분기가 글자까지 같아서 아무 일도 하지 않는다.

### C12. "가장 크게 악화"가 performanceScore 개선을 악화로 세고, CLS 변화를 +0 으로 보여준다

`src/lib/performance-alerts/discord-report.ts:121-143` (`84509d7` 신규)

통합 카드의 `worstTargets` 는 `current > previous` 인 metric 을 악화로 분류한다(126줄).
triage 입력의 lab metric 에는 `performanceScore` 가 포함되는데, 이 값은 **오를수록 좋다.**
점수가 오른 대상이 "가장 크게 악화" 에 실리고, 점수가 떨어진 진짜 악화는
`current <= previous` 로 걸러진다. C6 과 같은 부류의 방향 오류가 표시 계층에서 반복됐다.

표시도 어긋난다(139줄). `+${Math.round(item.delta)}` 는 CLS 변화 0.15 를 `+0` 으로
만들고, performanceScore 에는 `ms` 단위가 붙는다. 정렬도 원시 delta 비교라
ms 단위 metric 이 항상 CLS 를 이긴다. CLS 0.2 악화(심각)가 LCP +30ms(사소)에 밀린다.

`discord-report.test.ts` 의 새 케이스는 LCP 만 검증하고 CLS 는 delta 0 으로 두어
이 경로가 드러나지 않는다.

## 낮음

### C8. 데이터 부족 요약이 1,024자에서 잘린다

`report-decision.ts:338`

`insufficientReports.join("\n")` 이 대상과 form factor 마다 한 줄씩 만든다.
`https://sungjoon.works/ko/photo/albums (phone): CrUX record 없음, 3회 연속` 이 약 70자이고,
대상 12개 × phone/desktop 이면 24줄이다. `fitEmbed` 가 field 값을 1,024자로 자르므로
14줄쯤부터 나머지가 `…` 로 바뀐다.

이 집계 자체가 여러 대상이 동시에 CrUX 표본을 잃는 상황을 위해 만들어졌다.
가장 흔한 경우에 목록의 절반을 잃는다. 게다가 잘린 결과가 "영향받는 대상은 이게 전부"처럼 읽힌다.

### C9. 아무 일도 하지 않는 삼항

`lighthouse-result.ts:90`. C6 과 같은 줄이다. 두 분기가 동일하다.

### C10. shard 개수가 세 곳에 따로 적혀 있다

`scripts/merge-production-lighthouse.ts:31` 의 기본값 `3`,
`.github/workflows/core-web-vitals-report.yml` 의 `matrix.shard: [0, 1, 2]` 와
`LIGHTHOUSE_SHARD_COUNT: 3` 이 서로를 모른다.

matrix 를 4로 늘리고 스크립트를 안 고치면 merge 가
`Expected 3 Lighthouse shards, found 4` 로 실패한다. 그 단계는 `continue-on-error: true` 라서
실제 오류는 다음 단계의 `manifest.json` ENOENT 로 나타난다. 원인과 증상이 멀다.

### C11. 대상 id 와 path 의 짝을 검증하지 않는다

`scripts/performance-targets.ts:33-61`

`isPerformanceTarget` 은 id 가 허용 목록에 있는지, path 가 허용 목록에 있는지를
각각 본다. 짝은 보지 않으므로 `{ id: "home", path: "/ko/contact" }` 가 통과한다.
커밋된 설정 파일이라 실수 여지는 작지만, 이 함수의 목적이 그 실수를 잡는 것이다.

### C13. 상세 링크가 url 없는 카드에서 `undefined` 를 만든다

`src/lib/performance-alerts/discord-report.ts:193-195, 216-219` (`84509d7` 신규)

`actionsRun` 은 `entries[0].card.url` 이 없을 때를 폴백으로 막아 두고(193-195줄),
세 줄 아래 `상세` field 의 Lighthouse 링크는 같은 값을 가드 없이 보간한다(218줄).
url 이 비면 `[Lighthouse 결과](undefined#artifacts)` 가 카드에 실린다.
실제 배선에서는 `createPerformanceDiscordCard` 가 항상 url 을 넣어 도달하지 않지만,
한 함수 안에서 같은 값을 한 번은 가드하고 한 번은 안 하는 상태다.

## 닫힌 항목

### C1. 빈 목록이 Discord 400 을 만들고 알림이 사라진다 (닫힘, `1a67ec4`)

모델이 `inspectFirst` 와 `recommendedChecks` 를 모두 빈 배열로 돌려주면
`확인 순서` field 의 값이 빈 문자열이 되고, Discord 는 값이 빈 embed field 를 400 으로
거부한다. 그 응답은 재시도 대상이 아니라 경고가 전달되지 않은 채 실행이 실패했다.

목록이 비면 `"제안 없음"` 으로 채운다. 같은 데이터를 쓰는 `ai-report.ts:56` 과
통합 카드의 `mergedChecks` 는 이미 같은 폴백을 갖고 있어 세 소비자의 동작을 맞춘 것이다.
회귀 테스트로 두 배열이 모두 빈 경우를 고정했다.

같은 커밋이 01 문서의 S3(허용 목록이 프롬프트 전용)를 함께 닫았다. 필터링이 배열을
비울 수 있어 두 항목을 분리할 수 없었다.

### `84509d7` 로 닫힌 항목

첫 검토(`89484c2`)에 있었고 재검토에서 해소를 확인한 것들이다.

#### C3. 통합 카드가 측정값과 실행 링크를 전부 버린다 (닫힘)

통합 카드가 재설계됐다. 코드가 집계한 `현황`(LCP 불량·악화·개선, TBT 증가, CLS 문제 수),
`공통 원인` 최대 3개, `우선 확인` 3개, `가장 크게 악화` 3개(실제 delta 포함),
Actions run 과 artifact 를 가리키는 `상세` field 를 담는다.
대상별 전문은 Actions summary 와 artifact 로 옮기고 그 사실을 카드에 적는다.
같은 커밋이 plan 13 과 troubleshooting 문서의 카드 계약 서술도 함께 갱신했다.
새 집계 로직의 방향·표시 문제는 C12 로 분리했다.

#### C4. 강제 재분석이 Lighthouse 경고에 적용되지 않는다 (닫힘)

`report-decision.ts:283` 이 `if (!input.forceAiAnalysis && !registerAlert(key)) continue;` 로
바뀌어 강제 실행이 lab 경고를 다시 포함한다. 회귀 테스트
("강제 AI 분석은 이미 전송한 Lighthouse 경고도 다시 포함한다")도 함께 들어왔다.
다만 이 수정이 C5 의 단락 패턴을 세 번째 경로에 복제했다. C5 참조.

#### C7. 통합 카드가 6,000자를 넘을 수 있다 (닫힘)

재설계된 카드는 field 5개가 전부 상한이 있는 집계라 최악 합계가 2,000자대다.
6,000자 상한에 도달하지 않고, artifact 포인터를 pop 으로 잃는 경로도 사라졌다.

## 확인한 측정값

| 시점                    | 항목                                       | 결과                                      |
| ----------------------- | ------------------------------------------ | ----------------------------------------- |
| 첫 검토 (`89484c2`)     | `vitest run` (범위 내)                     | 32 파일 / 369개 전부 통과, 1.49초         |
| 첫 검토                 | `eslint scripts/core-web-vitals-report.ts` | 0건 (무시 파일 아님을 JSON 포맷으로 확인) |
| 첫 검토                 | `gh run list` 두 워크플로                  | 최근 실행 모두 성공                       |
| 재검토 (`84509d7`)      | `vitest run` (범위 내)                     | 32 파일 / 370개 전부 통과, 1.35초         |
| 보안 라운드 (`33b1ab9`) | `vitest run` (범위 내)                     | 38 파일 / 408개 전부 통과, 1.61초         |
| 보안 라운드             | `npm run test:coverage`                    | 통과 (`lib/text` statements 100%)         |
