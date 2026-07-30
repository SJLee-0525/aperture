import { deleteImages } from "@/lib/firebase/storage";
import { imagePaths as imageMetaPaths, type ImageMeta } from "@/types/image";

const imagePaths = (images: Array<ImageMeta | null | undefined>): string[] =>
  images.flatMap(imageMetaPaths);

/**
 * 편집을 완료한 뒤 초기 자산과 이번 세션 업로드 중 최종 문서가 참조하지 않는 객체만 제거한다.
 * 문서 저장보다 먼저 호출하면 기존 공개 문서의 이미지가 깨질 수 있으므로 editor가 저장 후 호출한다.
 */
const removeUnreferencedImages = (
  candidates: Iterable<string>,
  retained: Iterable<string>,
): Promise<void> => {
  const retainedPaths = new Set(retained);
  return deleteImages([...candidates].filter((path) => !retainedPaths.has(path)));
};

export { imagePaths, removeUnreferencedImages };
