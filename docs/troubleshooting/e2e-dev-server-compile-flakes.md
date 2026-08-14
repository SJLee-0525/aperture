# E2E가 dev 서버 컴파일 타이밍에 흔들리는 문제

## 기록 범위

`7fd2ca1`부터 `2fb4af5`까지, 로컬 E2E 실행 방식을 dev 서버에서 프로덕션 빌드로 옮기면서 정리한
내용이다. 무작위로 보이던 실패 세 건의 원인, 그 과정에서 두 번 잘못 짚은 진단, 원인이 로그에
남지 않던 하네스 결함을 함께 기록한다.

## 증상

전체 실행에서 한두 개가 실패하는데 매번 다른 스펙이었다. 단독으로 다시 돌리면 통과했다.

```text
1) [desktop] › e2e\pages\search.e2e.ts:5:5
   Expected pattern: /\/ko\/search\?q=…$/
   Received string:  "http://127.0.0.1:3100/ko"

2) [desktop] › e2e\pages\chat.e2e.ts:245:7
   Locator: getByRole('dialog', { name: '새벽의 항구' })
   Error: element(s) not found        ← 모달은 열렸지만 이름이 "사진 불러오는 중"

3) [mobile] › e2e\pages\photo.e2e.ts:7:7
   Locator: locator('[data-photo-modal-image-area="ready"]')
   Expected: attached
```

## 원인 1. 라우트 첫 컴파일이 단언 창 안에서 일어난다

`search.e2e.ts`의 trace 네트워크 타임라인이 답을 줬다.

```text
734607  GET /api/search-index                  +9518ms
734692  GET /ko/search?q=…&_rsc=…              +9550ms   ← 앞 컴파일 뒤에 줄 선다
734696  toHaveURL 시작 (deadline 744696)
744216  마지막 폴링, 아직 /ko
744242  RSC 응답 도착                                     ← 마지막 폴링 26ms 뒤
```

`next dev`는 라우트를 첫 요청에서 컴파일하고 그동안 다른 응답까지 막는다. App Router는 RSC
페이로드가 도착해야 URL을 바꾸므로, 클라이언트 내비게이션 뒤의 단언이 그 컴파일을 통째로
기다리게 된다. `expect` 기본 타임아웃은 10초다(`playwright.config.ts:60`).

같은 구조가 나머지 두 건에도 있었다.

| 엔드포인트               | 부르는 시점        | 그 뒤의 단언                  |
| ------------------------ | ------------------ | ----------------------------- |
| `/api/search-index`      | 검색창 포커스      | 제출 후 URL (10초)            |
| `/api/photos/[id]`       | 사진 모달 열기     | 로드된 dialog 이름 (10초)     |
| `/api/dev-projects/[id]` | 프로젝트 모달 열기 | 스켈레톤이라 단언이 안 기다림 |

`photo.e2e.ts`가 `page.route("**/api/photos/*")`로 감싸고 있어 안전해 보였다. 그런데 그 핸들러는
`route.continue()`(스켈레톤 타이밍용 300ms 지연)라 실서버를 그대로 친다. 목킹은 컴파일을 막지
못한다.

`page.goto`는 내비게이션 타임아웃(30초)을 쓰므로 컴파일을 흡수한다. 위험한 자리는 클릭이나
포커스가 부른 요청을 10초 `expect`로 기다리는 곳뿐이다.

## 원인 2. dev 서버는 60초 놀린 엔트리를 버린다

처음에는 전역 셋업에서 이 엔드포인트들을 한 번 데워두면 끝이라고 판단했다. 틀렸다.

`photo.e2e.ts:7`(mobile)이 실패했을 때 `/api/photos`는 이미 desktop 차례에 컴파일된 상태였는데도
응답이 10초 넘게 오지 않았다.

```js
// next/dist/server/dev/on-demand-entry-handler.js:256
if (lastActiveTime && Date.now() - lastActiveTime > maxInactiveAge)
  entries[entryKey].dispose = true;
```

`maxInactiveAge` 기본값은 60초이고(`next/dist/server/config-shared.js:121`), 폐기 검사는 최대
5초마다 돈다. 20분 넘는 런에서 한 번 데워두는 것으로는 아무것도 해결되지 않는다. 60초 안에 다시
안 쓴 라우트는 버려지고 다음 요청에서 처음부터 컴파일한다.

같은 `public-pages` 테스트가 실행마다 1.5초에서 22.4초까지 널뛰던 것도 이걸로 설명된다.

## 해결. 로컬 기본 실행을 프로덕션 빌드로

CI는 이미 프로덕션 빌드로 돌고 있었다(`Production E2E` 잡, mock + `next start`). 로컬만 dev로
돌아 CI와 다른 것을 보고 있었을 뿐이다.

```json
"test:e2e":       "node e2e/run.cjs --production --build",
"test:e2e:ci":    "node e2e/run.cjs",
"test:e2e:admin": "node e2e/run.cjs e2e/admin"
```

`--build`를 `test:e2e`에 붙이면 CI의 `Production E2E` 잡이 내려받은 산출물을 버리고 다시 빌드하게
된다. 그래서 그 잡만 `test:e2e:ci`로 분리했다.

| 항목        | dev       | 프로덕션 빌드              |
| ----------- | --------- | -------------------------- |
| 런 시간     | 23.3분    | 4.7분                      |
| 컴파일 대기 | 있음      | 없음                       |
| admin 스펙  | 포함      | 제외(인증 우회가 금지된다) |
| 시각 회귀   | 전부 skip | 실행                       |

admin 스펙이 프로덕션에서 빠지는 것은 설계다. `AuthGuard`의 통과 조건은 `isAdmin || testSession`
인데, `testSession`을 여는 `NEXT_PUBLIC_ADMIN_TEST_SESSION`을 `lib/auth/test-admin-session.ts`가
프로덕션 빌드에서 금지한다. 그래서 `playwright.config.ts:20`이 `E2E_PRODUCTION=1`일 때
`e2e/admin/**`을 수집하지 않고, dev 서버로 그 디렉터리만 따로 돌린다.

## 프로덕션으로 옮기고 드러난 것

컴파일 문제는 사라졌지만 `chat.e2e.ts:162`가 프로덕션에서 3/3 실패했다. `body.style.top`이
`-NNNpx`여야 하는데 `0px`이었다.

### 잘못 짚은 진단

계측에서 클릭 직후 `scrollY`가 500에서 167을 거쳐 0으로 움직이는 것을 보고, App Router가 합성
popstate에서 스크롤을 복원하는 탓에 모달을 열면 배경 스크롤 위치를 잃는다고 진단했다. 사용자
영향까지 단정했다. 실제 브라우저에서는 정상이었다.

```text
scroll y=891
LOCK top=-892px pos=fixed y=0    ← 잠금이 위치를 정확히 붙잡는다
LOCK top=- pos=- y=892           ← 닫으면 복원
```

앱은 처음부터 옳았다. 그 숫자들은 전부 Playwright 하네스가 만든 것이었다.

### 실제 원인

세 가지가 겹쳐 있었다.

첫째, 인트로 스플래시가 걷히기 전에 클릭했다. `IntroSplash`는 1.4초 CSS 애니메이션이고
`position: fixed; inset: 0`이라 그동안 포인터를 가로챈다. 테스트는 로드 후 100ms쯤에 클릭해
재시도를 유발했고, 그 사이 스크롤이 흐트러졌다. 잠금값이 실행 환경마다 달랐다. 프로덕션은
`-18px`, dev는 `-269px`이었다.

둘째, 스크롤 위치에서 화면 밖인 카드를 클릭했다. 모바일 뷰포트 839px에서 카드 배치는 이렇다.

| 카드                 | 문서 좌표 |
| -------------------- | --------- |
| 개인 포트폴리오      | 166–503   |
| 사진 포트폴리오      | 520–857   |
| 실시간 협업 대시보드 | 873–1210  |

`scrollTo(0, 500)` 뒤 보이는 구간은 500부터 1339까지라 첫 카드는 화면 밖이다. Playwright는 클릭 전
대상을 뷰포트로 끌어오므로(`scrolling into view if needed`) `scrollY=166`까지 되감는다. 반복해서
나오던 `-167px`의 정체다.

셋째, 단언이 그 손실을 덮었다. `/^-\d+px$/`는 음수면 통과라, 스크롤 위치를 500에서 167로 잃은
상태도 초록불이었다. 프로덕션이 우연히 `0px`으로 떨어져서야 드러났다. dev에서 통과하던 것은
검증이 아니라 운이었다.

### 고친 방향

화면이 자리 잡은 뒤에 스크롤하고, 그 위치에서 이미 온전히 보이는 카드를 누르고, 잠금값을 실제
오프셋과 대조한다.

```ts
await expect(page.locator("[data-intro-splash]")).toBeHidden();
await page.evaluate(() => window.scrollTo(0, 500));
const projectButton = page.getByRole("button", { name: /사진 포트폴리오/ });
await expect(projectButton).toBeInViewport({ ratio: 1 });
const scrolledY = await page.evaluate(() => window.scrollY);
await projectButton.click();
await expect
  .poll(() => page.evaluate(() => Number.parseFloat(document.body.style.top)))
  .toBeCloseTo(-scrolledY, 0);
```

이제 dev와 프로덕션 모두 `-500px`으로 일치한다.

잠금의 `position: fixed` + 음수 `top` 경로는 폭 767px 이하에서만 돈다는 점도 기억해 둘 만하다
(`hooks/use-scroll-lock.ts:59`). 데스크톱 폭에서는 `overflow: hidden`만 걸고 `body.style.top`을
건드리지 않으므로 이 증상 자체가 관찰되지 않는다.

## 서버가 죽어도 아무것도 안 남던 문제

한 실행에서 3100 서버가 런 도중 죽어 남은 200여 개가 전부 `ERR_CONNECTION_REFUSED`로 떨어졌다.
죽은 이유는 어디에도 없었다. `e2e/run.cjs`가 서버를 `stdio: "ignore"`로 띄워 출력을 통째로
버렸고, `waitUntilReady()`는 시작할 때 한 번만 생사를 확인한 뒤로는 보지 않았기 때문이다.

서버 출력을 `e2e-server.log`로 받도록 바꿨다. Playwright가 시작할 때 `test-results/`를 비우므로 그
안에 두면 지워진다. 저장소 루트에 쓰고 `.gitignore`에 넣었다. 그리고 `server.on("exit")`에서
테스트가 아직 돌고 있으면 로그 꼬리를 찍고 Playwright를 중단한다. 실패 200여 개가 원인을 덮지
않게.

## 시각 기준선이 미완성 상태로 굳은 문제

`update-visual-snapshots`가 만든 기준선으로 바로 이어 돈 CI에서 `dev-article-detail` 데스크톱만
실패했다. 같은 커밋, 같은 러너인데 높이가 달랐다.

```text
Expected an image 1440px by 3736px, received 1440px by 4639px.
```

본문 이미지는 마크다운이 크기를 담지 않아 width/height 없는 `<img loading="lazy">`로 그려진다
(`ArticleBody.tsx`). 로드 전에는 높이가 0이다. 게다가 mock 본문 이미지는 실재하지 않는 데모
버킷을 가리켜 항상 404다(`mocks/dev-articles.ts:17`). 404가 도착하면 대체 워드마크가 렌더돼
페이지가 길어진다. 로컬에서 세 상태를 재보면 이렇다.

| 상태                      | 높이   |
| ------------------------- | ------ |
| 이미지 pending (높이 0)   | 3736px |
| 404 뒤 대체 이미지 렌더   | 4639px |
| 이미지가 정상 로드된 경우 | 5456px |

기준선 3736px은 이미지가 결판나기 전에 찍힌 미완성 상태였다. 스펙의 이미지 대기가 lazy면서 아직
안 끝난 이미지를 건너뛰고 있었기 때문이다.

```js
.filter((image) => image.loading !== "lazy" || image.complete)
```

그 이미지가 fullPage 캡처 도중에 결판나면서 레이아웃이 903px 자랐다. 지금은 모든 이미지를
eager로 바꿔 전부 요청시키고, 실패한 이미지가 대체 이미지를 새로 렌더하므로 높이가 두 번 연속
같아질 때까지 반복한다. 로컬 2회 반복에서 데스크톱이 두 번 다 4639px로 나온다.

본문 이미지가 자리를 미리 잡지 않는 것은 방문자에게도 레이아웃 이동으로 보인다. 마크다운에 크기가
없어 생긴 제약이라 별도로 다룰 문제다.

## 회귀 조건

dev 서버로 도는 스펙에서는 클릭이나 포커스가 부른 요청을 10초 `expect`로 기다리지 않는다. admin
스펙이 전부 `test.setTimeout(90_000~120_000)`을 두는 이유가 이것이다. `page.route(...).continue()`는
컴파일을 막지 못하므로, 목킹돼 있다고 안전하다고 보면 안 된다.

화면 밖 요소를 클릭하면 Playwright가 페이지를 되감는다. 스크롤 위치를 검증하는 테스트는 클릭
대상이 그 위치에서 보이는지 먼저 확인해야 한다. 애니메이션이 도는 동안에도 클릭하지 않는다.
인트로 스플래시(1.4초)가 걷힌 뒤에 조작한다.

어떤 값이든 통과하는 단언은 검증이 아니다. 가능하면 측정한 값과 대조한다.

프로덕션에서만 실패한다고 해서 프로덕션 문제인 것도 아니다. 여기서 세 건 모두 타이밍이 드러낸
기존 결함이었고, 그중 하나는 앱이 아니라 테스트의 결함이었다.

## 남은 것

시각 회귀 기준선은 `update-visual-snapshots` 워크플로(GitHub Actions Windows)가 만들어 브랜치에
커밋한다. 로컬 Windows에서도 생성은 되지만 CI 러너와 픽셀이 같은지는 확인된 바 없어 커밋하지
않는다. 위 이미지 대기 수정 뒤에 `dev-article-detail-desktop.png` 하나를 다시 만들어야 한다.

`dev-article-detail.e2e.ts:62`(mobile)이 한 번 실패했다가 단독 재실행과 이후 두 번의 전체 런에서
재현되지 않았다. 원인 미상.
