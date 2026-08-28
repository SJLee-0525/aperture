"use client";

import { useRef } from "react";

import { useDialogIsolation } from "@/hooks/use-dialog-isolation";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useMounted } from "@/hooks/use-mounted";
import { useOverlayLayer } from "@/hooks/use-overlay-layer";
import { useScrollLock } from "@/hooks/use-scroll-lock";

import type { ScrollLockOptions } from "@/hooks/use-scroll-lock";

type Options = {
  /** 배경 스크롤 잠금 세부. 오버레이마다 모바일 처리가 달라 그대로 통과시킨다. */
  scrollLock?: ScrollLockOptions;
  /**
   * 열린 동안 나머지 body 를 접근성·포커스 트리에서 격리할지.
   *
   * 스크림으로 화면을 덮지 않는 오버레이(챗 패널, 목차 서랍)만 켠다. 전면 스크림이
   * 있는 모달은 스크림 자체가 클릭을 막아 격리가 겹친다.
   */
  isolate?: boolean;
  /**
   * Escape 를 이 훅이 처리할지. 방향키와 한 리스너에서 다루는 오버레이는 끄고
   * 자기 리스너를 유지한다 — 키 사이의 순서와 조건이 달라 나누면 동작이 바뀐다.
   */
  escape?: (() => void) | false;
};

/**
 * 오버레이 하나를 여는 데 필요한 조립.
 *
 * 포커스 트랩·스크롤 잠금·Escape·격리·최상위 판정은 함께 켜지고 함께 꺼진다. 여섯
 * 오버레이가 이 조합을 손으로 적으면서 조금씩 다른 집합을 골랐고, 어느 것을 빠뜨렸는지
 * 인터페이스로 볼 수 없었다.
 *
 * @param open 오버레이가 열려 있는지.
 * @param options 오버레이마다 실제로 다른 부분만 받는다.
 * @returns `panelRef` 는 포커스 트랩 컨테이너, `overlayRef` 는 격리에서 제외할 노드,
 *   `isTopLayer` 는 겹친 오버레이 중 자신이 위인지, `mounted` 는 포털을 그려도 되는지.
 */
const useDialog = (open: boolean, options: Options = {}) => {
  const { scrollLock, isolate = false, escape } = options;
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useFocusTrap(open);
  const mounted = useMounted();

  useScrollLock(open, scrollLock);
  useDialogIsolation(open && isolate, overlayRef);

  // Escape 를 이 훅이 다루지 않아도 stack 등록은 필요하다. 자기 리스너를 가진
  // 오버레이도 최상위 판정을 같은 stack 에서 받아야 겹칠 때 순서가 맞는다.
  const escapeTopLayer = useEscapeKey(open && escape !== false, escape || (() => undefined));
  const ownTopLayer = useOverlayLayer(open && escape === false);
  const isTopLayer = escape === false ? ownTopLayer : escapeTopLayer;

  return { panelRef, overlayRef, isTopLayer, mounted };
};

export { useDialog };
