"use client";

import { useCallback, useEffect } from "react";

import { useUnsavedGuardContext } from "@/features/admin-shell/_components/UnsavedGuardProvider";

import { useUnsavedGuard } from "@/hooks/use-unsaved-guard";

/**
 * 편집 폼이 자기 dirty 상태를 셸에 알리고 이탈 확인을 빌려 쓴다.
 *
 * 새로고침·탭 닫기는 `useUnsavedGuard` 가, 셸 헤더의 링크 이동은 셸이 막는다.
 * 폼 자신의 취소 버튼은 `confirmLeave` 를 직접 부른다.
 *
 * @param dirty 저장 이후 바뀐 것이 있는지.
 * @returns 이동해도 되는지 묻는 함수. dirty 가 아니면 묻지 않고 true.
 */
const useUnsavedForm = (dirty: boolean): (() => boolean) => {
  const guard = useUnsavedGuardContext();
  const setDirty = guard?.setDirty;

  useUnsavedGuard(dirty);

  useEffect(() => {
    setDirty?.(dirty);
    // 화면을 떠나면 셸에 남은 dirty 표시를 지운다.
    return () => setDirty?.(false);
  }, [dirty, setDirty]);

  return useCallback(() => guard?.confirmLeave() ?? true, [guard]);
};

export { useUnsavedForm };
