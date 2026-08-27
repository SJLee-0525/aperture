/**
 * 업로드 파이프라인의 진행 단계.
 *
 * EXIF 추출·webp 3단 압축·Storage 3회 업로드가 한 번의 클릭에 이어 붙는다. 4천만 화소
 * 사진이면 압축만으로도 수 초가 걸리는데, 화면이 "처리 중…" 하나만 보이면 멈춘 것과
 * 구분되지 않는다.
 */
type UploadStage = "idle" | "reading" | "compressing" | "uploading";

const UPLOAD_STAGE_LABEL: Record<UploadStage, string> = {
  idle: "",
  reading: "사진 정보 읽는 중…",
  compressing: "압축 중…",
  uploading: "업로드 중…",
};

/**
 * 브라우저에서 압축할 수 있는 파일 크기 상한.
 *
 * `use-image-upload` 주석이 적은 대로 4천만 화소 사진에서 모바일 Safari 가 탭을 종료할 수
 * 있다. 압축을 시작하기 전에 걸러 그 실패를 오류 문구로 바꾼다.
 */
const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;

/**
 * 파일이 상한을 넘는지 본다.
 *
 * @returns 넘으면 안내 문구, 아니면 null.
 */
const checkUploadSize = (file: File): string | null => {
  if (file.size <= MAX_UPLOAD_BYTES) return null;
  const mb = Math.round(file.size / (1024 * 1024));
  const limit = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
  return `${mb}MB 파일은 브라우저에서 압축할 수 없습니다. ${limit}MB 이하로 줄여 주세요.`;
};

export { checkUploadSize, MAX_UPLOAD_BYTES, UPLOAD_STAGE_LABEL };
export type { UploadStage };
