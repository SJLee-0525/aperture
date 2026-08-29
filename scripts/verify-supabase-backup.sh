#!/usr/bin/env bash
set -euo pipefail

bucket="${B2_BUCKET:-aperture-backups-sungjoon}"
backup_file="${1:-}"
restore_dir="${RESTORE_DIR:-/tmp/aperture-restore-test}"
age_identity="${AGE_IDENTITY:-${HOME}/.config/aperture-backup/age-key.txt}"

if [[ ! -f "$age_identity" ]]; then
  echo "age 개인키를 찾을 수 없습니다: $age_identity" >&2
  exit 1
fi

for command_name in rclone age gzip tar shasum; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "필수 명령을 찾을 수 없습니다: $command_name" >&2
    exit 1
  fi
done

if ! rclone listremotes | grep -Fxq 'b2:'; then
  echo "rclone에 b2 remote가 등록되어 있지 않습니다." >&2
  exit 1
fi

remote_dir="b2:${bucket}/aperture"

if [[ -z "$backup_file" ]]; then
  latest_backup="$({
    rclone lsf "$remote_dir" \
      --files-only \
      --include 'aperture-*.tar.gz.age' \
      --format 'tp' \
      --separator '|'
  } | LC_ALL=C sort | tail -n 1)"

  if [[ -z "$latest_backup" ]]; then
    echo "B2에서 검증할 백업을 찾을 수 없습니다: $remote_dir" >&2
    exit 1
  fi

  backup_file="${latest_backup#*|}"
  echo "가장 최근 백업을 선택했습니다: $backup_file"
else
  if [[ "$backup_file" == */* ]]; then
    echo "백업 파일명만 입력해야 합니다: $backup_file" >&2
    exit 1
  fi
  echo "지정한 백업을 선택했습니다: $backup_file"
fi

mkdir -p "$restore_dir"
encrypted_file="${restore_dir}/backup.tar.gz.age"
archive_file="${restore_dir}/backup.tar.gz"
remote_file="${remote_dir}/${backup_file}"

echo "B2 백업 확인: $remote_file"
rclone size "$remote_file"

echo "암호화 백업 다운로드"
rclone copyto \
  "$remote_file" \
  "$encrypted_file" \
  --progress

echo "백업 복호화"
rm -f "$archive_file"
age --decrypt \
  --identity "$age_identity" \
  --output "$archive_file" \
  "$encrypted_file"

echo "gzip 무결성 검사"
gzip --test "$archive_file"

echo "백업 압축 해제"
extracted_dir="$(mktemp -d "${restore_dir}/extracted.XXXXXX")"
tar -xzf "$archive_file" -C "$extracted_dir"
backup_root="$(find "$extracted_dir" -mindepth 1 -maxdepth 1 -type d -print -quit)"

if [[ -z "$backup_root" || ! -f "${backup_root}/SHA256SUMS" ]]; then
  echo "백업 루트 또는 SHA256SUMS를 찾을 수 없습니다." >&2
  exit 1
fi

for required_file in database/roles.sql database/schema.sql database/data.sql manifest.txt; do
  if [[ ! -f "${backup_root}/${required_file}" ]]; then
    echo "필수 백업 파일이 없습니다: $required_file" >&2
    exit 1
  fi
done

if [[ -f "${backup_root}/managed-schema/storage.sql" ]]; then
  echo "Storage 정책 백업 확인"
else
  echo "참고: 이 백업은 Storage 정책을 별도 포함하기 전 형식입니다."
fi

echo "내부 파일 SHA-256 검증"
(
  cd "$backup_root"
  shasum -a 256 -c SHA256SUMS
)

echo "백업 파일 요약"
sed -n '1,80p' "${backup_root}/manifest.txt"

echo
echo "백업 패키지 검증 성공"
echo "암호화 파일: $encrypted_file"
echo "복호화 파일: $archive_file"
echo "압축 해제 위치: $backup_root"
printf '%s\n' "$backup_root" > "${restore_dir}/latest-backup-root"
