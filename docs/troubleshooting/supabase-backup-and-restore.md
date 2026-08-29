# Supabase 백업과 복구 절차

이 문서는 Aperture의 Supabase DB와 `media` Storage를 Backblaze B2에 백업하고,
백업 파일을 검증하거나 새 환경에 복구할 때 사용한다. Firebase 프로젝트 삭제 후에는 이
백업이 외부 복구본이다.

첫 원격 백업, 패키지 검증, 빈 Supabase 프로젝트 복구 훈련은 2026-08-29에 마쳤다.

## 1. 구성

백업은 매주 월요일 04:17 KST에 GitHub Actions에서 실행된다. 필요할 때 Actions 화면에서
수동으로 실행할 수도 있다.

1. Supabase DB에서 roles, schema, data를 각각 dump한다.
2. `media` 버킷의 객체를 모두 내려받는다.
3. 테이블 행 수와 Storage 객체 수를 `manifest.txt`에 기록한다.
4. 기본 schema dump에서 빠지는 Storage 정책 SQL을 `managed-schema/storage.sql`에 넣는다.
5. DB, 관리 스키마, Storage 파일의 SHA-256을 `SHA256SUMS`에 기록한다.
6. 전체 디렉터리를 tar.gz로 묶고 age 공개키로 암호화한다.
7. 암호화 파일만 private B2 bucket의 `aperture/` 경로에 올린다.
8. 업로드한 파일의 크기가 로컬 암호화 파일과 같은지 확인한다.

GitHub Actions 러너의 평문 파일은 job이 끝나면 사라진다. age 개인키는 GitHub, Supabase,
Backblaze에 저장하지 않는다.

관련 파일은 다음 두 개다.

- `.github/workflows/supabase-backup.yml`: 일정, GitHub secret, 실행 환경
- `scripts/backup-supabase.sh`: dump, Storage 다운로드, 암호화, 업로드

## 2. GitHub Actions 설정

Repository secrets:

| 이름                    | 값                                     |
| ----------------------- | -------------------------------------- |
| `SUPABASE_DB_URL`       | Session pooler 연결 문자열             |
| `SUPABASE_DB_PASSWORD`  | Supabase 프로젝트 DB 비밀번호 원문     |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI personal access token     |
| `SUPABASE_PROJECT_REF`  | Supabase 프로젝트 ref                  |
| `BACKUP_AGE_RECIPIENT`  | `age1...` 형식의 암호화 공개키         |
| `B2_APPLICATION_KEY_ID` | 백업 bucket 전용 B2 Application Key ID |
| `B2_APPLICATION_KEY`    | B2 Application Key                     |

Repository variable `B2_BUCKET`에는 private bucket 이름을 넣는다.

### DB 연결 문자열

Dashboard의 현재 경로는 `Database > Settings`다. `Connect` 화면에서는 Session pooler를
선택한다. 연결 문자열의 사용자는 `postgres.<project-ref>` 형식이다.

```text
postgresql://postgres.<project-ref>:<password>@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
```

Supabase CLI가 URL 인코딩된 특수문자 비밀번호를 Session pooler에 전달할 때 인증에 실패한
사례가 있었다. DB 비밀번호는 긴 영문과 숫자 조합을 사용한다. 비밀번호를 바꾸면
`SUPABASE_DB_PASSWORD`와 `SUPABASE_DB_URL`을 함께 갱신한다. 웹앱의 publishable key,
service role key, Auth 사용자 비밀번호에는 영향이 없다. TablePlus나 다른 CI처럼 DB에 직접
접속하는 도구가 있으면 그 연결 정보도 바꿔야 한다.

## 3. 수동 백업

GitHub의 `Actions > Supabase encrypted backup > Run workflow`에서 실행한다. `label`에는
영문, 숫자, 점, 밑줄, 하이픈만 쓸 수 있다.

Firebase 삭제 직전에는 다음 라벨을 사용한다.

```text
pre-firebase-teardown
```

성공 로그의 마지막에는 B2 경로와 암호화 파일 크기가 나온다.

```text
암호화 백업 업로드 완료: b2:<bucket>/aperture/<file>.tar.gz.age (<bytes> bytes)
```

Storage 다운로드 중에는 같은 파일명이 마지막 로그로 오래 남을 수 있다. 2026-08-29 첫
실행에서는 약 77MB, 831개 객체를 받는 동안 10분가량 새 로그가 없었다. job이 실패로 끝나지
않았고 제한 시간 30분 안이라면 기다린다. 첫 실행은 Docker image도 내려받으므로 이후 실행보다
오래 걸릴 수 있다.

## 4. 새 컴퓨터 설정

새 컴퓨터에서는 B2 읽기 설정과 age 개인키가 필요하다. 저장소를 clone하는 것만으로는 복호화할
수 없다.

### 4.1 도구 설치

macOS와 Homebrew 기준:

```bash
brew install rclone age
```

확인:

```bash
rclone version
age --version
```

### 4.2 age 개인키 이전

기존 컴퓨터나 오프라인 보관 장치에서 다음 파일을 안전하게 옮긴다.

```text
~/.config/aperture-backup/age-key.txt
```

새 컴퓨터에서 권한을 제한한다.

```bash
mkdir -p "$HOME/.config/aperture-backup"
chmod 700 "$HOME/.config/aperture-backup"
chmod 600 "$HOME/.config/aperture-backup/age-key.txt"
```

공개키를 확인한다.

```bash
age-keygen -y "$HOME/.config/aperture-backup/age-key.txt"
```

출력값은 GitHub secret `BACKUP_AGE_RECIPIENT`에 등록한 공개키와 같아야 한다. 개인키를 잃으면
B2의 기존 백업을 복호화할 수 없다. 개인키 파일은 최소 두 곳에 보관하되 Git 저장소, GitHub
Actions secret, B2 bucket에는 올리지 않는다.

### 4.3 rclone에 B2 등록

로컬 rclone 설정과 GitHub Actions 설정은 별개다. Actions는 job 안에서 임시 설정을 만들고
종료할 때 삭제한다. 새 컴퓨터에서는 한 번 등록해야 한다.

```bash
rclone config
```

대화형 화면에서 다음 값을 넣는다.

1. `n`을 선택해 remote를 만든다.
2. remote 이름은 `b2`로 정한다. 검증 스크립트가 이 이름을 사용한다.
3. Storage 종류는 `b2`를 선택한다.
4. `account`에 B2 Application Key ID를 넣는다.
5. `key`에 B2 Application Key를 넣는다.
6. 나머지는 기본값으로 저장한다.

복구용 키는 대상 bucket에 대한 읽기 권한이 있어야 한다. GitHub secret에 넣었던 값을 보관하지
않았다면 기존 secret을 다시 볼 수 없으므로 Backblaze에서 새 키를 발급한다. master key 대신
해당 bucket으로 범위를 제한한 키를 사용한다.

등록 확인:

```bash
rclone listremotes
rclone lsl b2:aperture-backups-sungjoon/aperture
```

첫 명령에 `b2:`가 나오고 두 번째 명령에 `.tar.gz.age` 파일이 나오면 준비가 끝났다.

## 5. 백업 패키지 검증

저장소 루트에서 실행한다.

```bash
./scripts/verify-supabase-backup.sh
```

인자가 없으면 B2 객체 수정 시각이 가장 최근인 백업을 고른다. 파일명 정렬은 사용하지 않는다.
수동 라벨과 예약 라벨이 파일명 중간에 들어가므로 파일명 순서가 생성 순서와 다를 수 있기
때문이다.

특정 백업을 검사하려면 파일명만 전달한다.

```bash
./scripts/verify-supabase-backup.sh "aperture-manual-first-2026-08-29T05-14-08Z.tar.gz.age"
```

스크립트는 다음 항목을 검사한다.

- B2 객체 존재 여부와 크기
- 다운로드와 age 복호화
- gzip 무결성
- `roles.sql`, `schema.sql`, `data.sql`, `manifest.txt` 존재 여부
- DB dump와 Storage 파일의 SHA-256
- manifest에 기록된 앱 테이블과 Storage 수량

성공하면 복호화 파일과 압축 해제 위치를 출력한다. 기본 작업 경로는
`/tmp/aperture-restore-test`다.

### 2026-08-29 첫 검증 기록

| 항목             | 결과                                                    |
| ---------------- | ------------------------------------------------------- |
| B2 파일          | `aperture-manual-first-2026-08-29T05-14-08Z.tar.gz.age` |
| 암호화 파일 크기 | 78,865,575 bytes                                        |
| age 복호화       | 성공                                                    |
| gzip 검사        | 성공                                                    |
| SHA-256          | 성공                                                    |
| `media` 원격     | 831개, 77,603,202 bytes                                 |
| `media` 다운로드 | 831개, 77,603,202 bytes                                 |
| DB dump          | roles, schema, data 존재                                |
| `rag_documents`  | 425행                                                   |

관찰 종료 기준값의 RAG 424행보다 1행 많다. 백업 시점의 manifest와 dump가 함께 생성됐고
Storage 수량도 일치했다. 이 차이는 백업 전에 운영 데이터가 1행 늘어난 결과로 기록한다.

## 6. 새 Supabase 프로젝트에 복구

실제 복구는 운영 프로젝트가 아닌 빈 프로젝트에서 먼저 연습한다. 대상 DB를 잘못 지정하면
기존 데이터와 충돌하거나 덮어쓸 수 있다. 아래 명령을 실행하기 전에 대상 project ref와 DB
호스트를 다시 확인한다.

저장소 루트에서 복원 스크립트를 실행하는 방법이 기본이다.

```bash
brew install libpq
./scripts/restore-supabase-backup.sh
```

스크립트는 복구 project ref와 DB 비밀번호를 묻고 운영 project ref를 거부한다. 대상 public
schema가 비었는지 확인한 뒤 DB, Storage 정책, Storage 객체를 복원한다. 마지막에는 manifest의
행 수를 비교하고 Storage를 다시 내려받아 원본과 파일 단위로 비교한다. 아래 6.1절부터는
스크립트가 수행하는 세부 절차와 수동 복구가 필요할 때 쓸 명령이다.

### 6.1 백업 풀기

5절의 검증 스크립트를 실행한다. 마지막 줄의 `압축 해제 위치`가 복구 원본이다.

```bash
export BACKUP_ROOT="/tmp/aperture-restore-test/extracted.xxxxxx/aperture-백업이름"
```

`xxxxxx`와 백업 이름은 실제 출력값으로 바꾼다.

### 6.2 대상 프로젝트 준비

1. 별도의 Supabase 프로젝트를 만든다.
2. 대상 프로젝트의 Session pooler 연결 문자열과 DB 비밀번호를 준비한다.
3. Supabase access token으로 CLI에 로그인하고 대상 프로젝트를 link한다.
4. `TARGET_DB_URL`의 project ref와 호스트가 운영 프로젝트와 다른지 확인한다.

```bash
supabase login
supabase link --project-ref "<target-project-ref>"
export TARGET_DB_URL="postgresql://postgres.<target-project-ref>:<password>@<target-session-pooler-host>:5432/postgres"
```

### 6.3 DB 복원

roles, schema, data 순서로 한 번의 psql 세션에서 적용한다.

```bash
psql "$TARGET_DB_URL" \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file "$BACKUP_ROOT/database/roles.sql" \
  --file "$BACKUP_ROOT/database/schema.sql" \
  --command 'SET session_replication_role = replica' \
  --file "$BACKUP_ROOT/database/data.sql"
```

오류가 하나라도 나면 transaction이 실패하므로 성공으로 기록하지 않는다. Supabase 시스템
스키마나 role이 이미 있는 대상에서는 `already exists` 오류가 날 수 있다. 그 경우 오류를
무시해서 진행하지 말고 새 빈 프로젝트인지 확인한다.

### 6.4 Storage 복원

대상 프로젝트에 `media` bucket이 만들어졌는지 확인한 뒤 객체를 올린다.

```bash
supabase storage cp \
  --recursive \
  --linked \
  --experimental \
  "$BACKUP_ROOT/storage/media" \
  ss://media
```

### 6.5 복원 결과 확인

`manifest.txt`의 `[application_rows]`와 대상 DB의 행 수를 비교한다. 2026-08-29 백업 기준은
다음과 같다.

| 테이블             | 행 수 |
| ------------------ | ----: |
| `albums`           |     1 |
| `dev_article_tags` |    10 |
| `dev_articles`     |     8 |
| `dev_projects`     |     9 |
| `music_awards`     |     0 |
| `music_media`      |     4 |
| `music_works`      |     4 |
| `photos`           |   173 |
| `rag_documents`    |   425 |
| `site_documents`   |     3 |

Storage는 831개, 77,603,202 bytes여야 한다. 관리자 화면과 공개 페이지에서도 대표 콘텐츠와
이미지가 열리는지 확인한다.

2026-08-29 훈련에서는 `auth.users`, `auth.identities`, 비밀번호 해시와 admin claim이 복원됐고
기존 비밀번호 로그인도 성공했다. 기존 세션은 새 프로젝트에서 쓸 수 없으므로 다시 로그인한다.
로그인에 실패할 때만 관리자 계정을 다시 만들고 `app_metadata.role = 'admin'`을 설정한다.

## 7. 막혔던 지점

### Google Drive OAuth

처음에는 rclone으로 Google Drive에 올리려 했다. OAuth 앱이 테스트 상태였고, 테스트 사용자와
브랜딩 설정을 마쳐도 403 `access_denied`가 반복됐다. 개인 백업 때문에 OAuth 앱 게시와 Google
검증 절차까지 유지하는 비용이 컸다. 저장 대상을 private Backblaze B2 bucket으로 바꿨다. 기존
Drive용 rclone remote는 이 백업에 쓰지 않는다.

### 비밀번호 인증 실패

처음 연결 문자열은 파싱 오류가 났고, 수정한 뒤에는 `password authentication failed for user
"postgres"`가 났다. 셸에서 URL 인코딩 결과 뒤에 보인 `%`는 zsh가 줄바꿈 없는 출력을 표시한
기호였지만, 특수문자가 들어간 비밀번호 자체도 Supabase CLI와 Session pooler 조합에서 문제를
일으켰다. DB 비밀번호를 긴 영문과 숫자 조합으로 바꾸고 두 GitHub secret을 함께 갱신해 해결했다.

### 로컬 Supabase RLS 테스트 시작 실패

로컬 stack의 Realtime 컨테이너가 `Failed to detect IP version for DB_HOST: nxdomain`으로
종료됐다. `supabase/config.toml`의 `project_id`가 `aperture.`로 끝나 Docker hostname이 잘못
만들어진 것이 원인이었다. `project_id = "aperture"`로 바꾼 뒤 2 suites, 8 tests가 통과했다.

### Storage 다운로드가 멈춘 것처럼 보임

`supabase storage cp --recursive`는 파일마다 다운로드 로그를 남기지만 다음 파일을 처리하는
동안 진행률을 계속 출력하지 않는다. 첫 백업에서는 마지막 `.webp` 로그 뒤 약 10분 동안 출력이
없었지만 작업은 끝났고 B2 업로드도 성공했다. workflow 제한 시간은 30분이다.

### 로컬 rclone의 `b2` 설정 없음

GitHub Actions는 임시 rclone 설정을 사용한다. 따라서 Actions 백업이 성공해도 로컬에서 `b2:`를
바로 사용할 수 없다. 새 컴퓨터에서는 4.3절대로 `b2` remote를 등록해야 한다.

### age 개인키 경로

처음 검증 스크립트가 `~/.config/age/aperture-backup-key.txt`를 찾도록 작성돼 실패했다. 실제
경로는 `~/.config/aperture-backup/age-key.txt`다. 스크립트와 이 문서는 실제 경로를 사용한다.

### Storage 정책 누락

첫 실제 복원에서는 DB와 831개 Storage 파일이 복원됐지만 관리자 업로드가 RLS `42501`로
거부됐다. 정책 목록을 확인하니 `storage.objects`의 `media_admin_*` 4개가 없었다. Supabase의
기본 schema dump는 관리 대상인 `auth`, `storage` 스키마의 사용자 변경을 포함하지 않는다.
정책을 적용한 뒤 기존 관리자 JWT로 Storage 쓰기와 공개 읽기가 통과했다. 이후 백업은
`managed-schema/storage.sql`을 포함하고 복원 스크립트가 이를 자동 적용한다.

### Realtime 관리 role 권한 오류

첫 DB 복원은 `roles.sql`의 `GRANT SET ON PARAMETER "log_min_messages" TO
"supabase_realtime_admin"`에서 권한 오류가 났다. 이 role은 새 Supabase 프로젝트가 이미
관리한다. 복원 스크립트는 백업 원본을 수정하지 않고 임시 roles 파일에서 이 GRANT만 제외한다.
나머지 anon, authenticated, authenticator timeout 설정은 적용한다.

### 2026-08-29 실제 복구 훈련 결과

- 대상: 빈 Supabase 프로젝트 `tdxsqceamgxlyptkqtai`
- DB roles, schema, data 복원 성공
- manifest와 앱 테이블 행 수 일치
- Storage 831개 업로드 후 재다운로드 파일 비교 성공
- public 테이블 11개 RLS 활성화, public 정책 21개와 Storage 정책 4개 확인
- 기존 Auth 사용자 1명, admin 1명, 기존 비밀번호 로그인 성공
- anon 초안 미노출과 쓰기 거부 확인
- admin DB CRUD, 정렬 RPC, Storage 쓰기와 공개 읽기 성공
- Storage origin 191행을 복구 프로젝트 ref로 재작성하고 이전 origin 0건 확인
- 복구 Storage 대표 이미지 HTTP 200 확인
- RAG 청크의 이전·복구 Storage origin 모두 0건

Auth, RLS, RPC, Storage 접근은 다음 명령으로 다시 검사할 수 있다.

```bash
./scripts/verify-restored-supabase-access.mjs
```

복구 프로젝트 URL, publishable key, 기존 관리자 이메일과 비밀번호를 입력한다. 스크립트가 만든
DB와 Storage probe는 검사가 끝날 때 삭제한다.

## 8. 아직 남은 일

- Storage 정책을 포함한 새 형식 백업을 한 번 생성하고 패키지 내용 확인
- `pre-firebase-teardown` 라벨의 최종 수동 백업
- B2 보관 정책 확정
