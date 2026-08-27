"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import type { ReactNode } from "react";

type UnsavedGuardValue = {
  /** 편집 중인 폼이 dirty 인지 셸이 읽는 값. */
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
  /** 이동해도 되는지 묻는다. dirty 가 아니면 묻지 않고 true. */
  confirmLeave: () => boolean;
};

const UnsavedGuardContext = createContext<UnsavedGuardValue | null>(null);

const LEAVE_MESSAGE = "저장하지 않은 변경을 버릴까요?";

/**
 * 관리자 셸과 편집 폼이 dirty 상태를 공유하는 통로.
 *
 * 셸 헤더의 링크는 폼 밖에 있어 폼의 상태를 볼 수 없다. 그 사이를 이 context 가 잇는다.
 * Next 문서가 `<Link onNavigate>` 로 이동을 막을 때 권하는 형태다
 * (`docs/01-app/03-api-reference/02-components/link.md` 의 Blocking navigation 절).
 */
const UnsavedGuardProvider = ({ children }: { children: ReactNode }) => {
  const [dirty, setDirtyState] = useState(false);
  const dirtyRef = useRef(false);

  const setDirty = useCallback((next: boolean) => {
    dirtyRef.current = next;
    setDirtyState(next);
  }, []);

  // 이벤트 핸들러에서 부르므로 렌더 시점 값이 아니라 ref 를 읽는다.
  const confirmLeave = useCallback(() => !dirtyRef.current || window.confirm(LEAVE_MESSAGE), []);

  const value = useMemo(() => ({ dirty, setDirty, confirmLeave }), [dirty, setDirty, confirmLeave]);

  return <UnsavedGuardContext.Provider value={value}>{children}</UnsavedGuardContext.Provider>;
};

/** 셸 밖(로그인 화면 등)에서는 null 이므로 가드 없이 동작한다. */
const useUnsavedGuardContext = (): UnsavedGuardValue | null => useContext(UnsavedGuardContext);

export { LEAVE_MESSAGE, UnsavedGuardProvider, useUnsavedGuardContext };
