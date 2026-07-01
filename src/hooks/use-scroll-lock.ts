"use client";

import { useEffect } from "react";

/** 모달·오버레이가 열려 있는 동안 body 스크롤 잠금 (2개 이상 feature 공유 → hooks 승격) */
const useScrollLock = (locked: boolean) => {
  useEffect(() => {
    if (!locked) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [locked]);
};

export { useScrollLock };
