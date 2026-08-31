# Core Web Vitals AI 알림 설정

Core Web Vitals 리포트는 매주 화요일과 금요일 10:17 KST에 실행된다. CrUX field 데이터와 모바일
Lighthouse 결과를 코드로 판정하고, 경고가 있을 때만 AI 분석을 붙여 Discord로 보낸다. 정상 실행은
Actions summary와 artifact만 남긴다.

구현 범위와 판정 기준은 [Core Web Vitals AI 알림 계획](../plan/13-core-web-vitals-ai-alerts.md), 진행
상태는 [구현 체크리스트](../checklist/11-core-web-vitals-ai-alerts.md)에서 관리한다.

## 측정 대상

경로 목록은 [`config/performance-targets.json`](../../config/performance-targets.json)이 단일 출처다.
CrUX는 origin과 각 URL을 PHONE, DESKTOP으로 조회한다. Lighthouse는 아래 URL을 모바일 환경에서
각 3회 측정한다.

CrUX `record 없음`은 대상별 연속 횟수와 중복 억제 key를 snapshot에 보존하지만, Discord 알림은 한 실행의
데이터 부족 항목을 요약 카드 한 장으로 묶는다. Lighthouse 회귀 알림은 대상별로 별도 전송한다.

```text
https://sungjoon.works/ko/dev/projects
https://sungjoon.works/ko/dev/articles
https://sungjoon.works/ko/dev
https://sungjoon.works/ko/dev/career
https://sungjoon.works/ko/photo
https://sungjoon.works/ko/photo/about
https://sungjoon.works/ko/photo/albums
https://sungjoon.works/ko/photo/map
https://sungjoon.works/ko/music
https://sungjoon.works/ko/music/media
https://sungjoon.works/ko
https://sungjoon.works/ko/contact
```

## GitHub Actions 설정

GitHub 저장소의 `Settings > Secrets and variables > Actions`에서 값을 등록한다. API key와 Discord
webhook은 Secrets에만 둔다.

Variables:

```text
SITE_URL=https://sungjoon.works
PERFORMANCE_TRIAGE_PROVIDER=openai
PERFORMANCE_TRIAGE_PROVIDER_MODEL=<primary model ID>
PERFORMANCE_TRIAGE_FALLBACK_PROVIDER=gemini
PERFORMANCE_TRIAGE_FALLBACK_PROVIDER_MODEL=<fallback model ID>
```

Secrets:

```text
CRUX_API_KEY=<Chrome UX Report API key>
DISCORD_PERFORMANCE_WEBHOOK_URL=<Discord webhook URL>
PERFORMANCE_TRIAGE_PROVIDER_API_KEY=<primary provider API key>
PERFORMANCE_TRIAGE_FALLBACK_PROVIDER_API_KEY=<fallback provider API key>
```

fallback을 쓰지 않으면 이름이 `PERFORMANCE_TRIAGE_FALLBACK_`으로 시작하는 세 값은 등록하지 않아도
된다. AI 연결 없이 카드 구성을 확인할 때는 `PERFORMANCE_TRIAGE_PROVIDER=mock`을 사용한다. mock은
model과 API key가 필요 없다.

`GITHUB_TOKEN`, `GITHUB_RUN_ID`, `GITHUB_REPOSITORY`는 Actions가 제공한다. `SEND_BASELINE`은 수동
실행 입력에서 정하므로 별도 Variable로 등록하지 않는다.

## 수동 실행

1. GitHub 저장소의 `Actions`에서 `Core Web Vitals report`를 연다.
2. `Run workflow`를 누른다.
3. Discord 연결을 함께 확인하려면 `send_baseline`을 `true`로 선택한다.
4. 실행이 끝나면 summary의 target별 field, lab 상태를 확인한다.

첫 실행에는 이전 snapshot이 없으므로 고정 임계값만 판정한다. 정상 실행이 끝나면
`core-web-vitals-snapshot` artifact가 생기고 다음 실행부터 회귀 비교에 사용된다.

## 결과와 artifact

workflow는 두 artifact를 90일간 보관한다.

| 이름                         | 내용                                                  |
| ---------------------------- | ----------------------------------------------------- |
| `core-web-vitals-snapshot`   | 정규화한 field·lab 수치, 상태, 전송한 알림의 중복 key |
| `core-web-vitals-lighthouse` | URL별 Lighthouse JSON, HTML과 `manifest.json`         |

snapshot에는 CrUX 원본 응답, Lighthouse HTML, screenshot, API key와 webhook URL을 넣지 않는다.
Discord 카드에는 코드가 판정한 수치를 먼저 표시하고, AI가 성공하면 요약, 사용자 영향, 원인 후보와
확인 순서를 추가한다. AI가 실패해도 수치 카드는 전송된다.

## 로컬 확인

운영 Lighthouse 측정에는 `SITE_URL`과 Chromium이 필요하다.

```bash
npx playwright install chromium
SITE_URL=https://sungjoon.works npm run test:lighthouse:production
```

`performance:report`는 CrUX key, GitHub Actions 실행 정보, Discord webhook과 Lighthouse 결과를 함께
사용하므로 운영 workflow에서 실행하는 것을 기준으로 한다. 외부 호출 없이 로직만 확인할 때는 다음
명령을 사용한다.

```bash
npm test -- performance
npm run check
npm run lint
```

## 실패 점검

### preflight 실패

Actions log에서 실패한 URL과 응답 상태를 확인한다. 측정 대상은 같은 origin의 2xx HTML이어야 하며
redirect loop와 다른 origin 이동은 허용하지 않는다.

### CrUX 404

`chrome ux report data not found`는 API key 오류가 아니라 공개 표본 부족이다. 리포트는 이를
`insufficient_data`로 기록하고 최초와 4회 연속 시점에 운영 메모를 보낸다.

401이나 403이면 Google Cloud에서 API가 켜져 있는지, key의 API 제한이 Chrome UX Report API인지
확인한다. GitHub-hosted runner는 IP가 고정되지 않으므로 application restriction은 사용하지 않는다.

### Lighthouse 실패

`core-web-vitals-lighthouse` artifact에서 해당 URL의 HTML과 JSON을 확인한다. 한 URL에서 두 번 이상
실패하면 workflow도 실패하며 정상 snapshot을 덮지 않는다.

첫 운영 검증에서 사용한 `lhci autorun`은 Lighthouse 프로세스가 한 번 실패하자 남은 URL을 측정하지
않고 upload 단계 전에 종료했다. 현재는 운영 수집을 URL·회차별로 분리해 성공한 JSON과 HTML을 즉시
저장한다. 실패한 회차는 15초 뒤 한 번 재시도하고, 그래도 실패하면 다음 회차와 URL을 계속 측정한다.
URL별 3회 중 2회가 성공하면 `partial`로 report를 만들며 2회 미만이면 모든 대상을 측정한 뒤 workflow를
실패시킨다.

2026-08-31 KST 첫 baseline 실행에서는 10개 URL의 30회와 `/ko`의 첫 2회가 성공한 뒤 `/ko` 3회차
문서 요청이 HTTP 403으로 끝났다. 재실행에서도 같은 패턴이 반복됐다. Vercel Firewall에서
`System Mitigations: Active`, `Custom Rules: 0`, `Bot Protection: Inactive`, `Challenged 24`와
GitHub runner(Microsoft ASN) IP가 확인되어 Vercel 자동 DDoS mitigation challenge가 원인임을 확정했다.
challenge는 애플리케이션 도달 전에 처리되므로 Vercel 애플리케이션 로그에는 오류가 남지 않는다.

Hobby 플랜에서는 system-level DDoS mitigation을 끄거나 System Bypass Rule을 만들 수 없다. 따라서
Lighthouse를 세 shard job으로 나눠 각 runner가 네 URL만 측정하고, aggregation job에서 결과를 합친다.

- 실패한 시각의 `Project → Firewall → Overview → Events`에서 `System Mitigations`, `Challenged`, IP,
  JA4, User Agent와 경로를 확인한다. `Rules`가 비어 있어도 자동 DDoS mitigation은 별도로 동작한다.
- `collection-summary.json`에서 실패한 URL, 회차와 재시도 결과를 확인한다.
- 성공한 JSON과 HTML이 `core-web-vitals-lighthouse` artifact에 남았는지 확인한다.
- 한 URL의 성공이 2회 미만이면 report와 snapshot은 만들지 않으므로 원시 결과로 원인을 조사한다.

재현 시에는 Firewall의 `Live 10 minutes`를 열어 둔 상태에서 workflow를 수동 실행한다. challenge가
확인되면 임의의 Custom Rule이나 Attack Challenge Mode를 추가하지 않는다.

### AI 분석 실패

provider 이름, model ID와 API key Secret 이름을 확인한다. primary가 실패하면 fallback을 한 번
호출한다. 양쪽이 실패하거나 schema가 맞지 않으면 `AI 분석 없음` 수치 카드를 보낸다. provider 원본
응답은 log와 카드에 기록하지 않는다.

### Discord 전송 실패

`DISCORD_PERFORMANCE_WEBHOOK_URL`이 현재 webhook과 일치하는지 확인한다. Discord 전송이 실패하면
workflow는 실패하고 snapshot을 올리지 않는다. 오류 메시지는 URL query와 secret 형태를 제거한 뒤
summary에 남긴다.

### 이전 snapshot을 찾지 못함

첫 실행이라면 정상이다. 기존 실행이 있는데도 비교가 생략되면 workflow 권한이 `actions: read`인지,
이전 성공 실행에 `core-web-vitals-snapshot` artifact가 남아 있는지 확인한다. 조회 실패는 현재 측정을
막지 않지만 비교 기반 경고는 만들지 않는다.
