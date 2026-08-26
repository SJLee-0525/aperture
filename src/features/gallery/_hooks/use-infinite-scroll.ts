"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * 클라이언트 윈도잉 무한스크롤 — 이미 로드된 배열을 화면에 점진 렌더한다(추가 fetch 없음).
 * 서버가 ISR 로 전체를 한 번 받고(방문자당 read 0), 여기선 pageSize 만큼만 렌더 → 하단 sentinel 이
 * 뷰포트에 들어오면 count 를 늘린다. 진짜 DB 페이지네이션이 아니라 DOM 마운트만 점진화한 것 —
 * 클라 필터·검색(전체 배열 대상)의 즉각성과 무료 한도(읽기)를 그대로 지킨다.
 *
 * @param {T[]} items
 * @param {number} [pageSize]
 * @returns {{ visible: T[]; attachSentinel: (node: HTMLDivElement | null) => void; hasMore: boolean }}
 */
const useInfiniteScroll = <T>(items: T[], pageSize = 24) => {
  const [count, setCount] = useState(pageSize);

  // items 참조가 바뀌면 처음부터 — effect 대신 렌더 중 조정(React 권장 패턴, use-photo-filter 와 동일).
  const [prevItems, setPrevItems] = useState(items);
  if (items !== prevItems) {
    setPrevItems(items);
    setCount(pageSize);
  }

  const hasMore = count < items.length;

  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);
  // 콜백 ref(함수) — ref 객체가 아니라 함수라 렌더 중 ref 접근 규칙에 걸리지 않는다.
  const attachSentinel = useCallback((node: HTMLDivElement | null) => setSentinel(node), []);

  useEffect(() => {
    if (!sentinel || !hasMore) return;
    // rootMargin 으로 하단 도달 前 미리 로드. count 를 deps 에 둬 로드 후에도 sentinel 이
    // 여전히 보이면(넓은 뷰포트) 이어서 채운다.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setCount((current) => Math.min(current + pageSize, items.length));
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [sentinel, hasMore, pageSize, items.length, count]);

  return { visible: items.slice(0, count), attachSentinel, hasMore };
};

export { useInfiniteScroll };
