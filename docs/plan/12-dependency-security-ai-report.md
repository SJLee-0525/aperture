# 의존성 보안 AI 리포트 계획

> 관련 결정: [`docs/adr/0006-ai-error-triage-alerts.md`](../adr/0006-ai-error-triage-alerts.md)
> 기준일: 2026-08-30 KST
> 상태: 계획

## 1. 목표

Dependabot이 기본 브랜치의 알려진 취약점을 계속 감시하게 두고, 매주 월요일에 현재 열린
alert를 Discord로 보낸다. 리포트는 GitHub Advisory와 lockfile에서 확인한 사실을 먼저 만들고,
LLM은 그 사실을 바탕으로 프로젝트 영향과 검증할 항목을 한국어로 설명한다.

PR에는 dependency review를 추가한다. 사람이 dependency를 바꾸거나 Dependabot이 수정 PR을
만들었을 때, 새 취약점이 기본 브랜치에 들어오기 전에 CI가 막는다.

이번 작업의 범위는 npm과 GitHub Actions dependency다. 컨테이너와 다른 package ecosystem은
현재 저장소에 manifest가 생길 때 추가한다.

## 2. 역할과 실행 시점

```text
기본 브랜치
  │
  ├─ Dependabot Alerts             알려진 취약점 상시 탐지
  └─ Dependabot Security Updates   패치가 가능하면 수정 PR 생성

Pull request
  │
  ├─ 기존 CI                       test, type, lint, build, E2E
  └─ Dependency Review             새 취약 dependency 유입 차단

매주 월요일 10:07 KST
  │
  └─ GitHub Actions
       ├─ open Dependabot alert 전부 조회
       ├─ package-lock.json과 결합
       ├─ 신규와 누적 alert 분류
       ├─ LLM 분석
       └─ Discord 주간 리포트
```

Dependabot alert와 security update는 월요일 스케줄을 기다리지 않는다. 일반 version update
PR은 만들지 않는다. `dependabot.yml`은 npm과 GitHub Actions의 security update PR에 label과
실행 범위를 적용하기 위해 남긴다.

- [Dependabot security updates](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependabot-security-updates)

## 3. 먼저 켤 저장소 설정

Repository Settings의 Advanced Security에서 다음 항목을 켠다.

1. Dependency graph
2. Dependabot alerts
3. Dependabot security updates

Grouped security updates는 첫 배포에서 켜지 않는다. 여러 패키지를 한 PR에 묶으면 CI 실패의
원인을 찾기 어렵다. 한 달 동안 PR 수를 본 뒤, 소음이 실제로 문제일 때 npm development
dependency부터 묶는다.

### 3.1 `dependabot.yml`

`.github/dependabot.yml`에 npm과 GitHub Actions를 등록하되 일반 version update PR은 끈다.
`schedule`은 ecosystem 설정의 필수 필드라 유지하며 security update의 탐지 시점을 늦추지 않는다.

```yaml
version: 2

updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
      day: monday
      time: "09:00"
      timezone: "Asia/Seoul"
    # 일반 버전 PR은 만들지 않고 security update PR만 허용한다.
    open-pull-requests-limit: 0
    labels:
      - dependencies

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
      day: monday
      time: "09:20"
      timezone: "Asia/Seoul"
    # 일반 버전 PR은 만들지 않고 security update PR만 허용한다.
    open-pull-requests-limit: 0
    labels:
      - dependencies
      - github-actions
```

`open-pull-requests-limit: 0`은 일반 version update PR만 끈다. Security update PR은 계속
생성되며 안전한 버전이 major에만 있어도 수정을 시도한다. 보안 PR도 기존 CI를 모두 통과한 뒤
사람이 merge한다.

## 4. PR dependency review

`.github/workflows/dependency-review.yml`을 별도 workflow로 만든다. 기존 `ci.yml`에 섞지 않아야
branch protection에서 이 검사를 독립된 required check로 지정할 수 있다.

```yaml
name: Dependency review

on:
  pull_request:

permissions:
  contents: read

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v7
      - uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: high
          fail-on-scopes: runtime
```

첫 기준은 runtime의 High와 Critical이다. Moderate까지 즉시 막으면 개발 도구의 간접 dependency
때문에 모든 PR이 멈출 수 있다. 한 달 뒤 실제 탐지 결과를 보고 `moderate`로 낮출지 결정한다.
license 정책은 이번 범위에 넣지 않는다. 현재 저장소는 `UNLICENSED`이고, 허용하거나 거부할
license 목록을 정하지 않은 상태다.

Dependabot PR에서 실행되는 workflow에는 일반 Actions secret이 전달되지 않는다. 이 workflow는
secret을 쓰지 않으므로 그대로 실행할 수 있다.

- [Dependency review 구성](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/manage-your-dependency-security/configure-dependency-review-action)
- [Dependabot이 만든 PR의 Actions 제약](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-on-actions)

## 5. 주간 리포트 workflow

`.github/workflows/dependency-security-report.yml`은 schedule과 수동 실행을 함께 지원한다.

```yaml
name: Weekly dependency security report

on:
  schedule:
    - cron: "7 1 * * 1"
  workflow_dispatch:

permissions:
  contents: read
  vulnerability-alerts: read

concurrency:
  group: dependency-security-report
  cancel-in-progress: false

jobs:
  probe:
    name: Probe Dependabot alerts API
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Check API access
        env:
          GH_TOKEN: ${{ github.token }}
          REPOSITORY: ${{ github.repository }}
        run: |
          response_file="${RUNNER_TEMP}/dependabot-alerts.json"
          curl --fail-with-body \
            --silent \
            --show-error \
            --output "${response_file}" \
            --header "Accept: application/vnd.github+json" \
            --header "Authorization: Bearer ${GH_TOKEN}" \
            --header "X-GitHub-Api-Version: 2026-03-10" \
            "https://api.github.com/repos/${REPOSITORY}/dependabot/alerts?state=open&per_page=1"
          jq --exit-status 'type == "array"' "${response_file}" > /dev/null
          alert_count=$(jq 'length' "${response_file}")
          echo "Dependabot alerts API access OK. Returned ${alert_count} alert(s)."
```

GitHub Actions cron은 기본적으로 UTC다. `01:07 UTC`는 KST 월요일 10:07이다. 정각에는 예약
workflow가 몰려 지연되거나 누락될 수 있어 7분을 더한다. 수동 실행은 첫 배포 검증과 장애 복구에
쓴다.

API 호출에는 별도 PAT 대신 `${{ github.token }}`을 쓴다. Dependabot alert 조회에 필요한 권한은
`security-events`가 아니라 `vulnerability-alerts: read`다.

P1에서 위 `probe` job을 수동 실행해 실제 저장소의 alert를 1건만 요청한다.

실패하면 dependency graph와 Dependabot alerts 활성화 여부, workflow 권한, 조직과 저장소의
Actions 정책, 저장소 식별자를 순서대로 확인한다. 이 조건이 모두 맞는데도 조직 정책이 기본
token을 막을 때만 GitHub App token 또는 fine-grained PAT를 도입한다.

- [Actions workflow 권한](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [예약 workflow의 시각과 지연](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)

## 6. GitHub alert 수집

`GET /repos/{owner}/{repo}/dependabot/alerts`에서 `state=open`을 요청한다. `per_page=100`만 믿지
않고 `Link` 헤더가 끝날 때까지 페이지를 읽는다. 응답은 필요한 필드만 남기고 나머지는 버린다.

| 원본 필드                                  | 용도                                   |
| ------------------------------------------ | -------------------------------------- |
| `number`, `html_url`, `created_at`         | alert 링크, 신규 여부                  |
| `dependency.package`                       | ecosystem과 package 이름               |
| `dependency.manifest_path`                 | 어느 manifest에서 발견됐는지           |
| `dependency.scope`, `relationship`         | runtime/development, direct/transitive |
| `security_advisory.ghsa_id`, `cve_id`      | 식별자                                 |
| `security_advisory.summary`, `description` | 취약점 설명                            |
| `security_advisory.severity`               | GitHub 기본 severity                   |
| `security_advisory.cvss_severities`        | CVSS v3/v4 점수와 vector               |
| `security_advisory.epss`                   | 알려진 악용 가능성의 보조 신호         |
| `security_advisory.cwes`                   | 취약점 유형                            |
| `security_advisory.references`             | 공급자 공지와 NVD 등 원문 링크         |
| `security_vulnerability`                   | 취약 버전 범위와 최초 패치 버전        |

Dependabot API만으로 CVE 설명, CVSS, EPSS, CWE, 취약 범위와 패치 버전을 받을 수 있다. 첫 버전은
GitHub Advisory를 유일한 CVE 데이터 소스로 쓴다. NVD API를 다시 호출하지 않는다. 참고 링크는
Discord에 제공하되, workflow가 링크 본문까지 가져오지는 않는다.

API가 403을 반환하면 권한 오류로 분류한다. 404는 저장소 식별자, token 접근 범위와 Dependabot
설정을 함께 확인해야 한다. 일부 페이지만 받은 상태에서는 리포트를 보내지 않는다. 불완전한
목록을 정상으로 보이는 것보다 workflow를 실패시키는 편이 낫다.

- [Dependabot Alerts REST API](https://docs.github.com/en/rest/dependabot/alerts?apiVersion=2026-03-10)

## 7. 프로젝트 문맥 계산

LLM을 부르기 전에 `package-lock.json`에서 다음 값을 계산한다.

```ts
type DependencySecurityFact = {
  alertNumber: number;
  packageName: string;
  installedVersions: string[];
  vulnerableVersionRange: string;
  firstPatchedVersion: string | null;
  scope: "runtime" | "development" | "unknown";
  relationship: "direct" | "transitive" | "unknown";
  lockfileLocations: string[];
  severity: "low" | "medium" | "high" | "critical";
  cvssScore: number | null;
  epssPercentage: number | null;
  ghsaId: string;
  cveId: string | null;
  createdAt: string;
  alertUrl: string;
};
```

현재 설치 버전과 lockfile 위치는 parser가 정한다. direct/transitive 관계와 패치 버전은 API
값을 그대로 쓴다. LLM이 이 값을 추측하지 않는다. 같은 package가 여러 버전으로 설치돼 있으면
모두 기록하고, `semver`로 취약 범위에 들어가는 인스턴스를 따로 표시한다. `semver`와 타입은
직접 devDependency로 선언한다.

parser는 package-lock v2와 v3의 `packages` map을 읽는다. 최상위 `node_modules/foo`,
`node_modules/a/node_modules/foo`, scoped package, 같은 package의 여러 버전과 version이 없는
workspace/link entry를 각각 처리한다. direct/transitive 관계를 lockfile에서 다시 계산하지
않으며 API 값이 없으면 `unknown`으로 남긴다.

`firstPatchedVersion`이 `null`이면 "수정 버전 미공개"로 분류한다. 패치 버전이 있어도 현재
semver 범위를 벗어나 자동 수정이 불가능할 수 있다. "업데이트 가능" 판정은 Dependabot PR의
존재가 아니라 현재 manifest 제약과 lockfile을 기준으로 계산한다.

코드 import 전수 검색은 첫 버전에 넣지 않는다. package 이름만 검색하면 동적 import, CLI,
Next plugin 설정을 놓치고 transitive dependency에는 의미 없는 결과가 많이 생긴다. High 또는
Critical alert를 사람이 심층 검토할 때 별도 명령으로 추가한다.

## 8. 우선순위와 주간 구간

API에서는 open alert를 severity와 관계없이 모두 가져온다. 출력에서 네 구간으로 나눈다.

| 구간      | 조건                             |
| --------- | -------------------------------- |
| 즉시 확인 | Critical, 또는 runtime High      |
| 이번 주   | development High, runtime Medium |
| 계획      | development Medium, runtime Low  |
| 관찰      | development Low                  |

EPSS와 CVSS는 같은 구간 안에서 정렬할 때만 쓴다. EPSS가 높다는 이유로 GitHub severity를 새 값으로
덮지 않는다. 값이 없으면 `unknown`으로 남긴다.

`created_at`이 실행 시점에서 7일 이내면 "이번 주 신규", 그보다 오래됐으면 "계속 열림"이다.
별도 DB 없이 현재 backlog를 설명할 수 있는 기준이다. 지난주에 닫힌 alert 목록은 첫 버전에서
보내지 않는다. fixed 이력을 주간 변화량으로 보여줄 필요가 생기면 그때 Supabase snapshot을
추가한다.

## 9. LLM 분석

Sentry 트리아지의 provider 코드는 오류 스택 전용이라 공유하지 않는다. 아래 규약만 맞춘다.

- env로 primary와 fallback provider를 교체한다.
- 두 provider 모두 같은 JSON schema를 반환한다.
- 전체 alert 원문이 아니라 §7에서 만든 사실만 보낸다.
- provider가 실패해도 결정적 데이터로 만든 기본 리포트는 보낸다.
- 모델 출력은 Discord 길이 제한에 맞추기 전에 schema와 길이를 검증한다.
- 한 번의 주간 실행에서 우선순위가 높은 alert 최대 10개만 분석한다.

환경변수 이름은 Sentry와 섞이지 않게 분리한다.

```text
DEPENDENCY_TRIAGE_PROVIDER=openai
DEPENDENCY_TRIAGE_PROVIDER_API_KEY=
DEPENDENCY_TRIAGE_PROVIDER_MODEL=
DEPENDENCY_TRIAGE_FALLBACK_PROVIDER=gemini
DEPENDENCY_TRIAGE_FALLBACK_PROVIDER_API_KEY=
DEPENDENCY_TRIAGE_FALLBACK_PROVIDER_MODEL=
DEPENDENCY_TRIAGE_MAX_ALERTS=10
DISCORD_SECURITY_WEBHOOK_URL=
```

Actions secret에는 API key 두 개와 Discord webhook URL을 넣는다. provider, model과 분석 상한은
평문 Actions variable 또는 workflow env로 둔다. 상한을 넘는 alert는 합계와 기본 정보에는
남지만 LLM에 보내지 않는다. Advisory description은 alert당 2,000자로 자르고 reference도 최대
5개만 전달한다.

### 9.1 출력 계약

```ts
type DependencyTriageResult = {
  alertNumber: number;
  impact: string;
  priorityReason: string;
  recommendedChecks: string[];
  confidence: "high" | "medium" | "low";
};
```

LLM은 다음 내용을 쓰지 못한다.

- API와 lockfile에 없는 현재 버전 또는 패치 버전
- 실제 코드 경로를 확인하지 않은 exploit 가능 판정
- Dependabot PR을 조회하지 않고 만든 PR 번호
- "breaking risk가 낮다"처럼 검증하지 않은 호환성 보장
- alert 자동 dismiss 또는 merge 지시

`security_advisory.description`과 package 이름은 외부 입력이다. prompt 안의 지시로 취급하지
않고 JSON 데이터로 전달한다. 모델 instruction에는 이 필드의 명령을 따르지 말라는 규칙을
넣는다.

## 10. Discord 리포트

Sentry 알림 채널과 분리한 `#aperture-security` 채널을 쓴다. 주간 alert가 0개여도 리포트를
보내 workflow와 Discord webhook이 살아 있음을 확인한다.

```text
Weekly Dependency Security Report

Open 3 · New 1 · Continuing 2
Critical 0 · High 1 · Medium 2 · Low 0

[이번 주 신규]
High · next · runtime/direct
CVE-... · GHSA-...
installed 16.3.0 · patched 16.3.1
영향: ...
확인: npm test, npm run build, 관련 route smoke test
Alert #12

[계속 열림]
Medium 2건

generated 2026-08-31 10:07 KST · openai/model
```

Discord embed 한 장에 모든 advisory 설명을 넣지 않는다. 본문에는 합계와 즉시 확인 항목을
우선 싣고, 나머지는 package, severity, alert 링크만 압축한다. 길이를 넘으면 Low,
development Medium, 오래된 alert 순서로 상세 설명을 줄인다. alert 자체를 합계에서 빼지는
않는다.

전송 전에 필드별 제한과 메시지 안의 모든 embed 텍스트 합계 6,000자를 검사한다.

| 대상                     | 상한    |
| ------------------------ | ------- |
| title                    | 256자   |
| description              | 4,096자 |
| field name               | 256자   |
| field value              | 1,024자 |
| field 수                 | 25개    |
| footer text              | 2,048자 |
| 모든 embed 텍스트의 합계 | 6,000자 |

절삭 뒤 전체 길이를 다시 계산한다. Low 상세, development Medium 상세, 오래된 alert 상세, AI 설명
순서로 줄이고 마지막에는 field 수를 축소한다. 합계, package 이름, severity와 alert 링크는 남긴다.

Discord 전송은 기존 Sentry 구현과 같은 규칙을 쓴다.

- `allowed_mentions.parse = []`
- 429의 `retry_after`를 읽고 한 번 재시도
- 5xx는 짧게 기다린 뒤 한 번 재시도
- 400, 401, 404는 재시도하지 않음
- webhook URL이나 API key를 로그에 출력하지 않음

공용 전송 코드를 쓰려면 먼저 `src/lib/sentry-triage/send-discord-card.ts`를
`src/lib/discord/send-webhook.ts`로 옮기고 Sentry가 새 모듈을 보게 한다. Dependency 코드가
`sentry-triage`를 직접 import하지 않는다.

## 11. 파일 구성

```text
.github/
├─ dependabot.yml
└─ workflows/
   ├─ dependency-review.yml
   └─ dependency-security-report.yml

scripts/
└─ dependency-security-report.ts

src/lib/dependency-security/
├─ github-alerts.ts
├─ normalize-alert.ts
├─ lockfile-context.ts
├─ priority.ts
├─ dependency-triage-provider.ts
├─ openai-dependency-triage-provider.ts
├─ gemini-dependency-triage-provider.ts
├─ dependency-triage-prompt.ts
├─ discord-report.ts
└─ *.test.ts

src/lib/discord/
└─ send-webhook.ts
```

workflow에서 TypeScript entrypoint를 실행하기 위해 `tsx`, 취약 버전 범위를 계산하기 위해
`semver`와 타입을 devDependency로 추가한다. `npm run security:report` script는 `npm ci` 뒤에
실행한다. 여기서 `npm ci`는 감사용 재탐지가 아니라 실행기와 테스트된 모듈을 설치하는 단계다.

## 12. 실패 처리

| 실패                           | workflow 결과 | Discord                                        |
| ------------------------------ | ------------- | ---------------------------------------------- |
| alert 0건                      | 성공          | 0건 정상 리포트                                |
| GitHub API 403/404             | 실패          | 가능하면 설정 오류 기본 메시지                 |
| API pagination 중간 실패       | 실패          | 불완전한 보안 합계를 보내지 않음               |
| lockfile에 package를 찾지 못함 | 성공          | 설치 버전 `unknown`, alert는 유지              |
| primary LLM 실패               | 성공          | fallback 분석                                  |
| primary와 fallback 모두 실패   | 성공          | AI 설명 없는 기본 리포트                       |
| Discord 최종 실패              | 실패          | Actions summary와 로그에 secret 없는 오류 기록 |
| schema 또는 길이 검증 실패     | 성공          | 해당 분석을 버리고 기본 리포트                 |

GitHub API가 실패했는데 Discord 오류 메시지까지 실패할 수 있다. 최종 운영 백업은 GitHub Actions의
실패 알림과 run log다. repository Actions 알림을 꺼 두지 않는다.

## 13. `npm audit`의 위치

주간 리포트는 Dependabot API를 탐지 소스로 쓴다. `npm audit`을 같은 workflow에서 합치지 않는다.
서로 다른 식별 결과를 한 합계로 섞으면 같은 취약점 중복 제거와 severity 차이를 설명해야 한다.

대신 다음 수동 script를 후속 작업으로 둘 수 있다.

```text
npm run security:audit
```

이 명령은 로컬 조사와 Dependabot 누락 의심 시 교차 확인에 쓴다. 결과가 다르면 자동으로 alert를
만들거나 dismiss하지 않고, npm advisory ID와 GHSA를 대조해 사람이 판단한다.

## 14. 구현 순서

### P1. GitHub 기본 기능

- [ ] Dependency graph, Dependabot alerts, security updates를 켠다.
- [ ] `github.token`과 `vulnerability-alerts: read`로 alert API 권한 probe를 통과한다.
- [ ] `.github/dependabot.yml`을 추가한다.
- [ ] 일반 version update PR이 생성되지 않고 security update PR은 유지되는지 확인한다.

### P2. PR 방어

- [ ] dependency review workflow를 추가한다.
- [ ] 안전한 dependency PR이 통과하는지 확인한다.
- [ ] 테스트 브랜치에서 High runtime 취약 dependency를 추가해 실패를 확인한다.
- [ ] branch protection의 required check로 지정한다.

### P3. 결정적 주간 리포트

- [ ] GitHub alert pagination과 화이트리스트 정규화를 구현한다.
- [ ] package-lock 문맥과 priority 계산을 구현한다.
- [ ] AI 없이 Discord 기본 리포트를 보낸다.
- [ ] alert 0건, 여러 페이지, 패치 없음, 같은 package 여러 버전을 검증한다.

### P4. AI 분석

- [ ] strict JSON schema를 정의한다.
- [ ] OpenAI와 Gemini provider, fallback을 구현한다.
- [ ] advisory description의 prompt injection fixture를 추가한다.
- [ ] 두 provider 실패 시 기본 리포트가 나가는지 확인한다.

### P5. 운영 검증

- [ ] `workflow_dispatch`로 실데이터 리포트를 받는다.
- [ ] Actions log에 secret과 전체 provider 응답이 없는지 확인한다.
- [ ] 다음 월요일 schedule 실행과 0건 리포트를 확인한다.
- [ ] 첫 달의 alert 수, Dependabot PR 수, AI 판정 품질을 기록한다.

## 15. 테스트

| 대상               | 필수 사례                                                                                                |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| `github-alerts`    | 1페이지, 여러 페이지, 빈 목록, 403, 404, 429, 중간 페이지 실패                                           |
| `normalize-alert`  | CVE 없음, CVSS v4만 있음, EPSS 없음, 패치 없음, 필드 추가, 긴 description                                |
| `lockfile-context` | lockfile v2/v3, 최상위·nested 설치, scoped package, 같은 package 여러 버전, workspace/link, package 누락 |
| `priority`         | severity와 scope 조합, null 신호, 신규 7일 경계                                                          |
| provider           | schema 고정, timeout, primary 실패, fallback 승격, 양쪽 실패, prompt injection 문자열                    |
| `discord-report`   | 0건, 합계 정확성, 길이 상한, 긴 package 이름, AI 없음, `allowed_mentions`                                |
| orchestration      | 수집 뒤 provider 호출, API 실패 시 중단, LLM 실패 시 전송, Discord 실패 시 process exit code 1           |

외부 GitHub, LLM, Discord 호출은 단위 테스트에서 mock한다. 실호출은 배포 체크리스트의 수동 실행에서
각각 한 번 확인한다.

전체 구현 후 다음 품질 게이트를 통과한다.

```text
npm test
npm run check
npm run lint
npm run format:check
npm run knip
npm run deps:check
npm run build
```

## 16. 완료 조건

1. 새 GitHub Advisory가 등록되면 Dependabot alert가 월요일과 관계없이 생성된다.
2. 패치 가능한 보안 update에는 Dependabot PR이 만들어진다.
3. PR이 새 High 또는 Critical runtime vulnerability를 추가하면 dependency review가 실패한다.
4. 월요일 리포트가 모든 open alert 합계와 신규/누적 구분을 정확히 보낸다.
5. 설치 버전, 취약 범위와 패치 버전은 API와 lockfile 값에서만 나온다.
6. LLM이 실패해도 기본 리포트가 도착한다.
7. alert가 0개인 주에도 정상 리포트가 도착한다.
8. Actions와 Discord 로그에 token, API key, webhook URL이 남지 않는다.
9. 수동 실행과 실제 schedule 실행을 각각 한 번 검증한다.
