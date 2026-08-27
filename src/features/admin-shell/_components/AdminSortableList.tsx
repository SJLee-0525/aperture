"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";


import type { ReactNode } from "react";

import styles from "./admin-list.module.css";
import { SORT_ANNOUNCEMENTS, SORT_SCREEN_READER_INSTRUCTIONS } from "./sort-announcements";

type Props = {
  ids: string[];
  onReorder: (activeId: string, overId: string) => void;
  children: ReactNode;
};

/**
 * 드래그·키보드로 순서를 바꾸는 목록.
 *
 * `useSensors` 에 센서를 명시하면 dnd-kit 기본 목록을 덮어쓴다. PointerSensor 만 넘기면
 * 핸들이 `aria-roledescription="sortable"` 로 낭독되면서도 Space·Enter 에 반응하지 않는다.
 * 목록 화면에는 위아래 버튼이 없어 그 경우 순서를 바꿀 수단이 사라진다.
 */
const AdminSortableList = ({ ids, onReorder, children }: Props) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over) onReorder(String(active.id), String(over.id));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements: SORT_ANNOUNCEMENTS,
        screenReaderInstructions: SORT_SCREEN_READER_INSTRUCTIONS,
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className={styles.list}>{children}</ul>
      </SortableContext>
    </DndContext>
  );
};

export { AdminSortableList };
