"use client";

import { useCallback, useEffect, useRef } from "react";

const FOCUSABLE_ITEM = "[data-list-item]";

type Options = {
  /** 열릴 때 포커스를 옮길 항목의 인덱스. 없으면 첫 항목. */
  activeIndex?: number;
};

/**
 * `listbox`·`menu` 안에서 방향키로 항목을 옮긴다.
 *
 * ARIA 는 두 role 모두 위아래 방향키와 Home·End 를 요구한다. 열릴 때 선택된 항목으로
 * 포커스를 옮기지 않으면 Tab 으로 항목을 하나씩 지나야 한다.
 *
 * 대상은 컨테이너 안의 `[data-list-item]` 이다. 항목이 버튼인지 링크인지에 따라
 * 선택자를 바꾸지 않으려고 표식으로 고른다.
 *
 * @param open 목록이 열려 있는지.
 * @param listRef 항목을 담은 컨테이너.
 * @returns 컨테이너에 그대로 거는 `onKeyDown`.
 */
const useRovingListFocus = <T extends HTMLElement>(
  open: boolean,
  listRef: React.RefObject<T | null>,
  options?: Options,
) => {
  const activeIndex = options?.activeIndex ?? 0;
  const activeIndexRef = useRef(activeIndex);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  });

  const items = useCallback(
    () => Array.from(listRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_ITEM) ?? []),
    [listRef],
  );

  useEffect(() => {
    if (!open) return;
    const list = items();
    (list[activeIndexRef.current] ?? list[0])?.focus({ preventScroll: true });
  }, [open, items]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<T>) => {
      const list = items();
      if (list.length === 0) return;
      const current = list.indexOf(document.activeElement as HTMLElement);

      const move = (next: number) => {
        event.preventDefault();
        list[(next + list.length) % list.length]?.focus();
      };

      if (event.key === "ArrowDown") move(current + 1);
      else if (event.key === "ArrowUp") move(current - 1);
      else if (event.key === "Home") move(0);
      else if (event.key === "End") move(list.length - 1);
    },
    [items],
  );

  return onKeyDown;
};

export { useRovingListFocus };
