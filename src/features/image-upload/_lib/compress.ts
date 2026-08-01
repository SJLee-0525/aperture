/**
 * 업로드 前 브라우저 압축 → webp. 긴 변 ~2048px (무료 한도·대역폭 보호).
 * ⚠️ 반드시 EXIF 추출 이후에 호출 — 압축 결과에는 메타데이터가 없다.
 * 라이브러리는 파일 선택 시점에 동적 로드 — 관리자 폼 진입만으로는 번들에 싣지 않는다.
 */
const compressToWebp = async (file: File, maxWidthOrHeight = 2048): Promise<Blob> => {
  const { default: imageCompression } = await import("browser-image-compression");
  return imageCompression(file, {
    maxWidthOrHeight,
    fileType: "image/webp",
    initialQuality: 0.82,
    useWebWorker: true,
  });
};

const compressThumbnailToWebp = (file: File): Promise<Blob> => compressToWebp(file, 320);
const compressPreviewToWebp = (file: File): Promise<Blob> => compressToWebp(file, 960);

export { compressPreviewToWebp, compressThumbnailToWebp, compressToWebp };
