# Sentry AI 트리아지 배포 체크리스트

> 설계 [ADR-0006](../adr/0006-ai-error-triage-alerts.md) · 구현 계획 [plan 10](../plan/10-sentry-ai-triage.md)
> 순서를 바꾸면 안 되는 것 두 가지: 공식 Discord Integration 제거는 **마지막**, Vercel env 는 **Production 스코프만**.

## 완료

### 코드

- [x] 페이로드 정규화 — 화이트리스트, 실물 fixture 계약 테스트
- [x] 웹훅 서명 검증 — HMAC-SHA256, 원문 대상, `Content-Length` 선검사
- [x] 트리아지 provider — env 교체, primary/폴백, 제공자별 요청 본문 고정 테스트
- [x] Discord 카드 — 판정 카드와 기본 카드, 3단계 길이 처리
- [x] 카드 전송 — 429 `retry_after` 준수, 5xx 1회 재시도
- [x] 일일 상한 — Upstash 카운터, 실패 시 통과
- [x] 기록 계층 — 테이블·RPC 2개·transport
- [x] 오케스트레이션과 라우트 — `after()` 로 202 이후 처리
- [x] 전체 검증 통과 — 테스트 1969개, 타입·lint·format·knip·deps·프로덕션 빌드
- [x] 코드리뷰 9건 반영 (커밋 `4a911f3`~`76909db`)

### 데이터베이스 (2026-08-19 적용)

- [x] `supabase db push` 로 `20260819000000_sentry_alerts.sql` 원격 적용
- [x] `private.webhook_secrets` 에 시크릿 SHA-256 1회 등록
- [x] anon 직접 SELECT 가 빈 결과인지 확인
- [x] anon 직접 INSERT 가 `42501` 로 거부되는지 확인
- [x] 틀린 시크릿 RPC 가 `42501 unauthorized` 로 거부되는지 확인 (pgcrypto 동작도 함께 증명)
- [x] 맞는 시크릿 RPC 가 행 id 를 돌려주는지 확인
- [x] 같은 `(issue_id, event_id)` 두 번째 호출이 `null` 인지 확인
- [x] 열거값 밖 `severity` 가 CHECK 로 거부되는지 확인
- [x] 배열 아닌 `recommendedActions` 가 함수에서 거부되는지 확인
- [ ] 검증용 행 삭제 — `delete from public.sentry_alerts where issue_id = 'verify-1';`

### 제공자

- [x] `gpt-5.6-luna` 가 `reasoning.effort` + strict `json_schema` 조합을 받는지 실호출 확인
- [x] 두 제공자 실호출 확인 (openai 3.9초 · gemini 1.6초, 판정 일치)

## 배포 전

### Sentry

- [x] Internal Integration 의 Webhook URL 을 `https://<도메인>/api/sentry-alert` 로 교체
- [x] `Alert Action` 이 켜져 있는지 확인 (꺼져 있으면 Alert Rule 목록에 안 뜬다)
- [x] 하단 Webhooks 구독(issue·error·comment)이 전부 꺼져 있는지 확인
- [x] Alert Rule 을 Production · 신규/회귀/escalated 로 좁히기 (캡처용 임시 규칙을 고쳐 썼다)
- [x] 규칙 이름을 `Production AI triage` 로 지정. 이 문자열이 카드 푸터의 `triggered_rule` 로 나간다
- [ ] (선택) 이 라우트의 transaction 제외 필터 — `transaction is not POST /api/sentry-alert`
  - 넣지 않아도 된다. `handleSentryAlert` 가 예외를 전부 삼켜 `after()` 안에서 Sentry 로 올라갈
    오류가 없으므로 알림 고리가 코드에서 막혀 있다.
  - 반대로 `is not` 조건은 해당 태그가 없는 이벤트의 판정이 구현에 달려 있어, 태그 없는 이슈의
    알림을 통째로 삼킬 수 있다.
  - 넣는다면 저장 후 테스트 오류로 카드가 오는지 반드시 확인한다.

- [x] 캡처용 테스트 이슈와 Replay 정리 (`payload capture`, `capture A1`, `capture A2`)
- [x] Sentry 기본 이메일 알림이 살아 있는지 확인 (파이프라인이 죽었을 때의 유일한 백업)

### Vercel

- [x] 환경변수 9종을 **Production 스코프에만** 등록. Preview 에는 넣지 않는다
      (공개 저장소의 프리뷰 배포가 같은 시크릿으로 실행된다)

Sensitive 로 넣을 것은 자격증명 5개다.

| 변수                                                   | 유형                                |
| ------------------------------------------------------ | ----------------------------------- |
| `SENTRY_ALERT_WEBHOOK_SECRET`                          | Sensitive                           |
| `SENTRY_ALERT_LOG_SECRET`                              | Sensitive                           |
| `DISCORD_ALERT_WEBHOOK_URL`                            | Sensitive (URL 자체가 자격증명이다) |
| `TRIAGE_PROVIDER_API_KEY`                              | Sensitive                           |
| `TRIAGE_FALLBACK_PROVIDER_API_KEY`                     | Sensitive                           |
| `TRIAGE_PROVIDER=openai`                               | 평문                                |
| `TRIAGE_PROVIDER_MODEL=gpt-5.6-luna`                   | 평문                                |
| `TRIAGE_FALLBACK_PROVIDER=gemini`                      | 평문                                |
| `TRIAGE_FALLBACK_PROVIDER_MODEL=gemini-3.5-flash-lite` | 평문                                |
| `SENTRY_TRIAGE_DAILY_LIMIT` (선택)                     | 평문                                |

모델명을 Sensitive 로 넣지 않는다. 비밀이 아닌데 나중에 어떤 모델로 돌고 있는지 확인할 수 없게 된다.
판정 품질이 이상할 때 제일 먼저 보는 값이다.

- [x] Sensitive 는 저장 후 값을 다시 볼 수 없으므로 5개 모두 사본을 확보한다.
      특히 `SENTRY_ALERT_LOG_SECRET` 은 DB 에 해시만 있어 잃어버리면 복구할 수 없고,
      새로 만들어 `private.webhook_secrets` 행을 갱신해야 한다

### Discord

- [x] `#aperture-errors` 채널 웹훅 URL 발급

## 배포 후 검증

- [ ] 테스트 오류 1회로 카드 도착 확인 — 제목 접두사, 심각도 색, Sentry 링크, 조치 목록

      푸터는 이 형태여야 한다. 규칙 이름이 다르게 보이면 다른 Alert Rule 이 발동한 것이다.

  ```
  production · aperture@<sha> · Production AI triage · openai/gpt-5.6-luna · 확신도 <high|medium|low>
  ```

- [ ] `sentry_alerts` 에 행이 남고 `completed_at` 이 채워지는지 확인
- [ ] 같은 전달을 재전송했을 때 두 번째 카드가 안 나가는지 확인
- [ ] 잘못된 서명으로 호출했을 때 401 인지 확인
- [ ] Vercel 런타임 로그에 시크릿이 찍히지 않는지 확인

## 마지막

- [ ] **공식 Discord Integration 제거** (위 검증이 전부 끝난 뒤에만)
- [ ] 캡처 스크립트와 `package.json` 의 `capture:sentry-webhook` 항목 삭제
- [ ] plan 05 P1 의 이관 항목 정리

## 운영 중 확인

처리가 끝나지 않은 전달을 보는 쿼리다. 계속 쌓이면 파이프라인이 조용히 죽은 것이다.

```sql
select id, issue_id, title, triage_status, notified, notify_error, created_at
from public.sentry_alerts
where completed_at is null or notified = false
order by created_at desc
limit 50;
```

- [ ] 첫 배포 후 24시간과 7일 시점에 판정 품질과 LLM 호출량 확인
- [ ] 판정이 반복해서 빗나가면 모델을 올리기 전에 입력 화이트리스트에 빠진 신호가 있는지 먼저 본다
