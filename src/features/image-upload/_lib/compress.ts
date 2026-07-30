import imageCompression from "browser-image-compression";

/**
 * 업로드 前 브라우저 압축 → webp. 긴 변 ~2048px (무료 한도·대역폭 보호).
 * ⚠️ 반드시 EXIF 추출 이후에 호출 — 압축 결과에는 메타데이터가 없다.
 */
const compressToWebp = (file: File, maxWidthOrHeight = 2048): Promise<Blob> =>
  imageCompression(file, {
    maxWidthOrHeight,
    fileType: "image/webp",
    initialQuality: 0.82,
    useWebWorker: true,
  });

const compressThumbnailToWebp = (file: File): Promise<Blob> => compressToWebp(file, 320);

export { compressThumbnailToWebp, compressToWebp };
