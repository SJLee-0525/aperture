#!/usr/bin/env bash
set -euo pipefail

production_project_ref="jvvonzvzlooxxujfslcg"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd "${script_dir}/.." && pwd)"
restore_dir="${RESTORE_DIR:-/tmp/aperture-restore-test}"
backup_root_file="${restore_dir}/latest-backup-root"
pooler_host="${TARGET_DB_HOST:-aws-0-ap-northeast-2.pooler.supabase.com}"
work_dir="$(mktemp -d /tmp/aperture-supabase-restore.XXXXXX)"

cleanup() {
  rm -rf "$work_dir"
  unset target_db_password target_db_url
}
trap cleanup EXIT

for command_name in supabase diff; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "필수 명령을 찾을 수 없습니다: $command_name" >&2
    exit 1
  fi
done

if command -v psql >/dev/null 2>&1; then
  psql_command="$(command -v psql)"
elif command -v brew >/dev/null 2>&1 && [[ -x "$(brew --prefix libpq 2>/dev/null)/bin/psql" ]]; then
  psql_command="$(brew --prefix libpq)/bin/psql"
else
  echo "psql을 찾을 수 없습니다. 먼저 brew install libpq 를 실행하세요." >&2
  exit 1
fi

backup_root=""
if [[ -f "$backup_root_file" ]]; then
  backup_root="$(<"$backup_root_file")"
fi

if [[ -z "$backup_root" || ! -d "$backup_root" ]]; then
  backup_root="$(
    find "$restore_dir" \
      -mindepth 2 \
      -maxdepth 2 \
      -type d \
      -name 'aperture-*' \
      -exec stat -f '%m|%N' {} \; 2>/dev/null \
      | LC_ALL=C sort -n \
      | tail -n 1
  )"
  backup_root="${backup_root#*|}"

  if [[ -z "$backup_root" || ! -d "$backup_root" ]]; then
    echo "검증된 백업 위치를 찾을 수 없습니다." >&2
    echo "먼저 ./scripts/verify-supabase-backup.sh 를 실행하세요." >&2
    exit 1
  fi

  echo "기존에 검증한 백업을 찾았습니다: $backup_root"
fi

for required_file in database/roles.sql database/schema.sql database/data.sql manifest.txt; do
  if [[ ! -f "${backup_root}/${required_file}" ]]; then
    echo "필수 백업 파일이 없습니다: $required_file" >&2
    exit 1
  fi
done

read -r -p "복구 훈련용 Supabase project ref: " target_project_ref
if [[ ! "$target_project_ref" =~ ^[a-z0-9]{20}$ ]]; then
  echo "project ref 형식이 올바르지 않습니다." >&2
  exit 1
fi
if [[ "$target_project_ref" == "$production_project_ref" ]]; then
  echo "운영 Supabase 프로젝트에는 복구할 수 없습니다." >&2
  exit 1
fi

read -r -s -p "복구 훈련용 DB 비밀번호: " target_db_password
echo
if [[ ! "$target_db_password" =~ ^[A-Za-z0-9]+$ ]]; then
  echo "이 스크립트는 URL 인코딩이 필요 없는 영문·숫자 DB 비밀번호만 허용합니다." >&2
  exit 1
fi

target_db_url="postgresql://postgres.${target_project_ref}:${target_db_password}@${pooler_host}:5432/postgres"

echo
echo "복구 원본: $backup_root"
echo "대상 project ref: $target_project_ref"
echo "대상 DB host: $pooler_host"
echo "운영 project ref: $production_project_ref (차단됨)"
echo
read -r -p "계속하려면 RESTORE ${target_project_ref} 를 입력하세요: " confirmation
if [[ "$confirmation" != "RESTORE ${target_project_ref}" ]]; then
  echo "복구를 취소했습니다."
  exit 1
fi

echo "대상 DB 연결 확인"
"$psql_command" "$target_db_url" \
  --no-psqlrc \
  --variable ON_ERROR_STOP=1 \
  --tuples-only \
  --command 'select current_database();' >/dev/null

public_table_count="$(
  "$psql_command" "$target_db_url" \
    --no-psqlrc \
    --tuples-only \
    --no-align \
    --variable ON_ERROR_STOP=1 \
    --command "select count(*) from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE';"
)"
if [[ "$public_table_count" != "0" ]]; then
  echo "대상 DB의 public schema가 비어 있지 않습니다: ${public_table_count}개 테이블" >&2
  exit 1
fi

echo "임시 Supabase 작업공간 생성"
(
  cd "$work_dir"
  supabase init --force >/dev/null
  supabase link \
    --project-ref "$target_project_ref" \
    --password "$target_db_password"
)

restore_roles="${work_dir}/roles.restore.sql"
awk '
  $0 == "GRANT SET ON PARAMETER \"log_min_messages\" TO \"supabase_realtime_admin\";" {
    print "-- 복구 대상 Supabase가 관리하는 Realtime role 권한이므로 건너뛴다."
    next
  }
  { print }
' "${backup_root}/database/roles.sql" > "$restore_roles"

if [[ -f "${backup_root}/managed-schema/storage.sql" ]]; then
  storage_schema_source="${backup_root}/managed-schema/storage.sql"
else
  storage_schema_source="${repository_root}/supabase/migrations/20260815060300_storage.sql"
  echo "이전 형식 백업이므로 저장소의 Storage 정책 migration을 사용합니다."
fi

restore_storage_schema="${work_dir}/storage.restore.sql"
{
  echo 'drop policy if exists "media_admin_select" on storage.objects;'
  echo 'drop policy if exists "media_admin_insert" on storage.objects;'
  echo 'drop policy if exists "media_admin_update" on storage.objects;'
  echo 'drop policy if exists "media_admin_delete" on storage.objects;'
  cat "$storage_schema_source"
} > "$restore_storage_schema"

echo "DB roles, schema, data와 Storage 정책 복원"
"$psql_command" "$target_db_url" \
  --no-psqlrc \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file "$restore_roles" \
  --file "${backup_root}/database/schema.sql" \
  --command 'SET session_replication_role = replica' \
  --file "${backup_root}/database/data.sql" \
  --file "$restore_storage_schema"

expected_rows="${work_dir}/expected-rows.csv"
actual_rows="${work_dir}/actual-rows.csv"
awk '
  /^\[application_rows\]$/ { in_rows = 1; next }
  /^\[/ { in_rows = 0 }
  in_rows && NF { print }
' "${backup_root}/manifest.txt" | LC_ALL=C sort > "$expected_rows"

"$psql_command" "$target_db_url" --no-psqlrc --tuples-only --csv <<'SQL' \
  | LC_ALL=C sort > "$actual_rows"
select 'photos' as table_name, count(*) as total from public.photos
union all select 'albums', count(*) from public.albums
union all select 'music_works', count(*) from public.music_works
union all select 'music_awards', count(*) from public.music_awards
union all select 'music_media', count(*) from public.music_media
union all select 'dev_projects', count(*) from public.dev_projects
union all select 'dev_articles', count(*) from public.dev_articles
union all select 'dev_article_tags', count(*) from public.dev_article_tags
union all select 'site_documents', count(*) from public.site_documents
union all select 'rag_documents', count(*) from public.rag_documents;
SQL

echo "DB 행 수 비교"
diff -u "$expected_rows" "$actual_rows"

echo "Storage 객체 업로드"
(
  cd "$work_dir"
  supabase storage cp \
    "${backup_root}/storage/media" \
    ss://media \
    --recursive \
    --linked \
    --experimental
)

storage_verify_dir="${work_dir}/storage-verify"
mkdir -p "$storage_verify_dir"
echo "복원된 Storage를 다시 다운로드"
(
  cd "$work_dir"
  supabase storage cp \
    ss://media \
    "$storage_verify_dir" \
    --recursive \
    --linked \
    --experimental
)

downloaded_media="${storage_verify_dir}/media"
if [[ ! -d "$downloaded_media" ]]; then
  echo "복원된 Storage 다운로드 디렉터리를 찾을 수 없습니다: $downloaded_media" >&2
  exit 1
fi

echo "Storage 파일 비교"
diff -qr "${backup_root}/storage/media" "$downloaded_media"

echo
echo "Supabase 복구 훈련 성공"
echo "대상 project ref: $target_project_ref"
echo "검증한 백업: $(basename "$backup_root")"
