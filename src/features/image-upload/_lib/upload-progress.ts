/**
 * 업로드 파이프라인의 진행 단계.
 *
 * EXIF 추출·webp 3단 압축·Storage 3회 업로드가 한 번의 클릭에 이어 붙는다. 4천만 화소
 * 사진이면 압축만으로도 수 초가 걸리는데, 화면이 "처리 중…" 하나만 보이면 멈춘 것과
 * 구분되지 않는다.
 */
type UploadStage = "idle" | "reading" | "compressing" | "uploading";

/**
 * 여러 장을 한 번에 올리는 화면이 낼 수 있는 단계.
 *
 * 파일마다 읽기·압축·업로드가 겹쳐 돌아 어느 하나를 현재 단계로 고를 수 없다.
 * 진행은 단계가 아니라 완료 수로 알린다.
 */
type BatchUploadStage = Extract<UploadStage, "idle" | "uploading">;

const UPLOAD_STAGE_LABEL: Record<UploadStage, string> = {
  idle: "",
  reading: "사진 정보 읽는 중…",
  compressing: "압축 중…",
  uploading: "업로드 중…",
};

export { UPLOAD_STAGE_LABEL };
export type { BatchUploadStage, UploadStage };
