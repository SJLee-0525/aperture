import type { Announcements, ScreenReaderInstructions } from "@dnd-kit/core";

/**
 * dnd-kit 의 정렬 안내. 기본값이 영어라 관리자 화면에서 이 문구만 다른 언어로 낭독된다.
 *
 * 위치는 1-기반으로 읽는다. dnd-kit 이 주는 index 는 0-기반이다.
 */
const position = (index: number | undefined): string =>
  index === undefined ? "" : String(index + 1);

const SORT_ANNOUNCEMENTS: Announcements = {
  onDragStart: ({ active }) => `${active.id} 항목을 집었습니다.`,
  onDragOver: ({ active, over }) =>
    over
      ? `${active.id} 항목을 ${position(over.data.current?.sortable?.index)}번째 자리로 옮겼습니다.`
      : `${active.id} 항목이 놓을 수 없는 자리에 있습니다.`,
  onDragEnd: ({ active, over }) =>
    over
      ? `${active.id} 항목을 ${position(over.data.current?.sortable?.index)}번째 자리에 놓았습니다.`
      : `${active.id} 항목을 놓았습니다. 순서가 바뀌지 않았습니다.`,
  onDragCancel: ({ active }) => `${active.id} 항목의 정렬을 취소했습니다. 순서는 그대로입니다.`,
};

const SORT_SCREEN_READER_INSTRUCTIONS: ScreenReaderInstructions = {
  draggable:
    "정렬하려면 스페이스바나 엔터를 누릅니다. 집은 뒤 방향키로 자리를 옮기고, 다시 스페이스바나 엔터로 놓습니다. Escape 를 누르면 취소합니다.",
};

export { SORT_ANNOUNCEMENTS, SORT_SCREEN_READER_INSTRUCTIONS };
