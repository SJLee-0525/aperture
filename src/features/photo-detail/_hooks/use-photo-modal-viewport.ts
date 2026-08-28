"use client";

import { useSyncExternalStore } from "react";

/** 바텀시트로 바뀌는 경계. `PhotoModal.module.css` 의 같은 폭 미디어쿼리와 짝이다. */
const MOBILE_QUERY = "(max-width: 900px)";

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

const readClient = () => window.matchMedia(MOBILE_QUERY).matches;

/**
 * 서버에서는 데스크톱으로 읽는다. 모바일로 가정하면 hydration 직후 바텀시트가
 * 라이트박스로 한 번 바뀌면서 열림 연출이 끊긴다.
 */
const readServer = () => false;

/** 사진 상세가 바텀시트로 그려지는 폭인지. 구독은 마운트된 동안만 유지된다. */
const usePhotoModalViewport = (): boolean =>
  useSyncExternalStore(subscribe, readClient, readServer);

export { usePhotoModalViewport };
