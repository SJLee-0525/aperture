#!/usr/bin/env bash
set -euo pipefail

required=(
  SUPABASE_DB_URL
  SUPABASE_DB_PASSWORD
  SUPABASE_PROJECT_REF
  SUPABASE_ACCESS_TOKEN
  BACKUP_AGE_RECIPIENT
  RCLONE_CONFIG_B64
)

for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "필수 환경변수 ${name}가 없습니다." >&2
    exit 1
  fi
done

for command_name in supabase psql age rclone sha256sum; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "필수 명령 ${command_name}를 찾을 수 없습니다." >&2
    exit 1
  fi
done

backup_label="${BACKUP_LABEL:-scheduled}"
if [[ ! "$backup_label" =~ ^[a-zA-Z0-9._-]+$ ]]; then
  echo "BACKUP_LABEL은 영문, 숫자, 점, 밑줄, 하이픈만 사용할 수 있습니다." >&2
  exit 1
fi

backup_timestamp="$(date -u +'%Y-%m-%dT%H-%M-%SZ')"
backup_name="aperture-${backup_label}-${backup_timestamp}"
backup_remote="${BACKUP_REMOTE:-gdrive:Backups/aperture}"
work_root="$(mktemp -d)"
backup_dir="${work_root}/${backup_name}"
rclone_config="${work_root}/rclone.conf"
encrypted_file="${work_root}/${backup_name}.tar.gz.age"

cleanup() {
  rm -rf "$work_root"
}
trap cleanup EXIT

mkdir -p "${backup_dir}/database" "${backup_dir}/storage"
printf '%s' "$RCLONE_CONFIG_B64" | base64 --decode > "$rclone_config"
chmod 600 "$rclone_config"

supabase link --project-ref "$SUPABASE_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"

supabase db dump \
  --db-url "$SUPABASE_DB_URL" \
  --file "${backup_dir}/database/roles.sql" \
  --role-only
supabase db dump \
  --db-url "$SUPABASE_DB_URL" \
  --file "${backup_dir}/database/schema.sql"
supabase db dump \
  --db-url "$SUPABASE_DB_URL" \
  --file "${backup_dir}/database/data.sql" \
  --data-only \
  --use-copy \
  --exclude "storage.buckets_vectors" \
  --exclude "storage.vector_indexes"

supabase storage cp \
  --recursive \
  --linked \
  --experimental \
  ss://media \
  "${backup_dir}/storage"

remote_storage="$(
  psql "$SUPABASE_DB_URL" --no-psqlrc --tuples-only --no-align --field-separator=, <<'SQL'
select count(*), coalesce(sum((metadata ->> 'size')::bigint), 0)
from storage.objects
where bucket_id = 'media';
SQL
)"
IFS=, read -r remote_object_count remote_total_bytes <<< "$remote_storage"
local_object_count="$(find "${backup_dir}/storage" -type f | wc -l | tr -d ' ')"
local_total_bytes="$(
  find "${backup_dir}/storage" -type f -exec stat -c '%s' {} + \
    | awk '{sum += $1} END {print sum + 0}'
)"

if [[ "$remote_object_count" != "$local_object_count" || "$remote_total_bytes" != "$local_total_bytes" ]]; then
  echo "Storage 백업 수량이 다릅니다." >&2
  echo "remote=${remote_object_count}/${remote_total_bytes}, local=${local_object_count}/${local_total_bytes}" >&2
  exit 1
fi

{
  echo "backup_name=${backup_name}"
  echo "created_at_utc=${backup_timestamp}"
  echo "project_ref=${SUPABASE_PROJECT_REF}"
  echo
  echo "[application_rows]"
  psql "$SUPABASE_DB_URL" --no-psqlrc --tuples-only --csv <<'SQL'
select 'photos' as table_name, count(*) as total from public.photos
union all select 'albums', count(*) from public.albums
union all select 'music_works', count(*) from public.music_works
union all select 'music_awards', count(*) from public.music_awards
union all select 'music_media', count(*) from public.music_media
union all select 'dev_projects', count(*) from public.dev_projects
union all select 'dev_articles', count(*) from public.dev_articles
union all select 'dev_article_tags', count(*) from public.dev_article_tags
union all select 'site_documents', count(*) from public.site_documents
union all select 'rag_documents', count(*) from public.rag_documents
order by table_name;
SQL
  echo
  echo "[storage_remote]"
  echo "bucket_id,object_count,total_bytes"
  echo "media,${remote_object_count},${remote_total_bytes}"
  echo
  echo "[storage_download]"
  echo "object_count=${local_object_count}"
  echo "total_bytes=${local_total_bytes}"
} > "${backup_dir}/manifest.txt"

(
  cd "$backup_dir"
  find database storage -type f -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS
)

tar -C "$work_root" -czf - "$backup_name" \
  | age --recipient "$BACKUP_AGE_RECIPIENT" --output "$encrypted_file"

rclone copyto \
  "$encrypted_file" \
  "${backup_remote}/${backup_name}.tar.gz.age" \
  --config "$rclone_config"

remote_size="$(
  rclone size \
    "${backup_remote}/${backup_name}.tar.gz.age" \
    --config "$rclone_config" \
    --json \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).bytes))'
)"
local_size="$(stat -c '%s' "$encrypted_file")"

if [[ "$remote_size" != "$local_size" ]]; then
  echo "Google Drive 업로드 크기가 다릅니다: local=${local_size}, remote=${remote_size}" >&2
  exit 1
fi

echo "암호화 백업 업로드 완료: ${backup_remote}/${backup_name}.tar.gz.age (${local_size} bytes)"
