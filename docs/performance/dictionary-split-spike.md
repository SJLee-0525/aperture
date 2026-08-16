# DICTIONARY 분할 스파이크: 측정 결과와 기각 근거

> 상태: 기각 (2026-08-16). 정식 전환을 권고하지 않는다.
> baseline: `0f434c6` / 측정 도구: `scripts/bundle-report.mjs`

`LangProvider` 가 전체 UI 사전(ko·en 양쪽)을 client 그래프에 넣는 문제를 줄이려고 프로토타입 두 개를
만들어 측정했다. **공개 라우트는 개선되지 않았고 오히려 소폭 악화됐다.** 프로토타입 코드는
병합하지 않았으므로, 같은 실험을 반복하지 않도록 결과만 남긴다.

## 문제 진단

```
dict 포함 공용 청크: 41,132 bytes raw / 14,111 bytes gzip
  ko '촬영지' 와 en 'Locations' 가 같은 청크에 공존
  route-bundle-stats 기준 54/54 라우트가 First Load 로 받는다
```

두 축이 있고, 축 B 가 축 A 의 전제다.

- 축 A: `[lang]` 이 URL 에 있는데 두 언어가 다 실린다.
- 축 B: `src/features/lang/_components/LangProvider.tsx` 가 `DICTIONARY` 를 정적 import 하고
  `src/app/layout.tsx` 가 admin 포함 모든 경로를 그 provider 로 감싼다. 그런데 `[lang]` 밖의
  dict 소비자는 `not-found.tsx`(4키), `error.tsx`(7키),
  `custom-scrollbar/_components/CustomScrollbar.tsx`(3키) 뿐이다. 약 14개 키를 위해 200개가 넘는
  키 × 2언어를 54개 라우트에 내려보낸다.

## 실험 설계

| arm         | 내용                                                                                                                                                                   |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline    | `0f434c6` 현재 구조                                                                                                                                                    |
| Arm B       | 루트 provider 가 `dictionary-status.ts`(13키 × 2언어)만 쓰고, 공개 트리는 새 `PublicLangProvider` 가 전체 사전을 준다                                                  |
| Arm A+B     | Arm B 위에 사전을 `dictionary-ko.ts`/`dictionary-en.ts` 로 쪼개고 `PublicLangProviderKo`/`En` 두 client entry 를 만든 뒤, 서버 `[lang]/layout.tsx` 가 `lang` 으로 분기 |
| Arm B+Props | 미실행. 아래 결과로 gate 판정이 이미 결정됐다                                                                                                                          |

### 환경 고정

전후 빌드는 `git worktree` 로 각 커밋을 체크아웃해 동일 env 로 돌렸다. `.env.local` 은 빌드
환경에만 주입하고(`set -a; . .env.local; set +a`) 아래를 명시적으로 override 했다.

```
NEXT_PUBLIC_USE_MOCK=1
APERTURE_E2E_ALLOW_PRODUCTION_MOCK=1
NEXT_PUBLIC_ADMIN_TEST_SESSION=0
NEXT_PUBLIC_GA_ID=G-E2ETEST
NEXT_PUBLIC_FORCE_ANALYTICS_CONSENT_BANNER=0
NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY=
```

```bash
# 각 arm 워크트리에서
npx next build
# 측정
node scripts/bundle-report.mjs <baseline-dist> <arm-dist>
```

⚠️ node_modules 는 symlink 가 아니라 `cp -al` 하드링크로 넣는다. Turbopack 이 프로젝트 밖을
가리키는 symlink 를 거부한다.

## 결과

### first-load JS, Baseline 대비 (bytes gzip)

라우트당 값이다. 공용 청크가 여러 라우트에 걸리므로 합산하면 같은 절감을 중복해서 세게 된다.

| arm     | group  | routes | min    | median | max    |
| ------- | ------ | ------ | ------ | ------ | ------ |
| Arm B   | admin  | 25     | -5,129 | -5,125 | +969   |
| Arm B   | public | 64     | +440   | +440   | +440   |
| Arm A+B | admin  | 25     | -5,130 | -5,126 | +966   |
| Arm A+B | public | 64     | +513   | +513   | +6,219 |

HTML·navigation RSC 변화는 라우트당 +3~+22 B 로 사실상 없다.

노이즈 바닥은 라우트당 최대 5 B(90개 라우트, 95분위 3 B)이므로 위 값은 전부 실제 신호다.

### 언어 격리 검증

`/ko`·`/en` 각 라우트의 first-load 청크를 문자열로 검사했다.

| 검사                                   | 결과                                       |
| -------------------------------------- | ------------------------------------------ |
| `/ko/dev` 에 en `"Development Career"` | 0 청크 (전체 EN 사전이 빠짐)               |
| `/en/dev` 에 ko `"촬영지"`             | 1 청크 (KO 사전이 남음)                    |
| `/ko/dev` 에 ko `"촬영지"`             | 1 청크 (정상)                              |
| `/ko/dev` 에 en `"Page scroll"`        | 2 청크 (status 사전 13키×2언어, 의도된 것) |

**양방향 격리에 실패했다.** 두 사전이 여전히 공개 그래프에 있고 provider 모듈만 늘어 Arm A+B 가
Arm B 보다 나쁘다.

원인은 확정하지 못했다. 후보는 Turbopack 의 공용 청크 병합, 다른 client 모듈의 ko 사전 직접
import, root/error/not-found client 그래프의 ko entry 참조, client reference manifest 의 공용 청크
승격 등이다. 프로토타입 워크트리를 정리하면서 importer trace 를 잃었다. gate 기각에는 원인 확정이
필요 없어 더 파지 않았다.

## Gate 판정

| 기준                                 | 결과                             |
| ------------------------------------ | -------------------------------- |
| Cold full load 유의미 감소           | admin ✅ / 공개 ❌ (+440 B 악화) |
| `/ko` 에 en, `/en` 에 ko 문자열 없음 | ❌                               |
| admin 에서 공개 DICTIONARY 청크 제거 | ✅ (-5.1 KB/라우트)              |
| provider 복잡도 대비 절감            | ❌                               |

공개 라우트가 방문자 표면이고 admin 은 1인용이다. admin 라우트당 5.1 KB 를 얻고 공개 라우트당
0.44 KB 를 잃는 교환은 채택 근거가 되지 못한다. 공개 쪽 이득은 언어 격리가 동작해야 나오는데 이
방식으로는 안 됐다.

## 재개한다면 첫 실험

provider 분기 대신 청크 분리를 강제하는 다른 기제를 작은 스파이크로 검증한다. 격리부터 확인하고,
안 되면 나머지 측정은 하지 않는다.

- 언어별 route group
- `next/dynamic` 언어 분기
- 빌드 시 사전 주입

검증은 위 「언어 격리 검증」의 문자열 검사를 그대로 쓰면 된다. 한 라우트만 봐도 판정된다.
