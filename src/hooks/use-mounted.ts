"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * SSR-safe 클라이언트 마운트 여부 (createPortal 등 document 접근 가드).
 * useSyncExternalStore로 서버=false / 클라=true → setState-in-effect 없이 안전.
 */
const useMounted = (): boolean =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

export { useMounted };
