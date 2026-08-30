# 의존성 보안 리포트 설정과 운영

> 구현 계획: [의존성 보안 AI 리포트](../plan/12-dependency-security-ai-report.md)
> workflow: [주간 리포트](../../.github/workflows/dependency-security-report.yml),
> [PR Dependency Review](../../.github/workflows/dependency-review.yml)

Dependabot은 기본 브랜치의 알려진 취약점을 감시한다. PR에서는 Dependency Review가 새 High 이상
runtime 취약점을 차단한다. 매주 월요일 10:07 KST에는 열린 Dependabot alert를 모아 AI 분석과
함께 Discord로 보낸다.

AI 제공자가 실패해도 리포트는 중단하지 않는다. primary가 실패하면 fallback을 한 번 호출하고,
둘 다 사용할 수 없으면 GitHub와 lockfile에서 확인한 기본 정보만 보낸다.

## 1. GitHub 보안 기능 켜기

저장소의 `Settings → Advanced Security`에서 다음 기능을 켠다.

1. Dependency graph
2. Dependabot alerts
3. Dependabot security updates

Grouped security updates는 사용하지 않는다. 한 PR에 여러 패키지가 섞이면 CI 실패 원인을 찾기
어렵기 때문이다. 일반 version update PR은 [`.github/dependabot.yml`](../../.github/dependabot.yml)의
`open-pull-requests-limit: 0`으로 막고 security update만 허용한다.

`tmp`와 `uuid`는 현재 `@lhci/cli@0.15.1`의 버전 범위 안에서 수정 버전을 설치할 수 없어 자동
업데이트 대상에서 제외했다. alert와 주간 리포트에는 계속 남는다. 상위 패키지가 제약을 고친
릴리스를 내면 `ignore` 두 항목을 제거한다.

## 2. Discord webhook 만들기

리포트를 받을 Discord 채널의 `채널 편집 → 연동 → 웹후크`에서 webhook을 만든다. 발급된 URL은
GitHub Actions secret인 `DISCORD_SECURITY_WEBHOOK_URL`에 저장한다. URL 자체가 메시지 전송
권한이므로 코드, 문서와 Actions variable에는 넣지 않는다.

## 3. AI 제공자 설정

GitHub 저장소의 `Settings → Secrets and variables → Actions`에서 다음 값을 등록한다.

### Repository secrets

| 이름                                          | 값                        |
| --------------------------------------------- | ------------------------- |
| `DISCORD_SECURITY_WEBHOOK_URL`                | Discord webhook URL       |
| `DEPENDENCY_TRIAGE_PROVIDER_API_KEY`          | primary 제공자의 API key  |
| `DEPENDENCY_TRIAGE_FALLBACK_PROVIDER_API_KEY` | fallback 제공자의 API key |

### Repository variables

| 이름                                        | 기본 구성 예시          |
| ------------------------------------------- | ----------------------- |
| `DEPENDENCY_TRIAGE_PROVIDER`                | `openai`                |
| `DEPENDENCY_TRIAGE_PROVIDER_MODEL`          | `gpt-5.6-luna`          |
| `DEPENDENCY_TRIAGE_FALLBACK_PROVIDER`       | `gemini`                |
| `DEPENDENCY_TRIAGE_FALLBACK_PROVIDER_MODEL` | `gemini-3.5-flash-lite` |

지원하는 provider 이름은 `openai`와 `gemini`다. API key 이름은 회사명이 아니라 primary와
fallback 슬롯을 뜻한다. Gemini를 primary로 바꿀 때는 다음처럼 값과 key의 위치를 함께 바꾼다.

```text
DEPENDENCY_TRIAGE_PROVIDER=gemini
DEPENDENCY_TRIAGE_PROVIDER_MODEL=gemini-3.5-flash-lite
DEPENDENCY_TRIAGE_PROVIDER_API_KEY=<Gemini API key>

DEPENDENCY_TRIAGE_FALLBACK_PROVIDER=openai
DEPENDENCY_TRIAGE_FALLBACK_PROVIDER_MODEL=gpt-5.6-luna
DEPENDENCY_TRIAGE_FALLBACK_PROVIDER_API_KEY=<OpenAI API key>
```

provider와 model은 secret이 아니다. Actions variable로 두면 현재 구성을 확인하고 제공자 순서를
바꿀 때 workflow 파일을 수정하지 않아도 된다.

## 4. 첫 리포트 확인

1. GitHub 저장소의 `Actions`에서 `Weekly dependency security report`를 연다.
2. `Run workflow`를 누르고 `main`을 선택한다.
3. `Send dependency security report` 작업이 성공하는지 확인한다.
4. Discord 카드의 합계, alert 링크, 설치 버전과 푸터를 확인한다.

정상 푸터는 다음 형식이다.

```text
generated 2026-08-30 20:03 KST · openai/gpt-5.6-luna
```

fallback이 처리하면 해당 provider와 model이 표시된다. 두 제공자를 모두 사용할 수 없으면
`AI 없음`으로 표시되며 기본 리포트는 그대로 도착해야 한다.

Actions 로그에는 성공 여부와 열린 alert 개수만 남는다.

```text
Dependency security report sent (4 open alert(s)).
```

API key, Discord webhook URL과 provider 원문 응답이 로그에 나타나면 안 된다.

## 5. PR 차단 설정

저장소의 `Settings → Rules → Rulesets`에서 `main` 대상 branch ruleset을 만든다. `Require status
checks to pass`를 켜고 `dependency-review`를 required check로 추가한다. 이 저장소는 다음 CI
작업도 required check로 사용한다.

- `Production build`
- `Secret scan`
- `Unit tests and static checks`

Dependency Review는 PR이 새로 추가한 runtime dependency만 비교하며 High와 Critical을 차단한다.
검증할 때는 별도 브랜치에 취약 버전을 추가하고 PR 실패만 확인한다. 테스트 PR과 취약 dependency는
`main`에 병합하지 않는다.

## 6. 카드 읽기

카드 상단은 열린 alert의 전체 합계와 이번 주에 새로 생긴 건수를 보여 준다. 색상은 열린 alert 중
가장 높은 심각도를 따른다.

| 최고 심각도 | 색상      |
| ----------- | --------- |
| Critical    | 빨강      |
| High        | 주황      |
| Medium      | 노랑      |
| Low         | 회색      |
| alert 없음  | 중립 회색 |

각 패키지에는 GitHub Advisory와 lockfile에서 가져온 식별자, 설치 버전, 수정 버전이 먼저 나온다.
AI는 그 아래의 영향, 판단 근거, 확인 항목과 확신도만 작성한다. 버전과 CVE 식별자를 AI가 만들지
않는다.

## 7. 문제 확인

| 증상                                      | 확인할 것                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| GitHub API가 403을 반환함                 | workflow의 `vulnerability-alerts: read`, Dependabot alerts와 Actions 정책 |
| 카드가 오지 않음                          | `DISCORD_SECURITY_WEBHOOK_URL`, webhook 만료 여부와 Actions 실패 로그     |
| 카드에 `AI 없음`이 표시됨                 | provider 이름, model variable, 두 API key의 primary/fallback 위치         |
| primary 대신 fallback이 표시됨            | primary API 상태, 모델명과 key가 같은 제공자 조합인지 확인                |
| 설치 버전이 `unknown`으로 표시됨          | alert의 manifest 경로와 `package-lock.json`에 해당 패키지가 있는지 확인   |
| Dependabot update가 `tmp`나 `uuid`로 실패 | `@lhci/cli` 상위 제약이다. alert는 유지하고 `dependabot.yml` 예외를 확인  |
| `npm ci`에 deprecated 경고가 표시됨       | `@lhci/cli` 전이 의존성인지 확인. 리포트 전송 성공 여부와 따로 판단       |

GitHub API가 페이지 중간에서 실패하면 리포트를 보내지 않는다. 일부 alert만 정상 합계처럼 보내는 것을
막기 위한 동작이다. Discord 전송이 실패해도 workflow는 실패하므로 Actions 알림과 실행 로그에서
확인할 수 있다.

## 8. 운영 확인

예약 실행은 매주 월요일 10:07 KST다. 첫 배포 뒤에는 다음 항목을 확인한다.

- 월요일 예약 실행이 수동 실행과 같은 카드를 보내는지 확인한다.
- alert가 없는 시점에 0건 카드가 도착하는지 확인한다.
- 첫 달 동안 alert 수, security update PR 수와 AI 분석 품질을 기록한다.
- `@lhci/cli` 새 릴리스가 나오면 `tmp`, `uuid` 제약이 풀렸는지 확인한다.

AI 설명이 GitHub Advisory와 다르면 카드의 Alert 링크를 기준으로 판단한다. 수정 버전과 설치 버전은
GitHub API와 lockfile 값이 우선이다.
