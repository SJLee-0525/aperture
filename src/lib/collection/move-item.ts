/** 한 칸 위(-1) 또는 아래(1). 배열 편집 UI 의 이동 버튼이 주는 값이다. */
type MoveOffset = -1 | 1;

/**
 * 배열 항목 하나를 이웃과 맞바꾼다.
 *
 * 범위를 벗어나면 원본을 그대로 돌려준다. 새 배열을 만들지 않으므로 호출부가 상태를
 * 갱신해도 리렌더가 일어나지 않는다.
 *
 * @param list 원본. 이 함수는 원본을 바꾸지 않는다.
 * @param index 옮길 항목의 위치.
 * @param offset 이동 방향.
 */
const moveItem = <T>(list: T[], index: number, offset: MoveOffset): T[] => {
  const target = index + offset;
  if (target < 0 || target >= list.length) return list;

  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

export { moveItem };
export type { MoveOffset };
