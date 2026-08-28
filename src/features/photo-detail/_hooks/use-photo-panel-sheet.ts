"use client";

import { useCallback, useRef, useState } from "react";

import type { RefObject, TouchEvent, UIEvent, WheelEvent } from "react";

/** 펼친 상태에서 최상단을 아래로 끌어 접기까지 필요한 거리(px). */
const COLLAPSE_TOUCH_THRESHOLD = 56;
/** 펼친 상태에서 최상단을 역스크롤해 접기까지 누적해야 하는 휠 이동량(px). */
const CLOSE_WHEEL_THRESHOLD = 80;

type PanelProps = {
  ref: RefObject<HTMLElement | null>;
  onScroll: (event: UIEvent<HTMLElement>) => void;
  onTouchStart: (event: TouchEvent<HTMLElement>) => void;
  onTouchMove: (event: TouchEvent<HTMLElement>) => void;
  onTouchEnd: () => void;
  onWheel: (event: WheelEvent<HTMLElement>) => void;
};

type PhotoPanelSheet = {
  /** EXIF 패널이 화면을 덮도록 펼쳐졌는지. */
  expanded: boolean;
  /** 사진 위 크롬(EXIF 스트립·이동 버튼)을 보일지. */
  chromeVisible: boolean;
  /** `<aside>` 에 그대로 펼친다. */
  panelProps: PanelProps;
  /** 사진이 바뀌면 패널과 크롬을 기본 상태로 되돌린다. 렌더 중에 부를 수 있다. */
  reset: () => void;
  toggleChrome: () => void;
  /** 펼침 손잡이 버튼용. 상태에 따라 접거나 편다. */
  toggleExpanded: () => void;
  /** 펼쳐져 있으면 접는다. 이미 접혀 있으면 아무 일도 하지 않는다. */
  collapse: () => void;
};

/**
 * 모바일 바텀시트의 펼침·접힘과 사진 위 크롬 표시를 관리한다.
 *
 * 펼치는 입력은 셋(스크롤·위로 스와이프·아래로 휠)이고 접는 입력도 셋(최상단에서
 * 아래로 당기기·최상단에서 역방향 휠·손잡이 버튼)이다. 임계값과 누적 상태를 한곳에
 * 두지 않으면 한쪽 입력만 고쳤을 때 나머지가 다른 기준으로 움직인다.
 */
const usePhotoPanelSheet = (): PhotoPanelSheet => {
  const [expanded, setExpanded] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const panelRef = useRef<HTMLElement>(null);
  const touchStartY = useRef<number | null>(null);
  const collapsePullStartY = useRef<number | null>(null);
  const wheelTravel = useRef(0);

  const collapsePanel = useCallback((panel: HTMLElement) => {
    touchStartY.current = null;
    collapsePullStartY.current = null;
    wheelTravel.current = 0;
    panel.scrollTo({ top: 0 });
    setExpanded(false);
    setChromeVisible(true);
  }, []);

  const expandPanel = useCallback((panel: HTMLElement) => {
    wheelTravel.current = 0;
    collapsePullStartY.current = null;
    panel.scrollTo({ top: 0 });
    setExpanded(true);
  }, []);

  const onScroll = useCallback(
    (event: UIEvent<HTMLElement>) => {
      if (!expanded && event.currentTarget.scrollTop > 8) expandPanel(event.currentTarget);
    },
    [expanded, expandPanel],
  );

  const onTouchStart = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      const startY = event.touches[0]?.clientY ?? null;
      touchStartY.current = startY;
      collapsePullStartY.current = expanded && event.currentTarget.scrollTop <= 1 ? startY : null;
    },
    [expanded],
  );

  const onTouchMove = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      const nextY = event.touches[0]?.clientY;
      if (nextY == null) return;
      const panel = event.currentTarget;

      if (!expanded && touchStartY.current != null) {
        const openTravel = nextY - touchStartY.current;
        if (openTravel < -8) {
          touchStartY.current = nextY;
          expandPanel(panel);
        }
        return;
      }

      // 펼친 상태에서는 최상단에서 아래로 당겨도 모달이 아닌 EXIF 패널만 축소한다.
      if (panel.scrollTop > 1) {
        collapsePullStartY.current = null;
        return;
      }
      if (collapsePullStartY.current == null || nextY < collapsePullStartY.current) {
        collapsePullStartY.current = nextY;
        return;
      }
      if (nextY - collapsePullStartY.current > COLLAPSE_TOUCH_THRESHOLD) collapsePanel(panel);
    },
    [collapsePanel, expandPanel, expanded],
  );

  const onTouchEnd = useCallback(() => {
    touchStartY.current = null;
    collapsePullStartY.current = null;
  }, []);

  const onWheel = useCallback(
    (event: WheelEvent<HTMLElement>) => {
      const panel = event.currentTarget;

      if (expanded) {
        // 최상단에 닿기 전의 역스크롤은 축소 임계치에 누적하지 않는다.
        if (panel.scrollTop > 1 || event.deltaY >= 0) {
          wheelTravel.current = 0;
          return;
        }
        wheelTravel.current += event.deltaY;
        if (wheelTravel.current < -CLOSE_WHEEL_THRESHOLD) collapsePanel(panel);
        return;
      }

      const sameDirection =
        wheelTravel.current === 0 || Math.sign(wheelTravel.current) === Math.sign(event.deltaY);
      wheelTravel.current = sameDirection ? wheelTravel.current + event.deltaY : event.deltaY;

      if (wheelTravel.current > 8) expandPanel(panel);
    },
    [collapsePanel, expandPanel, expanded],
  );

  const reset = useCallback(() => {
    setExpanded(false);
    setChromeVisible(true);
  }, []);

  const toggleChrome = useCallback(() => setChromeVisible((visible) => !visible), []);

  const collapse = useCallback(() => {
    const panel = panelRef.current;
    if (expanded && panel) collapsePanel(panel);
  }, [collapsePanel, expanded]);

  const toggleExpanded = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (expanded) collapsePanel(panel);
    else expandPanel(panel);
  }, [collapsePanel, expandPanel, expanded]);

  return {
    expanded,
    chromeVisible,
    panelProps: { ref: panelRef, onScroll, onTouchStart, onTouchMove, onTouchEnd, onWheel },
    reset,
    toggleChrome,
    toggleExpanded,
    collapse,
  };
};

export { usePhotoPanelSheet };
