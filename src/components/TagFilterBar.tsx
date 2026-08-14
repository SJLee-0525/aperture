"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Chip } from "@/components/Chip";
import { Icon } from "@/components/Icon";

import type { ReactNode } from "react";

import styles from "./TagFilterBar.module.css";

type TagFilterItem = {
  id: string;
  label: string;
};

type Props = {
  items: TagFilterItem[];
  activeId: string | null;
  allLabel: string;
  onSelect: (id: string | null) => void;
  trailing?: ReactNode;
};

/** 화살표를 누를 때 이동할 컨테이너 너비의 비율. */
const SCROLL_STEP_RATIO = 0.8;
/** 스크롤 끝 판정 여유(px). 소수점 폭에서 끝에 닿아도 1px 이 남는 경우가 있다. */
const SCROLL_EDGE_SLACK = 1;

/**
 * 태그를 선택하는 가로 스크롤 칩 목록.
 *
 * 여러 줄로 감싸면 태그가 늘어날수록 목록이 아래로 밀려 첫 화면에서 보이는 글 수가 줄어든다.
 * 그래서 어느 폭에서든 한 줄을 유지하고, 스크롤바는 숨긴 채 넘치는 방향에만 화살표를 띄운다.
 * 화살표는 포인터 입력용이므로 탭 순서와 접근성 트리에서 제외한다.
 * 칩을 Tab 으로 지나가면 브라우저가 알아서 해당 칩을 보이는 곳으로 스크롤한다.
 *
 * 선택 상태는 갖지 않는다. 사진은 `__all__` 센티널을 URL 에 쓰고 블로그는 키를 생략하는 식으로
 * 전체를 표현하는 방식이 다르므로, 이 컴포넌트는 전체를 `null` 하나로만 다루고 변환은 호출부가 한다.
 * 태그 사전 타입도 지면마다 달라 `{id, label}` 로 정규화해 받는다.
 *
 * @param {Props} props
 * @param {TagFilterItem[]} props.items 표시 순서대로의 태그. 라벨은 호출부가 현재 언어로 고른 값이다.
 * @param {string | null} props.activeId 선택된 태그 id. `null` 이면 `전체` 칩이 활성이다.
 * @param {string} props.allLabel `전체` 칩의 라벨.
 * @param {(id: string | null) => void} props.onSelect 칩을 누를 때 호출한다. `전체` 는 `null` 을 넘긴다.
 * @param {ReactNode | undefined} props.trailing 칩 행 오른쪽 도구(필터 팝오버 등). 없으면 칩이 폭을 모두 쓴다.
 * @returns {JSX.Element}
 */
const TagFilterBar = ({ items, activeId, allLabel, onSelect, trailing }: Props) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ start: false, end: false });

  const syncOverflow = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const max = scroller.scrollWidth - scroller.clientWidth;
    setOverflow({
      start: scroller.scrollLeft > SCROLL_EDGE_SLACK,
      end: scroller.scrollLeft < max - SCROLL_EDGE_SLACK,
    });
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.addEventListener("scroll", syncOverflow, { passive: true });
    // ResizeObserver로 컨테이너 크기 변화에 따른 넘침 여부를 갱신한다.
    const observer = new ResizeObserver(syncOverflow);
    observer.observe(scroller);

    return () => {
      scroller.removeEventListener("scroll", syncOverflow);
      observer.disconnect();
    };
  }, [syncOverflow]);

  // 항목이 바뀌면 내용 너비가 달라지므로 넘침 여부를 다시 확인한다.
  // 못 본다. 목록이 바뀔 때만 한 번 다시 잰다.
  useEffect(() => {
    syncOverflow();
  }, [syncOverflow, items]);

  const scrollStep = (direction: 1 | -1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollBy({
      left: direction * scroller.clientWidth * SCROLL_STEP_RATIO,
      behavior: reduced ? "auto" : "smooth",
    });
  };

  return (
    <div className={styles.bar}>
      <div
        className={styles.scroller}
        data-overflow-start={overflow.start}
        data-overflow-end={overflow.end}
      >
        <div className={styles.tagbar} ref={scrollerRef}>
          <Chip label={allLabel} active={activeId === null} onClick={() => onSelect(null)} />
          {items.map((item) => (
            <Chip
              key={item.id}
              label={item.label}
              active={activeId === item.id}
              onClick={() => onSelect(item.id)}
            />
          ))}
        </div>

        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowStart}`}
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => scrollStep(-1)}
        >
          <Icon name="chevronLeft" size={16} />
        </button>
        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowEnd}`}
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => scrollStep(1)}
        >
          <Icon name="chevronRight" size={16} />
        </button>
      </div>
      {trailing}
    </div>
  );
};

export { TagFilterBar };
