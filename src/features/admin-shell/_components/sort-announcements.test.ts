import { describe, expect, it } from "vitest";

import {
  SORT_ANNOUNCEMENTS,
  SORT_SCREEN_READER_INSTRUCTIONS,
} from "@/features/admin-shell/_components/sort-announcements";

const active = { id: "photo-1" } as never;
const overAt = (index: number) =>
  ({ id: "photo-2", data: { current: { sortable: { index } } } }) as never;

describe("SORT_ANNOUNCEMENTS", () => {
  it("집었을 때 대상 id 를 읽는다", () => {
    expect(SORT_ANNOUNCEMENTS.onDragStart?.({ active } as never)).toBe(
      "photo-1 항목을 집었습니다.",
    );
  });

  it("위치는 1-기반으로 읽는다. dnd-kit 이 주는 index 는 0-기반이다", () => {
    expect(SORT_ANNOUNCEMENTS.onDragOver?.({ active, over: overAt(0) } as never)).toBe(
      "photo-1 항목을 1번째 자리로 옮겼습니다.",
    );
  });

  it("놓을 수 없는 자리에서는 그 사실을 알린다", () => {
    expect(SORT_ANNOUNCEMENTS.onDragOver?.({ active, over: null } as never)).toBe(
      "photo-1 항목이 놓을 수 없는 자리에 있습니다.",
    );
  });

  it("놓았을 때 최종 위치를 알린다", () => {
    expect(SORT_ANNOUNCEMENTS.onDragEnd?.({ active, over: overAt(2) } as never)).toBe(
      "photo-1 항목을 3번째 자리에 놓았습니다.",
    );
  });

  it("바깥에 놓으면 순서가 그대로임을 알린다", () => {
    expect(SORT_ANNOUNCEMENTS.onDragEnd?.({ active, over: null } as never)).toBe(
      "photo-1 항목을 놓았습니다. 순서가 바뀌지 않았습니다.",
    );
  });

  it("취소는 순서 유지를 함께 알린다", () => {
    expect(SORT_ANNOUNCEMENTS.onDragCancel?.({ active } as never)).toBe(
      "photo-1 항목의 정렬을 취소했습니다. 순서는 그대로입니다.",
    );
  });

  it("안내가 한국어다. dnd-kit 기본값은 영어라 이 화면만 다른 언어로 낭독된다", () => {
    expect(SORT_SCREEN_READER_INSTRUCTIONS.draggable).toContain("스페이스바");
    expect(SORT_SCREEN_READER_INSTRUCTIONS.draggable).toContain("Escape");
  });
});
