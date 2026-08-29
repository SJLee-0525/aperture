# Firebase 해체와 Supabase 백업 자동화 계획

> 상위 작업: [`docs/checklist/08-supabase-migration.md`](../checklist/08-supabase-migration.md) M8
> 실행 체크리스트: [`docs/checklist/09-supabase-observation-teardown.md`](../checklist/09-supabase-observation-teardown.md)
> 백업·복구 runbook: [`docs/troubleshooting/supabase-backup-and-restore.md`](../troubleshooting/supabase-backup-and-restore.md)
> 기준 측정일: 2026-08-29 KST

## 1. 목표

2주 관찰을 마친 Supabase를 유일한 운영 데이터 소스로 확정하고 Firebase의 코드, 환경변수,
프로젝트를 순서대로 제거한다. Firebase 프로젝트를 삭제하기 전에 로컬 RLS 통합 테스트와
외부 백업을 준비한다. 백업은 GitHub 저장소에 넣지 않고 암호화한 파일만 Backblaze B2에
보관한다.

## 2. 해체 전 기준값

### 2.1 프로젝트와 사용량

측정 기간은 2026-08-15부터 2026-08-29까지다.

| 항목                   | 측정값                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| 플랜                   | Free                                                                                          |
| 리전                   | `ap-northeast-2` (Northeast Asia, Seoul)                                                      |
| 프로젝트 상태          | Healthy, 일시정지 예고 없음                                                                   |
| 마지막 keep-alive 성공 | 2026-08-28 12:30 PM KST                                                                       |
| keep-alive             | 최초 수동 실행 1회(8/15) 성공. 이후 관찰 구간 6회(8/16 2회, 8/19, 8/22, 8/25, 8/28) 모두 성공 |
| DB                     | 0.032GB / 0.5GB                                                                               |
| Storage                | 0.076GB / 1GB                                                                                 |
| Egress                 | 0.25GB / 비캐시 5GB                                                                           |
| Cached Egress          | 0.13GB / 캐시 5GB                                                                             |
| Auth MAU               | 2 / 50,000                                                                                    |
| 최근 24시간 API        | 2xx 약 1,500건, 4xx 0건, 5xx 0건                                                              |

대시보드 캡처 화면에서 Healthy 상태, 서울 리전, `No backups`, 캡처 시점 최근 60분 요청 성공률 100%를
확인했다. 위 Usage 수치는 같은 날 대시보드에서 별도로 읽어 기록한 값이다.

### 2.2 데이터 행 수

| 테이블             | 전체 |      발행 |      초안 |
| ------------------ | ---: | --------: | --------: |
| `photos`           |  173 |       173 |         0 |
| `albums`           |    1 |         1 |         0 |
| `music_works`      |    4 |         3 |         1 |
| `music_awards`     |    0 |         0 |         0 |
| `music_media`      |    4 |         4 |         0 |
| `dev_projects`     |    9 |         8 |         1 |
| `dev_articles`     |    8 |         8 |         0 |
| `rag_documents`    |  424 |       424 |         0 |
| `dev_article_tags` |   10 | 해당 없음 | 해당 없음 |
| `site_documents`   |    3 | 해당 없음 | 해당 없음 |

발행 게이트가 있는 콘텐츠 테이블 7개의 합계는 199행이며 발행 197행, 초안 2행이다.
`rag_documents` 424행은 별도의 RAG 청크다.

### 2.3 RAG 분포

| section     | source_type    | chunks |
| ----------- | -------------- | -----: |
| development | article        |    185 |
| development | devAward       |      4 |
| development | devCareer      |      1 |
| development | devConfig      |      1 |
| development | devEducation   |      3 |
| development | project        |     41 |
| music       | musicCareer    |      2 |
| music       | musicConfig    |      1 |
| music       | musicEducation |      3 |
| music       | musicMedia     |      4 |
| music       | musicWork      |      3 |
| photography | album          |      1 |
| photography | photo          |    173 |
| photography | profile        |      1 |
| profile     | profile        |      1 |
| 합계        |                |    424 |

관리자 유지보수 화면의 동기화 상태는 원본 문서 242/242, 100%, stale 0이다. 이 수치는
청크 수 424와 다른 지표다. 한 원본에서 여러 청크가 생길 수 있다.

### 2.4 Auth와 Storage

| 항목                          |           측정값 |
| ----------------------------- | ---------------: |
| `auth.users`                  |                1 |
| `app_metadata.role = 'admin'` |                1 |
| `media` 객체                  |              831 |
| `media` 총 바이트             | 77,603,202 bytes |

Usage의 Storage 0.076GB와 SQL 합계 77,603,202 bytes는 표시 단위와 반올림이 달라 생긴 차이다.

### 2.5 운영 검증

- 관리자 저장 후 공개 페이지 반영 성공
- 관리자 CRUD, 정렬 RPC, Storage 쓰기 성공
- 대표 챗 질의 3개 성공
- RAG 원본 242/242, 100%, stale 0
- 최근 24시간 Supabase API 4xx·5xx 없음
- 2026-08-15 anon 초안 조회 결과 빈 배열, anon insert HTTP 401
- 2026-08-29 anon `photos` insert HTTP 401, PostgREST `42501`; probe 행 0건 확인
- 2026-08-29 JSONB 8개 테이블의 Firebase Storage 호스트 전수 검색 결과 0건

전수 검색 대상은 `photos`, `albums`, `music_works`, `music_awards`, `music_media`,
`dev_projects`, `dev_articles`, `site_documents`다. 각 테이블의 `data::text`에서
`firebasestorage.googleapis.com`과 `storage.googleapis.com`을 검색했고,
`total_firebase_url_matches = 0`을 확인했다. CSP와 본문 Storage 경로 파서에서 Firebase
호스트를 제거할 수 있는 데이터 선행조건을 충족했다.

## 3. 완료 조건

아래 조건을 모두 만족한 뒤 Firebase 프로젝트를 삭제한다.

1. 로컬 Supabase 기반 RLS 통합 테스트가 anon, authenticated 비관리자, admin 권한을 검증한다.
2. `npm run test:rules`가 로컬 Supabase 테스트를 실행한다.
3. Firebase 패키지, Rules, 설정 파일과 런타임 호스트 허용 목록을 제거한다.
4. 8개 JSONB 테이블에서 Firebase Storage URL이 0건이다.
5. Supabase DB와 `media` 버킷 백업이 Backblaze B2에 생성되고 복호화 검증을 통과한다.
6. 코드 해체 후 전체 품질 게이트와 프로덕션 스모크가 통과한다.
7. Vercel의 Firebase 환경변수를 제거한 배포가 정상이다.
8. Firebase Auth, Storage, 프로젝트를 삭제하고 GCP 결제 표면을 정리한다.

Firebase 자체 백업은 완료 조건에 넣지 않는다. 2026-08-15 이후 운영 쓰기는 Supabase에서만
발생했고, 2주 관찰과 Firebase URL 전수 검사, Supabase 암호화 백업, 빈 프로젝트 실제 복구가
통과했다. Firebase 데이터는 현재 운영본보다 오래됐다. managed Firestore export를 위해 Blaze
플랜을 다시 활성화하지 않는다. 검증된 `post-restore-drill` Supabase 백업을 Firebase 삭제 기준
최종 복구본으로 사용한다.

## 4. 실행 순서

### 4.1 기준값 보완

- [x] 다음 테이블의 `data::text`에서 `firebasestorage.googleapis.com`과
      `storage.googleapis.com`을 검색한다: `photos`, `albums`, `music_works`, `music_awards`,
      `music_media`, `dev_projects`, `dev_articles`, `site_documents`. 2026-08-29 실행 결과 0건.
- [x] 전수 검사 결과와 실행일을 checklist 09에 기록한다.
- URL 발견 시 Storage 경로와 Supabase 공개 URL을 대조해 데이터를 먼저 수정하는 절차는
  이번 검사 결과가 0건이므로 실행하지 않았다.

### 4.2 로컬 RLS 통합 테스트

- `supabase start`로 로컬 스택을 시작하고 모든 migration을 적용한다.
- seed 또는 테스트 전용 SQL로 공개 행, 초안 행, Storage probe 객체를 만든다.
- anon 세션에서 공개 행만 보이고 초안은 보이지 않는지 검사한다.
- anon과 authenticated 비관리자의 insert, update, delete를 검사한다.
- admin 클레임 세션에서 전체 조회와 CRUD가 되는지 검사한다.
- 정렬 RPC는 anon 실행 거부, admin 실행 성공과 반환 행 수를 확인한다.
- Storage는 공개 read, anon write 거부, admin write/delete를 확인한다.
- 테스트 데이터는 로컬 DB에만 만들며 원격 프로젝트에는 접근하지 않는다.

### 4.3 Firebase 코드 해체

- `firebase`, `firebase-tools`, `@firebase/rules-unit-testing`을 제거하고 npm 10으로 lockfile을
  갱신한다.
- `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `firebase.json`, `.firebaserc`,
  기존 Firebase Rules 테스트를 삭제한다.
- CSP, Next 이미지 설정, mock URL, 본문 Storage 경로 파서에서 Firebase 호스트를 제거한다.
- `.env.example`, CLAUDE.md, ADR, troubleshooting, agent와 hook 문서를 현재 Supabase 구조에
  맞춘다.

### 4.4 백업 자동화

GitHub Actions에 `supabase-backup.yml`을 추가한다. 매주 1회와 수동 실행을 지원한다.
2026-08-29에 만든 `post-restore-drill` 백업은 새 형식과 실제 복구 검증을 통과했고, 이후 운영
데이터 변경이 없어 Firebase 삭제 기준 최종 복구본으로 확정했다.

워크플로는 다음 순서로 실행한다.

1. Supabase CLI로 roles, schema, data를 각각 dump한다.
2. `media` 버킷을 재귀 다운로드한다.
3. 테이블 행 수, RAG 청크 수, Storage 객체 수와 바이트를 `manifest.txt`에 기록한다.
4. 기본 schema dump에서 빠지는 Storage 정책을 `managed-schema/storage.sql`에 넣는다.
5. 각 파일의 SHA-256을 만든다.
6. 백업 디렉터리를 tar.gz로 묶는다.
7. age 공개키로 암호화한다. 복호화 개인키는 GitHub와 Backblaze B2에 두지 않는다.
8. bucket 전용 B2 Application Key로 private bucket의 `aperture/` prefix에 업로드한다.
9. 업로드된 파일의 존재와 크기를 다시 조회한다.
10. 러너의 평문 dump와 Storage 파일은 job 종료와 함께 폐기한다.

필요한 GitHub Actions secret은 다음과 같다.

| Secret                  | 용도                                 |
| ----------------------- | ------------------------------------ |
| `SUPABASE_DB_URL`       | Session pooler 연결 문자열           |
| `SUPABASE_DB_PASSWORD`  | CLI link에 쓰는 프로젝트 DB 비밀번호 |
| `SUPABASE_ACCESS_TOKEN` | linked 프로젝트의 Storage 접근       |
| `SUPABASE_PROJECT_REF`  | 프로젝트 식별자                      |
| `B2_APPLICATION_KEY_ID` | bucket 전용 B2 Application Key ID    |
| `B2_APPLICATION_KEY`    | bucket 전용 B2 Application Key       |
| `BACKUP_AGE_RECIPIENT`  | 백업 암호화 공개키                   |

Repository Variable `B2_BUCKET`에는 private bucket 이름을 넣는다. DB URL, B2 Application Key,
dump 파일은 로그에 출력하지 않는다. 백업 파일은 저장소나 GitHub
Actions artifact에 올리지 않는다. 자동 삭제는 `post-restore-drill` 백업 검증, Firebase
해체와 안정화 확인 뒤에 켠다. 예약 백업은 약
70일을 보관하고 수동·해체 직전 백업에는 자동 삭제를 적용하지 않는다. 월간 백업을 추가할 때는
별도 prefix와 약 400일 규칙을 사용한다.

B2 bucket은 public access를 끄고 백업 전용으로 만든다. Application Key는 이 bucket 하나로
범위를 제한하고 읽기·쓰기 권한과 S3/rclone 호환에 필요한 bucket 목록 권한만 부여한다. master
application key는 사용하지 않는다. GitHub Actions에는 Key ID와 Key를 각각 secret으로 저장하고,
키가 노출되거나 백업 자동화를 폐기할 때 즉시 폐기한다.

### 4.5 백업 복구 훈련

최초 자동 백업은 업로드 성공만으로 완료 처리하지 않는다.

실행 명령, 새 컴퓨터 설정, 자격증명과 장애 기록은
[`Supabase 백업과 복구 절차`](../troubleshooting/supabase-backup-and-restore.md)에 유지한다.

- Backblaze B2에서 암호화 파일을 내려받는다.
- 오프라인 개인키로 복호화하고 SHA-256 검증을 통과시킨다.
- roles, schema, data SQL 파일과 `media` 디렉터리를 확인한다.
- 가능하면 새 로컬 Supabase 스택에 schema와 data를 복구한다.
- 테이블별 행 수와 RAG 424청크를 기준값과 비교한다.
- Storage 831개 객체와 77,603,202 bytes를 기준값과 비교한다.
- 절차와 결과를 checklist 09에 기록한다.

2026-08-29 복구 훈련에서는 `auth.users`와 `auth.identities`, 비밀번호 해시,
`app_metadata.role = 'admin'`이 data dump에서 복원됐다. 기존 세션은 새 프로젝트에서 쓸 수
없으므로 다시 로그인한다. 로그인 실패 때만 관리자 계정을 다시 만들고 admin claim을 설정한다.

기본 schema dump는 `storage`의 사용자 정책을 포함하지 않았다. 백업에
`managed-schema/storage.sql`을 별도로 넣고 DB 복원 뒤 적용한다.

훈련에 사용한 임시 Supabase 프로젝트 `tdxsqceamgxlyptkqtai`는 모든 검증을 마친 뒤
2026-08-29 16:34 KST에 삭제했다. 운영 프로젝트 `jvvonzvzlooxxujfslcg`와 최종 복구본은
그대로 유지한다.

### 4.6 배포와 인프라 해체

- 코드 해체 후 check, lint, knip, depcruise, test, build와 필요한 E2E를 실행한다.
- 배포 후 공개 경로, 관리자 로그인·저장, 이미지, 검색, 챗을 확인한다.
- 검증된 `post-restore-drill` Supabase 백업을 Firebase 삭제 기준 최종 복구본으로 확인한다.
- Vercel의 `NEXT_PUBLIC_FIREBASE_*`와 `NEXT_PUBLIC_ADMIN_UID`를 제거하고 재배포한다.
- Firebase 별도 export는 만들지 않는다. 위 Supabase 최종 백업과 실제 복구 훈련 기록을 삭제
  근거로 사용한다.
- Firebase Auth 관리자 계정과 Storage를 삭제한다.
- Firebase 프로젝트를 마지막에 삭제한다.
- GCP 예산 알림과 카드 등록을 정리한다.
- 해체에만 쓴 Supabase CLI access token과 B2 Application Key 권한을 검토한다. 백업 자동화에
  필요한 자격증명은 최소 권한으로 다시 발급하거나 유지한다.

## 5. 중단 조건

다음 중 하나라도 발생하면 Firebase 프로젝트 삭제를 멈춘다.

- JSONB 전수 검사에서 Firebase URL이 발견됨
- 로컬 RLS 테스트가 권한 우회를 발견함
- Backblaze B2 백업이 없거나 복호화되지 않음
- 복구한 DB 또는 Storage 수량이 기준값과 다름
- Firebase 환경변수 제거 배포에서 공개 화면이나 관리자 기능이 실패함

코드 해체는 되돌릴 수 있지만 Firebase 프로젝트 삭제는 되돌릴 수 없다. 삭제 승인은 위 조건을
모두 확인한 뒤 별도 단계로 남긴다.

## 6. 문서 마감

- checklist 08의 M8을 완료로 바꾼다.
- checklist 09의 코드, 문서, 인프라, 백업 항목을 실제 결과와 커밋으로 닫는다.
- ADR-0005에 Firebase 해체일과 Supabase 기준값 문서 링크를 추가한다.
- README와 테스트 문서에서 Firebase Rules 테스트 안내를 제거한다.
- 릴리즈 태그에 Firebase 해체와 첫 외부 백업 검증을 기록한다.
