/**
 * 업로드 前 브라우저 압축 → webp. 긴 변 ~2048px (무료 한도·대역폭 보호).
 * ⚠️ 반드시 EXIF 추출 이후에 호출 — 압축 결과에는 메타데이터가 없다.
 * 라이브러리는 파일 선택 시점에 동적 로드 — 관리자 폼 진입만으로는 번들에 싣지 않는다.
 *
 * 파생본을 다시 줄일 때 쓰도록 `Blob` 도 받는다. 라이브러리가 `file.name` 을 읽어 결과
 * `File` 을 다시 만들기 때문에, 이름 없는 `Blob` 은 여기서 `File` 로 감싼다.
 * 저장 경로는 업로더가 정하므로 이 이름은 쓰이지 않는다.
 *
 * @param {Blob} source
 * @param {number} [maxWidthOrHeight]
 * @returns {Promise<Blob>}
 */
const compressToWebp = async (source: Blob, maxWidthOrHeight = 2048): Promise<Blob> => {
  const { default: imageCompression } = await import("browser-image-compression");
  const file =
    source instanceof File
      ? source
      : new File([source], "derived.webp", { type: source.type || "image/webp" });
  return imageCompression(file, {
    maxWidthOrHeight,
    fileType: "image/webp",
    initialQuality: 0.82,
    useWebWorker: true,
  });
};

const compressThumbnailToWebp = (source: Blob): Promise<Blob> => compressToWebp(source, 320);
const compressPreviewToWebp = (source: Blob): Promise<Blob> => compressToWebp(source, 960);

export { compressPreviewToWebp, compressThumbnailToWebp, compressToWebp };
