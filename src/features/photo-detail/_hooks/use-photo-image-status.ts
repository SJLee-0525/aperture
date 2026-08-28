"use client";

import { useCallback, useState } from "react";

type ImageStatus = "loaded" | "failed";

type PhotoImageStatus = {
  /** 결판이 난 사진의 결과. 아직 로드 중이면 `undefined`. */
  statusOf: (id: string) => ImageStatus | undefined;
  /** 재시도 횟수. 슬라이드 키와 줌 리셋 키가 같은 값을 쓴다. */
  retryCountOf: (id: string) => number;
  markLoaded: (id: string) => void;
  markFailed: (id: string) => void;
  retry: (id: string) => void;
};

/**
 * 사진별 로드 결과와 재시도 횟수를 누적한다.
 *
 * 이웃으로 미리 그려 둔 이미지가 현재로 승격돼도 `onLoad` 는 다시 뛰지 않는다. 결과를
 * 사진별로 쌓아 두어야 승격 직후 스피너가 다시 덮지 않는다.
 *
 * 재시도는 횟수를 올려 슬라이드 키를 바꾸는 방식이다. 같은 `src` 를 그대로 두면
 * 브라우저가 다시 받지 않는다.
 */
const usePhotoImageStatus = (): PhotoImageStatus => {
  const [status, setStatus] = useState<ReadonlyMap<string, ImageStatus>>(() => new Map());
  const [retryCounts, setRetryCounts] = useState<ReadonlyMap<string, number>>(() => new Map());

  const mark = useCallback((id: string, next: ImageStatus) => {
    setStatus((current) =>
      current.get(id) === next ? current : new Map(current).set(id, next),
    );
  }, []);

  const markLoaded = useCallback((id: string) => mark(id, "loaded"), [mark]);
  const markFailed = useCallback((id: string) => mark(id, "failed"), [mark]);

  const retry = useCallback((id: string) => {
    setStatus((current) => {
      const rest = new Map(current);
      rest.delete(id);
      return rest;
    });
    setRetryCounts((current) => new Map(current).set(id, (current.get(id) ?? 0) + 1));
  }, []);

  const statusOf = useCallback((id: string) => status.get(id), [status]);
  const retryCountOf = useCallback((id: string) => retryCounts.get(id) ?? 0, [retryCounts]);

  return { statusOf, retryCountOf, markLoaded, markFailed, retry };
};

export { usePhotoImageStatus };
