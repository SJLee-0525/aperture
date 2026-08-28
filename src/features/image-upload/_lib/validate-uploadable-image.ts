const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;

/**
 * 브라우저 이미지 처리 전에 판별할 수 있는 입력 조건을 검사한다.
 * MIME 정보가 비어 있으면 디코더가 형식을 판별하도록 허용한다.
 */
const validateUploadableImage = (file: File): string | null => {
  if (file.type && !file.type.startsWith("image/")) {
    return "이미지 파일만 업로드할 수 있습니다.";
  }
  if (file.type === "image/svg+xml") {
    return "SVG 이미지는 업로드할 수 없습니다. 다른 이미지 형식을 선택해 주세요.";
  }
  if (file.size <= MAX_UPLOAD_BYTES) return null;

  const mb = Math.round(file.size / (1024 * 1024));
  const limit = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
  return `${mb}MB 파일은 브라우저에서 압축할 수 없습니다. ${limit}MB 이하로 줄여 주세요.`;
};

export { validateUploadableImage };
