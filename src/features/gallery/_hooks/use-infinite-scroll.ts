"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 클라이언트 윈도잉 무한스크롤 — 이미 로드된 배열을 화면에 점진 렌더한다(추가 fetch 없음).
 * 서버가 ISR 로 전체를 한 번 받고(방문자당 read 0), 여기선 pageSize 만큼만 렌더 → 하단 sentinel 이
 * 뷰포트에 들어오면 count 를 늘린다. 진짜 DB 페이지네이션이 아니라 DOM 마운트만 점진화한 것 —
 * 클라 필터·검색(전체 배열 대상)의 즉각성과 무료 한도(읽기)를 그대로 지킨다.
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

  // 콜백이 최신 길이를 보되 관찰자를 다시 만들지는 않게 한다.
  const itemsLengthRef = useRef(items.length);
  useEffect(() => {
    itemsLengthRef.current = items.length;
  }, [items.length]);

  const observerRef = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    if (!sentinel) return;
    // rootMargin 으로 하단 도달 前 미리 로드.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setCount((current) => Math.min(current + pageSize, itemsLengthRef.current));
        }
      },
      { rootMargin: "600px 0px" },
    );
    observerRef.current = io;
    return () => {
      io.disconnect();
      observerRef.current = null;
    };
  }, [sentinel, pageSize]);

  // IntersectionObserver 는 교차 상태가 유지되는 동안 다시 발화하지 않는다. 한 페이지를
  // 채운 뒤에도 sentinel 이 여전히 보이면(넓은 뷰포트) 재관찰로 판정을 한 번 더 받는다.
  // 관찰자를 새로 만들면 500장 그리드에서 20회 넘게 재생성된다.
  useEffect(() => {
    const io = observerRef.current;
    if (!io || !sentinel) return;
    io.unobserve(sentinel);
    if (hasMore) io.observe(sentinel);
  }, [count, hasMore, sentinel]);

  return { visible: items.slice(0, count), attachSentinel, hasMore };
};

export { useInfiniteScroll };
