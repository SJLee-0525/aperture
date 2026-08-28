import type { PhotoNeighbors } from "@/features/photo-detail/_lib/photo-neighbors";
import type { Photo } from "@/types/photo";

type PhotoModalSlide = {
  key: string;
  item: Photo | null;
  current: boolean;
};

/**
 * 트랙에 올릴 세 장(이전·현재·다음)을 만든다.
 *
 * 키에 재시도 횟수를 섞는다. 같은 `src` 를 그대로 두면 브라우저가 다시 받지 않으므로,
 * 재시도는 키를 바꿔 `img` 를 새로 마운트하는 방식으로만 성립한다.
 *
 * @param retryCountOf 사진별 재시도 횟수. 아직 재시도한 적 없으면 0.
 */
const buildPhotoModalSlides = (
  photo: Photo,
  neighbors: PhotoNeighbors,
  retryCountOf: (id: string) => number,
): PhotoModalSlide[] => {
  const slideKey = (id: string, suffix = "") => `${id}${suffix}@${retryCountOf(id)}`;

  return [
    {
      key: neighbors.previous ? slideKey(neighbors.previous.id) : "empty-previous",
      item: neighbors.previous,
      current: false,
    },
    { key: slideKey(photo.id), item: photo, current: true },
    {
      // 사진이 2장이면 이전과 다음이 같은 문서라 키가 겹친다.
      key:
        neighbors.next == null
          ? "empty-next"
          : slideKey(
              neighbors.next.id,
              neighbors.next.id === neighbors.previous?.id ? "#next" : "",
            ),
      item: neighbors.next,
      current: false,
    },
  ];
};

export { buildPhotoModalSlides };
export type { PhotoModalSlide };
