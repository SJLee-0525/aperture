# 기각한 주장

검토 중 세운 가설 가운데 코드나 실행 이력으로 무너진 것을 남긴다.
다음 검토가 같은 자리를 다시 파지 않게 하는 것이 목적이다.

## 1. "신규 환경변수 26개가 CLAUDE.md 에 없다"

`process.env` 참조를 전부 뽑아 CLAUDE.md 와 대조하니 26개 중 26개가 없었다.
누락으로 보고하려다 CLAUDE.md 의 해당 절 제목을 다시 읽었다.
그 절은 `.env.local` 을 다루고, 이 26개는 전부 GitHub Actions 의 secrets 와 vars 다.
`.env.local` 에 들어갈 일이 없다.

실제로는 `docs/checklist/11-core-web-vitals-ai-alerts.md`,
`docs/plan/12-dependency-security-ai-report.md`,
`docs/plan/13-core-web-vitals-ai-alerts.md`,
`docs/troubleshooting/` 두 파일에 문서화돼 있다.

기각. 다만 CLAUDE.md 에서 그 문서들로 가는 링크는 없다.

## 2. "`vulnerability-alerts: read` 는 유효한 permissions 키가 아니다"

워크플로 `permissions:` 블록에서 이 키를 보고, 유효한 키 목록에 없는 것으로 기억해
"워크플로가 파싱 단계에서 실패한다"고 적으려 했다. 게다가 `GITHUB_TOKEN` 으로는
Dependabot alerts 를 읽을 수 없다는 제약도 기억에 있었다.

`gh run list --workflow=dependency-security-report.yml` 을 돌리니 최근 실행 네 건이
전부 success 였다. 키도 유효하고 토큰도 읽는다.

기각. 기억으로 API 계약을 단정하지 않는다.

## 3. "artifact 다운로드가 Azure 로 토큰을 흘린다"

`github-artifact.ts:135` 가 `redirect: "follow"` 와 `Authorization` 헤더를 함께 쓴다.
GitHub artifact zip 엔드포인트는 Azure Blob 으로 302 를 보내므로 전형적인 유출 형태로 보인다.

fetch 명세는 cross-origin 리다이렉트에서 `Authorization` 을 제거하고 undici 가 이를 구현한다.
토큰은 Azure 로 가지 않는다. 코드 주석의 서술이 맞다.

기각.

## 4. "scripts/ 의 import 순서가 CLAUDE.md 규약을 어긴다"

`core-web-vitals-report.ts` 에서 `import type` 이 10번째 줄에 있고 값 import 가 그 뒤로
이어진다. CLAUDE.md 는 `import type` 을 마지막 그룹으로 규정한다.

ESLint 를 직접 돌렸다. 0건이었다. 무시된 파일이라 조용히 통과한 것인지 의심해
`--format json` 으로 다시 확인하니 `files linted: 1`, `errors: 0`, `suppressedMessages: 0` 이었다.
실제로 린트되고 통과한다.

기각. 린터가 강제하는 규약은 린터에게 묻는다.

## 5. "Core Web Vitals 임계값이 틀렸다"

`performance-status.ts:50-54` 의 `FIELD_THRESHOLDS` 를 `web-perf` 스킬의 기준값과 대조했다.

| metric | 코드          | 기준          |
| ------ | ------------- | ------------- |
| LCP    | 2,500 / 4,000 | 2.5s / 4s     |
| INP    | 200 / 500     | 200ms / 500ms |
| CLS    | 0.1 / 0.25    | 0.1 / 0.25    |

전부 일치. 기각.

`judgeLab` 의 lab 임계값(LCP 3,000, CLS 0.1, score 0.8)은 CWV 경계가 아니라 자체 목표값이라
대조 대상이 아니다. TBT 에 고정 임계값이 없고 회귀만 보는 것도 의도된 설계로 읽힌다.

## 보류

### `redactPerformanceError` 의 실제 유출 경로

pathname 을 남기는 것은 확인했다([01](01-security-and-boundaries.md#s1-redactperformanceerror-가-url-pathname-을-남긴다-낮음)).
그런데 현재 코드에서 웹훅 URL 이 오류 메시지에 들어가는 경로는 찾지 못했다.
`send-webhook.ts` 의 실패 문자열은 상태 코드만 담고, undici 의 네트워크 오류 메시지에도
URL 이 없다. GitHub Actions 의 시크릿 마스킹도 한 겹 더 있다.

"확인된 유출"이 아니라 "강도가 다른 방어"로 낮춰 적었다.
실제 도달 경로를 찾으면 심각도를 올려야 한다.

### Discord 400 의 실측

[02](02-correctness.md#c1-빈-목록이-discord-400-을-만들고-알림이-사라진다) 의 높음 1건은 Discord API 계약과 코드 경로 추적으로 세웠다.
실제로 빈 field 를 보내 400 을 받아 보지는 않았다.
모델이 두 배열을 모두 비우는 빈도도 알 수 없다.
