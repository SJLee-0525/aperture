"use client";

import { useEffect } from "react";

/**
 * 저장하지 않은 변경이 있는 동안 새로고침·탭 닫기를 브라우저 확인창으로 막는다.
 *
 * 이것으로 덮이지 않는 경로가 둘이다. 앱 안의 링크 이동은 `beforeunload` 를 일으키지
 * 않으므로 `useUnsavedNavigationGuard` 가 따로 맡고, 브라우저 뒤로가기는 App Router 에
 * 막을 수단이 없어 보호되지 않는다.
 *
 * @param dirty 저장 이후 바뀐 것이 있는지. false 면 리스너를 걸지 않는다.
 */
const useUnsavedGuard = (dirty: boolean): void => {
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      // 최신 브라우저는 문구를 무시하고 자체 확인창을 띄운다. preventDefault 만이 조건이다.
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
};

export { useUnsavedGuard };
