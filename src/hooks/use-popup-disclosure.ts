"use client";

import { useCallback, useRef, useState } from "react";

import { useEscapeKey } from "@/hooks/use-escape-key";
import { useOutsidePointerDown } from "@/hooks/use-outside-pointer-down";

type Disclosure<Trigger extends HTMLElement, Root extends HTMLElement> = {
  open: boolean;
  /** 트리거에 건다. 열림 상태와 `aria-expanded` 가 같은 값을 본다. */
  triggerRef: React.RefObject<Trigger | null>;
  /** 트리거와 패널을 함께 감싸는 요소에 건다. 바깥 클릭 판정 범위다. */
  rootRef: React.RefObject<Root | null>;
  toggle: () => void;
  /** 닫고 트리거로 포커스를 되돌린다. 패널 안에서 닫는 모든 경로가 이걸 쓴다. */
  close: () => void;
  /** 바깥 클릭처럼 포커스가 이미 다른 곳으로 간 경우. 트리거로 되돌리지 않는다. */
  dismiss: () => void;
};

/**
 * 트리거 하나가 패널 하나를 여닫는 팝업의 공통 동작.
 *
 * 바깥 클릭으로 닫기, Escape 로 닫기, 닫을 때 트리거로 포커스 되돌리기 셋을 한곳에 둔다.
 * 세 번째가 빠지면 패널이 사라질 때 포커스가 body 로 떨어져 다음 Tab 이 지면 처음부터
 * 다시 시작한다.
 *
 * 목록 안의 방향키 이동은 이 훅이 다루지 않는다. `role` 마다 요구하는 키가 달라
 * `useRovingListFocus` 가 따로 맡는다.
 */
const usePopupDisclosure = <
  Trigger extends HTMLElement = HTMLButtonElement,
  Root extends HTMLElement = HTMLDivElement,
>(): Disclosure<Trigger, Root> => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<Trigger>(null);
  const rootRef = useRef<Root>(null);

  const dismiss = useCallback(() => setOpen(false), []);
  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);
  const toggle = useCallback(() => setOpen((current) => !current), []);

  useEscapeKey(open, close);
  useOutsidePointerDown(open, rootRef, dismiss);

  return { open, triggerRef, rootRef, toggle, close, dismiss };
};

export { usePopupDisclosure };
