# UI 품질 테스트

## 시각 회귀

Playwright가 핵심 공개 화면 6개를 데스크톱·모바일로 캡처한다. 기준 이미지는
`e2e/visual/public-pages.visual.e2e.ts-snapshots/`에 커밋한다.

Windows에서는 로컬로 실행할 수 있다.

```powershell
npm run test:visual
npm run test:visual:update
```

픽셀 기준선은 Windows Chromium 렌더링에 고정되어 있어 macOS에서는 시각 테스트가 자동으로
skip된다. 맥에서 디자인을 변경했다면 브랜치를 push한 뒤 GitHub의 **Actions → Update visual
snapshots → Run workflow**에서 해당 브랜치를 선택한다. Windows runner가 production build 기준
이미지를 생성해 `[TEST] Windows 시각 기준선 갱신` 커밋으로 같은 브랜치에 push한다. 실행 결과의
`windows-visual-snapshots-*` artifact에서도 생성 이미지를 확인할 수 있으며, 커밋 후 CI도 새
커밋을 대상으로 자동 실행된다.

이미 실행 중인 로컬 서버를 사용할 때는 다음처럼 지정할 수 있다.

```powershell
$env:PLAYWRIGHT_BASE_URL = "http://127.0.0.1:3001"
npm run test:visual
```

의도한 디자인 변경일 때만 `test:visual:update`로 production build 기준 이미지를 갱신하고 이미지 diff를
검토한다. CI 실패 시 `playwright-reports` 아티팩트에서 actual·expected·diff를 확인한다.

## 접근성

```powershell
npm run test:a11y
```

axe가 핵심 공개 화면의 문서 구조, ARIA, WCAG AA 색상 대비를 검사한다.

## 언어 진입과 분석 동의

`e2e/pages/locale.e2e.ts`는 루트 `/`의 쿠키·`Accept-Language` 우선순위, 307 상태,
query 보존과 비공유 캐시 계약을 검증한다. `e2e/pages/analytics-consent.e2e.ts`는 동의 전 Google
tag 요청 차단, 허용 후 로드, 철회 후 재허용, Footer 재설정, 섹션별 Primary 버튼 색과 배너가 열린
상태의 챗봇 접근을 검증한다. E2E의 기본 저장 상태는 `denied`라 기존 공개 화면 테스트에 동의 배너가
겹치지 않는다.

## E2E 불안정 테스트 좁히기

이 저장소의 production E2E는 변경이 없어도 실행마다 소수가 실패한다. 실패를 봤을 때
종료 코드가 아니라 어떤 테스트가 실패했는지를 변경 전 커밋과 대조한다.

`e2e/run.cjs`는 `--build`를 줄 때만 빌드한다. 한 번 빌드해 두면 이후 반복은 서버 기동과
Playwright 실행만 한다. 나머지 인자는 Playwright로 그대로 넘어간다.

```bash
# 최초 1회. dist 를 만든다
NEXT_DIST_DIR=.next-playwright-v7 node e2e/run.cjs --production --build e2e/pages/locale.e2e.ts

# 이후 반복 (빌드 없음)
NEXT_DIST_DIR=.next-playwright-v7 E2E_PRODUCTION=1 \
node e2e/run.cjs --production \
  e2e/pages/photo.e2e.ts --project=mobile --repeat-each=20
```

스펙 단위로 재현률을 먼저 재고, 재현되는 항목만 `-g "<테스트명>"`으로 좁혀 반복한다.
줄 번호는 코드가 바뀌면 어긋나므로 기록에는 테스트명을 쓴다.

| file | project | test title | before | after | 원인 |
| ---- | ------- | ---------- | ------ | ----- | ---- |

`before`·`after`는 `실패수/반복수`로 적는다. **수정 전에 실패를 재현하지 못했다면
`after`가 0이어도 "고쳤다"가 아니라 "재현하지 못했다"** 이다.

### 관찰 기록: 로컬 실패는 머신 부하와 함께 움직인다

같은 dist 로 조건만 바꿔 재현을 시도한 결과다.

| 조건                                                   | 실행 시간 | 결과                       |
| ------------------------------------------------------ | --------- | -------------------------- |
| `photo.e2e.ts` 단독, mobile, `--repeat-each=20`        | 5.7m      | 220/220 통과               |
| `photo.e2e.ts` 단독, desktop, `--repeat-each=20`       | 5.6m      | 200 통과 / 20 skip, 실패 0 |
| `photo`+`chat`+`dev-article-detail`, `--repeat-each=3` | 4.3m      | 183 통과 / 33 skip, 실패 0 |
| 전체 스위트, 동시 작업 없음                            | 3.5m      | 211 통과 / 75 skip, 실패 0 |

실패가 나왔던 과거 실행과 비교하면 시간 차이가 크다. 같은 전체 스위트가 59.3m 걸리면서 6건이
실패한 적이 있고, 그때는 다른 빌드·테스트가 함께 돌고 있었다. 3.5m 대 59.3m 은 17배이며,
`playwright.config.ts` 의 `expect.timeout` 이 10초인 이상 이 정도로 느려지면 타임아웃이 무작위로
터진다. 실행마다 다른 테스트가 실패하는 양상이 그 설명과 맞는다.

따라서 로컬에서 e2e 를 돌릴 때는 **빌드·유닛 테스트를 동시에 돌리지 않는다.** 실패를 봤다면
먼저 그 실행의 총 소요 시간을 확인한다. 평소보다 몇 배 느렸다면, 테스트 자체의 타이밍 결함과는
별개로 머신 부하가 실패를 증폭했을 가능성을 우선 의심할 근거가 된다.

강한 상관관계까지가 확인된 범위다. 수정 전 실패를 재현하지 못했고 실패 trace 를 원인별로
분석하지도 못했으므로 인과는 입증되지 않았다. 부하에도 견뎌야 하는 테스트라면 결국 timeout 이나
대기 조건이 취약한 것일 수 있다.

아직 확인하지 못한 것: CI(windows-latest)에서도 같은 실패가 나는지는 별개 문제다. CI 는
`retries: 2` 라 한 번 실패해도 리포트가 통과로 끝날 수 있으므로, 실제 재시도율을 보려면 실행
로그의 flaky 표시를 확인해야 한다.

### trace 로 원인 가르기

`playwright.config.ts`가 `trace: "retain-on-failure"`를 켜 두었다.

```bash
npx playwright show-trace test-results/<...>/trace.zip
```

- 이미지 로딩·레이아웃 이동 (`e2e/utils/settle-images.ts`가 덮지 못하는 지점)
- motion·scroll 완료 대기 부족
- URL 상태 갱신과 assertion 경쟁 (`?photo=`·`?project=` 딥링크)
- chat route interception 등록 시점
- dialog focus·scroll lock 해제 시점

### 완료 기준

수정 후 최소 재현 루프에서 0회, 같은 project로 해당 파일 전체를 반복했을 때도 0회,
마지막으로 전체 production E2E가 CI retry 없이 첫 시도에 통과해야 한다.

## Lighthouse

프로덕션 빌드가 있어야 한다.

```powershell
npm run build
npm run test:lighthouse
```

CI는 홈·사진·음악·프로젝트 화면의 Lighthouse 보고서를 `lighthouse-reports` 아티팩트로
보관한다. 성능은 초기 기준을 수집하기 위해 경고로 두며, 접근성·Best Practices·SEO가
기준 미달이면 실패한다.

### Core Web Vitals 알림의 로컬 fixture 테스트

수집 정규화, 판정, 카드 구성, AI 계약 테스트가 전부 fixture 기반이라 네트워크와
API key 가 필요 없다.

```powershell
npm test -- performance
```

### 운영 Lighthouse 수동 실행

`core-web-vitals-report.yml` 워크플로가 쓰는 측정을 로컬에서 돌릴 수 있다. CI의
`npm run test:lighthouse`와는 config와 대상이 다르며 서로의 계약을 바꾸지 않는다.
운영 origin을 직접 측정하므로 빌드는 필요 없다.

```powershell
$env:SITE_URL = "https://sungjoon.works"
npm run test:lighthouse:production   # 대표 URL을 3회씩 측정해 JSON·HTML·manifest 기록
npm run test:lighthouse:merge        # shard 결과와 manifest 병합 (단일 실행이면 그대로 통과)
```

shard 분할이 필요하면 `LIGHTHOUSE_SHARD_INDEX`·`LIGHTHOUSE_SHARD_COUNT`를 설정한다.
미설정 시 전체 URL을 한 번에 측정한다. 절차와 장애 대응은
[troubleshooting](troubleshooting/core-web-vitals-alerts.md)에 있다.

## Storybook

```powershell
npm run storybook
npm run build-storybook
```

테마와 섹션 액센트는 상단 툴바에서 변경할 수 있다. 새 재사용 UI를 추가할 때 기본,
빈 상태, 긴 텍스트, 모바일처럼 레이아웃 경계가 달라지는 상태를 story로 함께 추가한다.
