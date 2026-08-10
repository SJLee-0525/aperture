# Sentry 오류 수집과 Discord 알림 트러블슈팅

> 범위: Next.js 브라우저·Node·Edge 오류, 동일 출처 `/monitoring` 터널, Sentry Alerts와 Discord
> 관련 결정: [ADR-0004: 동의 기반 오류 모니터링](../adr/0004-consent-gated-error-monitoring.md)
> 운영 체크리스트: [Sentry 오류 모니터링 구현 및 운영 TODO](../plan/05-sentry-error-monitoring.md)

## 빠른 판별표

| 증상                                           | 먼저 볼 것                          | 의미·조치                                                                                                              |
| ---------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| DevTools에서 직접 `throw`했지만 요청이 없음    | 오류를 실행한 위치                  | 콘솔의 동기 예외는 DevTools가 처리할 수 있다. `setTimeout` 안에서 던진다.                                              |
| `/monitoring`이 `200 {}` 반환                  | 요청 envelope의 item `type`         | 빈 JSON 응답은 정상이다. `event`가 있으면 오류 이벤트이고, `replay_event`·`replay_recording`만 있으면 Replay 요청이다. |
| Sentry에는 이벤트가 있지만 새 Issue가 없음     | 기존 Issue의 최신 이벤트와 Activity | 메시지가 달라도 같은 스택이면 기존 Issue로 그룹화될 수 있다.                                                           |
| `runtime=node v…`만 보임                       | 커스텀 태그 이름                    | `runtime`은 Sentry 예약 태그다. 앱 분류에는 `app_runtime`을 사용한다.                                                  |
| 환경 목록에 `production`이 없음                | Production 이벤트 수신 여부         | Environment는 첫 이벤트를 받은 뒤 나타난다. 배포 후 Production 오류를 한 번 수집한다.                                  |
| Discord 테스트 알림은 오지만 실제 알림은 안 옴 | Issue 상태와 Alert 필터             | 연동은 정상이다. 신규·Escalated·Regressed 전환 여부와 태그 필터를 확인한다.                                            |
| Regressed 알림처럼 보이지 않음                 | Issue Activity와 Alert 이름         | Discord에 보이는 이름은 고정된 규칙 이름이다. Activity의 `Resolved → Regressed`로 판정한다.                            |

## 브라우저 오류를 확실하게 발생시키기

먼저 사이트의 개인정보 설정에서 오류 보고를 허용하고 페이지를 새로고침한다. 동의 전에 브라우저
SDK 청크를 내려받지 않는 것이 이 프로젝트의 계약이므로, 동의하지 않으면 오류가 전송되지 않는다.

DevTools Console에서 다음처럼 비동기 콜백 안에서 오류를 발생시킨다.

```js
setTimeout(() => {
  throw new Error("Sentry browser verification");
}, 100);
```

다음처럼 Console 평가 자체에서 바로 던지는 방식은 쓰지 않는다.

```js
throw new Error("Sentry browser verification");
```

브라우저가 Console 평가 오류를 페이지의 전역 오류 이벤트로 전달하지 않을 수 있기 때문이다.

## `/monitoring`의 `200 {}` 해석하기

`next.config.ts`의 `tunnelRoute: "/monitoring"`은 브라우저 이벤트를 동일 출처로 받은 뒤 Sentry
Relay에 전달한다. Relay는 저장된 이벤트 내용을 응답으로 돌려주지 않으므로 `200`과 `{}`는 실패
신호가 아니다.

Network 패널에서 `/monitoring` POST의 Request Payload를 열고 envelope item header를 확인한다.

```json
{ "type": "event" }
```

- `event`: 오류 이벤트. Sentry Issues에서 찾을 대상이다.
- `replay_event`, `replay_recording`: Replay 데이터다. 이 요청만 성공해도 오류 Issue가 생기지는 않는다.
- `session`: 세션 상태 데이터다.

응답에 `x-sentry-rate-limits`나 `retry-after` 헤더가 있으면 쿼터·속도 제한도 확인한다. 이벤트
payload에는 최소한 다음 분류값이 있어야 한다.

```text
environment=preview|production
release=<배포 릴리즈>
app_runtime=browser
area=public|admin
```

## `runtime` 태그 충돌

Sentry SDK는 `runtime=node v24…`처럼 실행 환경과 버전을 자동으로 기록한다. 같은 `runtime` 키에
`browser|node|edge`를 넣으면 자동 태그와 충돌하므로 이 프로젝트는 다음 커스텀 키를 사용한다.

| 런타임          | `app_runtime` | `area`   |
| --------------- | ------------- | -------- |
| 공개 브라우저   | `browser`     | `public` |
| 관리자 브라우저 | `browser`     | `admin`  |
| Node            | `node`        | `server` |
| Edge proxy      | `edge`        | `proxy`  |

Event Highlights와 Discord 카드에는 `environment`, `release`, `app_runtime`, `area`,
`transaction`을 표시한다.

## 새 Issue와 기존 Issue 구분

Sentry는 오류 메시지만으로 Issue를 나누지 않는다. 같은 위치에서 발생한 오류는 메시지에 타임스탬프를
넣어도 같은 스택으로 그룹화될 수 있다. 따라서 `A new issue is created` 규칙을 검증할 때 기존
Issue에 이벤트가 추가된 것을 새 Issue로 오해하지 않는다.

새 Issue 알림을 다시 검증해야 한다면 테스트 Issue를 일반 `Delete`한 뒤 같은 오류를 다시 발생시킬
수 있다. `Delete and Discard Forever`는 이후 같은 이벤트까지 버리므로 선택하지 않는다.

Regression은 다음 순서로 검증한다.

1. 기존 테스트 Issue를 `Resolve`한다.
2. Activity에서 상태가 `Resolved`인지 확인한다.
3. 같은 페이지와 같은 코드 위치에서 동일한 오류를 다시 발생시킨다.
4. 같은 Issue의 Activity가 `Regressed in <release>`로 바뀌는지 확인한다.
5. Alert의 최근 발동 시각과 Discord 카드 도착 시각을 비교한다.

Alert 이름은 트리거 원인을 표시하지 않는다. 예를 들어 규칙 이름이 `New issue`로 남아 있으면
Regression으로 발동해도 Discord에는 그 고정 이름이 보인다. 규칙 이름은 실제 조건을 반영하도록
`New, escalating, or regressed public browser issue`처럼 짓는다.

## 현재 Alert Builder에서 태그 필터 설정하기

새 Alerts UI에서는 예전의 `The event's tags match`가 선택 목록의 `Tagged event`로 표시된다.
프로젝트를 먼저 선택한 뒤 `If` 영역의 `Any event`를 눌러 `Tagged event`를 고른다.

권장 규칙은 세 개다.

| 규칙           | `When any`                 | `If all`                                 |
| -------------- | -------------------------- | ---------------------------------------- |
| Public browser | 신규, Escalated, Regressed | `app_runtime = browser`, `area = public` |
| Admin browser  | 신규, Escalated, Regressed | `area = admin`                           |
| Backend        | 신규, Escalated, Regressed | `app_runtime is one of node, edge`       |

`is one of` 값은 토큰 UI가 아니라 단일 입력란일 수 있다. 이때는 공식 문법대로 쉼표로 구분한다.

```text
node, edge
```

Production Environment는 Production 이벤트를 처음 받은 뒤 선택 목록에 나타난다. 그전에는
`All environments`로 Preview 알림을 검증할 수 있지만, Production 배포 후 세 규칙을 모두
`production`으로 제한해야 Preview 배포 오류가 운영 채널에 섞이지 않는다.

## Discord 알림이 오지 않을 때

1. Alert 편집 화면의 `Send Test Notification`을 실행한다.
2. 테스트도 오지 않으면 Discord 설치, 채널 ID와 봇의 채널 보기·메시지 보내기·링크 첨부 권한을 확인한다.
3. 테스트는 오면 Sentry 연동이 아니라 Alert 조건 문제다.
4. 대상 이벤트의 `environment`, `app_runtime`, `area`가 규칙과 일치하는지 확인한다.
5. Issue Activity에서 신규·Escalated·Regressed 중 실제 상태 전환이 있었는지 확인한다.
6. Alert의 최근 발동 시각과 Discord 도착 시각을 비교한다. 전송은 수십 초 이상 늦을 수 있다.

일반 Discord Webhook을 별도로 만들지 않는다. 공식 Integration을 사용해야 Sentry 규칙, 카드 태그와
Resolve·Archive 같은 이슈 동작을 함께 사용할 수 있다.
