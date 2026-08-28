import type { Photo } from "@/types/photo";

type PhotoNeighbors = {
  previous: Photo | null;
  next: Photo | null;
};

/**
 * 탐색 순서에서 앞뒤 사진을 찾는다. 순서는 순환하므로 처음의 이전은 마지막이다.
 * 상세를 아직 받지 못한 id 는 null 로 남는다. 온디맨드 경로는 활성 사진 ±1 만 캐시한다.
 *
 * @param navigationIds 전체 탐색 순서. 캐시된 사진보다 길 수 있다.
 * @param photoById 상세를 가진 사진만 담긴 조회표.
 * @param index navigationIds 안에서 현재 사진의 위치. 음수면 이웃이 없다.
 */
const readPhotoNeighbors = (
  navigationIds: string[],
  photoById: ReadonlyMap<string, Photo>,
  index: number,
): PhotoNeighbors => {
  const count = navigationIds.length;
  if (index < 0 || count < 2) return { previous: null, next: null };

  const previousId = navigationIds[(index - 1 + count) % count];
  const nextId = navigationIds[(index + 1) % count];

  return {
    previous: (previousId != null ? photoById.get(previousId) : undefined) ?? null,
    next: (nextId != null ? photoById.get(nextId) : undefined) ?? null,
  };
};

export { readPhotoNeighbors };
export type { PhotoNeighbors };
